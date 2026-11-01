/**
 * 教室页：排座相关逻辑（随机打乱、优带弱、男女同桌、撤销、打印座位表）
 */
import { ref } from 'vue'
import { S, save } from '@core/app'
import { allSeats, latestExam, seatMap } from '@core/select'
import { rankMap } from '@core/stats'
import { todayStr } from '@core/utils'
import { toast } from '@ui/shell/toast'
import type { Student } from '@core/types'

export const seatUndo = ref<[string, string | null, number][] | null>(null)

export function shuffleArr<T>(a: T[]): T[] {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const t = a[i]
    a[i] = a[j]
    a[j] = t
  }
  return a
}

export function snapshotSeats(): void {
  seatUndo.value = S.students.map((s) => [s.id, s.seat, s.group])
}

export function autoGroupsImpl(): void {
  S.students.forEach((s) => {
    if (s.seat) s.group = Math.floor(+s.seat.split('-')[1] / 2)
  })
}

export function placePairs(pairs: (Student | null)[][]): void {
  const desks: string[][] = []
  for (let r = 0; r < S.settings.rows; r++)
    for (let p = 0; p < S.settings.pairs; p++) desks.push([r + '-' + p * 2, r + '-' + (p * 2 + 1)])
  S.students.forEach((s) => {
    s.seat = null
  })
  pairs.forEach((pr, i) => {
    const d = desks[i]
    if (!d) return
    if (pr[0]) pr[0].seat = d[0]
    if (pr[1]) pr[1].seat = d[1]
  })
  autoGroupsImpl()
  save()
}

export function seatShuffle(): void {
  snapshotSeats()
  const list = shuffleArr(S.students.slice())
  const seats = allSeats()
  S.students.forEach((s) => {
    s.seat = null
  })
  list.forEach((s, i) => {
    s.seat = seats[i] || null
  })
  autoGroupsImpl()
  save()
  toast('已随机打乱座位')
}

export function seatMentor(): void {
  const ex = latestExam()
  if (!ex) {
    toast('还没有考试成绩，先去录入一次吧')
    return
  }
  snapshotSeats()
  const rm = rankMap(ex)
  const list = S.students.slice().sort((a, b) => (rm[a.id] ? rm[a.id].rank : 999) - (rm[b.id] ? rm[b.id].rank : 999))
  const pairs: (Student | null)[][] = []
  while (list.length) {
    const a = list.shift() as Student
    const b = list.length ? (list.pop() as Student) : null
    pairs.push([a, b])
  }
  placePairs(shuffleArr(pairs))
  toast('已按「' + ex.name + '」排名：前后搭配做同桌')
}

export function seatGender(): void {
  snapshotSeats()
  const boys = shuffleArr(S.students.filter((s) => s.gender !== 'F'))
  const girls = shuffleArr(S.students.filter((s) => s.gender === 'F'))
  const pairs: (Student | null)[][] = []
  while (boys.length && girls.length)
    pairs.push(Math.random() < 0.5 ? [boys.pop() || null, girls.pop() || null] : [girls.pop() || null, boys.pop() || null])
  const rest = boys.concat(girls)
  while (rest.length) pairs.push([rest.shift() || null, rest.length ? rest.shift() || null : null])
  placePairs(shuffleArr(pairs))
  toast('已安排男女同桌')
}

export function seatUndoAct(): void {
  if (!seatUndo.value) {
    toast('没有可以撤销的调整')
    return
  }
  const m: Record<string, [string, string | null, number]> = {}
  seatUndo.value.forEach((x) => {
    m[x[0]] = x
  })
  S.students.forEach((s) => {
    if (m[s.id]) {
      s.seat = m[s.id][1]
      s.group = m[s.id][2]
    }
  })
  seatUndo.value = null
  save()
  toast('已撤销')
}

export function seatPrint(): void {
  const m = seatMap()
  const cols = S.settings.pairs * 2
  let h =
    '<!doctype html><html><head><meta charset="utf-8"><title>' +
    S.settings.className +
    ' 座位表</title><style>body{font-family:"PingFang SC","Microsoft YaHei",sans-serif;padding:24px;color:#171717}h1{font-size:20px;text-align:center;margin:0 0 4px}p{text-align:center;color:#777;margin:0 0 18px;font-size:12px}.pod{width:40%;margin:0 auto 18px;text-align:center;border:1.5px solid #171717;border-radius:8px;padding:8px;font-weight:600}table{border-collapse:separate;border-spacing:6px;margin:0 auto}td{width:84px;height:46px;border:1px solid #cfcfcc;border-radius:6px;text-align:center;font-size:14px}td.gap{border:0;width:18px}td small{display:block;color:#999;font-size:10px}td.e{color:#ccc}@media print{body{padding:0}}</style></head><body>'
  h +=
    '<h1>' +
    S.settings.className +
    ' 座位表</h1><p>' +
    (S.settings.school || '') +
    ' · ' +
    todayStr() +
    ' · 讲台在上方</p><div class="pod">讲 台</div><table>'
  for (let r = 0; r < S.settings.rows; r++) {
    h += '<tr>'
    for (let c = 0; c < cols; c++) {
      const stu = m[r + '-' + c]
      h += stu ? '<td>' + stu.name + '<small>' + (stu.no || '') + '</small></td>' : '<td class="e">空</td>'
      if (c % 2 === 1 && c < cols - 1) h += '<td class="gap"></td>'
    }
    h += '</tr>'
  }
  h += '</table><script>setTimeout(function(){window.print()},300)<\/script></body></html>'
  const w = window.open('', '_blank')
  if (!w) {
    toast('浏览器拦截了新窗口，请允许弹出窗口')
    return
  }
  w.document.write(h)
  w.document.close()
}
