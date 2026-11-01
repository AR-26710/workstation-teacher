/**
 * 常用查询（学生 / 考试 / 座位 / 考勤 / 生日）
 */
import { S } from './app'
import { daysBetween, parseDate, todayStr } from './utils'
import type { Exam, Student } from './types'

export function stuById(id: string | null | undefined): Student | null {
  if (!id) return null
  for (let i = 0; i < S.students.length; i++) if (S.students[i].id === id) return S.students[i]
  return null
}

export function examById(id: string | null | undefined): Exam | null {
  if (!id) return null
  for (let i = 0; i < S.exams.length; i++) if (S.exams[i].id === id) return S.exams[i]
  return null
}

export function examsSorted(): Exam[] {
  return S.exams.slice().sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
}

export function latestExam(): Exam | null {
  const e = examsSorted()
  return e.length ? e[e.length - 1] : null
}

export function prevExam(ex: Exam | null): Exam | null {
  if (!ex) return null
  const e = examsSorted()
  const i = e.indexOf(ex)
  return i > 0 ? e[i - 1] : null
}

export function seatMap(): Record<string, Student> {
  const m: Record<string, Student> = {}
  S.students.forEach((s) => {
    if (s.seat) m[s.seat] = s
  })
  return m
}

export function allSeats(): string[] {
  const out: string[] = []
  for (let r = 0; r < S.settings.rows; r++) for (let c = 0; c < S.settings.pairs * 2; c++) out.push(r + '-' + c)
  return out
}

export function firstEmptySeat(): string | null {
  const m = seatMap()
  const a = allSeats()
  for (let i = 0; i < a.length; i++) if (!m[a[i]]) return a[i]
  return null
}

export function studentsByNo(): Student[] {
  return S.students.slice().sort((a, b) => String(a.no).localeCompare(String(b.no), 'zh', { numeric: true }))
}

export function pointsOf(sid: string): number {
  let t = 0
  S.points.forEach((p) => {
    if (p.sid === sid) t += p.d
  })
  return t
}

export function attToday(sid: string): string | null {
  const a = S.attendance[todayStr()]
  return a ? a[sid] || null : null
}

export function age(st: Student): number | null {
  const b = parseDate(st.birthday)
  if (!b) return null
  const n = new Date()
  let a = n.getFullYear() - b.getFullYear()
  if (n.getMonth() < b.getMonth() || (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())) a--
  return a
}

export function daysToBirthday(st: Student): number | null {
  const b = parseDate(st.birthday)
  if (!b) return null
  const today = new Date()
  const n = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  let next = new Date(n.getFullYear(), b.getMonth(), b.getDate())
  if (next < n) next = new Date(n.getFullYear() + 1, b.getMonth(), b.getDate())
  return daysBetween(n, next)
}

export function weekNo(): number | null {
  const st = parseDate(S.settings.termStart)
  if (!st) return null
  const t = new Date()
  const n = new Date(t.getFullYear(), t.getMonth(), t.getDate())
  const d = daysBetween(st, n)
  if (d < 0) return null
  return Math.floor(d / 7) + 1
}

export function countdownDays(): number | null {
  const d = parseDate(S.settings.countdown.date)
  if (!d) return null
  const t = new Date()
  const n = new Date(t.getFullYear(), t.getMonth(), t.getDate())
  const v = daysBetween(n, d)
  return v < 0 ? null : v
}

export function seatText(seat: string | null): string {
  if (!seat) return '未排座'
  const p = seat.split('-')
  return '第' + (+p[0] + 1) + '排 第' + (+p[1] + 1) + '座'
}

export function groupName(i: number): string {
  return ['第一组', '第二组', '第三组', '第四组', '第五组', '第六组'][i] || '第' + (i + 1) + '组'
}

export function autoGroups(): void {
  S.students.forEach((s) => {
    if (s.seat) s.group = Math.floor(+s.seat.split('-')[1] / 2)
  })
}

/** 座位超出教室范围时清空（改小排数/组数后调用） */
export function fixSeats(): void {
  const cols = S.settings.pairs * 2
  S.students.forEach((s) => {
    if (!s.seat) return
    const p = s.seat.split('-')
    if (+p[0] >= S.settings.rows || +p[1] >= cols) s.seat = null
  })
  autoGroups()
}

export function shortExam(n: string): string {
  return String(n).replace('考试', '').replace(/\s+/g, ' ')
}
