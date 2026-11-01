/**
 * 编号自增：学号顺延
 *
 * 职责：从现有名单里找出最大尾号并 +1，保持位数与前缀一致。
 */

import { pad2 } from '@core/utils'

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
