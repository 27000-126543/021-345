import React, { useState, useEffect } from 'react'
import { View, Text, Button, Picker, Input, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import classnames from 'classnames'
import dayjs from 'dayjs'
import { usePileStore } from '@/store/usePileStore'
import { PileRecord, DailyLog } from '@/types/pile'
import StatusTag from '@/components/StatusTag'
import styles from './index.module.scss'

const DailyLogPage: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState(dayjs().format('YYYY-MM-DD'))
  const [showSignModal, setShowSignModal] = useState(false)
  const [signName, setSignName] = useState('')
  const [pendingLogId, setPendingLogId] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)

  const todayRecords = usePileStore(state => state.getTodayRecords())
  const dailyLogs = usePileStore(state => state.dailyLogs)
  const loadDailyLogs = usePileStore(state => state.loadDailyLogs)
  const generateDailyLog = usePileStore(state => state.generateDailyLog)
  const signDailyLog = usePileStore(state => state.signDailyLog)
  const loadRecords = usePileStore(state => state.loadRecords)

  useEffect(() => {
    loadRecords()
    loadDailyLogs()
  }, [])

  const filteredRecords = todayRecords.filter(r => r.createTime.startsWith(selectedDate))
  
  const totalPiles = filteredRecords.length
  const completedPiles = filteredRecords.filter(r => r.validation.overallStatus === 'normal').length
  const exceptionPiles = filteredRecords.filter(r => r.validation.overallStatus !== 'normal').length
  const progress = totalPiles > 0 ? Math.round((completedPiles / totalPiles) * 100) : 0

  const filteredLogs = dailyLogs.filter(log => 
    log.date === selectedDate || log.date.startsWith(selectedDate.slice(0, 7))
  ).sort((a, b) => b.createTime.localeCompare(a.createTime))

  const todayLog = filteredLogs.find(log => log.date === selectedDate)

  const handleGenerateLog = async () => {
    if (isGenerating) return
    if (filteredRecords.length === 0) {
      Taro.showToast({ title: '今日暂无施工记录', icon: 'none' })
        .catch(err => console.error('[DailyLogPage] Toast失败:', err))
      return
    }

    setIsGenerating(true)
    try {
      const log = generateDailyLog(selectedDate)
      if (log) {
        Taro.showToast({ title: '日志生成成功', icon: 'success' })
          .catch(err => console.error('[DailyLogPage] Toast失败:', err))
      }
    } catch (error) {
      console.error('[DailyLogPage] 生成日志异常:', error)
      Taro.showToast({ title: '生成失败', icon: 'error' })
        .catch(err => console.error('[DailyLogPage] Toast失败:', err))
    } finally {
      setTimeout(() => setIsGenerating(false), 1000)
    }
  }

  const handleSignClick = (logId: string) => {
    setPendingLogId(logId)
    setSignName('')
    setShowSignModal(true)
  }

  const handleConfirmSign = () => {
    if (!signName.trim()) {
      Taro.showToast({ title: '请输入签字人姓名', icon: 'none' })
        .catch(err => console.error('[DailyLogPage] Toast失败:', err))
      return
    }

    if (pendingLogId) {
      const success = signDailyLog(pendingLogId, signName.trim())
      if (success) {
        Taro.showToast({ title: '签字成功', icon: 'success' })
          .catch(err => console.error('[DailyLogPage] Toast失败:', err))
      } else {
        Taro.showToast({ title: '签字失败', icon: 'error' })
          .catch(err => console.error('[DailyLogPage] Toast失败:', err))
      }
    }
    setShowSignModal(false)
    setPendingLogId(null)
    setSignName('')
  }

  const dateRange = {
    start: dayjs().subtract(30, 'day').format('YYYY-MM-DD'),
    end: dayjs().format('YYYY-MM-DD')
  }

  const formatDate = (date: string) => {
    return dayjs(date).format('YYYY年MM月DD日')
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'normal': return 'normal'
      case 'pending': return 'warning'
      case 'error': return 'error'
      default: return 'normal'
    }
  }

  return (
    <View className={styles.pageContainer}>
      <View className={styles.header}>
        <View className={styles.headerTop}>
          <Text className={styles.title}>施工日志</Text>
          <Picker
            mode='date'
            value={selectedDate}
            start={dateRange.start}
            end={dateRange.end}
            onChange={(e) => setSelectedDate(e.detail.value)}
          >
            <View className={styles.datePicker}>
              <Text className={styles.dateText}>{formatDate(selectedDate)}</Text>
            </View>
          </Picker>
        </View>

        <View className={styles.statsCard}>
          <View className={styles.statsRow}>
            <View className={styles.statItem}>
              <Text className={styles.statValue}>{totalPiles}</Text>
              <Text className={styles.statLabel}>总桩数</Text>
            </View>
            <View className={styles.statItem}>
              <Text className={styles.statValue}>{completedPiles}</Text>
              <Text className={styles.statLabel}>合格</Text>
            </View>
            <View className={styles.statItem}>
              <Text className={styles.statValue}>{exceptionPiles}</Text>
              <Text className={styles.statLabel}>异常</Text>
            </View>
          </View>
          <View className={styles.progressBar}>
            <View className={styles.progressFill} style={{ width: `${progress}%` }} />
          </View>
          <Text className={styles.progressText}>合格率 {progress}%</Text>
        </View>
      </View>

      <ScrollView className={styles.content} scrollY>
        <View className={styles.sectionTitle}>
          <Text className={styles.sectionTitleText}>今日记录</Text>
          <Text className={styles.sectionCount}>共 {filteredRecords.length} 条</Text>
        </View>

        {filteredRecords.length === 0 ? (
          <View className={styles.emptyState}>
            <Text className={styles.emptyIcon}>📝</Text>
            <Text className={styles.emptyText}>今日暂无施工记录</Text>
            <Text className={styles.emptySubText}>请先在成孔记录中录入数据</Text>
          </View>
        ) : (
          <View className={styles.todayRecords}>
            {filteredRecords.map((record: PileRecord) => (
              <View key={record.id} className={styles.recordCard}>
                <View className={styles.recordHeader}>
                  <Text className={styles.recordPileNo}>{record.pileNo}</Text>
                  <StatusTag status={getStatusColor(record.validation.overallStatus)} />
                </View>
                <View className={styles.recordInfo}>
                  <View className={styles.recordInfoItem}>
                    <Text className={styles.recordInfoLabel}>实际孔深</Text>
                    <Text className={styles.recordInfoValue}>{record.actualDepth}m</Text>
                  </View>
                  <View className={styles.recordInfoItem}>
                    <Text className={styles.recordInfoLabel}>设计桩长</Text>
                    <Text className={styles.recordInfoValue}>{record.designLength}m</Text>
                  </View>
                  <View className={styles.recordInfoItem}>
                    <Text className={styles.recordInfoLabel}>灌注量</Text>
                    <Text className={styles.recordInfoValue}>{record.concreteVolume}m³</Text>
                  </View>
                  <View className={styles.recordInfoItem}>
                    <Text className={styles.recordInfoLabel}>钻机编号</Text>
                    <Text className={styles.recordInfoValue}>{record.drillNo || '-'}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        <View className={styles.historySection}>
          <View className={styles.sectionTitle}>
            <Text className={styles.sectionTitleText}>历史日志</Text>
            <Text className={styles.sectionCount}>共 {filteredLogs.length} 条</Text>
          </View>

          {filteredLogs.length === 0 ? (
            <View className={styles.emptyState}>
              <Text className={styles.emptyIcon}>📋</Text>
              <Text className={styles.emptyText}>暂无历史日志</Text>
            </View>
          ) : (
            <View className={styles.historyList}>
              {filteredLogs.map((log: DailyLog) => (
                <View key={log.id} className={styles.historyCard}>
                  <View className={styles.historyInfo}>
                    <Text className={styles.historyDate}>{formatDate(log.date)}</Text>
                    <View className={styles.historyStats}>
                      <Text className={styles.historyStatItem}>总桩数：{log.totalPiles}</Text>
                      <Text className={styles.historyStatItem}>合格：{log.completedPiles}</Text>
                      <Text className={styles.historyStatItem}>异常：{log.exceptionPiles}</Text>
                    </View>
                    {log.signedBy && (
                      <Text className={styles.historyStatItem} style={{ marginTop: 8, color: '#43A047' }}>
                        已签字：{log.signedBy} · {log.signTime}
                      </Text>
                    )}
                  </View>
                  <View className={styles.historyStatus}>
                    {log.status === 'signed' ? (
                      <StatusTag status='normal' text='已签字' />
                    ) : (
                      <Button
                        className={classnames(styles.modalBtn, styles.confirm)}
                        style={{ height: 64, fontSize: 24, padding: '0 24rpx' }}
                        onClick={() => handleSignClick(log.id)}
                      >
                        签字
                      </Button>
                    )}
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      <View className={styles.bottomBar}>
        <Button
          className={classnames(styles.generateBtn, { [styles.disabled]: isGenerating || filteredRecords.length === 0 })}
          onClick={handleGenerateLog}
          disabled={isGenerating || filteredRecords.length === 0}
        >
          {isGenerating ? '生成中...' : todayLog ? '重新生成日志' : '一键生成日志'}
        </Button>
      </View>

      {showSignModal && (
        <View className={styles.signModal} onClick={() => setShowSignModal(false)}>
          <View className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <Text className={styles.modalTitle}>技术负责人签字</Text>
            <Input
              className={styles.modalInput}
              placeholder='请输入姓名'
              value={signName}
              onInput={(e) => setSignName(e.detail.value)}
              maxlength={20}
            />
            <View className={styles.modalButtons}>
              <Button
                className={classnames(styles.modalBtn, styles.cancel)}
                onClick={() => setShowSignModal(false)}
              >
                取消
              </Button>
              <Button
                className={classnames(styles.modalBtn, styles.confirm)}
                onClick={handleConfirmSign}
              >
                确认签字
              </Button>
            </View>
          </View>
        </View>
      )}
    </View>
  )
}

export default DailyLogPage
