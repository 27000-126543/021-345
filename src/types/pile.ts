export interface PileInfo {
  id: string
  pileNo: string
  area: string
  status: 'pending' | 'in_progress' | 'completed' | 'exception'
  designDiameter: number
  designLength: number
  lng?: number
  lat?: number
}

export interface PileRecord {
  id: string
  pileId: string
  pileNo: string
  drillStartTime: string
  drillNo: string
  designDiameter: number
  designLength: number
  actualDepth: number
  mudWeight: number
  sedimentThickness: number
  cageLiftTime: string
  concreteVolume: number
  designConcreteVolume: number
  exceptionReason: string
  status: 'draft' | 'submitted' | 'signed'
  createTime: string
  updateTime: string
  validation: RecordValidation
}

export interface RecordValidation {
  missingFields: string[]
  exceptions: ValidationException[]
  overallStatus: 'normal' | 'pending' | 'error'
}

export interface ValidationException {
  field: string
  message: string
  type: 'warning' | 'error'
}

export interface DailyLog {
  id: string
  date: string
  records: string[]
  totalPiles: number
  completedPiles: number
  exceptionPiles: number
  signedBy?: string
  signTime?: string
  status: 'draft' | 'signed'
  createTime: string
}

export interface RecordField {
  key: keyof PileRecord
  label: string
  required: boolean
  unit?: string
  placeholder?: string
}

export const RECORD_FIELDS: RecordField[] = [
  { key: 'drillStartTime', label: '开钻时间', required: true, placeholder: '请选择开钻时间' },
  { key: 'drillNo', label: '钻机编号', required: true, placeholder: '请输入钻机编号' },
  { key: 'designDiameter', label: '设计桩径', required: true, unit: 'mm', placeholder: '请输入设计桩径' },
  { key: 'designLength', label: '设计桩长', required: true, unit: 'm', placeholder: '请输入设计桩长' },
  { key: 'actualDepth', label: '实际孔深', required: true, unit: 'm', placeholder: '请输入实际孔深' },
  { key: 'mudWeight', label: '泥浆比重', required: true, placeholder: '请输入泥浆比重' },
  { key: 'sedimentThickness', label: '沉渣厚度', required: true, unit: 'cm', placeholder: '请输入沉渣厚度' },
  { key: 'cageLiftTime', label: '钢筋笼下放时间', required: true, placeholder: '请选择下放时间' },
  { key: 'concreteVolume', label: '混凝土灌注量', required: true, unit: 'm³', placeholder: '请输入灌注量' }
]
