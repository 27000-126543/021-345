import React from 'react'
import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { PileInfo } from '@/types/pile'
import StatusTag from '@/components/StatusTag'
import { usePileStore } from '@/store/usePileStore'
import styles from './index.module.scss'

interface PileCardProps {
  pile: PileInfo
  onClick?: () => void
}

const PileCard: React.FC<PileCardProps> = ({ pile, onClick }) => {
  const selectPile = usePileStore(state => state.selectPile)

  const handleClick = () => {
    if (onClick) {
      onClick()
    } else {
      selectPile(pile)
      Taro.switchTab({ url: '/pages/recordForm/index' })
        .catch(err => console.error('[PileCard] 跳转失败:', err))
    }
  }

  return (
    <View className={styles.card} onClick={handleClick}>
      <View className={styles.header}>
        <Text className={styles.pileNo}>{pile.pileNo}</Text>
        <StatusTag status={pile.status} />
      </View>
      
      <View className={styles.info}>
        <View className={styles.infoItem}>
          <Text className={styles.label}>区域</Text>
          <Text className={styles.value}>{pile.area}</Text>
        </View>
        <View className={styles.infoItem}>
          <Text className={styles.label}>设计桩径</Text>
          <Text className={styles.value}>{pile.designDiameter}mm</Text>
        </View>
        <View className={styles.infoItem}>
          <Text className={styles.label}>设计桩长</Text>
          <Text className={styles.value}>{pile.designLength}m</Text>
        </View>
      </View>
    </View>
  )
}

export default PileCard
