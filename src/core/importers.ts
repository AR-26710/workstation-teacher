/**
 * 表格导入：学生名单 / 成绩（支持 Excel 粘贴与 CSV）
 */
import { S } from './app'
import { FAMILY_TYPES } from './state'
import { autoGroups, firstEmptySeat, stuById } from './select'
import { nextNo } from './state'
import { pad2, uid } from './utils'
import { parseTable } from './files'
import type { Exam, Gender, Student } from './types'

const STU_COLS: [string, string[]][] = [
  ['name', ['姓名', '名字', '学生姓名']],
  ['gender', ['性别']],
  ['no', ['学号', '编号']],
  ['birthday', ['生日', '出生日期', '出生年月']],
  ['role', ['职务', '班干部']],
  ['p0name', ['家长姓名', '家长', '联系人', '监护人']],
  ['p0rel', ['关系', '家长关系']],
  ['p0phone', ['家长电话', '联系电话', '电话', '手机']],
  ['family', ['家庭结构', '家庭情况']],
  ['familyNote', ['家庭备注']],
  ['study', ['学习情况']],
  ['personality', ['性格', '性格特长']],
  ['health', ['健康', '健康情况']],
  ['note', ['备注', '其他备注']]
]

export interface ParsedStudents {
  rows: string[][]
  map: Record<string, number>
}

export function parseStudentTable(text: string): ParsedStudents {
  const rows = parseTable(text)
  if (rows.length < 2) return { rows: [], map: {} }
  const head = rows[0].map((h) => h.replace(/[（(][^）)]*[）)]/g, '').replace(/[\s*：:]/g, ''))
  const map: Record<string, number> = {}
  const used: Record<number, number> = {}
  ;[0, 1].forEach((pass) => {
    head.forEach((hd, i) => {
      if (used[i] || !hd) return
      STU_COLS.forEach((c) => {
        if (used[i] || map[c[0]] !== undefined) return
        const hit = c[1].some((al) => (pass === 0 ? hd === al : hd.indexOf(al) === 0))
        if (hit) {
          map[c[0]] = i
          used[i] = 1
        }
      })
    })
  })
  return { rows: rows.slice(1), map }
}

export function importStudents(text: string, autoSeat: boolean): { added: number; skipped: number } {
  const p = parseStudentTable(text)
  if (p.map.name === undefined) return { added: -1, skipped: 0 }
  let added = 0
  let skipped = 0
  p.rows.forEach((row) => {
    const g = (k: string): string => (p.map[k] !== undefined ? (row[p.map[k]] || '').trim() : '')
    const name = g('name')
    if (!name) return
    if (S.students.some((s) => s.name === name && (!g('no') || s.no === g('no')))) {
      skipped++
      return
    }
    let bd = g('birthday').replace(/[年月\/.]/g, '-').replace(/日/g, '')
    const bp = bd.split('-')
    bd = bp.length === 3 ? bp[0] + '-' + pad2(+bp[1]) + '-' + pad2(+bp[2]) : ''
    const fam = g('family')
    const st: Student = {
      id: uid('stu'),
      name,
      gender: /女|f/i.test(g('gender')) ? 'F' : ('M' as Gender),
      no: g('no') || nextNo(S.students),
      seat: autoSeat ? firstEmptySeat() : null,
      group: 0,
      birthday: bd,
      role: g('role'),
      tags: [],
      boarding: false,
      parents: g('p0name') || g('p0phone') ? [{ name: g('p0name'), rel: g('p0rel') || '家长', phone: g('p0phone'), job: '' }] : [],
      family: FAMILY_TYPES.indexOf(fam) >= 0 ? fam : fam ? '其他' : '双亲家庭',
      familyNote: FAMILY_TYPES.indexOf(fam) >= 0 ? g('familyNote') : [fam, g('familyNote')].filter(Boolean).join('；'),
      study: g('study'),
      strengths: '',
      personality: g('personality'),
      health: g('health'),
      note: g('note'),
      comments: []
    }
    S.students.push(st)
    added++
  })
  autoGroups()
  return { added, skipped }
}

/** 成绩：把文本解析成 score 的取值（null 缺考，undefined 空） */
export function parseScore(t: string | number | null | undefined): number | null | undefined {
  let s = String(t == null ? '' : t).replace(/[０-９．－]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0)).trim()
  if (s === '') return undefined
  if (/^(缺|缺考|-|—|\/|x|X)$/.test(s)) return null
  const n = parseFloat(s.replace(/[^\d.\-]/g, ''))
  return isNaN(n) ? undefined : n
}

export interface ParsedScores {
  rows: string[][]
  ni: number
  noi: number
  cols: Record<string, number>
}

export function parseScoreTable(text: string, ex: Exam): ParsedScores | null {
  const rows = parseTable(text)
  if (rows.length < 2) return null
  const head = rows[0].map((x) => x.replace(/\s/g, ''))
  let ni = head.indexOf('姓名')
  const noi = head.indexOf('学号')
  if (ni < 0) ni = head.indexOf('名字')
  const cols: Record<string, number> = {}
  ex.subjects.forEach((s) => {
    const i = head.indexOf(s.name)
    if (i >= 0) cols[s.name] = i
  })
  return { rows: rows.slice(1), ni, noi, cols }
}

export function findStu(name: string, no: string): Student | null {
  const n = (name || '').trim()
  const o = (no || '').trim()
  if (o) {
    for (let i = 0; i < S.students.length; i++) if (String(S.students[i].no) === o) return S.students[i]
  }
  if (n) {
    const m = S.students.filter((s) => s.name === n)
    if (m.length === 1) return m[0]
  }
  return null
}

export function setScore(ex: Exam, sid: string, sub: string, v: number | null | undefined): void {
  if (!ex.scores[sid]) ex.scores[sid] = {}
  if (v === undefined) delete ex.scores[sid][sub]
  else ex.scores[sid][sub] = v
}

export { stuById }
