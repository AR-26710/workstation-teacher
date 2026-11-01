/**
 * 隐私脱敏：学生姓名 → 编号，模型返回后再还原
 *
 * 职责：把真实姓名替换成稳定的【学生NN】编号发出去，
 * 收到结果再换回来。编号一经分配不再变动，保证历史对话可读。
 */

import { S, save as saveNow } from '../app'
import { studentsByNo } from '../select'
import { pad2 } from '../utils'

/* ---------- 隐私脱敏：学生姓名 → 编号，结果回来再还原 ---------- */
export const Mask = {
  /** 每个学生分配固定编号（增删学生、改学号都不会变） */
  ensure(): void {
    let seq = S.settings.maskSeq || 0
    let changed = false
    S.students.forEach((s) => {
      if (s.mk && s.mk > seq) seq = s.mk
    })
    studentsSortedByNo().forEach((s) => {
      if (!s.mk) {
        s.mk = ++seq
        changed = true
      }
    })
    if (changed || S.settings.maskSeq !== seq) {
      S.settings.maskSeq = seq
      saveNow()
    }
  },
  code(s: { mk?: number }): string {
    Mask.ensure()
    return '【学生' + pad2(s.mk || 0) + '】'
  },
  build(): { fwd: [string, string][]; back: Record<string, string> } {
    Mask.ensure()
    const fwd: [string, string][] = []
    const back: Record<string, string> = {}
    S.students.forEach((s) => {
      fwd.push([s.name, '【学生' + pad2(s.mk || 0) + '】'])
      back[pad2(s.mk || 0)] = s.name
    })
    fwd.sort((a, b) => b[0].length - a[0].length)
    return { fwd, back }
  },
  apply(t: string): string {
    if (!S.settings.ai.mask || !t) return t
    const m = Mask.build()
    m.fwd.forEach((p) => {
      if (p[0]) t = t.split(p[0]).join(p[1])
    })
    return t
  },
  restore(t: string): string {
    if (!t) return t
    const b = Mask.build().back
    return t.replace(/[【\[]学生(\d{1,3})[】\]]/g, (all, n: string) => {
      const k = pad2(+n)
      return b[k] || all
    })
  }
}

function studentsSortedByNo(): { mk?: number; name: string }[] {
  return studentsByNo()
}
