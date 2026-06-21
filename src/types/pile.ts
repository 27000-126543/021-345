export type ConstructionStage = 'drill_start' | 'drill_end' | 'cage' | 'concrete'

export interface StageStatus {
  stage: ConstructionStage
  completed: boolean
  completedTime?: string
}

export interface PileInfo {
  id: string
  pileNo: string
  area: string
  status: 'pending' | 'in_progress' | 'completed' | 'exception'
  designDiameter: number
  designLength: number
  gridX?: number
  gridY?: number
  lng?: number
  lat?: number
  drillNo?: string
  operator?: string
}

export interface RecordChangeLog {
  field: string
  oldValue: any
  newValue: any
  operator: string
  changeTime: string
  reason?: string
}

export interface QualityCheck {
  checked: boolean
  checkedBy?: string
  checkedTime?: string
  result?: 'pass' | 'reject'
  comments?: string
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
  status: 'draft' | 'pending_check' | 'checked' | 'signed'
  stages: StageStatus[]
  currentStage: ConstructionStage
  createTime: string
  updateTime: string
  validation: RecordValidation
  operator?: string
  qualityCheck: QualityCheck
  changeLogs: RecordChangeLog[]
}

export interface RecordValidation {
  missingFields: string[]
  exceptions: ValidationException[]
  overallStatus: 'normal' | 'pending' | 'error'
  stageStatus: Record<ConstructionStage, 'normal' | 'pending' | 'error'>
}

export interface ValidationException {
  field: string
  message: string
  type: 'warning' | 'error'
  stage?: ConstructionStage
}

export interface LogRecordDetail {
  pileNo: string
  status: 'normal' | 'pending' | 'error'
  designLength: number
  actualDepth: number
  mudWeight?: number
  sedimentThickness?: number
  theoreticalVolume: number
  concreteVolume?: number
  completedStages: ConstructionStage[]
  pendingStages: ConstructionStage[]
  exceptions: Array<{
    field: string
    message: string
    reason?: string
  }>
}

export interface DailyLog {
  id: string
  date: string
  records: string[]
  recordDetails: LogRecordDetail[]
  totalPiles: number
  completedPiles: number
  exceptionPiles: number
  pendingReasons: string[]
  weather?: string
  constructionSituation?: string
  existingProblems?: string
  signedBy?: string
  signTime?: string
  status: 'draft' | 'signed'
  isLocked: boolean
  createTime: string
}

export interface RecordField {
  key: keyof PileRecord
  label: string
  required: boolean
  unit?: string
  placeholder?: string
  stage: ConstructionStage
  isNumeric?: boolean
}

export const CONSTRUCTION_STAGES: { key: ConstructionStage; label: string; fields: string[] }[] = [
  { key: 'drill_start', label: '开钻', fields: ['drillStartTime', 'drillNo', 'designDiameter', 'designLength'] },
  { key: 'drill_end', label: '终孔', fields: ['actualDepth', 'mudWeight', 'sedimentThickness'] },
  { key: 'cage', label: '下笼', fields: ['cageLiftTime'] },
  { key: 'concrete', label: '灌注', fields: ['concreteVolume'] }
]

export const RECORD_FIELDS: RecordField[] = [
  { key: 'drillStartTime', label: '开钻时间', required: true, placeholder: '请选择开钻时间', stage: 'drill_start' },
  { key: 'drillNo', label: '钻机编号', required: true, placeholder: '请输入钻机编号', stage: 'drill_start' },
  { key: 'designDiameter', label: '设计桩径', required: true, unit: 'mm', placeholder: '请输入设计桩径', stage: 'drill_start', isNumeric: true },
  { key: 'designLength', label: '设计桩长', required: true, unit: 'm', placeholder: '请输入设计桩长', stage: 'drill_start', isNumeric: true },
  { key: 'actualDepth', label: '实际孔深', required: true, unit: 'm', placeholder: '请输入实际孔深', stage: 'drill_end', isNumeric: true },
  { key: 'mudWeight', label: '泥浆比重', required: true, placeholder: '请输入泥浆比重', stage: 'drill_end', isNumeric: true },
  { key: 'sedimentThickness', label: '沉渣厚度', required: true, unit: 'cm', placeholder: '请输入沉渣厚度', stage: 'drill_end', isNumeric: true },
  { key: 'cageLiftTime', label: '钢筋笼下放时间', required: true, placeholder: '请选择下放时间', stage: 'cage' },
  { key: 'concreteVolume', label: '混凝土灌注量', required: true, unit: 'm³', placeholder: '请输入灌注量', stage: 'concrete', isNumeric: true }
]

export const DRILL_LIST: string[] = ['1号钻机', '2号钻机', '3号钻机']
export const OPERATOR_LIST: string[] = ['张工', '李工', '王工', '赵工', '刘工']

export interface AssignAdjustLog {
  id: string
  pileId: string
  pileNo: string
  field: 'drillNo' | 'operator'
  oldValue: string
  newValue: string
  adjustTime: string
  adjustBy: string
  reason?: string
}

export const FIELD_LABELS: Record<string, string> = {
  drillStartTime: '开钻时间',
  drillNo: '钻机编号',
  designDiameter: '设计桩径',
  designLength: '设计桩长',
  actualDepth: '实际孔深',
  mudWeight: '泥浆比重',
  sedimentThickness: '沉渣厚度',
  cageLiftTime: '钢筋笼下放时间',
  concreteVolume: '混凝土灌注量',
  exceptionReason: '异常原因说明'
}
