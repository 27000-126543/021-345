import React from 'react'
import { View, Text } from '@tarojs/components'
import styles from './index.module.scss'

const PileDetailPage: React.FC = () => {
  return (
    <View className={styles.pageContainer}>
      <Text className={styles.icon}>📍</Text>
      <Text className={styles.title}>桩位详情</Text>
      <Text className={styles.text}>功能正在开发中...</Text>
    </View>
  )
}

export default PileDetailPage
