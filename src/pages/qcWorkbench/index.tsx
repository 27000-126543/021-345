import React, { useState, useEffect } from 'react'
import { View, Text, ScrollView, Picker } from '@tarojs/components'
import Taro from '@tarojs/taro'
import classnames from 'classnames'
import { usePileStore } from '@/store/usePileStore'
import { PileRecord, DRILL_LIST, OPERATOR_LIST, FIELD_LABELS, CONSTRUCTION_STAGES } from '@/types/pile'
import styles from './index.module.scss'

const QCWorkbenchPage: React.FC = () => {
  const getPendingQualityChecks = usePileStore(state => state.getPendingQualityChecks)
  const qualityCheck = usePileStore(state => state.qualityCheck)
  const loadRecords = usePileStore(state => state.loadRecords)
  const loadPiles = usePileStore(state => state.loadPiles)
  const selectPile = usePileStore(state => state.selectPile)
  const piles = usePileStore(state => state.piles)

  const [filterDrill, setFilterDrill] = useState<string>('all')
  const [filterOperator, setFilterOperator] = useState<string>('all')
  const [filterException, setFilterException] = useState<string>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  useEffect(() => {
    loadRecords()
    loadPiles()
  }, [])

  const pendingList = getPendingQualityChecks({
    drillNo: filterDrill === 'all' ? undefined : filterDrill,
    operator: filterOperator === 'all' ? undefined : filterOperator,
    exceptionType: filterException === 'all' ? undefined : filterException
  })

  const handleRefresh = () => {
    setIsRefreshing(true)
    loadRecords()
    loadPiles()
    setTimeout(() => setIsRefreshing(false), 800)
  }

  const handleCheck = async (record: PileRecord, pass: boolean) => {
    const opts: any = {
      title: pass ? `确认通过 ${record.pileNo}？` : `驳回 ${record.pileNo} 复核`,
      content: pass ? '确认该桩位所有数据质检通过？' : '请在下方填写驳回原因',
      editable: !pass,
      placeholderText: pass ? '' : '请填写驳回原因和修改要求...',
      confirmText: pass ? '通过' : '驳回',
      cancelText: '取消',
      confirmColor: pass ? undefined : '#E53935'
    }
    const res = await Taro.showModal(opts).catch(err => {
      console.error('[QCWorkbench] Modal失败:', err)
      return { confirm: false, content: '' } as any
    })
    if (!res.confirm) return
    const contentVal = String((res as any).content || '')
    if (!pass && !contentVal) {
      Taro.showToast({ title: '请填写驳回原因', icon: 'none' })
        .catch(err => console.error('[QCWorkbench] Toast失败:', err))
      return
    }
    const ok = qualityCheck(record.id!, pass, contentVal || undefined, '质检员')
    if (ok) {
      Taro.showToast({ title: pass ? '质检通过' : '已驳回', icon: 'success' })
        .catch(err => console.error('[QCWorkbench] Toast失败:', err))
      setExpandedId(null)
    }
  }

  const handleJumpToRecord = (record: PileRecord) => {
    const pile = piles.find(p => p.id === record.pileId)
    if (pile) {
      selectPile(pile)
      Taro.switchTab({ url: '/pages/recordForm/index' })
        .catch(err => console.error('[QCWorkbench] 跳转失败:', err))
    } else {
      Taro.showToast({ title: '找不到对应桩位', icon: 'none' })
        .catch(err => console.error('[QCWorkbench] Toast失败:', err))
    }
  }

  const getStageLabel = (stage: string) => {
    const s = CONSTRUCTION_STAGES.find(x => x.key === stage)
    return s?.label || stage
  }

  const totalPending = getPendingQualityChecks().length
  const hasException = pendingList.filter(r => r.validation.exceptions.some(e => e.type === 'error')).length
  const hasWarning = pendingList.filter(r => r.validation.exceptions.some(e => e.type === 'warning')).length

  const drillOptions = [{ label: '全部钻机', value: 'all' }, ...DRILL_LIST.map(d => ({ label: d, value: d }))]
  const operatorOptions = [{ label: '全部人员', value: 'all' }, ...OPERATOR_LIST.map(o => ({ label: o, value: o }))]
  const exceptionOptions = [
    { label: '全部', value: 'all' },
    { label: '有异常', value: 'error' },
    { label: '仅警告', value: 'warning' }
  ]

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id)
  }

  return (
    <View className={styles.pageContainer}>
      <View className={styles.header}>
        <Text className={styles.title}>质检工作台</Text>
        <Text className={styles.subtitle}>待复核桩位集中处理</Text>

        <View className={styles.statsGrid}>
          <View className={styles.statItem}>
            <Text className={classnames(styles.statValue, styles.total)}>{totalPending}</Text>
            <Text className={styles.statLabel}>待复核</Text>
          </View>
          <View className={styles.statItem}>
            <Text className={classnames(styles.statValue, styles.error)}>{hasException}</Text>
            <Text className={styles.statLabel}>异常</Text>
          </View>
          <View className={styles.statItem}>
            <Text className={classnames(styles.statValue, styles.warning)}>{hasWarning}</Text>
            <Text className={styles.statLabel}>警告</Text>
          </View>
          <View className={styles.statItem}>
            <Text className={classnames(styles.statValue, styles.normal)}>
              {Math.max(totalPending - hasException - hasWarning, 0)}
            </Text>
            <Text className={styles.statLabel}>正常</Text>
          </View>
        </View>

        <View className={styles.refreshBtn} onClick={handleRefresh}>
          <Text className={styles.refreshIcon}>🔄</Text>
          <Text>{isRefreshing ? '刷新中...' : '刷新'}</Text>
        </View>
      </View>

      <View className={styles.filterBar}>
        <View className={styles.filterItem}>
          <Text className={styles.filterLabel}>钻机</Text>
          <Picker
            mode='selector'
            range={drillOptions.map(d => d.label)}
            value={drillOptions.findIndex(d => d.value === filterDrill)}
            onChange={(e) => setFilterDrill(drillOptions[e.detail.value].value)}
          >
            <View className={styles.picker}>
              <Text className={styles.pickerText}>
                {drillOptions.find(d => d.value === filterDrill)?.label || '全部'}
              </Text>
            </View>
          </Picker>
        </View>
        <View className={styles.filterItem}>
          <Text className={styles.filterLabel}>人员</Text>
          <Picker
            mode='selector'
            range={operatorOptions.map(o => o.label)}
            value={operatorOptions.findIndex(o => o.value === filterOperator)}
            onChange={(e) => setFilterOperator(operatorOptions[e.detail.value].value)}
          >
            <View className={styles.picker}>
              <Text className={styles.pickerText}>
                {operatorOptions.find(o => o.value === filterOperator)?.label || '全部'}
              </Text>
            </View>
          </Picker>
        </View>
        <View className={styles.filterItem}>
          <Text className={styles.filterLabel}>异常</Text>
          <Picker
            mode='selector'
            range={exceptionOptions.map(e => e.label)}
            value={exceptionOptions.findIndex(e => e.value === filterException)}
            onChange={(e) => setFilterException(exceptionOptions[e.detail.value].value)}
          >
            <View className={styles.picker}>
              <Text className={styles.pickerText}>
                {exceptionOptions.find(e => e.value === filterException)?.label || '全部'}
              </Text>
            </View>
          </Picker>
        </View>
      </View>

      <ScrollView className={styles.listContainer} scrollY>
        {pendingList.length === 0 ? (
          <View className={styles.emptyState}>
            <Text className={styles.emptyIcon}>✅</Text>
            <Text className={styles.emptyText}>暂无待复核桩位</Text>
            <Text className={styles.emptySubText}>所有记录都已处理完啦</Text>
          </View>
        ) : (
          pendingList.map(record => {
            const isExpanded = expandedId === record.id
            const errorList = record.validation.exceptions.filter(e => e.type === 'error')
            const warningList = record.validation.exceptions.filter(e => e.type === 'warning')
            const missList = record.validation.missingFields

            return (
              <View key={record.id} className={styles.recordCard}>
                <View className={styles.cardHeader} onClick={() => toggleExpand(record.id!)}>
                  <View className={styles.pileInfo}>
                    <Text className={styles.pileNo}>{record.pileNo}</Text>
                    <View className={styles.pileTags}>
                      <Text className={styles.pileTag}>⛏️ {record.drillNo || '未分配'}</Text>
                      <Text className={styles.pileTag}>👷 {record.operator || '未分配'}</Text>
                    </View>
                  </View>
                  <View className={styles.cardRight}>
                    <View className={classnames(styles.stageBadge, styles[record.currentStage || ''])}>
                      {getStageLabel(record.currentStage || '')}
                    </View>
                    <Text className={classnames(styles.expandIcon, { [styles.expanded]: isExpanded })}>▼</Text>
                  </View>
                </View>

                {isExpanded && (
                  <View className={styles.cardBody}>
                    <View className={styles.section}>
                      <Text className={styles.sectionTitle}>📊 关键数据</Text>
                      <View className={styles.dataGrid}>
                        <View className={styles.dataItem}>
                          <Text className={styles.dataLabel}>设计桩长</Text>
                          <Text className={styles.dataValue}>{record.designLength}m</Text>
                        </View>
                        <View className={styles.dataItem}>
                          <Text className={styles.dataLabel}>实际孔深</Text>
                          <Text className={classnames(styles.dataValue, {
                            [styles.dataError]: record.actualDepth < record.designLength
                          })}>
                            {record.actualDepth || '-'}m
                          </Text>
                        </View>
                        <View className={styles.dataItem}>
                          <Text className={styles.dataLabel}>泥浆比重</Text>
                          <Text className={styles.dataValue}>{record.mudWeight || '-'}</Text>
                        </View>
                        <View className={styles.dataItem}>
                          <Text className={styles.dataLabel}>沉渣厚度</Text>
                          <Text className={classnames(styles.dataValue, {
                            [styles.dataError]: record.sedimentThickness > 10
                          })}>
                            {record.sedimentThickness || '-'}cm
                          </Text>
                        </View>
                        <View className={styles.dataItem}>
                          <Text className={styles.dataLabel}>理论方量</Text>
                          <Text className={styles.dataValue}>{record.designConcreteVolume?.toFixed(2) || '-'}m³</Text>
                        </View>
                        <View className={styles.dataItem}>
                          <Text className={styles.dataLabel}>灌注量</Text>
                          <Text className={styles.dataValue}>{record.concreteVolume || '-'}m³</Text>
                        </View>
                      </View>
                    </View>

                    {(errorList.length > 0 || warningList.length > 0) && (
                      <View className={styles.section}>
                        <Text className={styles.sectionTitle}>⚠️ 异常说明</Text>
                        {errorList.length > 0 && (
                          <View className={styles.exceptionList}>
                            {errorList.map((ex, i) => (
                              <Text key={`e${i}`} className={classnames(styles.exception, styles.error)}>
                                ❌ {FIELD_LABELS[ex.field] || ex.field}：{ex.message}
                              </Text>
                            ))}
                          </View>
                        )}
                        {warningList.length > 0 && (
                          <View className={styles.exceptionList}>
                            {warningList.map((ex, i) => (
                              <Text key={`w${i}`} className={classnames(styles.exception, styles.warning)}>
                                ⚠️ {FIELD_LABELS[ex.field] || ex.field}：{ex.message}
                              </Text>
                            ))}
                          </View>
                        )}
                        {record.exceptionReason && (
                          <View className={styles.reasonBox}>
                            <Text className={styles.reasonTitle}>施工员说明：</Text>
                            <Text className={styles.reasonText}>{record.exceptionReason}</Text>
                          </View>
                        )}
                      </View>
                    )}

                    {missList.length > 0 && (
                      <View className={styles.section}>
                        <Text className={styles.sectionTitle}>📋 待补项（{missList.length}）</Text>
                        {missList.map((k, i) => (
                          <Text key={`m${i}`} className={styles.missItem}>
                            · {FIELD_LABELS[k] || k}
                          </Text>
                        ))}
                      </View>
                    )}

                    {record.changeLogs && record.changeLogs.length > 0 && (
                      <View className={styles.section}>
                        <Text className={styles.sectionTitle}>📝 补录痕迹</Text>
                        {record.changeLogs.slice(-5).reverse().map((log, i) => (
                          <View key={`l${i}`} className={styles.logItem}>
                            <View className={styles.logMeta}>
                              <Text className={styles.logOperator}>{log.operator}</Text>
                              <Text className={styles.logTime}>{log.changeTime}</Text>
                            </View>
                            <Text className={styles.logContent}>
                              {log.field}：{String(log.oldValue)} → {String(log.newValue)}
                            </Text>
                            {log.reason && (
                              <Text className={styles.logReason}>原因：{log.reason}</Text>
                            )}
                          </View>
                        ))}
                      </View>
                    )}

                    <View className={styles.cardActions}>
                      <View className={styles.actionBtn} onClick={() => handleJumpToRecord(record)}>
                        <Text>📄 查看完整记录</Text>
                      </View>
                      <View className={classnames(styles.actionBtn, styles.reject)} onClick={() => handleCheck(record, false)}>
                        <Text>驳回修改</Text>
                      </View>
                      <View className={classnames(styles.actionBtn, styles.pass)} onClick={() => handleCheck(record, true)}>
                        <Text>质检通过</Text>
                      </View>
                    </View>
                  </View>
                )}
              </View>
            )
          })
        )}
        <View className={styles.bottomSpacer} />
      </ScrollView>
    </View>
  )
}

export default QCWorkbenchPage
