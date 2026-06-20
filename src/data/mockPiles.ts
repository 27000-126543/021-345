import { PileInfo } from '@/types/pile'
import { savePileList, getPileList } from '@/utils/storage'

export const mockPileList: PileInfo[] = [
  { id: 'p001', pileNo: 'Z1-01', area: '1号区域', status: 'pending', designDiameter: 800, designLength: 25 },
  { id: 'p002', pileNo: 'Z1-02', area: '1号区域', status: 'pending', designDiameter: 800, designLength: 25 },
  { id: 'p003', pileNo: 'Z1-03', area: '1号区域', status: 'in_progress', designDiameter: 800, designLength: 28 },
  { id: 'p004', pileNo: 'Z1-04', area: '1号区域', status: 'completed', designDiameter: 1000, designLength: 30 },
  { id: 'p005', pileNo: 'Z1-05', area: '1号区域', status: 'pending', designDiameter: 800, designLength: 25 },
  { id: 'p006', pileNo: 'Z2-01', area: '2号区域', status: 'exception', designDiameter: 1000, designLength: 32 },
  { id: 'p007', pileNo: 'Z2-02', area: '2号区域', status: 'completed', designDiameter: 800, designLength: 28 },
  { id: 'p008', pileNo: 'Z2-03', area: '2号区域', status: 'pending', designDiameter: 800, designLength: 25 },
  { id: 'p009', pileNo: 'Z2-04', area: '2号区域', status: 'pending', designDiameter: 1000, designLength: 30 },
  { id: 'p010', pileNo: 'Z2-05', area: '2号区域', status: 'completed', designDiameter: 800, designLength: 28 },
  { id: 'p011', pileNo: 'Z3-01', area: '3号区域', status: 'pending', designDiameter: 800, designLength: 25 },
  { id: 'p012', pileNo: 'Z3-02', area: '3号区域', status: 'in_progress', designDiameter: 1000, designLength: 35 },
  { id: 'p013', pileNo: 'Z3-03', area: '3号区域', status: 'pending', designDiameter: 800, designLength: 28 },
  { id: 'p014', pileNo: 'Z3-04', area: '3号区域', status: 'completed', designDiameter: 800, designLength: 25 },
  { id: 'p015', pileNo: 'Z3-05', area: '3号区域', status: 'pending', designDiameter: 1000, designLength: 32 }
]

export const initMockData = (): void => {
  const existing = getPileList()
  if (existing.length === 0) {
    savePileList(mockPileList)
    console.log('[Mock] 初始化桩位数据成功，共', mockPileList.length, '条')
  } else {
    console.log('[Mock] 已有桩位数据，跳过初始化:', existing.length, '条')
  }
}
