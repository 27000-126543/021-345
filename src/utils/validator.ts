import { PileRecord, RecordValidation, ValidationException, RECORD_FIELDS } from '@/types/pile'

export const validateRecord = (record: Partial<PileRecord>): RecordValidation => {
  const missingFields: string[] = []
  const exceptions: ValidationException[] = []

  console.log('[Validator] 开始校验记录:', record.pileNo)

  RECORD_FIELDS.forEach(field => {
    const value = record[field.key]
    if (field.required && (value === undefined || value === null || value === '')) {
      missingFields.push(field.key)
    }
  })

  if (record.actualDepth !== undefined && record.designLength !== undefined) {
    const actualDepth = Number(record.actualDepth)
    const designLength = Number(record.designLength)
    if (actualDepth > 0 && designLength > 0 && actualDepth < designLength) {
      exceptions.push({
        field: 'actualDepth',
        message: `实际孔深(${actualDepth}m)小于设计桩长(${designLength}m)`,
        type: 'error'
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
          type: 'warning'
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
        type: 'warning'
      })
    }
  }

  if (record.sedimentThickness !== undefined) {
    const sediment = Number(record.sedimentThickness)
    if (sediment > 10) {
      exceptions.push({
        field: 'sedimentThickness',
        message: `沉渣厚度(${sediment}cm)超过10cm限值`,
        type: 'error'
      })
    }
  }

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
    overallStatus
  })

  return {
    missingFields,
    exceptions,
    overallStatus
  }
}

export const getFieldStatus = (
  fieldKey: string,
  validation: RecordValidation
): 'normal' | 'pending' | 'error' | 'warning' => {
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
  const radius = diameter / 2000
  const volume = Math.PI * radius * radius * length * 1.1
  return Number(volume.toFixed(2))
}
