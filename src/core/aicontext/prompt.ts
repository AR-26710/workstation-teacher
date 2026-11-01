/**
 * 提示词组装：把模板任务拼成可发送 / 可复制的最终文本
 *
 * 职责：区分"网页版 AI 用的完整提示词"和"走 API 时的 user 消息"两种形态，
 * 并提供模板字段默认值与下拉名单。
 */

import { Mask } from '@core/ai'
import { examsSorted, studentsByNo } from '@core/select'
import { sysPrompt } from './context'
import type { TplJob, TplField } from './templates'
import type { Exam, Student } from '@core/types'

/** 给网页版 AI 用的完整提示词 */
export function fullPrompt(job: TplJob): string {
  return Mask.apply(sysPrompt() + '\n\n' + (job.ctx || []).join('\n') + '\n' + job.prompt)
}

/** 走 API 时真正作为 user 消息发送的内容 */
export function userContent(job: TplJob): string {
  return Mask.apply((job.ctx && job.ctx.length ? job.ctx.join('\n') + '\n【任务】\n' : '') + job.prompt)
}

/** 模板字段的默认值（支持函数） */
export function fieldDefault(f: TplField): unknown {
  const d = f[3] as unknown
  return typeof d === 'function' ? (d as () => unknown)() : d
}

/** 学生下拉用的排序名单 */
export function tplStudentList(): Student[] {
  return studentsByNo()
}

/** 考试下拉（新 → 旧） */
export function tplExamList(): Exam[] {
  return examsSorted().reverse()
}
