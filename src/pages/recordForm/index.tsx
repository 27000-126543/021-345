import React, { useEffect, useState } from 'react'
import { View, Text, Button } from '@tarojs/components'
import Taro from '@tarojs/taro'
import classnames from 'classnames'
import { usePileStore } from '@/store/usePileStore'
import { PileRecord } from '@/types/pile'
import { RECORD_FIELDS } from '@/types/pile'
import FormSection from '@/components/FormSection'
import RecordItem from '@/components/RecordItem'
import StatusTag from '@/components/StatusTag'
import styles from './index.module.scss'

const RecordFormPage: React.FC = () => {
  const selectedPile = usePileStore(state => state.selectedPile)
  const currentRecord = usePileStore(state => state.currentRecord)
  const currentValidation = usePileStore(state => state.currentValidation)
  const updateRecordField = usePileStore(state => state.updateRecordField)
  const saveCurrentRecord = usePileStore(state => state.saveCurrentRecord)
  const selectPile = usePileStore(state => state.selectPile)

  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    console.log('[RecordFormPage] 当前选中桩位:', selectedPile)
  }, [selectedPile])

  const handleFieldChange = (field: keyof PileRecord, value: any) => {
    updateRecordField(field, value)
  }

  const handleSave = async () => {
    if (isSaving) return
    
    if (!currentRecord) {
      Taro.showToast({ title: '请先选择桩位', icon: 'none' })
        .catch(err => console.error('[RecordFormPage] Toast失败:', err))
      return
    }

    if (currentValidation?.overallStatus === 'pending') {
      const confirm = await Taro.showModal({
        title: '提示',
        content: `还有${currentValidation.missingFields.length}项必填项未填写，确定保存吗？`,
        confirmText: '继续保存',
        cancelText: '返回填写'
      }).catch(err => {
        console.error('[RecordFormPage] Modal失败:', err)
        return { confirm: false }
      })
      if (!confirm.confirm) return
    }

    if (currentValidation?.overallStatus === 'error' && !currentRecord.exceptionReason) {
      const confirm = await Taro.showModal({
        title: '异常提示',
        content: '存在数据异常，请填写异常原因说明',
        confirmText: '去填写',
        cancelText: '仍保存'
      }).catch(err => {
        console.error('[RecordFormPage] Modal失败:', err)
        return { confirm: false }
      })
      if (confirm.confirm) return
    }

    setIsSaving(true)
    try {
      const success = saveCurrentRecord()
      if (success) {
        Taro.showToast({ title: '保存成功', icon: 'success' })
          .catch(err => console.error('[RecordFormPage] Toast失败:', err))
        selectPile(null)
      } else {
        Taro.showToast({ title: '保存失败', icon: 'error' })
          .catch(err => console.error('[RecordFormPage] Toast失败:', err))
      }
    } catch (error) {
      console.error('[RecordFormPage] 保存异常:', error)
      Taro.showToast({ title: '保存失败', icon: 'error' })
        .catch(err => console.error('[RecordFormPage] Toast失败:', err))
    } finally {
      setTimeout(() => setIsSaving(false), 1000)
    }
  }

  const handleSelectPile = () => {
    Taro.switchTab({ url: '/pages/pileList/index' })
      .catch(err => console.error('[RecordFormPage] 跳转失败:', err))
  }

  if (!selectedPile || !currentRecord) {
    return (
      <View className={styles.pageContainer}>
        <View className={styles.emptyState}>
          <Text className={styles.emptyIcon}>📍</Text>
          <Text className={styles.emptyTitle}>请先选择桩位</Text>
          <Text className={styles.emptyText}>从今日桩位列表中选择要记录的桩位</Text>
          <Button className={styles.selectPileBtn} onClick={handleSelectPile}>
            去选择桩位
          </Button>
        </View>
      </View>
    )
  }

  const basicFields = RECORD_FIELDS.slice(0, 4)
  const constructionFields = RECORD_FIELDS.slice(4)

  const missingCount = currentValidation?.missingFields.length || 0
  const errorCount = currentValidation?.exceptions.filter(e => e.type === 'error').length || 0
  const warningCount = currentValidation?.exceptions.filter(e => e.type === 'warning').length || 0
  const normalCount = RECORD_FIELDS.length - missingCount - errorCount - warningCount

  const needsReason = currentValidation?.overallStatus === 'error' && !currentRecord.exceptionReason

  return (
    <View className={styles.pageContainer}>
      <View className={styles.pileInfoCard}>
        <View className={styles.pileHeader}>
          <View>
            <Text className={styles.pileNo}>{selectedPile.pileNo}</Text>
            <Text className={styles.pileArea}> · {selectedPile.area}</Text>
          </View>
          <StatusTag status={selectedPile.status} />
        </View>
        <View className={styles.pileDesign}>
          <View className={styles.designItem}>
            <Text className={styles.designLabel}>设计桩径</Text>
            <Text className={styles.designValue}>{selectedPile.designDiameter}mm</Text>
          </View>
          <View className={styles.designItem}>
            <Text className={styles.designLabel}>设计桩长</Text>
            <Text className={styles.designValue}>{selectedPile.designLength}m</Text>
          </View>
          <View className={styles.designItem}>
            <Text className={styles.designLabel}>理论方量</Text>
            <Text className={styles.designValue}>{currentRecord.designConcreteVolume}m³</Text>
          </View>
        </View>
      </View>

      <View className={styles.validationSummary}>
        <Text className={styles.summaryTitle}>数据校验</Text>
        <View className={styles.summaryContent}>
          <View className={classnames(styles.summaryItem, styles.normal)}>
            <View className={classnames(styles.summaryDot, styles.normal)} />
            <Text>正常 {normalCount}</Text>
          </View>
          <View className={classnames(styles.summaryItem, styles.pending)}>
            <View className={classnames(styles.summaryDot, styles.pending)} />
            <Text>未填 {missingCount}</Text>
          </View>
          {warningCount > 0 && (
            <View className={classnames(styles.summaryItem, styles.pending)}>
              <View className={classnames(styles.summaryDot, styles.pending)} />
              <Text>警告 {warningCount}</Text>
            </View>
          )}
          {errorCount > 0 && (
            <View className={classnames(styles.summaryItem, styles.error)}>
              <View className={classnames(styles.summaryDot, styles.error)} />
              <Text>异常 {errorCount}</Text>
            </View>
          )}
        </View>
        {currentValidation && currentValidation.exceptions.length > 0 && (
          <View className={styles.exceptionList}>
            {currentValidation.exceptions.map((ex, index) => (
              <Text key={index} className={styles.exceptionItem}>{ex.message}</Text>
            ))}
          </View>
        )}
      </View>

      <FormSection title='基础信息'>
        {basicFields.map(field => (
          <RecordItem
            key={field.key}
            label={field.label}
            field={field.key}
            value={currentRecord[field.key]}
            validation={currentValidation}
            type={field.key === 'drillStartTime' ? 'time' : 'text'}
            unit={field.unit}
            placeholder={field.placeholder}
            required={field.required}
            onChange={(val) => handleFieldChange(field.key, val)}
          />
        ))}
      </FormSection>

      <FormSection title='施工参数'>
        {constructionFields.map(field => (
          <RecordItem
            key={field.key}
            label={field.label}
            field={field.key}
            value={currentRecord[field.key]}
            validation={currentValidation}
            type={field.key === 'cageLiftTime' ? 'time' : 'number'}
            unit={field.unit}
            placeholder={field.placeholder}
            required={field.required}
            onChange={(val) => handleFieldChange(field.key, val)}
          />
        ))}
        
        <View className={styles.theoreticalVolume}>
          <Text className={styles.volumeText}>
            理论混凝土灌注量：
            <Text className={styles.volumeValue}>
              {currentRecord.designConcreteVolume} m³
            </Text>
            （含1.1充盈系数）
          </Text>
        </View>
      </FormSection>

      <FormSection title='异常说明'>
        <RecordItem
          label='异常原因'
          field='exceptionReason'
          value={currentRecord.exceptionReason}
          validation={null}
          type='textarea'
          placeholder={needsReason ? '请填写异常原因说明...' : '如无异常可留空'}
          required={needsReason}
          onChange={(val) => handleFieldChange('exceptionReason', val)}
        />
      </FormSection>

      <View className={styles.bottomBar}>
        <Button
          className={classnames(styles.saveBtn, { [styles.disabled]: isSaving })}
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving ? '保存中...' : '保存记录'}
        </Button>
      </View>
    </View>
  )
}

export default RecordFormPage
