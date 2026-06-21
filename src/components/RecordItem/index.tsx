import React from 'react'
import { View, Text, Input, Picker, Textarea } from '@tarojs/components'
import classnames from 'classnames'
import { PileRecord } from '@/types/pile'
import { getFieldStatus } from '@/utils/validator'
import { RecordValidation } from '@/types/pile'
import styles from './index.module.scss'

interface RecordItemProps {
  label: string
  field: keyof PileRecord
  value: any
  validation: RecordValidation | null
  type?: 'text' | 'number' | 'date' | 'time' | 'textarea'
  unit?: string
  placeholder?: string
  required?: boolean
  disabled?: boolean
  onChange: (value: any) => void
}

const RecordItem: React.FC<RecordItemProps> = ({
  label,
  field,
  value,
  validation,
  type = 'text',
  unit,
  placeholder,
  required = false,
  disabled = false,
  onChange
}) => {
  const status = validation ? getFieldStatus(field as string, validation) : 'normal'
  const exception = validation?.exceptions.find(e => e.field === field)

  const handleInputChange = (e: any) => {
    const val = type === 'number' ? Number(e.detail.value) || 0 : e.detail.value
    onChange(val)
  }

  const renderInput = () => {
    if (type === 'textarea') {
      return (
        <Textarea
          className={classnames(styles.textarea, {
            [styles.pending]: status === 'pending',
            [styles.error]: status === 'error',
            [styles.warning]: status === 'warning',
            [styles.disabled]: disabled
          })}
          value={value || ''}
          placeholder={placeholder}
          onInput={disabled ? undefined : handleInputChange}
          maxlength={500}
          autoHeight
          disabled={disabled}
        />
      )
    }

    if (type === 'date' || type === 'time') {
      return (
        <Picker
          mode={type}
          value={value || ''}
          onChange={(e) => { if (!disabled) onChange(e.detail.value) }}
          disabled={disabled}
        >
          <View className={classnames(styles.picker, {
            [styles.pending]: status === 'pending',
            [styles.error]: status === 'error',
            [styles.warning]: status === 'warning',
            [styles.disabled]: disabled
          })}>
            <Text className={classnames(styles.value, { [styles.placeholder]: !value })}>
              {value || placeholder}
            </Text>
          </View>
        </Picker>
      )
    }

    return (
      <Input
        className={classnames(styles.input, {
          [styles.pending]: status === 'pending',
          [styles.error]: status === 'error',
          [styles.warning]: status === 'warning',
          [styles.disabled]: disabled
        })}
        type={type === 'number' ? 'digit' : 'text'}
        value={value ? String(value) : ''}
        placeholder={placeholder}
        onInput={disabled ? undefined : handleInputChange}
        disabled={disabled}
      />
    )
  }

  return (
    <View className={styles.item}>
      <View className={styles.labelRow}>
        <Text className={styles.label}>
          {required && <Text className={styles.required}>*</Text>}
          {label}
        </Text>
        {unit && <Text className={styles.unit}>{unit}</Text>}
      </View>
      
      <View className={styles.inputWrapper}>
        {renderInput()}
        {status === 'pending' && (
          <View className={styles.statusDot} style={{ backgroundColor: '#FB8C00' }} />
        )}
        {(status === 'error' || status === 'warning') && (
          <View className={styles.statusDot} style={{ backgroundColor: '#E53935' }} />
        )}
      </View>

      {exception && (
        <Text className={classnames(styles.errorMsg, { [styles.warningMsg]: exception.type === 'warning' })}>
          {exception.message}
        </Text>
      )}
    </View>
  )
}

export default RecordItem
