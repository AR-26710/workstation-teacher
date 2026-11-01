/**
 * 状态迁移：把任意历史版本或损坏的数据修补成当前版本
 *
 * 职责：只做"补齐缺失字段 + 剔除脏数据"，不做业务判断。
 * 每次读取本地存储时都会经过它，是数据兼容的唯一入口。
 */

import { defaultState } from './defaults'
import { todayStr } from '@core/utils'
import type { AppState } from '@core/types'

/**
 * 迁移 / 修复历史数据：补齐缺失字段、剔除脏数据
 */
export function migrate(raw: Partial<AppState> | null): AppState {
  const s = raw as AppState
  if (!s || typeof s !== 'object') return defaultState()
  const d = defaultState()
  s.settings = Object.assign({}, d.settings, s.settings || {})
  s.settings.ai = Object.assign({}, d.settings.ai, s.settings.ai || {})
  s.settings.teacher = Object.assign({}, d.settings.teacher, s.settings.teacher || {})
  s.settings.countdown = Object.assign({}, d.settings.countdown, s.settings.countdown || {})
  if (s.settings.ai.model === 'deepseek-chat' || s.settings.ai.model === 'deepseek-reasoner') {
    s.settings.ai.model = 'deepseek-flash'
  }
  if (/^moonshot-v1/.test(s.settings.ai.model)) s.settings.ai.model = 'kimi-k3'
  ;(['students', 'exams', 'points', 'records', 'todos', 'chats'] as const).forEach((k) => {
    if (!Array.isArray(s[k])) s[k] = []
  })
  if (!s.attendance || typeof s.attendance !== 'object') s.attendance = {}
  Object.keys(s.attendance).forEach((k) => {
    if (!s.attendance[k] || typeof s.attendance[k] !== 'object') s.attendance[k] = {}
  })
  s.students = s.students.filter((st) => st && st.id && st.name)
  s.exams = s.exams
    .filter((e) => e && e.id)
    .map((e) => {
      if (!Array.isArray(e.subjects)) e.subjects = []
      e.subjects = e.subjects.filter((x) => x && x.name).map((x) => ({ name: x.name, full: +x.full > 0 ? +x.full : 100 }))
      if (!e.scores || typeof e.scores !== 'object') e.scores = {}
      if (!e.name) e.name = '未命名考试'
      if (!e.date) e.date = todayStr()
      return e
    })
  s.points = s.points.filter((p) => p && p.sid && typeof p.d === 'number')
  s.records = s.records.filter((r) => r && r.sid)
  // 上次关闭页面时正在生成的回复：标记为中断，允许重试
  s.chats.forEach((c) => {
    ;(c.msgs || []).forEach((m) => {
      if (m.streaming) {
        m.streaming = false
        if (!m.content) m.err = '上次生成被中断了（页面关闭或刷新），可以点「重试」。'
        else m.content += '\n\n（上次生成被中断，可以点「重新生成」）'
      }
      if (m.batch) m.batch.items.forEach((it) => { if (it.st === 'run') it.st = 'wait' })
    })
    if (!Array.isArray(c.msgs)) c.msgs = []
  })
  s.students.forEach((st) => {
    if (!st.parents) st.parents = []
    if (!st.tags) st.tags = []
    if (!st.comments) st.comments = []
  })
  if (typeof s.v !== 'number') s.v = 1
  if (typeof s.demo !== 'boolean') s.demo = false
  return s
}
