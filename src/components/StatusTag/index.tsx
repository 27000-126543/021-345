import React from 'react'
import { View, Text } from '@tarojs/components'
import classnames from 'classnames'
import styles from './index.module.scss'

interface StatusTagProps {
  status: 'pending' | 'in_progress' | 'completed' | 'exception' | 'normal' | 'error' | 'warning'
  text?: string
}

const statusMap: Record<string, { label: string; className: string }> = {
  pending: { label: '待施工', className: 'pending' },
  in_progress: { label: '施工中', className: 'inProgress' },
  completed: { label: '已完成', className: 'completed' },
  exception: { label: '异常', className: 'exception' },
  normal: { label: '正常', className: 'normal' },
  error: { label: '错误', className: 'error' },
  warning: { label: '警告', className: 'warning' }
}

const StatusTag: React.FC<StatusTagProps> = ({ status, text }) => {
  const info = statusMap[status] || statusMap.pending
  return (
    <View className={classnames(styles.tag, styles[info.className])}>
      <Text className={styles.text}>{text || info.label}</Text>
    </View>
  )
}

export default StatusTag
