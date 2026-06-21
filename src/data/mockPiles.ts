import { PileInfo } from '@/types/pile'
import { savePileList, getPileList } from '@/utils/storage'

export const DRILL_LIST = ['钻机-01', '钻机-02', '钻机-03']
export const OPERATOR_LIST = ['张伟', '李明', '王强', '赵刚', '刘洋']

export const mockPileList: PileInfo[] = [
  { id: 'p001', pileNo: 'Z1-01', area: '1号区域', status: 'pending', designDiameter: 800, designLength: 25, gridX: 1, gridY: 1, drillNo: '钻机-01', operator: '张伟' },
  { id: 'p002', pileNo: 'Z1-02', area: '1号区域', status: 'pending', designDiameter: 800, designLength: 25, gridX: 2, gridY: 1, drillNo: '钻机-01', operator: '张伟' },
  { id: 'p003', pileNo: 'Z1-03', area: '1号区域', status: 'in_progress', designDiameter: 800, designLength: 28, gridX: 3, gridY: 1, drillNo: '钻机-01', operator: '张伟' },
  { id: 'p004', pileNo: 'Z1-04', area: '1号区域', status: 'completed', designDiameter: 1000, designLength: 30, gridX: 4, gridY: 1, drillNo: '钻机-02', operator: '李明' },
  { id: 'p005', pileNo: 'Z1-05', area: '1号区域', status: 'pending', designDiameter: 800, designLength: 25, gridX: 5, gridY: 1, drillNo: '钻机-02', operator: '李明' },
  { id: 'p006', pileNo: 'Z2-01', area: '2号区域', status: 'exception', designDiameter: 1000, designLength: 32, gridX: 1, gridY: 2, drillNo: '钻机-02', operator: '李明' },
  { id: 'p007', pileNo: 'Z2-02', area: '2号区域', status: 'completed', designDiameter: 800, designLength: 28, gridX: 2, gridY: 2, drillNo: '钻机-03', operator: '王强' },
  { id: 'p008', pileNo: 'Z2-03', area: '2号区域', status: 'pending', designDiameter: 800, designLength: 25, gridX: 3, gridY: 2, drillNo: '钻机-03', operator: '王强' },
  { id: 'p009', pileNo: 'Z2-04', area: '2号区域', status: 'pending', designDiameter: 1000, designLength: 30, gridX: 4, gridY: 2, drillNo: '钻机-03', operator: '赵刚' },
  { id: 'p010', pileNo: 'Z2-05', area: '2号区域', status: 'completed', designDiameter: 800, designLength: 28, gridX: 5, gridY: 2, drillNo: '钻机-01', operator: '赵刚' },
  { id: 'p011', pileNo: 'Z3-01', area: '3号区域', status: 'pending', designDiameter: 800, designLength: 25, gridX: 1, gridY: 3, drillNo: '钻机-02', operator: '刘洋' },
  { id: 'p012', pileNo: 'Z3-02', area: '3号区域', status: 'in_progress', designDiameter: 1000, designLength: 35, gridX: 2, gridY: 3, drillNo: '钻机-02', operator: '刘洋' },
  { id: 'p013', pileNo: 'Z3-03', area: '3号区域', status: 'pending', designDiameter: 800, designLength: 28, gridX: 3, gridY: 3, drillNo: '钻机-03', operator: '刘洋' },
  { id: 'p014', pileNo: 'Z3-04', area: '3号区域', status: 'completed', designDiameter: 800, designLength: 25, gridX: 4, gridY: 3, drillNo: '钻机-01', operator: '张伟' },
  { id: 'p015', pileNo: 'Z3-05', area: '3号区域', status: 'pending', designDiameter: 1000, designLength: 32, gridX: 5, gridY: 3, drillNo: '钻机-03', operator: '王强' }
]

export const initMockData = (): void => {
  const existing = getPileList()
  if (existing.length === 0) {
    savePileList(mockPileList)
    console.log('[Mock] 初始化桩位数据成功，共', mockPileList.length, '条')
  } else {
    const hasGridCoords = existing.some(p => p.gridX !== undefined)
    const hasDrillInfo = existing.some(p => p.drillNo !== undefined)
    if (!hasGridCoords || !hasDrillInfo) {
      const updated = existing.map((p, index) => ({
        ...p,
        gridX: p.gridX ?? mockPileList[index]?.gridX ?? 1,
        gridY: p.gridY ?? mockPileList[index]?.gridY ?? 1,
        drillNo: p.drillNo ?? mockPileList[index]?.drillNo,
        operator: p.operator ?? mockPileList[index]?.operator
      }))
      savePileList(updated)
      console.log('[Mock] 已为桩位数据补充坐标和班组信息')
    } else {
      console.log('[Mock] 已有桩位数据，跳过初始化:', existing.length, '条')
    }
  }
}
