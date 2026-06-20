import { create } from 'zustand'
import { PileInfo, PileRecord, DailyLog, RecordValidation, ConstructionStage, CONSTRUCTION_STAGES, LogRecordDetail, RECORD_FIELDS } from '@/types/pile'
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
import { validateRecord, calculateDesignConcreteVolume, isStageComplete } from '@/utils/validator'
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
  saveStage: (stage: ConstructionStage) => boolean
  getRecordByPileId: (pileId: string) => PileRecord | undefined
  loadExistingRecord: (pileId: string) => boolean
  getTodayRecords: () => PileRecord[]
  generateDailyLog: (date?: string) => DailyLog | null
  signDailyLog: (logId: string, signName: string) => boolean
  initNewRecord: (pile: PileInfo) => void
  completeStage: (stage: ConstructionStage) => void
  getStats: () => { total: number; completed: number; inProgress: number; exception: number }
}

const initStages = (): PileRecord['stages'] => {
  return CONSTRUCTION_STAGES.map(s => ({
    stage: s.key,
    completed: false
  }))
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
      const loaded = get().loadExistingRecord(pile.id)
      if (!loaded) {
        get().initNewRecord(pile)
      }
    }
  },

  getRecordByPileId: (pileId) => {
    const records = getPileRecords()
    return records.find(r => r.pileId === pileId)
  },

  loadExistingRecord: (pileId) => {
    const existingRecord = get().getRecordByPileId(pileId)
    if (existingRecord) {
      const validation = validateRecord(existingRecord)
      set({ 
        currentRecord: existingRecord,
        currentValidation: validation
      })
      console.log('[Store] 加载已有记录:', existingRecord.pileNo, '阶段:', existingRecord.currentStage)
      return true
    }
    return false
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
      stages: initStages(),
      currentStage: 'drill_start',
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
      updated.designConcreteVolume = calculateDesignConcreteVolume(diameter, length)
    }

    const validation = validateRecord(updated)
    set({ 
      currentRecord: updated,
      currentValidation: validation
    })
  },

  completeStage: (stage) => {
    const { currentRecord } = get()
    if (!currentRecord) return

    const updatedStages = currentRecord.stages?.map(s => 
      s.stage === stage 
        ? { ...s, completed: true, completedTime: dayjs().format('YYYY-MM-DD HH:mm:ss') }
        : s
    ) || initStages()

    const stageIndex = CONSTRUCTION_STAGES.findIndex(s => s.key === stage)
    const nextStage = stageIndex < CONSTRUCTION_STAGES.length - 1 
      ? CONSTRUCTION_STAGES[stageIndex + 1].key 
      : stage

    const updated: Partial<PileRecord> = {
      ...currentRecord,
      stages: updatedStages,
      currentStage: nextStage,
      updateTime: dayjs().format('YYYY-MM-DD HH:mm:ss')
    }

    const validation = validateRecord(updated)
    set({ 
      currentRecord: updated,
      currentValidation: validation
    })
    console.log('[Store] 完成阶段:', stage, '进入下一阶段:', nextStage)
  },

  saveStage: (stage) => {
    const { currentRecord, currentValidation, selectedPile } = get()
    if (!currentRecord || !currentValidation) return false

    const stageComplete = isStageComplete(stage, currentRecord)
    if (!stageComplete) {
      console.log('[Store] 阶段数据不完整，无法标记完成:', stage)
      return false
    }

    get().completeStage(stage)
    
    const updatedRecord = get().currentRecord
    const updatedValidation = get().currentValidation
    
    if (!updatedRecord || !updatedValidation) return false

    try {
      const recordToSave: PileRecord = {
        ...updatedRecord,
        validation: updatedValidation,
        status: 'draft',
        createTime: updatedRecord.createTime || dayjs().format('YYYY-MM-DD HH:mm:ss'),
        updateTime: dayjs().format('YYYY-MM-DD HH:mm:ss')
      } as PileRecord

      savePileRecord(recordToSave)
      
      if (selectedPile && currentValidation.overallStatus !== 'pending') {
        const pileStatus = currentValidation.overallStatus === 'error' ? 'exception' : 'in_progress'
        updatePileStatus(selectedPile.id, pileStatus)
      }

      const records = getPileRecords()
      const piles = getPileList()
      set({ records, piles })

      console.log('[Store] 阶段保存成功:', stage, '桩号:', recordToSave.pileNo)
      return true
    } catch (error) {
      console.error('[Store] 阶段保存失败:', error)
      return false
    }
  },

  saveCurrentRecord: () => {
    const { currentRecord, currentValidation, selectedPile } = get()
    if (!currentRecord || !currentValidation) return false

    try {
      let status: PileRecord['status'] = 'draft'
      if (currentValidation.missingFields.length === 0) {
        status = currentValidation.overallStatus === 'error' ? 'submitted' : 'submitted'
      }

      const allStagesComplete = currentValidation.stageStatus && 
        Object.values(currentValidation.stageStatus).every(s => s === 'normal')

      const updatedStages = allStagesComplete
        ? currentRecord.stages?.map(s => ({ ...s, completed: true })) || initStages()
        : currentRecord.stages || initStages()

      const recordToSave: PileRecord = {
        ...currentRecord,
        stages: updatedStages,
        validation: currentValidation,
        status,
        createTime: currentRecord.createTime || dayjs().format('YYYY-MM-DD HH:mm:ss'),
        updateTime: dayjs().format('YYYY-MM-DD HH:mm:ss')
      } as PileRecord

      savePileRecord(recordToSave)
      
      if (selectedPile) {
        const pileStatus = allStagesComplete 
          ? (currentValidation.overallStatus === 'error' ? 'exception' : 'completed')
          : 'in_progress'
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

    const calculateTheoreticalVolume = (diameter: number, length: number) => {
      const radius = diameter / 2 / 1000
      return Math.PI * radius * radius * length
    }

    const convertToLogRecordDetail = (record: PileRecord): LogRecordDetail => {
      const completedStages: ConstructionStage[] = []
      const pendingStages: ConstructionStage[] = []
      
      if (record.stages) {
        record.stages.forEach(s => {
          if (s.completed) {
            completedStages.push(s.stage)
          } else {
            pendingStages.push(s.stage)
          }
        })
      } else {
        CONSTRUCTION_STAGES.forEach(s => pendingStages.push(s.key))
      }

      const exceptions = record.validation.exceptions.map(ex => ({
        field: RECORD_FIELDS.find(f => f.key === ex.field)?.label || ex.field,
        message: ex.message,
        reason: record.exceptionReason || undefined
      }))

      const theoreticalVolume = record.designConcreteVolume || 
        calculateTheoreticalVolume(record.designDiameter, record.designLength)

      return {
        pileNo: record.pileNo,
        status: record.validation.overallStatus,
        designLength: record.designLength,
        actualDepth: record.actualDepth,
        mudWeight: record.mudWeight || undefined,
        sedimentThickness: record.sedimentThickness || undefined,
        theoreticalVolume,
        concreteVolume: record.concreteVolume || undefined,
        completedStages,
        pendingStages,
        exceptions
      }
    }

    const pendingReasons: string[] = []
    todayRecords.forEach(record => {
      const detail = convertToLogRecordDetail(record)
      
      if (detail.pendingStages.length > 0) {
        pendingReasons.push(`${record.pileNo}: 施工阶段未完成（${detail.pendingStages.map(s => {
          const stageLabels: Record<string, string> = { drill_start: '开钻', drill_end: '终孔', cage: '下笼', concrete: '灌注' }
          return stageLabels[s] || s
        }).join('、')}）`)
      }
      
      record.validation.exceptions.forEach(ex => {
        const fieldLabel = RECORD_FIELDS.find(f => f.key === ex.field)?.label || ex.field
        if (!record.exceptionReason) {
          pendingReasons.push(`${record.pileNo}: ${fieldLabel}异常 - ${ex.message}，待说明原因`)
        }
      })
      
      if (record.validation.missingFields.length > 0) {
        record.validation.missingFields.forEach(fieldKey => {
          const fieldLabel = RECORD_FIELDS.find(f => f.key === fieldKey)?.label || fieldKey
          pendingReasons.push(`${record.pileNo}: ${fieldLabel}未填写`)
        })
      }
    })

    const recordDetails = todayRecords.map(r => convertToLogRecordDetail(r))

    const log: DailyLog = {
      id: generateId(),
      date: targetDate,
      records: todayRecords.map(r => r.id),
      recordDetails,
      totalPiles: todayRecords.length,
      completedPiles: todayRecords.filter(r => r.validation.overallStatus === 'normal').length,
      exceptionPiles: todayRecords.filter(r => r.validation.overallStatus === 'error').length,
      pendingReasons,
      weather: '晴',
      constructionSituation: `今日完成${todayRecords.length}根桩施工，其中${todayRecords.filter(r => r.validation.overallStatus === 'normal').length}根合格，${todayRecords.filter(r => r.validation.overallStatus === 'error').length}根存在异常。`,
      existingProblems: pendingReasons.length > 0 ? `共${pendingReasons.length}项待补，详见待补原因汇总。` : '无',
      status: 'draft',
      isLocked: false,
      createTime: dayjs().format('YYYY-MM-DD HH:mm:ss')
    }

    saveDailyLog(log)
    const logs = getDailyLogs()
    set({ dailyLogs: logs })

    console.log('[Store] 生成施工日志:', targetDate, '待补原因:', pendingReasons.length)
    return log
  },

  signDailyLog: (logId, signName) => {
    const { dailyLogs } = get()
    const logIndex = dailyLogs.findIndex(l => l.id === logId)
    if (logIndex < 0) return false

    const log = dailyLogs[logIndex]
    if (log.isLocked) {
      console.log('[Store] 日志已锁定，无法重复签字')
      return false
    }

    try {
      const updatedLog: DailyLog = {
        ...log,
        signedBy: signName,
        signTime: dayjs().format('YYYY-MM-DD HH:mm:ss'),
        status: 'signed',
        isLocked: true
      }
      saveDailyLog(updatedLog)
      const logs = getDailyLogs()
      set({ dailyLogs: logs })
      console.log('[Store] 日志签字成功，已锁定:', signName)
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
