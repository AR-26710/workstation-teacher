/**
 * 默认状态工厂：新用户 / 清数据时的出厂状态
 *
 * 职责：定义「一份干净的数据长什么样」。
 * 版本迁移时的兜底基准也来自这里（见 migrate.ts）。
 */

import { DEFAULT_REASONS, SUBJECT_PRESETS } from './constants'
import { deepClone } from '@core/utils'
import type { AiSettings, AppState, Countdown, Settings, Subject } from '@core/types'

export const VERSION = '1.0.0'
export const STORE_KEY = 'bzr-workbench-v1'

export function defaultAi(): AiSettings {
  return { provider: 'deepseek', base: 'https://api.deepseek.com', key: '', model: 'deepseek-flash', mask: true, temp: 0.7 }
}

export function defaultCountdown(): Countdown {
  return { label: '期末考试', date: '2027-01-15' }
}

export function defaultSubjects(stage = '初中'): Subject[] {
  const list = SUBJECT_PRESETS[stage] || SUBJECT_PRESETS['初中']
  return list.slice(0, 6).map((x) => ({ name: x[0], full: x[1] }))
}

export function defaultSettings(): Settings {
  return {
    school: '',
    className: '我的班级',
    stage: '初中',
    grade: '',
    term: '',
    termStart: '2026-09-01',
    countdown: defaultCountdown(),
    teacher: { name: '老师', gender: 'F', subject: '' },
    rows: 6,
    pairs: 4,
    subjects: defaultSubjects(),
    boardLeft: '1 语文  2 数学\n3 英语  4 物理\n5 体育  6 道法\n7 自习',
    boardRight: '值日：待安排\n作业：',
    reasons: deepClone(DEFAULT_REASONS),
    anim: true,
    ai: defaultAi(),
    lastBackup: 0,
    onboarded: false
  }
}

export function defaultState(): AppState {
  return {
    v: 1,
    demo: false,
    settings: defaultSettings(),
    students: [],
    exams: [],
    attendance: {},
    points: [],
    records: [],
    todos: [],
    chats: []
  }
}
