/**
 * 默认状态、示例无关常数、状态迁移
 */
import { deepClone, pad2, todayStr } from './utils'
import type { AiSettings, AppState, Countdown, Reason, Settings, Subject } from './types'

export const VERSION = '1.0.0'
export const STORE_KEY = 'bzr-workbench-v1'

export const SUBJECT_PRESETS: Record<string, [string, number][]> = {
  小学: [
    ['语文', 100],
    ['数学', 100],
    ['英语', 100],
    ['科学', 100],
    ['道法', 100]
  ],
  初中: [
    ['语文', 120],
    ['数学', 120],
    ['英语', 120],
    ['物理', 100],
    ['化学', 100],
    ['道法', 100],
    ['历史', 100],
    ['地理', 100],
    ['生物', 100]
  ],
  高中: [
    ['语文', 150],
    ['数学', 150],
    ['英语', 150],
    ['物理', 100],
    ['化学', 100],
    ['生物', 100],
    ['政治', 100],
    ['历史', 100],
    ['地理', 100]
  ]
}

export const DEFAULT_REASONS: Reason[] = [
  { t: '积极发言', d: 1 },
  { t: '作业优秀', d: 1 },
  { t: '乐于助人', d: 1 },
  { t: '值日认真', d: 1 },
  { t: '考试进步', d: 2 },
  { t: '为班争光', d: 3 },
  { t: '上课走神', d: -1 },
  { t: '作业未交', d: -1 },
  { t: '迟到', d: -1 },
  { t: '违反纪律', d: -2 }
]

export const ROLES = [
  '班长',
  '副班长',
  '学习委员',
  '纪律委员',
  '体育委员',
  '文艺委员',
  '劳动委员',
  '宣传委员',
  '心理委员',
  '语文课代表',
  '数学课代表',
  '英语课代表',
  '物理课代表',
  '化学课代表',
  '小组长'
]

export const TAG_POOL = [
  '重点关注',
  '住校',
  '留守',
  '单亲',
  '近视',
  '过敏',
  '体育特长',
  '文艺特长',
  '进步明显',
  '偏科',
  '心理关注',
  '困难帮扶'
]

export const FAMILY_TYPES = ['双亲家庭', '单亲家庭', '重组家庭', '隔代抚养', '父母在外务工', '其他']

export const RECORD_TYPES = ['表扬', '谈话', '家访', '获奖', '提醒', '其他']

export const ATT: Record<string, { t: string; tone: string }> = {
  leave: { t: '请假', tone: 'amber' },
  absent: { t: '缺勤', tone: 'red' },
  late: { t: '迟到', tone: 'blue' }
}

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

/** 学号顺延：找出最大尾号 +1 */
export function nextNo(students: { no?: string }[], len = 2): string {
  let max = 0
  let pre = ''
  let w = len
  students.forEach((s) => {
    const m = String(s.no || '').match(/^(.*?)(\d+)$/)
    if (m && +m[2] > max) {
      max = +m[2]
      pre = m[1]
      w = m[2].length
    }
  })
  if (!max) return pad2(students.length + 1)
  let n = String(max + 1)
  while (n.length < w) n = '0' + n
  return pre + n
}
