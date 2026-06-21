import Taro from '@tarojs/taro'
import { PileRecord, DailyLog, PileInfo, AssignAdjustLog } from '@/types/pile'

const STORAGE_KEYS = {
  PILES: 'pile_records',
  LOGS: 'daily_logs',
  PILE_LIST: 'pile_info_list',
  ASSIGN_ADJUST_LOGS: 'assign_adjust_logs'
}

export const savePileRecord = (record: PileRecord): void => {
  try {
    const records = getPileRecords()
    const index = records.findIndex(r => r.id === record.id)
    if (index >= 0) {
      records[index] = record
    } else {
      records.push(record)
    }
    Taro.setStorageSync(STORAGE_KEYS.PILES, records)
    console.log('[Storage] 保存桩记录成功:', record.pileNo)
  } catch (error) {
    console.error('[Storage] 保存桩记录失败:', error)
    throw error
  }
}

export const getPileRecords = (): PileRecord[] => {
  try {
    const data = Taro.getStorageSync(STORAGE_KEYS.PILES)
    return data || []
  } catch (error) {
    console.error('[Storage] 获取桩记录失败:', error)
    return []
  }
}

export const getPileRecordsByDate = (date: string): PileRecord[] => {
  const records = getPileRecords()
  return records.filter(r => r.createTime.startsWith(date))
}

export const saveDailyLog = (log: DailyLog): void => {
  try {
    const logs = getDailyLogs()
    const index = logs.findIndex(l => l.id === log.id)
    if (index >= 0) {
      logs[index] = log
    } else {
      logs.push(log)
    }
    Taro.setStorageSync(STORAGE_KEYS.LOGS, logs)
    console.log('[Storage] 保存施工日志成功:', log.date)
  } catch (error) {
    console.error('[Storage] 保存施工日志失败:', error)
    throw error
  }
}

export const getDailyLogs = (): DailyLog[] => {
  try {
    const data = Taro.getStorageSync(STORAGE_KEYS.LOGS)
    return data || []
  } catch (error) {
    console.error('[Storage] 获取施工日志失败:', error)
    return []
  }
}

export const savePileList = (piles: PileInfo[]): void => {
  try {
    Taro.setStorageSync(STORAGE_KEYS.PILE_LIST, piles)
    console.log('[Storage] 保存桩位列表成功，共', piles.length, '条')
  } catch (error) {
    console.error('[Storage] 保存桩位列表失败:', error)
    throw error
  }
}

export const getPileList = (): PileInfo[] => {
  try {
    const data = Taro.getStorageSync(STORAGE_KEYS.PILE_LIST)
    return data || []
  } catch (error) {
    console.error('[Storage] 获取桩位列表失败:', error)
    return []
  }
}

export const updatePileStatus = (pileId: string, status: PileInfo['status']): void => {
  try {
    const piles = getPileList()
    const index = piles.findIndex(p => p.id === pileId)
    if (index >= 0) {
      piles[index].status = status
      savePileList(piles)
    }
  } catch (error) {
    console.error('[Storage] 更新桩位状态失败:', error)
    throw error
  }
}

export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}

export const savePileInfo = (pile: PileInfo): void => {
  try {
    const piles = getPileList()
    const index = piles.findIndex(p => p.id === pile.id)
    if (index >= 0) {
      piles[index] = pile
    } else {
      piles.push(pile)
    }
    Taro.setStorageSync(STORAGE_KEYS.PILE_LIST, piles)
    console.log('[Storage] 更新桩位信息成功:', pile.pileNo)
  } catch (error) {
    console.error('[Storage] 更新桩位信息失败:', error)
    throw error
  }
}

export const getAssignAdjustLogs = (): AssignAdjustLog[] => {
  try {
    const data = Taro.getStorageSync(STORAGE_KEYS.ASSIGN_ADJUST_LOGS)
    return data || []
  } catch (error) {
    console.error('[Storage] 获取调整记录失败:', error)
    return []
  }
}

export const saveAssignAdjustLog = (log: AssignAdjustLog): void => {
  try {
    const logs = getAssignAdjustLogs()
    logs.unshift(log)
    Taro.setStorageSync(STORAGE_KEYS.ASSIGN_ADJUST_LOGS, logs)
    console.log('[Storage] 保存调整记录成功:', log.pileNo, log.field, log.oldValue, '→', log.newValue)
  } catch (error) {
    console.error('[Storage] 保存调整记录失败:', error)
    throw error
  }
}
