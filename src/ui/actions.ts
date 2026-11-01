/**
 * 跨页面通用动作：打开档案抽屉 / 学生表单 / 积分增减
 */
import { ref } from 'vue'
import { openDrawer } from './drawer'
import { toast } from './toast'
import { S, save } from '../core/app'
import { stuById, autoGroups, seatMap, allSeats, pointsOf } from '../core/select'
import { uid, todayStr } from '../core/utils'
import type { Student } from '../core/types'

export { openAITemplate } from './ai'
export { openStudentForm } from './forms'

/** 教室页注册的「飘分」动画回调 */
export const floatHook: { fn: ((seat: string | null, text: string, color: string) => void) | null } = { fn: null }

/** 档案抽屉当前标签 */
export const drawerTab = ref<string>('overview')

export function openStudent(sid: string, tab?: string): void {
  if (!stuById(sid)) return
  openDrawer(sid)
  if (tab) drawerTab.value = tab
}

/** 加/减分；返回受影响的学生 */
export function addPoint(sid: string, d: number, reason: string): Student | null {
  const st = stuById(sid)
  if (!st) return null
  S.points.unshift({ id: uid('p'), sid, d, r: reason, t: Date.now() })
  save()
  if (floatHook.fn) floatHook.fn(st.seat, (d > 0 ? '+' : '') + d, d > 0 ? '#1d9a57' : '#e5483b')
  return st
}

/** 全班 +1（请假、缺勤的同学不算） */
export function addPointAll(): void {
  const day = S.attendance[todayStr()] || {}
  const now = Date.now()
  let n = 0
  S.students.forEach((s) => {
    if (s.seat && day[s.id] !== 'leave' && day[s.id] !== 'absent') {
      S.points.unshift({ id: uid('p'), sid: s.id, d: 1, r: '全班表现好', t: now })
      n++
    }
  })
  save()
  if (floatHook.fn) {
    S.students.forEach((s) => {
      if (s.seat && day[s.id] !== 'leave' && day[s.id] !== 'absent') floatHook.fn?.(s.seat, '+1', '#1d9a57')
    })
  }
  toast('全班 ' + n + ' 人各 +1')
}

export function removePoint(id: string): void {
  S.points = S.points.filter((p) => p.id !== id)
  save()
}

/** 座位互换 */
export function moveSeat(from: string, to: string): void {
  if (from === to) return
  const m = seatMap()
  const a = m[from]
  const b = m[to]
  if (!a) return
  a.seat = to
  if (b) b.seat = from
  autoGroups()
  save()
}

export function deleteStudent(st: Student): void {
  S.students = S.students.filter((s) => s.id !== st.id)
  S.points = S.points.filter((p) => p.sid !== st.id)
  S.records = S.records.filter((r) => r.sid !== st.id)
  S.exams.forEach((e) => {
    delete e.scores[st.id]
  })
  Object.keys(S.attendance).forEach((k) => {
    delete S.attendance[k][st.id]
  })
  save()
}

export function pointsLabel(sid: string): string {
  const p = pointsOf(sid)
  return (p > 0 ? '+' : '') + p
}

export function allSeatKeys(): string[] {
  return allSeats()
}
