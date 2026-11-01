/**
 * 批量任务：把模板展开成"每人一条提示词"的作业列表
 *
 * 职责：面向多学生的批量生成（期末评语、家长沟通）。
 * 供 ui/ai 的批量调度器调用。
 */

import { S } from '../app'
import { Mask } from '../ai'
import { examById, prevExam, stuById } from '../select'
import { rankMap } from '../stats'
import { studentContext, sysPrompt } from './context'
import { commentPrompt } from './templates'
import type { Tpl, TplValues } from './templates'
import type { Student } from '../types'

/* ---------- 批量任务 ---------- */

export interface BatchJob {
  sid: string
  prompt: string
}

export function batchJobs(tpl: Tpl, v: TplValues): BatchJob[] {
  if (tpl.id === 'comments') {
    const sids = (v.students as string[]) || []
    return sids.map((sid) => {
      const s = stuById(sid) as Student
      return { sid, prompt: Mask.apply(studentContext(s) + '\n【任务】\n' + commentPrompt(v)) }
    })
  }
  if (tpl.id === 'parent-batch') {
    const ex = examById(String(v.exam))
    const pe = v.cmp ? examById(String(v.cmp)) : ex ? prevExam(ex) : null
    if (!ex || !pe || pe === ex) return []
    const rm = rankMap(ex)
    const pm = rankMap(pe)
    return S.students
      .filter((s) => rm[s.id] && pm[s.id] && pm[s.id].rank - rm[s.id].rank <= -5)
      .map((s) => ({
        sid: s.id,
        prompt: Mask.apply(
          studentContext(s) +
            '\n【任务】\n这位同学在「' +
            ex.name +
            '」中比「' +
            pe.name +
            '」退步了 ' +
            (rm[s.id].rank - pm[s.id].rank) +
            ' 名。请写一条给家长的' +
            v.channel +
            '：先肯定孩子的优点，再客观说明变化（不要直接说排名，用各科表现描述），提出 2 条家校配合的具体办法，语气尊重温和，250 字以内。只输出正文。'
        )
      }))
  }
  return []
}

export function batchCombinedPrompt(tpl: Tpl, v: TplValues): string {
  const jobs = batchJobs(tpl, v)
  if (!jobs.length) return '（没有符合条件的学生）'
  const head = sysPrompt() + '\n\n下面有 ' + jobs.length + ' 位同学的资料，请逐一完成任务，每位同学用「### 【学生编号】」或「### 姓名」作为小标题分隔。\n\n'
  return head + jobs.map((j, i) => '=== 第 ' + (i + 1) + ' 位 ===\n' + j.prompt).join('\n\n')
}
