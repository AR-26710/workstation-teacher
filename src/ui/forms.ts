/**
 * 各类表单弹窗的统一入口
 */
import { openModal } from './modal'
import StudentFormModal from '../components/StudentFormModal.vue'
import ExamFormModal from '../components/ExamFormModal.vue'
import ImportStudentsModal from '../components/ImportStudentsModal.vue'
import ScoreImportModal from '../components/ScoreImportModal.vue'
import PointBoardModal from '../components/PointBoardModal.vue'
import DemoClearModal from '../components/DemoClearModal.vue'
import type { Student } from '../core/types'

export function openStudentForm(st: Student | null, opts: { seat?: string | null } = {}): void {
  openModal({
    title: st ? '编辑 · ' + st.name : '添加学生',
    component: StudentFormModal,
    props: { sid: st ? st.id : null, presetSeat: opts.seat || null },
    wide: true,
    foot: 'none'
  })
}

export function openExamForm(id: string | null): void {
  openModal({
    title: id ? '编辑考试' : '新建考试',
    component: ExamFormModal,
    props: { id },
    foot: 'none'
  })
}

export function openImportStudents(): void {
  openModal({
    title: '批量导入学生',
    component: ImportStudentsModal,
    wide: true,
    foot: 'none'
  })
}

export function openScoreImport(examId: string, examName: string): void {
  openModal({
    title: '按表头导入成绩 · ' + examName,
    component: ScoreImportModal,
    props: { id: examId },
    wide: true,
    foot: 'none'
  })
}

export function openPointBoard(): void {
  openModal({
    title: '积分榜',
    component: PointBoardModal,
    wide: true,
    foot: 'none'
  })
}

export function openDemoClear(): void {
  openModal({
    title: '开始使用我的班级',
    component: DemoClearModal,
    foot: 'none'
  })
}
