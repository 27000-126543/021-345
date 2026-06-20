import { PileRecord, RecordValidation, ValidationException, RECORD_FIELDS, CONSTRUCTION_STAGES, ConstructionStage, RecordField } from '@/types/pile'

const isFieldEmpty = (value: any, field: RecordField): boolean => {
  if (value === undefined || value === null) return true
  if (value === '') return true
  if (field.isNumeric) {
    const numValue = Number(value)
    return isNaN(numValue) || numValue <= 0
  }
  return false
}

export const validateRecord = (record: Partial<PileRecord>): RecordValidation => {
  const missingFields: string[] = []
  const exceptions: ValidationException[] = []
  const stageStatus: Record<ConstructionStage, 'normal' | 'pending' | 'error'> = {
    drill_start: 'normal',
    drill_end: 'normal',
    cage: 'normal',
    concrete: 'normal'
  }

  console.log('[Validator] 开始校验记录:', record.pileNo)

  RECORD_FIELDS.forEach(field => {
    const value = record[field.key]
    if (field.required && isFieldEmpty(value, field)) {
      missingFields.push(field.key)
    }
  })

  console.log('[Validator] 未填字段:', missingFields)

  if (record.actualDepth !== undefined && record.designLength !== undefined) {
    const actualDepth = Number(record.actualDepth)
    const designLength = Number(record.designLength)
    if (actualDepth > 0 && designLength > 0 && actualDepth < designLength) {
      exceptions.push({
        field: 'actualDepth',
        message: `实际孔深(${actualDepth}m)小于设计桩长(${designLength}m)`,
        type: 'error',
        stage: 'drill_end'
      })
    }
  }

  if (record.concreteVolume !== undefined && record.designConcreteVolume !== undefined) {
    const actual = Number(record.concreteVolume)
    const design = Number(record.designConcreteVolume)
    if (actual > 0 && design > 0) {
      const deviation = Math.abs((actual - design) / design)
      if (deviation > 0.15) {
        exceptions.push({
          field: 'concreteVolume',
          message: `灌注方量偏差${(deviation * 100).toFixed(1)}%，超过15%阈值`,
          type: 'warning',
          stage: 'concrete'
        })
      }
    }
  }

  if (record.mudWeight !== undefined) {
    const mudWeight = Number(record.mudWeight)
    if (mudWeight > 0 && (mudWeight < 1.1 || mudWeight > 1.3)) {
      exceptions.push({
        field: 'mudWeight',
        message: `泥浆比重(${mudWeight})超出正常范围(1.1-1.3)`,
        type: 'warning',
        stage: 'drill_end'
      })
    }
  }

  if (record.sedimentThickness !== undefined) {
    const sediment = Number(record.sedimentThickness)
    if (sediment > 10) {
      exceptions.push({
        field: 'sedimentThickness',
        message: `沉渣厚度(${sediment}cm)超过10cm限值`,
        type: 'error',
        stage: 'drill_end'
      })
    }
  }

  CONSTRUCTION_STAGES.forEach(stage => {
    const stageFields = RECORD_FIELDS.filter(f => f.stage === stage.key)
    const hasMissing = stageFields.some(f => missingFields.includes(f.key as string))
    const hasError = exceptions.some(e => e.stage === stage.key && e.type === 'error')
    
    if (hasError) {
      stageStatus[stage.key] = 'error'
    } else if (hasMissing) {
      stageStatus[stage.key] = 'pending'
    } else {
      stageStatus[stage.key] = 'normal'
    }
  })

  let overallStatus: 'normal' | 'pending' | 'error' = 'normal'
  if (missingFields.length > 0) {
    overallStatus = 'pending'
  }
  if (exceptions.some(e => e.type === 'error')) {
    overallStatus = 'error'
  }

  console.log('[Validator] 校验完成:', {
    missingFields,
    exceptions,
    overallStatus,
    stageStatus
  })

  return {
    missingFields,
    exceptions,
    overallStatus,
    stageStatus
  }
}

export const getFieldStatus = (
  fieldKey: string,
  validation: RecordValidation | null
): 'normal' | 'pending' | 'error' | 'warning' => {
  if (!validation) return 'normal'
  if (validation.missingFields.includes(fieldKey)) {
    return 'pending'
  }
  const exception = validation.exceptions.find(e => e.field === fieldKey)
  if (exception) {
    return exception.type
  }
  return 'normal'
}

export const calculateDesignConcreteVolume = (diameter: number, length: number): number => {
  if (diameter <= 0 || length <= 0) return 0
  const radius = diameter / 2000
  const volume = Math.PI * radius * radius * length * 1.1
  return Number(volume.toFixed(2))
}

export const isStageComplete = (
  stage: ConstructionStage,
  record: Partial<PileRecord>
): boolean => {
  const stageFields = RECORD_FIELDS.filter(f => f.stage === stage)
  return stageFields.every(field => !isFieldEmpty(record[field.key], field))
}
