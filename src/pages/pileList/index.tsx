import React, { useState, useEffect } from 'react'
import { View, Text, ScrollView, Picker } from '@tarojs/components'
import Taro from '@tarojs/taro'
import classnames from 'classnames'
import dayjs from 'dayjs'
import { usePileStore } from '@/store/usePileStore'
import { initMockData } from '@/data/mockPiles'
import PileCard from '@/components/PileCard'
import PileMap from '@/components/PileMap'
import { PileInfo } from '@/types/pile'
import styles from './index.module.scss'

type ViewMode = 'list' | 'map'

const PileListPage: React.FC = () => {
  const [selectedArea, setSelectedArea] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [isRefreshing, setIsRefreshing] = useState(false)

  const piles = usePileStore(state => state.piles)
  const loadPiles = usePileStore(state => state.loadPiles)
  const getStats = usePileStore(state => state.getStats)
  const selectPile = usePileStore(state => state.selectPile)
  const getRecordByPileId = usePileStore(state => state.getRecordByPileId)

  useEffect(() => {
    initMockData()
    loadPiles()
  }, [])

  const stats = getStats()

  const areas = Array.from(new Set(piles.map(p => p.area)))
  const areaOptions = [{ label: '全部区域', value: 'all' }, ...areas.map(a => ({ label: a, value: a }))]

  const statusOptions = [
    { label: '全部', value: 'all' },
    { label: '待施工', value: 'pending' },
    { label: '施工中', value: 'in_progress' },
    { label: '已完成', value: 'completed' },
    { label: '异常', value: 'exception' }
  ]

  const viewModeOptions = [
    { label: '列表', value: 'list' as ViewMode, icon: '📋' },
    { label: '平面图', value: 'map' as ViewMode, icon: '🗺️' }
  ]

  const filteredPiles = piles.filter(pile => {
    const areaMatch = selectedArea === 'all' || pile.area === selectedArea
    const statusMatch = selectedStatus === 'all' || pile.status === selectedStatus
    return areaMatch && statusMatch
  })

  const handleRefresh = () => {
    setIsRefreshing(true)
    loadPiles()
    setTimeout(() => {
      setIsRefreshing(false)
      Taro.stopPullDownRefresh()
    }, 1000)
  }

  useEffect(() => {
    if (isRefreshing) {
      handleRefresh()
    }
  }, [isRefreshing])

  const handlePullDownRefresh = () => {
    setIsRefreshing(true)
  }

  useEffect(() => {
    Taro.eventCenter.on('onPullDownRefresh', handlePullDownRefresh)
    return () => {
      Taro.eventCenter.off('onPullDownRefresh', handlePullDownRefresh)
    }
  }, [])

  const handlePileClick = (pile: PileInfo) => {
    const existingRecord = getRecordByPileId(pile.id)
    if (existingRecord) {
      Taro.showModal({
        title: '提示',
        content: `桩位 ${pile.pileNo} 已有记录，是否继续编辑？`,
        confirmText: '继续编辑',
        cancelText: '取消'
      }).then(res => {
        if (res.confirm) {
          selectPile(pile)
          Taro.switchTab({ url: '/pages/recordForm/index' })
            .catch(err => console.error('[PileListPage] 跳转失败:', err))
        }
      }).catch(err => console.error('[PileListPage] Modal失败:', err))
    } else {
      selectPile(pile)
      Taro.switchTab({ url: '/pages/recordForm/index' })
        .catch(err => console.error('[PileListPage] 跳转失败:', err))
    }
  }

  const today = dayjs().format('YYYY年MM月DD日')

  return (
    <View className={styles.pageContainer}>
      <View className={styles.header}>
        <Text className={styles.title}>今日桩位</Text>
        <Text className={styles.subtitle}>{today}</Text>
        
        <View className={styles.statsGrid}>
          <View className={styles.statItem}>
            <Text className={styles.statValue}>{stats.total}</Text>
            <Text className={styles.statLabel}>总桩数</Text>
          </View>
          <View className={styles.statItem}>
            <Text className={styles.statValue}>{stats.completed}</Text>
            <Text className={styles.statLabel}>已完成</Text>
          </View>
          <View className={styles.statItem}>
            <Text className={styles.statValue}>{stats.inProgress}</Text>
            <Text className={styles.statLabel}>施工中</Text>
          </View>
          <View className={styles.statItem}>
            <Text className={styles.statValue}>{stats.exception}</Text>
            <Text className={styles.statLabel}>异常</Text>
          </View>
        </View>
      </View>

      <View className={styles.content}>
        <View className={styles.filterBar}>
          <View className={styles.filterItem}>
            <Text className={styles.filterLabel}>区域</Text>
            <Picker
              mode='selector'
              range={areaOptions.map(a => a.label)}
              value={areaOptions.findIndex(a => a.value === selectedArea)}
              onChange={(e) => setSelectedArea(areaOptions[e.detail.value].value)}
            >
              <View className={styles.picker}>
                <Text className={styles.pickerText}>
                  {areaOptions.find(a => a.value === selectedArea)?.label || '全部区域'}
                </Text>
              </View>
            </Picker>
          </View>

          <View className={styles.filterItem}>
            <Text className={styles.filterLabel}>视图</Text>
            <View className={styles.viewModeTabs}>
              {viewModeOptions.map(option => (
                <View
                  key={option.value}
                  className={classnames(styles.viewModeTab, {
                    [styles.active]: viewMode === option.value
                  })}
                  onClick={() => setViewMode(option.value)}
                >
                  <Text className={styles.viewModeIcon}>{option.icon}</Text>
                  <Text className={styles.viewModeText}>{option.label}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {viewMode === 'list' && (
          <>
            <ScrollView className={styles.statusTabs} scrollX>
              {statusOptions.map(option => (
                <View
                  key={option.value}
                  className={classnames(styles.tabItem, { [styles.active]: selectedStatus === option.value })}
                  onClick={() => setSelectedStatus(option.value)}
                >
                  <Text>{option.label}</Text>
                </View>
              ))}
            </ScrollView>

            <ScrollView className={styles.listContainer} scrollY>
              {filteredPiles.length === 0 ? (
                <View className={styles.emptyState}>
                  <Text className={styles.emptyIcon}>📋</Text>
                  <Text className={styles.emptyText}>暂无符合条件的桩位</Text>
                </View>
              ) : (
                filteredPiles.map(pile => (
                  <PileCard
                    key={pile.id}
                    pile={pile}
                    onClick={() => handlePileClick(pile)}
                  />
                ))
              )}
              
              {isRefreshing && (
                <Text className={styles.loadingText}>刷新中...</Text>
              )}
            </ScrollView>
          </>
        )}

        {viewMode === 'map' && (
          <View className={styles.mapContainer}>
            <PileMap
              piles={filteredPiles}
              selectedArea={selectedArea}
              onPileClick={handlePileClick}
            />
            
            {isRefreshing && (
              <Text className={styles.loadingText}>刷新中...</Text>
            )}
          </View>
        )}
      </View>
    </View>
  )
}

export default PileListPage
