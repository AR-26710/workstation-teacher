/**
 * 通用工具函数（日期、数字、格式化、转义）
 */
import type { Gender } from './types'

export function esc(s: unknown): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function uid(p = 'id'): string {
  return p + Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}

export function clamp(v: number, a: number, b: number): number {
  return Math.max(a, Math.min(b, v))
}

export function round1(v: number): number {
  return Math.round(v * 10) / 10
}

export function pad2(n: number): string {
  return (n < 10 ? '0' : '') + n
}

export function todayStr(d?: Date): string {
  const x = d || new Date()
  return x.getFullYear() + '-' + pad2(x.getMonth() + 1) + '-' + pad2(x.getDate())
}

export function parseDate(s: string | null | undefined): Date | null {
  if (!s) return null
  const p = String(s).split(/[-\/.]/)
  if (p.length < 3) return null
  const d = new Date(+p[0], +p[1] - 1, +p[2])
  return isNaN(d.getTime()) ? null : d
}

export function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86400000)
}

export const WEEK = ['日', '一', '二', '三', '四', '五', '六']

export function fmtMD(s: string): string {
  const d = parseDate(s)
  return d ? d.getMonth() + 1 + '月' + d.getDate() + '日' : ''
}

export function fmtShort(s: string): string {
  const d = parseDate(s)
  return d ? pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()) : ''
}

export function fmtTime(ts: number): string {
  const d = new Date(ts)
  return pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()) + ' ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes())
}

export function sum(a: number[]): number {
  let s = 0
  for (let i = 0; i < a.length; i++) s += a[i]
  return s
}

export function avg(a: number[]): number {
  return a.length ? sum(a) / a.length : 0
}

export function fmtNum(v: number | null | undefined, d = 1): string {
  if (v === null || v === undefined || isNaN(v)) return '—'
  const m = Math.pow(10, d)
  return String(Math.round(v * m) / m)
}

export function pct(v: number | null | undefined): string {
  if (v === null || v === undefined || isNaN(v)) return '—'
  return Math.round(v * 1000) / 10 + '%'
}

export function deepClone<T>(o: T): T {
  return JSON.parse(JSON.stringify(o)) as T
}

export function sexText(g: Gender): string {
  return g === 'F' ? '女' : '男'
}

/** 取数组映射后的最大 / 最小值（空数组时 Math.max 会返回 -Infinity，调用方需自行兜底） */
export function maxOf<T>(arr: T[], fn: (x: T) => number): number {
  return arr.reduce((m, x) => Math.max(m, fn(x)), -Infinity)
}

export function minOf<T>(arr: T[], fn: (x: T) => number): number {
  return arr.reduce((m, x) => Math.min(m, fn(x)), Infinity)
}
