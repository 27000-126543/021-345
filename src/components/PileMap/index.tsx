import React, { useState } from 'react'
import { View, Text, ScrollView } from '@tarojs/components'
import classnames from 'classnames'
import { PileInfo } from '@/types/pile'
import styles from './index.module.scss'

interface PileMapProps {
  piles: PileInfo[]
  selectedArea: string
  onPileClick: (pile: PileInfo) => void
}

const statusColors: Record<string, string> = {
  pending: '#FB8C00',
  in_progress: '#1E88E5',
  completed: '#43A047',
  exception: '#E53935'
}

const statusBgColors: Record<string, string> = {
  pending: 'rgba(251, 140, 0, 0.2)',
  in_progress: 'rgba(30, 136, 229, 0.2)',
  completed: 'rgba(67, 160, 71, 0.2)',
  exception: 'rgba(229, 57, 53, 0.2)'
}

const PileMap: React.FC<PileMapProps> = ({ piles, selectedArea, onPileClick }) => {
  const [selectedPileId, setSelectedPileId] = useState<string | null>(null)

  const filteredPiles = selectedArea === 'all' 
    ? piles 
    : piles.filter(p => p.area === selectedArea)

  const areas = Array.from(new Set(filteredPiles.map(p => p.area)))
  
  const maxX = Math.max(...filteredPiles.map(p => p.gridX || 1))
  const maxY = Math.max(...filteredPiles.map(p => p.gridY || 1))

  const handlePileClick = (pile: PileInfo) => {
    setSelectedPileId(pile.id)
    setTimeout(() => {
      onPileClick(pile)
    }, 200)
  }

  return (
    <View className={styles.container}>
      <View className={styles.legend}>
        <View className={styles.legendItem}>
          <View className={styles.legendDot} style={{ backgroundColor: statusColors.pending }} />
          <Text className={styles.legendText}>待施工</Text>
        </View>
        <View className={styles.legendItem}>
          <View className={styles.legendDot} style={{ backgroundColor: statusColors.in_progress }} />
          <Text className={styles.legendText}>施工中</Text>
        </View>
        <View className={styles.legendItem}>
          <View className={styles.legendDot} style={{ backgroundColor: statusColors.completed }} />
          <Text className={styles.legendText}>已完成</Text>
        </View>
        <View className={styles.legendItem}>
          <View className={styles.legendDot} style={{ backgroundColor: statusColors.exception }} />
          <Text className={styles.legendText}>异常</Text>
        </View>
      </View>

      <ScrollView className={styles.mapScroll} scrollX scrollY>
        <View className={styles.mapContainer}>
          {areas.map((area, areaIndex) => (
            <View key={area} className={styles.areaSection}>
              <Text className={styles.areaTitle}>{area}</Text>
              
              <View className={styles.areaGrid}>
                {Array.from({ length: maxY }).map((_, yIdx) => {
                  const y = yIdx + 1
                  return (
                    <View key={y} className={styles.gridRow}>
                      <Text className={styles.rowLabel}>Y{y}</Text>
                      
                      {Array.from({ length: maxX }).map((_, xIdx) => {
                        const x = xIdx + 1
                        const pile = filteredPiles.find(p => 
                          p.area === area && p.gridX === x && p.gridY === y
                        )
                        
                        return (
                          <View key={`${x}-${y}`} className={styles.gridCell}>
                            {pile ? (
                              <View
                                className={classnames(styles.pilePoint, {
                                  [styles.selected]: selectedPileId === pile.id
                                })}
                                style={{
                                  backgroundColor: statusBgColors[pile.status],
                                  borderColor: statusColors[pile.status]
                                }}
                                onClick={() => handlePileClick(pile)}
                              >
                                <Text
                                  className={styles.pileNo}
                                  style={{ color: statusColors[pile.status] }}
                                >
                                  {pile.pileNo.split('-')[1]}
                                </Text>
                                {pile.status === 'in_progress' && (
                                  <View className={styles.pulseRing} style={{ borderColor: statusColors[pile.status] }} />
                                )}
                              </View>
                            ) : (
                              <View className={styles.emptyCell} />
                            )}
                          </View>
                        )
                      })}
                    </View>
                  )
                })}

                <View className={styles.colLabels}>
                  <View className={styles.rowLabel} />
                  {Array.from({ length: maxX }).map((_, xIdx) => (
                    <Text key={xIdx + 1} className={styles.colLabel}>X{xIdx + 1}</Text>
                  ))}
                </View>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      <View className={styles.tip}>
        <Text className={styles.tipText}>💡 点击桩位可进入成孔记录</Text>
      </View>
    </View>
  )
}

export default PileMap
