import React from 'react'
import { View, Text } from '@tarojs/components'
import styles from './index.module.scss'

interface FormSectionProps {
  title: string
  children: React.ReactNode
}

const FormSection: React.FC<FormSectionProps> = ({ title, children }) => {
  return (
    <View className={styles.section}>
      <View className={styles.header}>
        <View className={styles.titleBar} />
        <Text className={styles.title}>{title}</Text>
      </View>
      <View className={styles.content}>
        {children}
      </View>
    </View>
  )
}

export default FormSection
