/**
 * 学生生命周期的领域写操作
 *
 * 与 select.ts（只读查询）相对，这里负责会改变状态的写操作。
 * 删除学生必须级联清理积分、成长记录、成绩、考勤，
 * 这类"数据完整性"规则属于领域层，不该散落在 UI 里。
 */

import { S, save } from './app'
import type { Student } from './types'

/**
 * 删除学生并级联清理所有关联数据
 * 注意：不含确认交互，弹窗确认由 UI 层负责
 */
export function removeStudent(st: Student): void {
  S.students = S.students.filter((s) => s.id !== st.id)
  S.points = S.points.filter((p) => p.sid !== st.id)
  S.records = S.records.filter((r) => r.sid !== st.id)
  S.exams.forEach((e) => {
    delete e.scores[st.id]
  })
  Object.keys(S.attendance).forEach((k) => {
    delete S.attendance[k][st.id]
  })
  save()
}
