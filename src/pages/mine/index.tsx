import React, { useState, useEffect } from 'react'
import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { usePileStore } from '@/store/usePileStore'
import { getPileRecords, getDailyLogs } from '@/utils/storage'
import dayjs from 'dayjs'
import styles from './index.module.scss'

const MinePage: React.FC = () => {
  const [totalRecords, setTotalRecords] = useState(0)
  const [totalLogs, setTotalLogs] = useState(0)
  const [todayRecords, setTodayRecords] = useState(0)

  const loadRecords = usePileStore(state => state.loadRecords)
  const loadDailyLogs = usePileStore(state => state.loadDailyLogs)
  const loadPiles = usePileStore(state => state.loadPiles)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = () => {
    loadRecords()
    loadDailyLogs()
    loadPiles()

    const records = getPileRecords()
    const logs = getDailyLogs()
    const today = dayjs().format('YYYY-MM-DD')
    const todayRecs = records.filter(r => r.createTime.startsWith(today))

    setTotalRecords(records.length)
    setTotalLogs(logs.length)
    setTodayRecords(todayRecs.length)
  }

  const handleSync = () => {
    Taro.showLoading({ title: '同步中...' })
      .catch(err => console.error('[MinePage] Loading失败:', err))
    
    setTimeout(() => {
      loadStats()
      Taro.hideLoading()
      Taro.showToast({ title: '同步成功', icon: 'success' })
        .catch(err => console.error('[MinePage] Toast失败:', err))
    }, 1500)
  }

  const handleClearData = async () => {
    const confirm = await Taro.showModal({
      title: '确认清空',
      content: '确定要清空所有本地数据吗？此操作不可恢复！',
      confirmColor: '#E53935'
    }).catch(err => {
      console.error('[MinePage] Modal失败:', err)
      return { confirm: false }
    })

    if (confirm.confirm) {
      Taro.clearStorageSync()
      loadStats()
      Taro.showToast({ title: '数据已清空', icon: 'success' })
        .catch(err => console.error('[MinePage] Toast失败:', err))
    }
  }

  const handleMenuClick = (menu: string) => {
    Taro.showToast({ title: `${menu}功能开发中`, icon: 'none' })
      .catch(err => console.error('[MinePage] Toast失败:', err))
  }

  const menuItems = [
    { icon: '👥', title: '班组人员管理', color: 'blue', action: () => handleMenuClick('班组人员') },
    { icon: '🔧', title: '设备管理', color: 'green', action: () => handleMenuClick('设备管理') },
    { icon: '⚙️', title: '系统设置', color: 'orange', action: () => handleMenuClick('系统设置') },
    { icon: '☁️', title: '数据同步', color: 'purple', action: handleSync },
    { icon: '❓', title: '帮助与反馈', color: 'blue', action: () => handleMenuClick('帮助反馈') },
    { icon: '🗑️', title: '清空本地数据', color: 'red', action: handleClearData }
  ]

  return (
    <View className={styles.pageContainer}>
      <View className={styles.header}>
        <View className={styles.userInfo}>
          <View className={styles.avatar}>👷</View>
          <View className={styles.userDetails}>
            <Text className={styles.userName}>张施工</Text>
            <Text className={styles.userRole}>施工员 · 桩基班组一组</Text>
          </View>
        </View>
      </View>

      <View className={styles.content}>
        <View className={styles.statsCard}>
          <Text className={styles.statsTitle}>我的数据</Text>
          <View className={styles.statsGrid}>
            <View className={styles.statItem}>
              <Text className={styles.statValue}>{todayRecords}</Text>
              <Text className={styles.statLabel}>今日记录</Text>
            </View>
            <View className={styles.statItem}>
              <Text className={styles.statValue}>{totalRecords}</Text>
              <Text className={styles.statLabel}>累计记录</Text>
            </View>
            <View className={styles.statItem}>
              <Text className={styles.statValue}>{totalLogs}</Text>
              <Text className={styles.statLabel}>施工日志</Text>
            </View>
          </View>
        </View>

        <View className={styles.teamInfo}>
          <Text className={styles.teamTitle}>班组信息</Text>
          <View className={styles.teamGrid}>
            <View className={styles.teamItem}>
              <Text className={styles.teamLabel}>班组名称</Text>
              <Text className={styles.teamValue}>桩基班组一组</Text>
            </View>
            <View className={styles.teamItem}>
              <Text className={styles.teamLabel}>所属项目</Text>
              <Text className={styles.teamValue}>XX花园项目</Text>
            </View>
            <View className={styles.teamItem}>
              <Text className={styles.teamLabel}>班组人数</Text>
              <Text className={styles.teamValue}>8人</Text>
            </View>
            <View className={styles.teamItem}>
              <Text className={styles.teamLabel}>负责区域</Text>
              <Text className={styles.teamValue}>1-3号区域</Text>
            </View>
          </View>
        </View>

        <View className={styles.menuGroup}>
          {menuItems.slice(0, 3).map((item, index) => (
            <View key={index} className={styles.menuItem} onClick={item.action}>
              <View className={`${styles.menuIcon} ${styles[item.color]}`}>
                <Text>{item.icon}</Text>
              </View>
              <View className={styles.menuContent}>
                <Text className={styles.menuTitle}>{item.title}</Text>
                <Text className={styles.menuArrow}>›</Text>
              </View>
            </View>
          ))}
        </View>

        <View className={styles.menuGroup}>
          {menuItems.slice(3).map((item, index) => (
            <View key={index} className={styles.menuItem} onClick={item.action}>
              <View className={`${styles.menuIcon} ${styles[item.color]}`}>
                <Text>{item.icon}</Text>
              </View>
              <View className={styles.menuContent}>
                <Text className={styles.menuTitle}>{item.title}</Text>
                <Text className={styles.menuArrow}>›</Text>
              </View>
            </View>
          ))}
        </View>

        <View className={styles.versionInfo}>
          <Text className={styles.versionText}>桩基施工记录 v1.0.0</Text>
        </View>
      </View>
    </View>
  )
}

export default MinePage
