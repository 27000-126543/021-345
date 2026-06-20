import { create } from 'zustand'
import { PileInfo, PileRecord, DailyLog, RecordValidation } from '@/types/pile'
import {
  getPileList,
  getPileRecords,
  savePileRecord,
  getPileRecordsByDate,
  getDailyLogs,
  saveDailyLog,
  updatePileStatus,
  generateId
} from '@/utils/storage'
import { validateRecord, calculateDesignConcreteVolume } from '@/utils/validator'
import dayjs from 'dayjs'

interface PileStore {
  piles: PileInfo[]
  records: PileRecord[]
  dailyLogs: DailyLog[]
  selectedPile: PileInfo | null
  currentRecord: Partial<PileRecord> | null
  currentValidation: RecordValidation | null
  isLoading: boolean
  loadPiles: () => void
  loadRecords: () => void
  loadDailyLogs: () => void
  selectPile: (pile: PileInfo | null) => void
  updateRecordField: (field: keyof PileRecord, value: any) => void
  saveCurrentRecord: () => boolean
  getTodayRecords: () => PileRecord[]
  generateDailyLog: (date?: string) => DailyLog | null
  signDailyLog: (logId: string, signName: string) => boolean
  initNewRecord: (pile: PileInfo) => void
  getStats: () => { total: number; completed: number; inProgress: number; exception: number }
}

export const usePileStore = create<PileStore>((set, get) => ({
  piles: [],
  records: [],
  dailyLogs: [],
  selectedPile: null,
  currentRecord: null,
  currentValidation: null,
  isLoading: false,

  loadPiles: () => {
    const piles = getPileList()
    set({ piles })
    console.log('[Store] 加载桩位列表:', piles.length, '条')
  },

  loadRecords: () => {
    const records = getPileRecords()
    set({ records })
    console.log('[Store] 加载施工记录:', records.length, '条')
  },

  loadDailyLogs: () => {
    const logs = getDailyLogs()
    set({ dailyLogs: logs })
    console.log('[Store] 加载施工日志:', logs.length, '条')
  },

  selectPile: (pile) => {
    set({ selectedPile: pile })
    if (pile) {
      get().initNewRecord(pile)
    }
  },

  initNewRecord: (pile: PileInfo) => {
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')
    const designConcreteVolume = calculateDesignConcreteVolume(pile.designDiameter, pile.designLength)
    
    const newRecord: Partial<PileRecord> = {
      id: generateId(),
      pileId: pile.id,
      pileNo: pile.pileNo,
      drillStartTime: '',
      drillNo: '',
      designDiameter: pile.designDiameter,
      designLength: pile.designLength,
      actualDepth: 0,
      mudWeight: 0,
      sedimentThickness: 0,
      cageLiftTime: '',
      concreteVolume: 0,
      designConcreteVolume,
      exceptionReason: '',
      status: 'draft',
      createTime: now,
      updateTime: now
    }
    
    const validation = validateRecord(newRecord)
    set({ 
      currentRecord: newRecord,
      currentValidation: validation
    })
    console.log('[Store] 初始化新记录:', pile.pileNo)
  },

  updateRecordField: (field, value) => {
    const { currentRecord } = get()
    if (!currentRecord) return

    const updated: Partial<PileRecord> = {
      ...currentRecord,
      [field]: value,
      updateTime: dayjs().format('YYYY-MM-DD HH:mm:ss')
    }

    if (field === 'designDiameter' || field === 'designLength') {
      const diameter = Number(field === 'designDiameter' ? value : currentRecord.designDiameter)
      const length = Number(field === 'designLength' ? value : currentRecord.designLength)
      if (diameter > 0 && length > 0) {
        updated.designConcreteVolume = calculateDesignConcreteVolume(diameter, length)
      }
    }

    const validation = validateRecord(updated)
    set({ 
      currentRecord: updated,
      currentValidation: validation
    })
  },

  saveCurrentRecord: () => {
    const { currentRecord, currentValidation, selectedPile } = get()
    if (!currentRecord || !currentValidation) return false

    try {
      let status: PileRecord['status'] = 'draft'
      if (currentValidation.missingFields.length === 0) {
        status = currentValidation.overallStatus === 'error' ? 'submitted' : 'submitted'
      }

      const recordToSave: PileRecord = {
        ...currentRecord,
        validation: currentValidation,
        status,
        createTime: currentRecord.createTime || dayjs().format('YYYY-MM-DD HH:mm:ss'),
        updateTime: dayjs().format('YYYY-MM-DD HH:mm:ss')
      } as PileRecord

      savePileRecord(recordToSave)
      
      if (selectedPile) {
        const pileStatus = currentValidation.overallStatus === 'error' ? 'exception' : 'completed'
        updatePileStatus(selectedPile.id, pileStatus)
      }

      const records = getPileRecords()
      const piles = getPileList()
      set({ records, piles })

      console.log('[Store] 保存记录成功:', recordToSave.pileNo)
      return true
    } catch (error) {
      console.error('[Store] 保存记录失败:', error)
      return false
    }
  },

  getTodayRecords: () => {
    const today = dayjs().format('YYYY-MM-DD')
    return getPileRecordsByDate(today)
  },

  generateDailyLog: (date?: string) => {
    const targetDate = date || dayjs().format('YYYY-MM-DD')
    const todayRecords = getPileRecordsByDate(targetDate)
    
    if (todayRecords.length === 0) {
      console.log('[Store] 今日无记录，无法生成日志')
      return null
    }

    const log: DailyLog = {
      id: generateId(),
      date: targetDate,
      records: todayRecords.map(r => r.id),
      totalPiles: todayRecords.length,
      completedPiles: todayRecords.filter(r => r.validation.overallStatus === 'normal').length,
      exceptionPiles: todayRecords.filter(r => r.validation.overallStatus !== 'normal').length,
      status: 'draft',
      createTime: dayjs().format('YYYY-MM-DD HH:mm:ss')
    }

    saveDailyLog(log)
    const logs = getDailyLogs()
    set({ dailyLogs: logs })

    console.log('[Store] 生成施工日志:', targetDate)
    return log
  },

  signDailyLog: (logId, signName) => {
    const { dailyLogs } = get()
    const logIndex = dailyLogs.findIndex(l => l.id === logId)
    if (logIndex < 0) return false

    try {
      const updatedLog: DailyLog = {
        ...dailyLogs[logIndex],
        signedBy: signName,
        signTime: dayjs().format('YYYY-MM-DD HH:mm:ss'),
        status: 'signed'
      }
      saveDailyLog(updatedLog)
      const logs = getDailyLogs()
      set({ dailyLogs: logs })
      console.log('[Store] 日志签字成功:', signName)
      return true
    } catch (error) {
      console.error('[Store] 日志签字失败:', error)
      return false
    }
  },

  getStats: () => {
    const { piles } = get()
    return {
      total: piles.length,
      completed: piles.filter(p => p.status === 'completed').length,
      inProgress: piles.filter(p => p.status === 'in_progress').length,
      exception: piles.filter(p => p.status === 'exception').length
    }
  }
}))
