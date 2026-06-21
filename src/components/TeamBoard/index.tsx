import React, { useState } from 'react'
import { View, Text, ScrollView, Picker } from '@tarojs/components'
import Taro from '@tarojs/taro'
import classnames from 'classnames'
import { PileInfo, DRILL_LIST, OPERATOR_LIST } from '@/types/pile'
import StatusTag from '@/components/StatusTag'
import styles from './index.module.scss'

interface TeamBoardProps {
  byDrill: Record<string, PileInfo[]>
  byOperator: Record<string, PileInfo[]>
  byStage: Record<'pending' | 'drill_start' | 'drill_end' | 'cage' | 'concrete' | 'completed', PileInfo[]>
  onPileClick: (pile: PileInfo) => void
  onAdjustAssignment?: (pileId: string, field: 'drillNo' | 'operator', newValue: string, reason?: string) => void
}

type GroupByMode = 'drill' | 'operator' | 'stage'

const stageLabels: Record<string, string> = {
  pending: '待开工',
  drill_start: '开钻阶段',
  drill_end: '终孔阶段',
  cage: '下笼阶段',
  concrete: '灌注阶段',
  completed: '已完成'
}

const stageColors: Record<string, string> = {
  pending: '#FB8C00',
  drill_start: '#1E88E5',
  drill_end: '#8E24AA',
  cage: '#00897B',
  concrete: '#F4511E',
  completed: '#43A047'
}

const TeamBoard: React.FC<TeamBoardProps> = ({ byDrill, byOperator, byStage, onPileClick, onAdjustAssignment }) => {
  const [groupBy, setGroupBy] = useState<GroupByMode>('drill')
  const [adjustPile, setAdjustPile] = useState<PileInfo | null>(null)
  const [adjustField, setAdjustField] = useState<'drillNo' | 'operator'>('drillNo')

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'normal'
      case 'in_progress': return 'warning'
      case 'exception': return 'error'
      default: return 'warning'
    }
  }

  const handleLongPressChip = (pile: PileInfo, field: 'drillNo' | 'operator') => {
    if (!onAdjustAssignment) return
    if (pile.status === 'completed') {
      Taro.showToast({ title: '已完成的桩位不可调整', icon: 'none' })
        .catch(err => console.error('[TeamBoard] Toast失败:', err))
      return
    }
    setAdjustPile(pile)
    setAdjustField(field)
    setTimeout(() => {
      const options = field === 'drillNo' ? DRILL_LIST : OPERATOR_LIST
      const currentVal = String((pile as any)[field] || '')
      const currentIdx = options.indexOf(currentVal)
      const newVal = options[currentIdx >= 0 ? currentIdx : 0]
      confirmAdjust(pile, field, newVal)
    }, 50)
  }

  const confirmAdjust = async (pile: PileInfo, field: 'drillNo' | 'operator', pickerValue: string) => {
    const currentVal = String((pile as any)[field] || '')
    if (pickerValue === currentVal) {
      setAdjustPile(null)
      return
    }
    const fieldLabel = field === 'drillNo' ? '钻机' : '施工员'
    const modalOpts: any = {
      title: `调整${fieldLabel}`,
      content: `将 ${pile.pileNo} 的${fieldLabel}从「${currentVal || '未分配'}」调整为「${pickerValue}」`,
      editable: true,
      placeholderText: '选填：调整原因（如临时换班）',
      confirmText: '确认调整',
      cancelText: '取消',
      confirmColor: '#1E88E5'
    }
    const res: any = await Taro.showModal(modalOpts).catch(err => {
      console.error('[TeamBoard] Modal失败:', err)
      return { confirm: false, content: '' }
    })
    if (!res.confirm) {
      setAdjustPile(null)
      return
    }
    onAdjustAssignment!(pile.id, field, pickerValue, res.content || undefined)
    setAdjustPile(null)
    Taro.showToast({ title: '调整成功', icon: 'success' })
      .catch(err => console.error('[TeamBoard] Toast失败:', err))
  }

  const renderPileChip = (pile: PileInfo, field: 'drillNo' | 'operator' | null) => (
    <View
      key={pile.id}
      className={classnames(styles.pileChip, {
        [styles.hasAdjust]: !!field && !!onAdjustAssignment
      })}
    >
      <View
        className={styles.pileChipMain}
        onClick={() => onPileClick(pile)}
      >
        <Text className={styles.pileChipNo}>{pile.pileNo}</Text>
        <StatusTag status={getStatusColor(pile.status)} />
      </View>
      {field && onAdjustAssignment && (
        <View
          className={styles.adjustBtn}
          onClick={(e) => {
            e.stopPropagation?.()
            handleLongPressChip(pile, field)
          }}
        >
          <Text className={styles.adjustIcon}>↔</Text>
        </View>
      )}
    </View>
  )

  const renderGroupCard = (title: string, piles: PileInfo[], color?: string, field: 'drillNo' | 'operator' | null = null) => {
    const completed = piles.filter(p => p.status === 'completed').length
    const inProgress = piles.filter(p => p.status === 'in_progress').length
    const pending = piles.filter(p => p.status === 'pending').length
    const exception = piles.filter(p => p.status === 'exception').length

    return (
      <View key={title + (field || '')} className={styles.groupCard}>
        <View className={styles.groupHeader}>
          <View className={styles.groupTitleRow}>
            {color && <View className={styles.groupColorBar} style={{ backgroundColor: color }} />}
            <Text className={styles.groupTitle}>{title}</Text>
          </View>
          <View className={styles.groupStats}>
            <Text className={styles.groupStat}>共{piles.length}根</Text>
          </View>
        </View>

        <View className={styles.groupProgress}>
          {completed > 0 && (
            <View className={styles.progressTag} style={{ backgroundColor: 'rgba(67, 160, 71, 0.1)', color: '#43A047' }}>
              ✓ {completed} 已完
            </View>
          )}
          {inProgress > 0 && (
            <View className={styles.progressTag} style={{ backgroundColor: 'rgba(30, 136, 229, 0.1)', color: '#1E88E5' }}>
              ⟳ {inProgress} 施工中
            </View>
          )}
          {pending > 0 && (
            <View className={styles.progressTag} style={{ backgroundColor: 'rgba(251, 140, 0, 0.1)', color: '#FB8C00' }}>
              ○ {pending} 待施工
            </View>
          )}
          {exception > 0 && (
            <View className={styles.progressTag} style={{ backgroundColor: 'rgba(229, 57, 53, 0.1)', color: '#E53935' }}>
              ! {exception} 异常
            </View>
          )}
        </View>

        <ScrollView className={styles.pileScroll} scrollX>
          <View className={styles.pileList}>
            {piles.map(pile => renderPileChip(pile, field))}
          </View>
        </ScrollView>
      </View>
    )
  }

  const renderContent = () => {
    if (groupBy === 'drill') {
      const drills = Object.keys(byDrill)
      if (drills.length === 0) {
        return (
          <View className={styles.emptyState}>
            <Text className={styles.emptyIcon}>👷</Text>
            <Text className={styles.emptyText}>暂无钻机分配</Text>
          </View>
        )
      }
      return drills.map(drill => renderGroupCard(drill, byDrill[drill], '#1E88E5', 'drillNo'))
    }

    if (groupBy === 'operator') {
      const operators = Object.keys(byOperator)
      if (operators.length === 0) {
        return (
          <View className={styles.emptyState}>
            <Text className={styles.emptyIcon}>👥</Text>
            <Text className={styles.emptyText}>暂无人员分配</Text>
          </View>
        )
      }
      return operators.map(op => renderGroupCard(op, byOperator[op], '#00897B', 'operator'))
    }

    const stages: Array<keyof typeof byStage> = ['pending', 'drill_start', 'drill_end', 'cage', 'concrete', 'completed']
    return stages.map(stage => {
      const piles = byStage[stage]
      if (piles.length === 0) return null
      return renderGroupCard(stageLabels[stage] || stage, piles, stageColors[stage], null)
    })
  }

  const tabs: Array<{ key: GroupByMode; label: string; icon: string }> = [
    { key: 'drill', label: '按钻机', icon: '⛏️' },
    { key: 'operator', label: '按人员', icon: '👷' },
    { key: 'stage', label: '按阶段', icon: '📊' }
  ]

  return (
    <View className={styles.container}>
      <View className={styles.tabs}>
        {tabs.map(tab => (
          <View
            key={tab.key}
            className={classnames(styles.tab, { [styles.active]: groupBy === tab.key })}
            onClick={() => setGroupBy(tab.key)}
          >
            <Text className={styles.tabIcon}>{tab.icon}</Text>
            <Text className={styles.tabText}>{tab.label}</Text>
          </View>
        ))}
      </View>

      <ScrollView className={styles.content} scrollY>
        {renderContent()}
      </ScrollView>

      <View className={styles.tip}>
        <Text className={styles.tipText}>
          💡 点击桩号进入成孔记录 · 点击↔可临时调整钻机/施工员（班前分活用）
        </Text>
      </View>

      {adjustPile && (
        <Picker
          mode='selector'
          range={adjustField === 'drillNo' ? DRILL_LIST : OPERATOR_LIST}
          onChange={(e) => {
            const val = (adjustField === 'drillNo' ? DRILL_LIST : OPERATOR_LIST)[e.detail.value]
            confirmAdjust(adjustPile, adjustField, val)
          }}
          onCancel={() => setAdjustPile(null)}
        >
          <View className={styles.hiddenPicker} />
        </Picker>
      )}
    </View>
  )
}

export default TeamBoard
