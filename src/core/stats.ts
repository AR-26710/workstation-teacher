/**
 * 成绩与积分统计
 */
import { S } from './app'
import { avg, parseDate, sum } from './utils'
import { examsSorted } from './select'
import type { Exam, ExamRow, ExamStats, SubjectStats } from './types'

export function examFull(ex: Exam): number {
  return sum(ex.subjects.map((s) => s.full))
}

export function stuTotal(ex: Exam, sid: string): number | null {
  const row = ex.scores[sid]
  if (!row) return null
  let t = 0
  let n = 0
  ex.subjects.forEach((sb) => {
    const v = row[sb.name]
    if (typeof v === 'number') {
      t += v
      n++
    }
  })
  return n ? t : null
}

/** 按总分降序，rank 为并列后的名次 */
export function examTable(ex: Exam): ExamRow[] {
  const rows: ExamRow[] = []
  S.students.forEach((st) => {
    const t = stuTotal(ex, st.id)
    if (t === null) return
    rows.push({ sid: st.id, total: t, subs: ex.scores[st.id] || {}, rank: 0 })
  })
  rows.sort((a, b) => b.total - a.total)
  let last: number | null = null
  let lastRank = 0
  rows.forEach((r, i) => {
    if (r.total !== last) {
      lastRank = i + 1
      last = r.total
    }
    r.rank = lastRank
  })
  return rows
}

export function rankMap(ex: Exam | null): Record<string, ExamRow> {
  const m: Record<string, ExamRow> = {}
  if (!ex) return m
  examTable(ex).forEach((r) => {
    m[r.sid] = r
  })
  return m
}

export function subjectStats(ex: Exam, name: string): SubjectStats {
  let full = 100
  ex.subjects.forEach((s) => {
    if (s.name === name) full = s.full
  })
  const vals: number[] = []
  S.students.forEach((st) => {
    const row = ex.scores[st.id]
    if (row && typeof row[name] === 'number') vals.push(row[name] as number)
  })
  if (!vals.length) return { name, full, n: 0 }
  const a = avg(vals)
  return {
    name,
    full,
    n: vals.length,
    avg: a,
    rate: a / full,
    max: Math.max(...vals),
    min: Math.min(...vals),
    pass: vals.filter((v) => v >= full * 0.6).length / vals.length,
    good: vals.filter((v) => v >= full * 0.85).length / vals.length,
    low: vals.filter((v) => v < full * 0.6).length
  }
}

export function examStats(ex: Exam): ExamStats {
  const t = examTable(ex)
  const full = examFull(ex)
  const totals = t.map((r) => r.total)
  const res: ExamStats = {
    ex,
    full,
    n: t.length,
    table: t,
    subs: ex.subjects.map((s) => subjectStats(ex, s.name))
  }
  if (!t.length) return res
  res.avg = avg(totals)
  res.max = Math.max(...totals)
  res.min = Math.min(...totals)
  res.rate = res.avg / full
  res.pass = totals.filter((v) => v >= full * 0.6).length / t.length
  res.good = totals.filter((v) => v >= full * 0.85).length / t.length
  res.sd = Math.sqrt(avg(totals.map((v) => (v - (res.avg as number)) * (v - (res.avg as number)))))
  return res
}

export function entryProgress(ex: Exam): { n: number; total: number } {
  let n = 0
  const total = S.students.length
  S.students.forEach((st) => {
    const row = ex.scores[st.id]
    if (row && ex.subjects.every((sb) => row[sb.name] !== undefined && row[sb.name] !== null)) n++
  })
  return { n, total }
}

export interface TrendPoint {
  ex: Exam
  total: number | null
  rank: number | null
  n: number
  rate: number | null
}

export function stuTrend(sid: string): TrendPoint[] {
  return examsSorted().map((ex) => {
    const m = rankMap(ex)
    const r = m[sid]
    return {
      ex,
      total: r ? r.total : null,
      rank: r ? r.rank : null,
      n: Object.keys(m).length,
      rate: r ? r.total / examFull(ex) : null
    }
  })
}

/** 本周（周一起）积分最高的 3 位同学 */
export function weekStars(): { name: string; pts: string }[] {
  const n = new Date()
  const wd = (n.getDay() + 6) % 7
  const since = new Date(n.getFullYear(), n.getMonth(), n.getDate() - wd).getTime()
  const m: Record<string, number> = {}
  S.points.forEach((p) => {
    if (p.t >= since) m[p.sid] = (m[p.sid] || 0) + p.d
  })
  const byId = (id: string) => S.students.find((s) => s.id === id)
  return Object.keys(m)
    .filter((k) => m[k] > 0 && byId(k))
    .sort((a, b) => m[b] - m[a])
    .slice(0, 3)
    .map((k) => ({ name: (byId(k) as { name: string }).name, pts: '+' + m[k] }))
}

/** 本月过生日的同学 */
export function monthBirthdays(): { name: string; date: string }[] {
  const mo = new Date().getMonth() + 1
  return S.students
    .map((s) => {
      const b = parseDate(s.birthday)
      return b && b.getMonth() + 1 === mo ? { name: s.name, d: b.getDate() } : null
    })
    .filter((x): x is { name: string; d: number } => !!x)
    .sort((a, b) => a.d - b.d)
    .map((x) => ({ name: x.name, date: mo + '月' + x.d + '日' }))
}

/** 某次考试中相对对比考试退步 5 名以上的同学 */
export function decliningStudents(ex: Exam, cmp: Exam): { sid: string; diff: number }[] {
  const rm = rankMap(ex)
  const pm = rankMap(cmp)
  return S.students
    .filter((s) => rm[s.id] && pm[s.id] && pm[s.id].rank - rm[s.id].rank <= -5)
    .map((s) => ({ sid: s.id, diff: rm[s.id].rank - pm[s.id].rank }))
}
