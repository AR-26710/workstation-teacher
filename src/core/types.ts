/**
 * 班主任工作台 · 数据模型类型定义
 */

export type Gender = 'M' | 'F'

/** 考勤状态：请假 / 缺勤 / 迟到 */
export type AttStatus = 'leave' | 'absent' | 'late'

export interface Teacher {
  name: string
  gender: Gender
  subject: string
}

export interface Parent {
  name: string
  rel: string
  phone: string
  job?: string
}

export interface StudentComment {
  id: string
  text: string
  date: string
  src: '手写' | 'AI' | string
}

export interface Student {
  id: string
  name: string
  gender: Gender
  no: string
  seat: string | null
  group: number
  birthday: string
  role: string
  tags: string[]
  boarding: boolean
  parents: Parent[]
  family: string
  familyNote: string
  study: string
  strengths: string
  personality: string
  health: string
  note: string
  comments: StudentComment[]
  /** 脱敏编号序号（由 Mask 分配，保证历史对话里的编号稳定） */
  mk?: number
}

export interface Subject {
  name: string
  full: number
}

/** 单科成绩：number 为分数，null 为缺考，undefined 为未录入 */
export type ScoreValue = number | null | undefined

export interface Exam {
  id: string
  name: string
  date: string
  type: string
  subjects: Subject[]
  scores: Record<string, Record<string, ScoreValue>>
}

export interface Point {
  id: string
  sid: string
  d: number
  r: string
  t: number
}

export interface RecordItem {
  id: string
  sid: string
  type: string
  text: string
  date: string
}

export interface Todo {
  id: string
  text: string
  done: boolean
}

export interface BatchItem {
  sid: string
  prompt: string
  text: string
  st: 'wait' | 'run' | 'done' | 'err'
  err?: string
  saved?: boolean
}

export interface BatchPayload {
  kind: string
  items: BatchItem[]
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  show?: string
  streaming?: boolean
  err?: string
  batch?: BatchPayload
}

export interface Chat {
  id: string
  title: string
  date: number
  tpl?: string
  sid?: string | null
  saveAs?: string | null
  batchOnly?: boolean
  msgs: ChatMessage[]
}

export interface Reason {
  t: string
  d: number
}

export interface Countdown {
  label: string
  date: string
}

export interface AiSettings {
  provider: string
  base: string
  key: string
  model: string
  mask: boolean
  temp: number
}

export interface Settings {
  school: string
  className: string
  stage: '小学' | '初中' | '高中' | string
  grade: string
  term: string
  termStart: string
  countdown: Countdown
  teacher: Teacher
  rows: number
  pairs: number
  subjects: Subject[]
  boardLeft: string
  boardRight: string
  reasons: Reason[]
  anim: boolean
  ai: AiSettings
  lastBackup: number
  onboarded: boolean
  maskSeq?: number
}

export interface AppState {
  v: number
  demo: boolean
  settings: Settings
  students: Student[]
  exams: Exam[]
  attendance: Record<string, Record<string, AttStatus>>
  points: Point[]
  records: RecordItem[]
  todos: Todo[]
  chats: Chat[]
}

/** 教室场景里每位同学的显示状态（由 buildViews 生成） */
export interface SeatView {
  cls?: string
  chip?: string
  chipTone?: string
  badge?: string
  badgeTone?: string
  tint?: string
  color?: string
}

/** 成绩统计：单行 */
export interface ExamRow {
  sid: string
  total: number
  rank: number
  subs: Record<string, ScoreValue>
}

export interface SubjectStats {
  name: string
  full: number
  n: number
  avg?: number
  rate?: number
  max?: number
  min?: number
  pass?: number
  good?: number
  low?: number
}

export interface ExamStats {
  ex: Exam
  full: number
  n: number
  table: ExamRow[]
  subs: SubjectStats[]
  avg?: number
  max?: number
  min?: number
  rate?: number
  pass?: number
  good?: number
  sd?: number
}
