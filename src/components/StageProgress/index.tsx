import React from 'react'
import { View, Text } from '@tarojs/components'
import classnames from 'classnames'
import { CONSTRUCTION_STAGES, ConstructionStage, StageStatus } from '@/types/pile'
import { RecordValidation } from '@/types/pile'
import styles from './index.module.scss'

interface StageProgressProps {
  currentStage: ConstructionStage
  stages: StageStatus[]
  validation: RecordValidation | null
  onStageClick?: (stage: ConstructionStage) => void
}

const stageColors: Record<string, { bg: string; border: string; text: string }> = {
  pending: { bg: '#FEF3C7', border: '#FB8C00', text: '#FB8C00' },
  normal: { bg: 'rgba(67, 160, 71, 0.1)', border: '#43A047', text: '#43A047' },
  error: { bg: 'rgba(229, 57, 53, 0.1)', border: '#E53935', text: '#E53935' }
}

const StageProgress: React.FC<StageProgressProps> = ({
  currentStage,
  stages,
  validation,
  onStageClick
}) => {
  const getStageStatus = (stage: ConstructionStage): 'pending' | 'normal' | 'error' => {
    if (!validation?.stageStatus) return 'pending'
    return validation.stageStatus[stage]
  }

  const isStageCompleted = (stage: ConstructionStage): boolean => {
    return stages?.some(s => s.stage === stage && s.completed) || false
  }

  const isCurrentStage = (stage: ConstructionStage): boolean => {
    return currentStage === stage
  }

  const completedCount = stages?.filter(s => s.completed).length || 0
  const totalCount = CONSTRUCTION_STAGES.length
  const progress = Math.round((completedCount / totalCount) * 100)

  return (
    <View className={styles.container}>
      <View className={styles.header}>
        <Text className={styles.title}>施工进度</Text>
        <Text className={styles.progressText}>{progress}% 完成</Text>
      </View>
      
      <View className={styles.progressBar}>
        <View className={styles.progressFill} style={{ width: `${progress}%` }} />
      </View>

      <View className={styles.stages}>
        {CONSTRUCTION_STAGES.map((stage, index) => {
          const status = getStageStatus(stage.key)
          const completed = isStageCompleted(stage.key)
          const current = isCurrentStage(stage.key)
          const colors = stageColors[status]

          return (
            <React.Fragment key={stage.key}>
              <View
                className={classnames(styles.stageItem, {
                  [styles.current]: current,
                  [styles.clickable]: onStageClick
                })}
                onClick={() => onStageClick?.(stage.key)}
              >
                <View
                  className={classnames(styles.stageCircle, {
                    [styles.completed]: completed
                  })}
                  style={{
                    backgroundColor: completed ? colors.border : colors.bg,
                    borderColor: colors.border
                  }}
                >
                  {completed ? (
                    <Text className={styles.checkIcon}>✓</Text>
                  ) : (
                    <Text style={{ color: colors.text, fontSize: 24 }}>{index + 1}</Text>
                  )}
                </View>
                <Text
                  className={styles.stageLabel}
                  style={{ color: colors.text }}
                >
                  {stage.label}
                </Text>
                {current && (
                  <View className={styles.currentIndicator} />
                )}
              </View>
              
              {index < CONSTRUCTION_STAGES.length - 1 && (
                <View className={styles.connector}>
                  <View
                    className={styles.connectorFill}
                    style={{
                      width: completed ? '100%' : '0%',
                      backgroundColor: stageColors['normal'].border
                    }}
                  />
                </View>
              )}
            </React.Fragment>
          )
        })}
      </View>
    </View>
  )
}

export default StageProgress
