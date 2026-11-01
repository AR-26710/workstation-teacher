/**
 * 教室页状态（模式、考勤日期、成绩模式选中的考试、缩放视图）
 */
import { ref } from 'vue'
import { todayStr } from '@core/utils'

export type ClassMode = 'daily' | 'att' | 'points' | 'grade' | 'seat'

export const MODES: { id: ClassMode; t: string }[] = [
  { id: 'daily', t: '日常' },
  { id: 'att', t: '考勤' },
  { id: 'points', t: '点评' },
  { id: 'grade', t: '成绩' },
  { id: 'seat', t: '排座' }
]

export const clsMode = ref<ClassMode>('daily')
export const attDate = ref<string>(todayStr())
export const gradeExam = ref<string | null>(null)
export const view = ref({ s: 1, x: 0, y: 0, fit: true })

/** 是否降低动效（系统设置） */
export const REDUCED =
  typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches

export function setMode(m: ClassMode): void {
  clsMode.value = m
}
