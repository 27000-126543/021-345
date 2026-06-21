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

interface TeamBoardData {
  byDrill: Record<string, PileInfo[]>
  byOperator: Record<string, PileInfo[]>
  byStage: Record<'pending' | 'drill_start' | 'drill_end' | 'cage' | 'concrete' | 'completed', PileInfo[]>
}

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
  updateRecordField: (field: keyof PileRecord, value: any, reason?: string) => void
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
  submitForQualityCheck: () => boolean
  qualityCheck: (recordId: string, pass: boolean, comments?: string, inspector?: string) => boolean
  getTeamBoardData: () => TeamBoardData
  getPendingQualityChecks: () => PileRecord[]
  exportDailyReport: (date?: string) => DailyLog | null
}

const initStages = (): PileRecord['stages'] => {
  return CONSTRUCTION_STAGES.map(s => ({
    stage: s.key,
    completed: false
  }))
}

const DEFAULT_QUALITY_CHECK = {
  checked: false
}

const DEFAULT_CHANGE_LOGS: any[] = []

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
      drillNo: pile.drillNo || '',
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
      updateTime: now,
      operator: pile.operator,
      qualityCheck: DEFAULT_QUALITY_CHECK,
      changeLogs: DEFAULT_CHANGE_LOGS
    }
    
    const validation = validateRecord(newRecord)
    set({ 
      currentRecord: newRecord,
      currentValidation: validation
    })
    console.log('[Store] 初始化新记录:', pile.pileNo)
  },

  updateRecordField: (field, value, reason) => {
    const { currentRecord } = get()
    if (!currentRecord) return

    const oldValue = currentRecord[field]
    const now = dayjs().format('YYYY-MM-DD HH:mm:ss')

    const updated: Partial<PileRecord> = {
      ...currentRecord,
      [field]: value,
      updateTime: now
    }

    if (field === 'designDiameter' || field === 'designLength') {
      const diameter = Number(field === 'designDiameter' ? value : currentRecord.designDiameter)
      const length = Number(field === 'designLength' ? value : currentRecord.designLength)
      updated.designConcreteVolume = calculateDesignConcreteVolume(diameter, length)
    }

    if (oldValue !== value && currentRecord.id) {
      const fieldLabel = RECORD_FIELDS.find(f => f.key === field)?.label || String(field)
      const newChangeLog = {
        field: fieldLabel,
        oldValue: oldValue ?? '(空)',
        newValue: value ?? '(空)',
        operator: currentRecord.operator || '施工员',
        changeTime: now,
        reason
      }
      updated.changeLogs = [...(currentRecord.changeLogs || []), newChangeLog]
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
      const allStagesComplete = Object.values(updatedValidation.stageStatus || {}).every(s => s === 'normal')
      const recordStatus: PileRecord['status'] = allStagesComplete ? 'pending_check' : 'draft'

      const recordToSave: PileRecord = {
        ...updatedRecord,
        validation: updatedValidation,
        status: recordStatus,
        qualityCheck: (updatedRecord as any).qualityCheck || DEFAULT_QUALITY_CHECK,
        changeLogs: (updatedRecord as any).changeLogs || DEFAULT_CHANGE_LOGS,
        createTime: updatedRecord.createTime || dayjs().format('YYYY-MM-DD HH:mm:ss'),
        updateTime: dayjs().format('YYYY-MM-DD HH:mm:ss')
      } as PileRecord

      savePileRecord(recordToSave)
      
      let pileStatus: PileInfo['status'] = 'in_progress'
      if (allStagesComplete) {
        pileStatus = updatedValidation.overallStatus === 'error' ? 'exception' : 'completed'
      } else if (updatedValidation.overallStatus === 'error') {
        pileStatus = 'exception'
      }

      if (selectedPile) {
        updatePileStatus(selectedPile.id, pileStatus)
        console.log('[Store] 阶段保存后更新桩位状态:', selectedPile.pileNo, '→', pileStatus)
      }

      const records = getPileRecords()
      const piles = getPileList()
      set({ records, piles })

      console.log('[Store] 阶段保存成功:', stage, '桩号:', recordToSave.pileNo, '状态:', pileStatus)
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
      const allStagesComplete = currentValidation.stageStatus && 
        Object.values(currentValidation.stageStatus).every(s => s === 'normal')

      let status: PileRecord['status'] = 'draft'
      if (allStagesComplete && currentValidation.missingFields.length === 0) {
        status = 'pending_check'
      } else if (currentValidation.missingFields.length === 0) {
        status = 'submitted' as any
      }

      const updatedStages = allStagesComplete
        ? currentRecord.stages?.map(s => ({ ...s, completed: true })) || initStages()
        : currentRecord.stages || initStages()

      const recordToSave: PileRecord = {
        ...currentRecord,
        stages: updatedStages,
        validation: currentValidation,
        status,
        qualityCheck: (currentRecord as any).qualityCheck || DEFAULT_QUALITY_CHECK,
        changeLogs: (currentRecord as any).changeLogs || DEFAULT_CHANGE_LOGS,
        createTime: currentRecord.createTime || dayjs().format('YYYY-MM-DD HH:mm:ss'),
        updateTime: dayjs().format('YYYY-MM-DD HH:mm:ss')
      } as PileRecord

      savePileRecord(recordToSave)
      
      let pileStatus: PileInfo['status'] = 'in_progress'
      if (allStagesComplete) {
        pileStatus = currentValidation.overallStatus === 'error' ? 'exception' : 'completed'
      } else if (currentValidation.overallStatus === 'error') {
        pileStatus = 'exception'
      }

      if (selectedPile) {
        updatePileStatus(selectedPile.id, pileStatus)
        console.log('[Store] 完整保存后更新桩位状态:', selectedPile.pileNo, '→', pileStatus)
      }

      const records = getPileRecords()
      const piles = getPileList()
      set({ records, piles })

      console.log('[Store] 保存记录成功:', recordToSave.pileNo, '状态:', status)
      return true
    } catch (error) {
      console.error('[Store] 保存记录失败:', error)
      return false
    }
  },

  submitForQualityCheck: () => {
    const { currentRecord, currentValidation } = get()
    if (!currentRecord || !currentValidation) return false

    const allStagesComplete = Object.values(currentValidation.stageStatus || {}).every(s => s === 'normal')
    if (!allStagesComplete) {
      console.log('[Store] 存在未完成阶段，无法提交质检')
      return false
    }
    if (currentValidation.missingFields.length > 0) {
      console.log('[Store] 存在必填项未填，无法提交质检')
      return false
    }

    try {
      const updatedRecord: PileRecord = {
        ...currentRecord,
        status: 'pending_check',
        updateTime: dayjs().format('YYYY-MM-DD HH:mm:ss')
      } as PileRecord

      savePileRecord(updatedRecord)

      const records = getPileRecords()
      set({ records, currentRecord: updatedRecord })

      console.log('[Store] 提交质检成功:', updatedRecord.pileNo)
      return true
    } catch (error) {
      console.error('[Store] 提交质检失败:', error)
      return false
    }
  },

  qualityCheck: (recordId, pass, comments, inspector = '质检员') => {
    const records = getPileRecords()
    const recordIndex = records.findIndex(r => r.id === recordId)
    if (recordIndex < 0) return false

    const record = records[recordIndex]
    if (record.status !== 'pending_check') {
      console.log('[Store] 该记录未处于待复核状态')
      return false
    }

    try {
      const updatedRecord: PileRecord = {
        ...record,
        status: pass ? 'checked' : 'draft',
        qualityCheck: {
          checked: true,
          checkedBy: inspector,
          checkedTime: dayjs().format('YYYY-MM-DD HH:mm:ss'),
          result: pass ? 'pass' : 'reject',
          comments
        },
        updateTime: dayjs().format('YYYY-MM-DD HH:mm:ss')
      }

      savePileRecord(updatedRecord)
      
      if (pass && record.pileId) {
        updatePileStatus(record.pileId, 'completed')
      } else if (!pass && record.pileId) {
        updatePileStatus(record.pileId, 'in_progress')
      }

      const allRecords = getPileRecords()
      const piles = getPileList()
      set({ records: allRecords, piles })

      console.log('[Store] 质检完成:', record.pileNo, pass ? '通过' : '驳回')
      return true
    } catch (error) {
      console.error('[Store] 质检操作失败:', error)
      return false
    }
  },

  getPendingQualityChecks: () => {
    return getPileRecords().filter(r => r.status === 'pending_check')
  },

  getTodayRecords: () => {
    const today = dayjs().format('YYYY-MM-DD')
    return getPileRecordsByDate(today)
  },

  getTeamBoardData: () => {
    const { piles, records } = get()
    const todayRecords = records.filter(r => r.createTime.startsWith(dayjs().format('YYYY-MM-DD')))

    const byDrill: Record<string, PileInfo[]> = {}
    const byOperator: Record<string, PileInfo[]> = {}
    const byStage: TeamBoardData['byStage'] = {
      pending: [],
      drill_start: [],
      drill_end: [],
      cage: [],
      concrete: [],
      completed: []
    }

    piles.forEach(pile => {
      if (pile.drillNo) {
        if (!byDrill[pile.drillNo]) byDrill[pile.drillNo] = []
        byDrill[pile.drillNo].push(pile)
      }
      if (pile.operator) {
        if (!byOperator[pile.operator]) byOperator[pile.operator] = []
        byOperator[pile.operator].push(pile)
      }

      const record = todayRecords.find(r => r.pileId === pile.id)
      if (pile.status === 'completed') {
        byStage.completed.push(pile)
      } else if (pile.status === 'pending' || !record) {
        byStage.pending.push(pile)
      } else {
        const stage = record.currentStage as keyof typeof byStage
        if (byStage[stage]) {
          byStage[stage].push(pile)
        } else {
          byStage.pending.push(pile)
        }
      }
    })

    return { byDrill, byOperator, byStage }
  },

  generateDailyLog: (date?: string) => {
    const targetDate = date || dayjs().format('YYYY-MM-DD')
    const todayRecords = getPileRecordsByDate(targetDate)
      .filter(r => r.status === 'checked' || r.status === 'signed' || r.status === 'pending_check')
    
    if (todayRecords.length === 0) {
      console.log('[Store] 今日无合格记录，无法生成日志')
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

      if (record.status === 'pending_check') {
        pendingReasons.push(`${record.pileNo}: 待质检复核`)
      }
    })

    const recordDetails = todayRecords.map(r => convertToLogRecordDetail(r))
    const signedRecords = todayRecords.filter(r => r.status === 'checked' || r.status === 'signed')

    const log: DailyLog = {
      id: generateId(),
      date: targetDate,
      records: todayRecords.map(r => r.id),
      recordDetails,
      totalPiles: signedRecords.length,
      completedPiles: signedRecords.filter(r => r.validation.overallStatus === 'normal').length,
      exceptionPiles: signedRecords.filter(r => r.validation.overallStatus === 'error').length,
      pendingReasons,
      weather: '晴',
      constructionSituation: `今日完成${signedRecords.length}根桩质检通过，其中${signedRecords.filter(r => r.validation.overallStatus === 'normal').length}根合格，${signedRecords.filter(r => r.validation.overallStatus === 'error').length}根存在异常。${todayRecords.filter(r => r.status === 'pending_check').length}根待质检复核。`,
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

  exportDailyReport: (date?: string) => {
    const targetDate = date || dayjs().format('YYYY-MM-DD')
    const logs = getDailyLogs()
    const existingLog = logs.find(l => l.date === targetDate)
    
    if (existingLog) {
      console.log('[Store] 导出日报(已有日志):', targetDate)
      return existingLog
    }

    return get().generateDailyLog(targetDate)
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
