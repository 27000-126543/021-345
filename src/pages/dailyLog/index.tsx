import React, { useState, useEffect } from 'react'
import { View, Text, Button, Picker, Input, ScrollView } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
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
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [dailyReport, setDailyReport] = useState<any>(null)

  const todayRecords = usePileStore(state => state.getTodayRecords())
  const dailyLogs = usePileStore(state => state.dailyLogs)
  const loadDailyLogs = usePileStore(state => state.loadDailyLogs)
  const generateDailyLog = usePileStore(state => state.generateDailyLog)
  const signDailyLog = usePileStore(state => state.signDailyLog)
  const loadRecords = usePileStore(state => state.loadRecords)
  const exportDailyReport = usePileStore(state => state.exportDailyReport)
  const loadPiles = usePileStore(state => state.loadPiles)

  useEffect(() => {
    loadRecords()
    loadDailyLogs()
  }, [])

  useDidShow(() => {
    loadPiles()
    loadRecords()
    loadDailyLogs()
    console.log('[DailyLog] useDidShow刷新状态')
  })

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

    if (todayLog?.isLocked) {
      Taro.showModal({
        title: '日志已锁定',
        content: '该日志已由技术负责人签字，无法重新生成',
        showCancel: false,
        confirmText: '我知道了'
      }).catch(err => console.error('[DailyLogPage] Modal失败:', err))
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
    const log = dailyLogs.find(l => l.id === logId)
    if (!log) return

    if (log.isLocked) {
      Taro.showToast({ title: '该日志已签字锁定', icon: 'none' })
        .catch(err => console.error('[DailyLogPage] Toast失败:', err))
      return
    }

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
      const log = dailyLogs.find(l => l.id === pendingLogId)
      if (log?.isLocked) {
        Taro.showToast({ title: '该日志已签字锁定', icon: 'none' })
          .catch(err => console.error('[DailyLogPage] Toast失败:', err))
        setShowSignModal(false)
        setPendingLogId(null)
        setSignName('')
        return
      }

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

  const toggleLogExpand = (logId: string) => {
    setExpandedLogId(expandedLogId === logId ? null : logId)
  }

  const handlePreviewReport = () => {
    const report = exportDailyReport(selectedDate)
    if (!report) {
      Taro.showToast({ title: '该日期暂无数据', icon: 'none' })
        .catch(err => console.error('[DailyLogPage] Toast失败:', err))
      return
    }
    setDailyReport(report)
    setShowPreview(true)
  }

  const handleShareReport = () => {
    Taro.showToast({ title: '已生成日报截图（演示）', icon: 'success' })
      .catch(err => console.error('[DailyLogPage] Toast失败:', err))
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

  const getStageLabel = (stage: string) => {
    const labels: Record<string, string> = {
      'drill_start': '开钻',
      'drill_end': '终孔',
      'cage': '下笼',
      'concrete': '灌注'
    }
    return labels[stage] || stage
  }

  const renderRecordDetail = (record: any) => {
    return (
      <View key={record.pileNo} className={styles.recordDetailItem}>
        <View className={styles.recordDetailHeader}>
          <Text className={styles.recordDetailPileNo}>{record.pileNo}</Text>
          <StatusTag status={getStatusColor(record.status)} />
        </View>
        <View className={styles.recordDetailGrid}>
          <View className={styles.recordDetailGridItem}>
            <Text className={styles.gridLabel}>设计桩长</Text>
            <Text className={styles.gridValue}>{record.designLength}m</Text>
          </View>
          <View className={styles.recordDetailGridItem}>
            <Text className={styles.gridLabel}>实际孔深</Text>
            <Text className={classnames(styles.gridValue, {
              [styles.gridValueWarning]: record.actualDepth < record.designLength
            })}>{record.actualDepth}m</Text>
          </View>
          <View className={styles.recordDetailGridItem}>
            <Text className={styles.gridLabel}>泥浆比重</Text>
            <Text className={classnames(styles.gridValue, {
              [styles.gridValueWarning]: record.mudWeight && (record.mudWeight < 1.1 || record.mudWeight > 1.3)
            })}>{record.mudWeight || '-'}</Text>
          </View>
          <View className={styles.recordDetailGridItem}>
            <Text className={styles.gridLabel}>沉渣厚度</Text>
            <Text className={classnames(styles.gridValue, {
              [styles.gridValueWarning]: record.sedimentThickness && record.sedimentThickness > 10
            })}>{record.sedimentThickness ? `${record.sedimentThickness}cm` : '-'}</Text>
          </View>
          <View className={styles.recordDetailGridItem}>
            <Text className={styles.gridLabel}>设计方量</Text>
            <Text className={styles.gridValue}>{record.theoreticalVolume.toFixed(2)}m³</Text>
          </View>
          <View className={styles.recordDetailGridItem}>
            <Text className={styles.gridLabel}>实际灌注</Text>
            <Text className={classnames(styles.gridValue, {
              [styles.gridValueWarning]: record.concreteVolume && Math.abs((record.concreteVolume - record.theoreticalVolume) / record.theoreticalVolume) > 0.15
            })}>{record.concreteVolume ? `${record.concreteVolume}m³` : '-'}</Text>
          </View>
        </View>
        <View className={styles.recordDetailStages}>
          <Text className={styles.stagesLabel}>施工阶段：</Text>
          {record.completedStages.map((stage: string, idx: number) => (
            <Text key={stage} className={styles.stageTag}>
              {getStageLabel(stage)}
              {idx < record.completedStages.length - 1 ? ' → ' : ''}
            </Text>
          ))}
          {record.pendingStages.length > 0 && (
            <Text className={styles.stagePending}>
              （待完成：{record.pendingStages.map((s: string) => getStageLabel(s)).join('、')}）
            </Text>
          )}
        </View>
        {record.exceptions.length > 0 && (
          <View className={styles.recordDetailExceptions}>
            <Text className={styles.exceptionsLabel}>异常说明：</Text>
            {record.exceptions.map((ex: any, idx: number) => (
              <View key={idx} className={styles.exceptionRow}>
                <Text className={styles.exceptionType}>{ex.field}</Text>
                <Text className={styles.exceptionDesc}>{ex.message}</Text>
                {ex.reason && <Text className={styles.exceptionReason}>[说明] {ex.reason}</Text>}
                {!ex.reason && <Text className={styles.exceptionNoReason}>⚠️ 未说明原因</Text>}
              </View>
            ))}
          </View>
        )}
      </View>
    )
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
                  <View
                    className={styles.historyHeader}
                    onClick={() => toggleLogExpand(log.id)}
                  >
                    <View className={styles.historyInfo}>
                      <View className={styles.historyDateRow}>
                        <Text className={styles.historyDate}>{formatDate(log.date)}</Text>
                        {log.isLocked && (
                          <Text className={styles.lockedTag}>🔒 已锁定</Text>
                        )}
                      </View>
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
                      {log.pendingReasons && log.pendingReasons.length > 0 && log.status !== 'signed' && (
                        <View className={styles.pendingReasonsBox}>
                          <Text className={styles.pendingTitle}>⚠️ 待补项（{log.pendingReasons.length}项）：</Text>
                          {log.pendingReasons.slice(0, 3).map((reason, idx) => (
                            <Text key={idx} className={styles.pendingReason}>
                              · {reason}
                            </Text>
                          ))}
                          {log.pendingReasons.length > 3 && (
                            <Text className={styles.pendingMore}>
                              ...还有 {log.pendingReasons.length - 3} 项待补，点击展开查看
                            </Text>
                          )}
                        </View>
                      )}
                    </View>
                    <View className={styles.historyStatus}>
                      <Text className={classnames(styles.expandIcon, {
                        [styles.expanded]: expandedLogId === log.id
                      })}>▼</Text>
                    </View>
                  </View>

                  {expandedLogId === log.id && log.recordDetails && (
                    <View className={styles.expandedContent}>
                      <View className={styles.expandedSection}>
                        <Text className={styles.expandedSectionTitle}>📊 当日桩位详情</Text>
                        <View className={styles.recordDetailList}>
                          {log.recordDetails.map(record => renderRecordDetail(record))}
                        </View>
                      </View>

                      {log.pendingReasons && log.pendingReasons.length > 0 && (
                        <View className={styles.expandedSection}>
                          <Text className={styles.expandedSectionTitle}>⚠️ 待补原因汇总</Text>
                          <View className={styles.pendingReasonsList}>
                            {log.pendingReasons.map((reason, idx) => (
                              <Text key={idx} className={styles.pendingReasonFull}>
                                {idx + 1}. {reason}
                              </Text>
                            ))}
                          </View>
                        </View>
                      )}

                      {log.weather || log.constructionSituation || log.existingProblems ? (
                        <View className={styles.expandedSection}>
                          <Text className={styles.expandedSectionTitle}>📝 日志内容</Text>
                          {log.weather && (
                            <View className={styles.logContentRow}>
                              <Text className={styles.logContentLabel}>天气：</Text>
                              <Text className={styles.logContentValue}>{log.weather}</Text>
                            </View>
                          )}
                          {log.constructionSituation && (
                            <View className={styles.logContentRow}>
                              <Text className={styles.logContentLabel}>施工情况：</Text>
                              <Text className={styles.logContentValue}>{log.constructionSituation}</Text>
                            </View>
                          )}
                          {log.existingProblems && (
                            <View className={styles.logContentRow}>
                              <Text className={styles.logContentLabel}>存在问题：</Text>
                              <Text className={styles.logContentValue}>{log.existingProblems}</Text>
                            </View>
                          )}
                        </View>
                      ) : null}
                    </View>
                  )}

                  <View className={styles.historyFooter}>
                    <View className={styles.historyStatus}>
                      {log.status === 'signed' ? (
                        <StatusTag status='normal' text='已签字' />
                      ) : (
                        <Button
                          className={classnames(styles.modalBtn, styles.confirm)}
                          style={{ height: 64, fontSize: 24, padding: '0 24rpx' }}
                          onClick={() => handleSignClick(log.id)}
                        >
                          {log.isLocked ? '已锁定' : '签字'}
                        </Button>
                      )}
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      <View className={styles.bottomBar}>
        <Button
          className={styles.previewBtn}
          onClick={handlePreviewReport}
        >
          📄 日报预览
        </Button>
        <Button
          className={classnames(styles.generateBtn, { [styles.disabled]: isGenerating || filteredRecords.length === 0 })}
          onClick={handleGenerateLog}
          disabled={isGenerating || filteredRecords.length === 0 || (todayLog?.isLocked || false)}
        >
          {todayLog?.isLocked ? '🔒 已锁定' : (isGenerating ? '生成中...' : todayLog ? '重新生成日志' : '一键生成日志')}
        </Button>
      </View>

      {showSignModal && (
        <View className={styles.signModal} onClick={() => setShowSignModal(false)}>
          <View className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <Text className={styles.modalTitle}>技术负责人签字</Text>
            
            {pendingLogId && dailyLogs.find(l => l.id === pendingLogId)?.pendingReasons && 
             dailyLogs.find(l => l.id === pendingLogId)!.pendingReasons!.length > 0 && (
              <View className={styles.modalWarning}>
                <Text className={styles.modalWarningTitle}>⚠️ 待补项提醒</Text>
                {dailyLogs.find(l => l.id === pendingLogId)!.pendingReasons!.slice(0, 5).map((reason, idx) => (
                  <Text key={idx} className={styles.modalWarningItem}>· {reason}</Text>
                ))}
                {dailyLogs.find(l => l.id === pendingLogId)!.pendingReasons!.length > 5 && (
                  <Text className={styles.modalWarningMore}>
                    ...还有 {dailyLogs.find(l => l.id === pendingLogId)!.pendingReasons!.length - 5} 项待补
                  </Text>
                )}
                <Text className={styles.modalWarningTip}>仍要继续签字吗？</Text>
              </View>
            )}
            
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

      {showPreview && dailyReport && (
        <View className={styles.previewModal} onClick={() => setShowPreview(false)}>
          <View className={styles.previewContent} onClick={(e) => e.stopPropagation()}>
            <View className={styles.previewHeader}>
              <Text className={styles.previewTitle}>桩基施工日报</Text>
              <Text className={styles.previewDate}>{dailyReport.date}</Text>
            </View>

            <ScrollView className={styles.previewScroll} scrollY>
              <View className={styles.previewStatsRow}>
                <View className={styles.previewStat}>
                  <Text className={styles.previewStatValue}>{dailyReport.totalPiles}</Text>
                  <Text className={styles.previewStatLabel}>总桩位</Text>
                </View>
                <View className={styles.previewStat}>
                  <Text className={styles.previewStatValue}>{dailyReport.checkedCount}</Text>
                  <Text className={styles.previewStatLabel}>质检通过</Text>
                </View>
                <View className={styles.previewStat}>
                  <Text className={styles.previewStatValue}>{dailyReport.pendingCheckCount}</Text>
                  <Text className={styles.previewStatLabel}>待质检</Text>
                </View>
                <View className={styles.previewStat}>
                  <Text className={styles.previewStatValue}>{dailyReport.exceptionCount}</Text>
                  <Text className={styles.previewStatLabel}>异常</Text>
                </View>
              </View>

              {dailyReport.pendingItems.length > 0 && (
                <View className={styles.previewSection}>
                  <Text className={styles.previewSectionTitle}>⚠️ 待补项（{dailyReport.pendingItems.length}）</Text>
                  {dailyReport.pendingItems.map((item: string, idx: number) => (
                    <Text key={idx} className={styles.previewPendingItem}>
                      · {item}
                    </Text>
                  ))}
                </View>
              )}

              <View className={styles.previewSection}>
                <Text className={styles.previewSectionTitle}>📋 桩位明细</Text>
                {dailyReport.pileReports.map((pile: any, idx: number) => (
                  <View key={idx} className={styles.previewPileCard}>
                    <View className={styles.previewPileHeader}>
                      <Text className={styles.previewPileNo}>{pile.pileNo}</Text>
                      <View className={classnames(styles.previewPileStatus, styles[pile.status])}>
                        {pile.statusText}
                      </View>
                    </View>
                    <View className={styles.previewPileInfo}>
                      <View className={styles.previewPileInfoItem}>
                        <Text>钻机：{pile.drillNo || '-'}</Text>
                      </View>
                      <View className={styles.previewPileInfoItem}>
                        <Text>施工员：{pile.operator || '-'}</Text>
                      </View>
                      <View className={styles.previewPileInfoItem}>
                        <Text>孔深：{pile.actualDepth || '-'}m</Text>
                      </View>
                      <View className={styles.previewPileInfoItem}>
                        <Text>灌注：{pile.concreteVolume || '-'}m³</Text>
                      </View>
                    </View>
                    <View className={styles.previewPileStages}>
                      {pile.completedStages.map((s: string, i: number) => (
                        <Text key={i} className={styles.previewStageTag}>
                          {s}
                        </Text>
                      ))}
                    </View>
                    {pile.exceptions.length > 0 && (
                      <View className={styles.previewPileExceptions}>
                        {pile.exceptions.map((ex: string, i: number) => (
                          <Text key={i} className={styles.previewException}>⚠ {ex}</Text>
                        ))}
                      </View>
                    )}
                    {pile.qualityCheck && (
                      <View className={styles.previewQC}>
                        <Text className={styles.previewQCText}>
                          {pile.qualityCheck.checked 
                            ? `✅ ${pile.qualityCheck.checkedBy} · ${pile.qualityCheck.checkedTime?.split(' ')[0] || ''}` 
                            : '⏳ 待质检复核'}
                        </Text>
                      </View>
                    )}
                  </View>
                ))}
              </View>

              {dailyReport.signed && (
                <View className={styles.previewSection}>
                  <Text className={styles.previewSectionTitle}>✍️ 签字确认</Text>
                  <View className={styles.previewSignInfo}>
                    <Text>技术负责人：{dailyReport.signedBy}</Text>
                    <Text>签字时间：{dailyReport.signTime}</Text>
                  </View>
                </View>
              )}

              <View className={styles.previewFooter}>
                <Text className={styles.previewFooterText}>
                  本日报由桩基施工记录App自动生成 · {dayjs().format('YYYY-MM-DD HH:mm')}
                </Text>
              </View>
            </ScrollView>

            <View className={styles.previewActions}>
              <Button className={styles.previewCancelBtn} onClick={() => setShowPreview(false)}>
                关闭
              </Button>
              <Button className={styles.previewShareBtn} onClick={handleShareReport}>
                📤 导出分享
              </Button>
            </View>
          </View>
        </View>
      )}
    </View>
  )
}

export default DailyLogPage
