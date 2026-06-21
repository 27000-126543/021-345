import React, { useEffect, useState } from 'react'
import { View, Text, Button, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import classnames from 'classnames'
import { usePileStore } from '@/store/usePileStore'
import { PileRecord, ConstructionStage, CONSTRUCTION_STAGES, RECORD_FIELDS } from '@/types/pile'
import FormSection from '@/components/FormSection'
import RecordItem from '@/components/RecordItem'
import StatusTag from '@/components/StatusTag'
import StageProgress from '@/components/StageProgress'
import { isStageComplete } from '@/utils/validator'
import styles from './index.module.scss'

const RecordFormPage: React.FC = () => {
  const selectedPile = usePileStore(state => state.selectedPile)
  const currentRecord = usePileStore(state => state.currentRecord)
  const currentValidation = usePileStore(state => state.currentValidation)
  const updateRecordField = usePileStore(state => state.updateRecordField)
  const saveCurrentRecord = usePileStore(state => state.saveCurrentRecord)
  const saveStage = usePileStore(state => state.saveStage)
  const selectPile = usePileStore(state => state.selectPile)
  const getRecordByPileId = usePileStore(state => state.getRecordByPileId)
  const submitForQualityCheck = usePileStore(state => state.submitForQualityCheck)
  const qualityCheck = usePileStore(state => state.qualityCheck)

  const [isSaving, setIsSaving] = useState(false)
  const [isSavingStage, setIsSavingStage] = useState<string | null>(null)
  const [activeStage, setActiveStage] = useState<ConstructionStage>('drill_start')
  const [isExistingRecord, setIsExistingRecord] = useState(false)
  const [showChangeLogs, setShowChangeLogs] = useState(false)

  useEffect(() => {
    if (selectedPile) {
      const existing = getRecordByPileId(selectedPile.id)
      setIsExistingRecord(!!existing)
      if (existing && currentRecord) {
        setActiveStage(currentRecord.currentStage || 'drill_start')
      }
    }
  }, [selectedPile, currentRecord?.currentStage])

  const handleFieldChange = (field: keyof PileRecord, value: any) => {
    if (currentRecord?.status === 'checked') {
      Taro.showToast({ title: '质检通过的记录不可修改', icon: 'none' })
        .catch(err => console.error('[RecordFormPage] Toast失败:', err))
      return
    }
    updateRecordField(field, value)
  }

  const handleStageClick = (stage: ConstructionStage) => {
    setActiveStage(stage)
  }

  const handleSaveStage = async (stage: ConstructionStage) => {
    if (isSavingStage || !currentRecord) return
    if (currentRecord.status === 'checked') {
      Taro.showToast({ title: '质检通过的记录不可修改', icon: 'none' })
        .catch(err => console.error('[RecordFormPage] Toast失败:', err))
      return
    }

    const complete = isStageComplete(stage, currentRecord)
    if (!complete) {
      Taro.showToast({ 
        title: '请先填写完该阶段的所有必填项', 
        icon: 'none' 
      }).catch(err => console.error('[RecordFormPage] Toast失败:', err))
      return
    }

    setIsSavingStage(stage)
    try {
      const success = saveStage(stage)
      if (success) {
        Taro.showToast({ title: '阶段保存成功', icon: 'success' })
          .catch(err => console.error('[RecordFormPage] Toast失败:', err))
        
        const stageIndex = CONSTRUCTION_STAGES.findIndex(s => s.key === stage)
        if (stageIndex < CONSTRUCTION_STAGES.length - 1) {
          const nextStage = CONSTRUCTION_STAGES[stageIndex + 1].key
          setActiveStage(nextStage)
        }
      } else {
        Taro.showToast({ title: '保存失败', icon: 'error' })
          .catch(err => console.error('[RecordFormPage] Toast失败:', err))
      }
    } catch (error) {
      Taro.showToast({ title: '保存失败', icon: 'error' })
        .catch(err => console.error('[RecordFormPage] Toast失败:', err))
    } finally {
      setTimeout(() => setIsSavingStage(null), 1000)
    }
  }

  const handleSaveFull = async () => {
    if (isSaving) return
    if (!currentRecord) {
      Taro.showToast({ title: '请先选择桩位', icon: 'none' })
        .catch(err => console.error('[RecordFormPage] Toast失败:', err))
      return
    }
    if (currentRecord.status === 'checked') {
      Taro.showToast({ title: '质检通过的记录不可修改', icon: 'none' })
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
      } else {
        Taro.showToast({ title: '保存失败', icon: 'error' })
          .catch(err => console.error('[RecordFormPage] Toast失败:', err))
      }
    } catch (error) {
      Taro.showToast({ title: '保存失败', icon: 'error' })
        .catch(err => console.error('[RecordFormPage] Toast失败:', err))
    } finally {
      setTimeout(() => setIsSaving(false), 1000)
    }
  }

  const handleSubmitForCheck = async () => {
    if (!currentRecord) return
    if (currentValidation?.overallStatus === 'pending') {
      const confirm = await Taro.showModal({
        title: '提交复核',
        content: `还有${currentValidation.missingFields.length}项必填项未填写，确定提交质检复核吗？`,
        confirmText: '继续提交',
        cancelText: '返回填写'
      }).catch(err => {
        console.error('[RecordFormPage] Modal失败:', err)
        return { confirm: false }
      })
      if (!confirm.confirm) return
    }

    const success = submitForQualityCheck()
    if (success) {
      Taro.showToast({ title: '已提交质检复核', icon: 'success' })
        .catch(err => console.error('[RecordFormPage] Toast失败:', err))
    } else {
      Taro.showToast({ title: '提交失败', icon: 'error' })
        .catch(err => console.error('[RecordFormPage] Toast失败:', err))
    }
  }

  const handleQualityCheck = async (pass: boolean) => {
    if (!currentRecord) return
    const modalOptions: any = {
      title: pass ? '复核通过' : '复核驳回',
      content: pass ? '确认该记录质检通过？' : '请填写驳回原因',
      editable: !pass,
      placeholderText: pass ? '' : '请填写驳回原因...',
      confirmText: pass ? '通过' : '驳回',
      cancelText: '取消',
      confirmColor: pass ? undefined : '#E53935'
    }
    const comments = await Taro.showModal(modalOptions).catch(err => {
      console.error('[RecordFormPage] Modal失败:', err)
      return { confirm: false, content: '' } as any
    })

    if (!comments.confirm) return
    const contentVal = String((comments as any).content || '')
    if (!pass && !contentVal) {
      Taro.showToast({ title: '请填写驳回原因', icon: 'none' })
        .catch(err => console.error('[RecordFormPage] Toast失败:', err))
      return
    }

    const recordId = currentRecord!.id as string
    const success = qualityCheck(recordId, pass, contentVal, '质检')
    if (success) {
      Taro.showToast({ title: pass ? '质检通过' : '已驳回', icon: 'success' })
        .catch(err => console.error('[RecordFormPage] Toast失败:', err))
    } else {
      Taro.showToast({ title: '操作失败', icon: 'error' })
        .catch(err => console.error('[RecordFormPage] Toast失败:', err))
    }
  }

  const handleSelectPile = () => {
    selectPile(null)
    Taro.switchTab({ url: '/pages/pileList/index' })
      .catch(err => console.error('[RecordFormPage] 跳转失败:', err))
  }

  const handleClearSelection = () => {
    Taro.showModal({
      title: '确认取消',
      content: '确定要取消当前记录吗？未保存的数据将丢失。',
      confirmColor: '#E53935'
    }).then(res => {
      if (res.confirm) {
        selectPile(null)
      }
    }).catch(err => console.error('[RecordFormPage] Modal失败:', err))
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'draft': return '📝 草稿'
      case 'pending_check': return '⏳ 待质检复核'
      case 'checked': return '✅ 质检通过'
      case 'signed': return '📋 已签入日志'
      default: return status
    }
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

  const missingCount = currentValidation?.missingFields.length || 0
  const errorCount = currentValidation?.exceptions.filter(e => e.type === 'error').length || 0
  const warningCount = currentValidation?.exceptions.filter(e => e.type === 'warning').length || 0
  const normalCount = RECORD_FIELDS.length - missingCount - errorCount - warningCount

  const needsReason = currentValidation?.overallStatus === 'error' && !currentRecord.exceptionReason
  const stages = currentRecord.stages || []
  const isChecked = currentRecord.status === 'checked'
  const isPendingCheck = currentRecord.status === 'pending_check'

  const getStageFields = (stage: ConstructionStage) => {
    return RECORD_FIELDS.filter(f => f.stage === stage)
  }

  const isStageCompleted = (stage: ConstructionStage) => {
    return stages.some(s => s.stage === stage && s.completed)
  }

  return (
    <View className={styles.pageContainer}>
      <View className={styles.pileInfoCard}>
        <View className={styles.pileHeader}>
          <View>
            <View className={styles.pileTitleRow}>
              <Text className={styles.pileNo}>{selectedPile.pileNo}</Text>
              <Text className={styles.pileArea}> · {selectedPile.area}</Text>
            </View>
            {isExistingRecord && (
              <Text className={styles.existingTag}>
                📝 已有记录，继续编辑中
              </Text>
            )}
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
        <View className={styles.drillOperatorRow}>
          {currentRecord.drillNo && (
            <View className={styles.drillOperatorItem}>
              <Text className={styles.doLabel}>钻机</Text>
              <Text className={styles.doValue}>⛏️ {currentRecord.drillNo}</Text>
            </View>
          )}
          {currentRecord.operator && (
            <View className={styles.drillOperatorItem}>
              <Text className={styles.doLabel}>施工员</Text>
              <Text className={styles.doValue}>👷 {currentRecord.operator}</Text>
            </View>
          )}
        </View>
      </View>

      <View className={classnames(styles.statusBanner, styles[currentRecord.status || 'draft'])}>
        <Text className={styles.statusBannerText}>
          {getStatusLabel(currentRecord.status || 'draft')}
        </Text>
        {currentRecord.qualityCheck?.checkedBy && (
          <Text className={styles.statusBannerSub}>
            复核人：{currentRecord.qualityCheck.checkedBy} · {currentRecord.qualityCheck.checkedTime?.split(' ')[0]}
          </Text>
        )}
        {currentRecord.qualityCheck?.comments && (
          <Text className={styles.statusBannerComments}>
            {currentRecord.qualityCheck.comments}
          </Text>
        )}
      </View>

      <StageProgress
        currentStage={currentRecord.currentStage || 'drill_start'}
        stages={stages}
        validation={currentValidation}
        onStageClick={handleStageClick}
      />

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

      <ScrollView className={styles.stagesScroll} scrollY>
        {CONSTRUCTION_STAGES.map((stage) => {
          const stageFields = getStageFields(stage.key)
          const completed = isStageCompleted(stage.key)
          const isActive = activeStage === stage.key
          const canSave = isStageComplete(stage.key, currentRecord) && !completed && !isChecked

          return (
            <View
              key={stage.key}
              className={classnames(styles.stageSection, {
                [styles.active]: isActive,
                [styles.completed]: completed,
                [styles.disabled]: isChecked
              })}
            >
              <View
                className={styles.stageHeader}
                onClick={() => setActiveStage(isActive ? '' as ConstructionStage : stage.key)}
              >
                <View className={styles.stageHeaderLeft}>
                  <View
                    className={classnames(styles.stageCircle, {
                      [styles.completed]: completed,
                      [styles.error]: currentValidation?.stageStatus?.[stage.key] === 'error',
                      [styles.pending]: currentValidation?.stageStatus?.[stage.key] === 'pending' && !completed
                    })}
                  >
                    {completed ? (
                      <Text className={styles.checkIcon}>✓</Text>
                    ) : (
                      <Text className={styles.stageIndex}>
                        {CONSTRUCTION_STAGES.findIndex(s => s.key === stage.key) + 1}
                      </Text>
                    )}
                  </View>
                  <View>
                    <Text className={styles.stageTitle}>{stage.label}</Text>
                    <Text className={styles.stageSubtitle}>
                      {stageFields.length}项内容
                      {completed && stages.find(s => s.stage === stage.key)?.completedTime && (
                        ` · 已保存: ${stages.find(s => s.stage === stage.key)?.completedTime?.split(' ')[1]}`
                      )}
                    </Text>
                  </View>
                </View>
                <Text className={classnames(styles.expandIcon, { [styles.expanded]: isActive })}>
                  ▼
                </Text>
              </View>

              {isActive && (
                <View className={styles.stageContent}>
                  <FormSection title={`${stage.label}阶段数据`}>
                    {stageFields.map(field => (
                      <RecordItem
                        key={field.key}
                        label={field.label}
                        field={field.key}
                        value={currentRecord[field.key]}
                        validation={currentValidation}
                        type={field.key === 'drillStartTime' || field.key === 'cageLiftTime' ? 'time' : (field.isNumeric ? 'number' : 'text')}
                        unit={field.unit}
                        placeholder={field.placeholder}
                        required={field.required}
                        disabled={isChecked}
                        onChange={(val) => handleFieldChange(field.key, val)}
                      />
                    ))}

                    {stage.key === 'concrete' && (
                      <View className={styles.theoreticalVolume}>
                        <Text className={styles.volumeText}>
                          理论混凝土灌注量：
                          <Text className={styles.volumeValue}>
                            {currentRecord.designConcreteVolume} m³
                          </Text>
                          （含1.1充盈系数）
                        </Text>
                      </View>
                    )}
                  </FormSection>

                  {!isChecked && (
                    <View className={styles.stageActions}>
                      <Button
                        className={classnames(styles.stageSaveBtn, {
                          [styles.disabled]: !canSave || isSavingStage === stage.key
                        })}
                        onClick={() => handleSaveStage(stage.key)}
                        disabled={!canSave || isSavingStage === stage.key}
                      >
                        {isSavingStage === stage.key ? '保存中...' : (completed ? '已完成' : `保存${stage.label}阶段`)}
                      </Button>
                    </View>
                  )}
                </View>
              )}
            </View>
          )
        })}

        <FormSection title='异常说明'>
          <RecordItem
            label='异常原因'
            field='exceptionReason'
            value={currentRecord.exceptionReason}
            validation={null}
            type='textarea'
            placeholder={needsReason ? '请填写异常原因说明...' : '如无异常可留空'}
            required={needsReason}
            disabled={isChecked}
            onChange={(val) => handleFieldChange('exceptionReason', val)}
          />
        </FormSection>

        {currentRecord.changeLogs && currentRecord.changeLogs.length > 0 && (
          <FormSection title='操作痕迹'>
            <View className={styles.changeLogHeader} onClick={() => setShowChangeLogs(!showChangeLogs)}>
              <Text className={styles.changeLogTitle}>
                📝 修改记录（{currentRecord.changeLogs.length}条）
              </Text>
              <Text className={classnames(styles.expandIcon, { [styles.expanded]: showChangeLogs })}>
                ▼
              </Text>
            </View>
            {showChangeLogs && (
              <View className={styles.changeLogList}>
                {currentRecord.changeLogs.slice().reverse().map((log, index) => (
                  <View key={index} className={styles.changeLogItem}>
                    <View className={styles.changeLogMeta}>
                      <Text className={styles.changeLogOperator}>{log.operator || '未知'}</Text>
                      <Text className={styles.changeLogTime}>{log.changeTime}</Text>
                    </View>
                    <Text className={styles.changeLogContent}>
                      {log.field}：{String(log.oldValue) || '空'} → {String(log.newValue) || '空'}
                    </Text>
                    {log.reason && (
                      <Text className={styles.changeLogReason}>原因：{log.reason}</Text>
                    )}
                  </View>
                ))}
              </View>
            )}
          </FormSection>
        )}

        <View className={styles.bottomSpacer} />
      </ScrollView>

      <View className={styles.bottomBar}>
        <Button
          className={styles.cancelBtn}
          onClick={handleClearSelection}
        >
          取消
        </Button>
        {isChecked ? (
          <Button className={styles.checkedBtn} disabled>
            ✅ 质检通过
          </Button>
        ) : isPendingCheck ? (
          <>
            <Button className={styles.rejectBtn} onClick={() => handleQualityCheck(false)}>
              驳回修改
            </Button>
            <Button className={styles.passBtn} onClick={() => handleQualityCheck(true)}>
              质检通过
            </Button>
          </>
        ) : (
          <>
            <Button
              className={classnames(styles.saveBtn, { [styles.disabled]: isSaving })}
              onClick={handleSaveFull}
              disabled={isSaving}
            >
              {isSaving ? '保存中...' : '保存草稿'}
            </Button>
            <Button className={styles.submitBtn} onClick={handleSubmitForCheck}>
              提交复核
            </Button>
          </>
        )}
      </View>
    </View>
  )
}

export default RecordFormPage
