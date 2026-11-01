<script setup lang="ts">
/**
 * 教室页：SVG 场景 + 五种模式（日常 / 考勤 / 点评 / 成绩 / 排座）
 * 随机点名、悬浮卡、拖拽排座、缩放平移
 */
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { S, save } from '@core/app'
import { ART } from '@lib/art'
import { CH } from '@lib/charts'
import { ATT } from '@core/state'
import {
  allSeats,
  attToday,
  countdownDays,
  daysToBirthday,
  examById,
  examsSorted,
  latestExam,
  pointsOf,
  prevExam,
  seatMap,
  stuById,
  weekNo
} from '@core/select'
import { monthBirthdays, rankMap, weekStars } from '@core/stats'
import { WEEK, clamp, parseDate, todayStr } from '@core/utils'
import { downloadFile, toCSV } from '@core/files'
import { clsMode, attDate, gradeExam, view, REDUCED, MODES } from '@ui/classroom/mode'
import { railOpen, go } from '@ui/shell/router'
import { addPoint, addPointAll, moveSeat, openStudent } from '@ui/student/actions'
import { floatHook } from '@ui/classroom/float'
import { openStudentForm, openPointBoard, openDemoClear, openImportStudents } from '@ui/forms'
import { toast } from '@ui/shell/toast'
import StudentAvatar from '@components/student/StudentAvatar.vue'
import TeacherAvatar from '@components/common/TeacherAvatar.vue'
import Icon from '@components/common/Icon.vue'
import type { Student } from '@core/types'

const NS = 'http://www.w3.org/2000/svg'

const stageEl = ref<HTMLElement | null>(null)
const innerEl = ref<HTMLElement | null>(null)
const stageW = ref(0)
const stageH = ref(0)

const pickedSeat = ref<string | null>(null)
const entered = ref(false)
const seatUndo = ref<[string, string | null, number][] | null>(null)
const picking = ref(false)
const pickStudent = ref<Student | null>(null)
let pickToken = 0
let recentPicks: string[] = []

/* ---------- 场景 ---------- */
const extra = computed(() => {
  const base = ART.layout(S.settings.rows, S.settings.pairs, 0)
  const W = stageW.value
  const H = stageH.value
  if (!W || !H) return 0
  const s = clamp(Math.max((H - 48 - 62) / base.H, 0.68), 0.3, 1.2)
  const want = (W - 32) / s - base.W
  return Math.round(clamp(want, 0, 1000) / 20) * 20
})

const board = computed(() => {
  const st = S.settings
  const d = new Date()
  const cd = countdownDays()
  const cdd = parseDate(st.countdown.date)
  return {
    leftTitle: '今日课程',
    leftLines: String(st.boardLeft || '').split('\n'),
    rightTitle: '今日事项',
    rightLines: String(st.boardRight || '').split('\n'),
    screenTop: st.className + ' · ' + (d.getMonth() + 1) + '月' + d.getDate() + '日 星期' + WEEK[d.getDay()],
    countLabel: st.countdown.label || '考试',
    days: cd,
    screenBottom: cd === null ? st.school || '' : cdd ? cdd.getFullYear() + '年' + (cdd.getMonth() + 1) + '月' + cdd.getDate() + '日' : '',
    stars: weekStars(),
    bdays: monthBirthdays()
  }
})

const views = computed(() => {
  const v: Record<string, { cls?: string; chip?: string; chipTone?: string; badge?: string; badgeTone?: string; tint?: string }> = {}
  const mode = clsMode.value
  const day = S.attendance[mode === 'att' ? attDate.value : todayStr()] || {}
  let rmap: Record<string, { rank: number }> | null = null
  let pmap: Record<string, { rank: number }> | null = null
  let n = 0
  if (mode === 'grade') {
    const ex = examById(gradeExam.value) || latestExam()
    if (ex) {
      rmap = rankMap(ex) as Record<string, { rank: number }>
      n = Object.keys(rmap).length
      const pe = prevExam(ex)
      pmap = pe ? (rankMap(pe) as Record<string, { rank: number }>) : null
    }
  }
  S.students.forEach((st) => {
    if (!st.seat) return
    const o: Record<string, string> = {}
    const cls: string[] = []
    const a = day[st.id]
    if (a) {
      o.chip = ATT[a].t
      o.chipTone = ATT[a].tone
      if (a !== 'late') cls.push('ghost')
    }
    if (mode === 'points') {
      const p = pointsOf(st.id)
      o.badge = (p > 0 ? '+' : '') + p
      o.badgeTone = p >= 8 ? '' : 'light'
    }
    if (mode === 'grade') {
      const r = rmap && rmap[st.id]
      if (r) {
        const q = n > 1 ? (r.rank - 1) / (n - 1) : 0
        o.tint = CH.SEQ[Math.min(4, Math.floor((1 - q) * 5))]
        const ch = pmap && pmap[st.id] ? pmap[st.id].rank - r.rank : null
        o.badge = '#' + r.rank + (ch !== null && Math.abs(ch) >= 5 ? (ch > 0 ? ' ↑' + ch : ' ↓' + -ch) : '')
        o.badgeTone = ch !== null && ch >= 5 ? 'up' : ch !== null && ch <= -5 ? 'down' : r.rank <= 10 ? '' : 'light'
      } else if (rmap) {
        cls.push('dim')
        o.badge = '无成绩'
        o.badgeTone = 'light'
      }
    }
    if (pickedSeat.value === st.seat) cls.push('picked')
    o.cls = cls.join(' ')
    v[st.id] = o
  })
  return v
})

const scene = computed(() => {
  const t = S.settings.teacher
  return ART.scene({
    rows: S.settings.rows,
    pairs: S.settings.pairs,
    extra: extra.value,
    subjects: S.settings.subjects.map((x) => x.name),
    seats: seatMap(),
    views: views.value,
    teacher: { gender: t.gender, label: t.name + ' · 班主任' },
    board: board.value,
    seatNos: clsMode.value === 'seat'
  })
})

const L = computed(() => scene.value.L)

const innerStyle = computed(() => ({
  width: L.value.W + 'px',
  height: L.value.H + 'px',
  transform:
    'translate(' + Math.round(view.value.x) + 'px,' + Math.round(view.value.y) + 'px) scale(' + view.value.s + ')'
}))

/* ---------- 视图缩放 ---------- */
function applyView(): void {
  const st = stageEl.value
  const v = view.value
  if (st && L.value) {
    const sw = L.value.W * v.s
    const sh = L.value.H * v.s
    const W = st.clientWidth
    const H = st.clientHeight
    const m = 140
    v.x = clamp(v.x, Math.min(m - sw, (W - sw) / 2), Math.max(W - m, (W - sw) / 2))
    v.y = clamp(v.y, Math.min(H - 90 - sh, 52), Math.max(H - m, 52))
  }
}

function fitView(): void {
  const st = stageEl.value
  if (!st || !L.value) return
  const W = st.clientWidth
  const H = st.clientHeight
  const top = 48
  const bottom = 62
  const wFit = (W - 32) / L.value.W
  const hFit = (H - top - bottom) / L.value.H
  const s = clamp(Math.min(wFit, Math.max(hFit, 0.68)), 0.3, 1.2)
  const v = view.value
  v.s = s
  v.x = (W - L.value.W * s) / 2
  v.y = top + Math.max(0, (H - top - bottom - L.value.H * s) / 2)
  v.fit = true
  applyView()
}

function zoomAt(f: number, cx: number, cy: number): void {
  const v = view.value
  const ns = clamp(v.s * f, 0.3, 2.4)
  v.x = cx - (cx - v.x) * (ns / v.s)
  v.y = cy - (cy - v.y) * (ns / v.s)
  v.s = ns
  v.fit = false
  applyView()
}

function zoomIn(): void {
  const st = stageEl.value
  if (st) zoomAt(1.2, st.clientWidth / 2, st.clientHeight / 2)
}
function zoomOut(): void {
  const st = stageEl.value
  if (st) zoomAt(1 / 1.2, st.clientWidth / 2, st.clientHeight / 2)
}

/* ---------- 时钟 ---------- */
function tickClock(): void {
  const g = document.querySelector('.scene-svg .clock') as SVGElement | null
  if (!g) return
  const cx = g.getAttribute('data-cx')
  const cy = g.getAttribute('data-cy')
  const d = new Date()
  const m = d.getMinutes() * 6
  const h = ((d.getHours() % 12) * 30 + d.getMinutes() / 2)
  const hh = g.querySelector('.clock-h')
  const mm = g.querySelector('.clock-m')
  if (hh) hh.setAttribute('transform', 'rotate(' + h + ' ' + cx + ' ' + cy + ')')
  if (mm) mm.setAttribute('transform', 'rotate(' + m + ' ' + cx + ' ' + cy + ')')
}

/* ---------- 飘分 ---------- */
function floatAt(seat: string | null, text: string, color: string): void {
  if (!seat) return
  const fx = document.querySelector('.scene-svg .fx-layer')
  if (!fx) return
  const p = seat.split('-')
  const x = L.value.headX(+p[1])
  const y = L.value.headY(+p[0])
  const t = document.createElementNS(NS, 'text')
  t.setAttribute('x', String(x))
  t.setAttribute('y', String(y - 26))
  t.setAttribute('text-anchor', 'middle')
  t.setAttribute('class', 'float-pt')
  t.setAttribute('fill', color)
  t.setAttribute('stroke', '#fff')
  t.setAttribute('stroke-width', '4')
  t.setAttribute('paint-order', 'stroke')
  t.textContent = text
  fx.appendChild(t)
  window.setTimeout(() => t.remove(), 1200)
}

floatHook.fn = floatAt

/* ---------- 悬浮卡 ---------- */
const cardEl = ref<HTMLElement | null>(null)
const cardOn = ref(false)
const cardHtml = ref('')
const cardPos = ref({ x: 0, y: 0, ax: 150 })
let cardT: number | undefined
let hideT: number | undefined
let hoverEl: Element | null = null

function stuCardHtml(st: Student): string {
  const a = attToday(st.id)
  const lat = latestExam()
  const rm = lat ? rankMap(lat) : {}
  const pe = lat ? prevExam(lat) : null
  const pm = pe ? rankMap(pe) : {}
  const r = rm[st.id]
  const ch = r && pm[st.id] ? pm[st.id].rank - r.rank : null
  const stTxt = a ? ATT[a].t : '在校'
  const stColor = a === 'leave' ? 'var(--amber)' : a === 'absent' ? 'var(--red)' : a === 'late' ? 'var(--blue)' : 'var(--green)'
  const intro = [st.study, st.personality].filter(Boolean).join('；')
  const bdd = daysToBirthday(st)
  const bd = parseDate(st.birthday)
  const ava = ART.avatar(st, 56, { color: ART.groupColor(st.group || 0) })
  let h =
    '<div class="hc-head">' +
    ava +
    '<div style="min-width:0"><div class="hc-name">' +
    st.name +
    '</div><div class="hc-role">' +
    (st.no || '') +
    ' · ' +
    (st.gender === 'F' ? '女生' : '男生') +
    (st.role ? ' · ' + st.role : '') +
    '</div><div class="hc-status"><i style="background:' +
    stColor +
    '"></i>' +
    stTxt +
    ' · ' +
    seatTextOf(st.seat) +
    '</div></div></div>'
  if (intro) h += '<div class="hc-sec"><div class="hc-k">简介：</div><div class="hc-v">' + intro + '</div></div>'
  if (st.family || st.familyNote)
    h += '<div class="hc-sec"><div class="hc-k">家庭：</div><div class="hc-v">' + [st.family, st.familyNote].filter(Boolean).join(' · ') + '</div></div>'
  if (st.tags && st.tags.length)
    h += '<div class="hc-sec"><div class="hc-k">标签：</div><div class="tags">' + st.tags.map((t) => '<span class="tag">' + t + '</span>').join('') + '</div></div>'
  const pts = pointsOf(st.id)
  h +=
    '<div class="hc-stats"><div><b>' +
    (r ? '#' + r.rank : '—') +
    (ch ? '<small class="' + (ch > 0 ? 'up' : 'dn') + '" style="font-size:11px;margin-left:2px">' + (ch > 0 ? '↑' + ch : '↓' + -ch) + '</small>' : '') +
    '</b><span>' +
    (lat ? lat.name : '最近排名') +
    '</span></div><div><b>' +
    (pts > 0 ? '+' : '') +
    pts +
    '</b><span>积分</span></div><div><b>' +
    (bd ? bd.getMonth() + 1 + '/' + bd.getDate() : '—') +
    '</b><span>' +
    (bdd === 0 ? '今天生日' : '生日') +
    '</span></div></div>'
  h +=
    '<div class="hc-act"><button class="btn btn-sm btn-light" data-card="pt-quick" data-sid="' +
    st.id +
    '">+1 表扬</button><button class="btn btn-sm btn-dark" data-card="open" data-sid="' +
    st.id +
    '">查看档案</button></div>'
  return h
}

function teacherCardHtml(): string {
  const t = S.settings.teacher
  const todo = S.todos.filter((x) => !x.done).length
  return (
    '<div class="hc-head">' +
    ART.teacherAvatar(t, 56) +
    '<div><div class="hc-name">' +
    t.name +
    '</div><div class="hc-role">' +
    S.settings.className +
    ' 班主任' +
    (t.subject ? ' · ' + t.subject : '') +
    '</div><div class="hc-status"><i></i>在岗 · 待办 ' +
    todo +
    ' 项</div></div></div>' +
    '<div class="hc-sec"><div class="hc-k">简介：</div><div class="hc-v">全班 ' +
    S.students.length +
    ' 名同学的大家长，统筹班级管理、家校沟通与学生成长。</div></div>' +
    '<div class="hc-sec"><div class="hc-k">AI 能帮你：</div><div class="tags"><span class="tag">写教案</span><span class="tag">期末评语</span><span class="tag">家长会发言稿</span><span class="tag">班会方案</span><span class="tag">家长沟通</span></div></div>' +
    '<div class="hc-act"><button class="btn btn-sm btn-light" data-card="settings-teacher">换形象</button><button class="btn btn-sm btn-dark" data-card="go-ai">打开 AI 助手</button></div>'
  )
}

function seatTextOf(seat: string | null): string {
  if (!seat) return '未排座'
  const p = seat.split('-')
  return '第' + (+p[0] + 1) + '排 第' + (+p[1] + 1) + '座'
}

function showCard(html: string, anchor: Element): void {
  const el = cardEl.value
  if (!el) return
  cardHtml.value = html
  cardOn.value = true
  nextTick(() => {
    const r = anchor.getBoundingClientRect()
    const cw = 300
    const chh = el.offsetHeight || 260
    let x = r.left + r.width / 2 - cw / 2
    x = clamp(x, 12, window.innerWidth - cw - 12)
    const below = r.bottom + chh + 16 < window.innerHeight
    let y = below ? r.bottom + 10 : r.top - chh - 10
    if (!below && y < 8) y = 8
    cardPos.value = { x, y, ax: clamp(r.left + r.width / 2 - x, 20, cw - 20) }
  })
}

function scheduleCard(el: Element): void {
  window.clearTimeout(cardT)
  window.clearTimeout(hideT)
  cardT = window.setTimeout(() => {
    if (down || picking.value || clsMode.value === 'seat' || clsMode.value === 'att' || clsMode.value === 'points') return
    if (el.classList.contains('teacher')) showCard(teacherCardHtml(), el)
    else {
      const st = stuById(el.getAttribute('data-sid'))
      if (st) showCard(stuCardHtml(st), el.querySelector('.stu') || el)
    }
  }, 220)
}

function scheduleHide(): void {
  window.clearTimeout(cardT)
  window.clearTimeout(hideT)
  hideT = window.setTimeout(() => {
    cardOn.value = false
  }, 180)
}

function onCardClick(e: MouseEvent): void {
  const t = (e.target as HTMLElement).closest('[data-card]') as HTMLElement | null
  if (!t) return
  const kind = t.getAttribute('data-card')
  const sid = t.getAttribute('data-sid')
  if (kind === 'pt-quick' && sid) {
    const st = addPoint(sid, 1, '表扬')
    cardOn.value = false
    if (st) toast(st.name + ' +1')
  } else if (kind === 'open' && sid) {
    cardOn.value = false
    openStudent(sid)
  } else if (kind === 'settings-teacher') {
    cardOn.value = false
    go('settings', { sec: 'teacher' })
  } else if (kind === 'go-ai') {
    cardOn.value = false
    go('ai')
  }
}

/* ---------- 点评浮层 ---------- */
const pop = ref<{ x: number; y: number; sid: string } | null>(null)
const popCustom = ref('')
const popSt = computed(() => (pop.value ? stuById(pop.value.sid) : null))
const popPoints = computed(() => (pop.value ? pointsOf(pop.value.sid) : 0))
const popStyle = computed(() => {
  const p = pop.value
  if (!p) return {}
  const w = 286
  const h = 230
  const left = clamp(p.x - w / 2, 10, window.innerWidth - w - 10)
  const top = p.y + h + 20 > window.innerHeight ? p.y - h - 14 : p.y + 14
  return { left: left + 'px', top: top + 'px' }
})

/* ---------- 考勤右键菜单 ---------- */
const attMenu = ref<{ x: number; y: number; sid: string } | null>(null)
const attMenuSt = computed(() => (attMenu.value ? stuById(attMenu.value.sid) : null))
const attMenuCur = computed(() => (attMenu.value ? S.attendance[attDate.value]?.[attMenu.value.sid] || null : null))
const attMenuLabel = computed(() => (attMenuCur.value ? ATT[attMenuCur.value].t : '出勤'))
const attMenuStyle = computed(() => {
  const p = attMenu.value
  if (!p) return {}
  const w = 168
  const h = 190
  const left = clamp(p.x, 8, window.innerWidth - w - 8)
  const top = p.y + h + 16 > window.innerHeight ? Math.max(8, p.y - h) : p.y
  return { left: left + 'px', top: top + 'px' }
})

function onSeatContext(ev: MouseEvent): void {
  if (clsMode.value !== 'att') return
  ev.preventDefault()
  const el = ev.target as Element
  const seat = el.closest ? el.closest('.seat') : null
  const st = seat ? stuById(seat.getAttribute('data-sid')) : null
  if (!st) {
    closeAttMenu()
    return
  }
  attMenu.value = { x: ev.clientX, y: ev.clientY, sid: st.id }
}

function setAtt(status: 'leave' | 'absent' | 'late' | null): void {
  const m = attMenu.value
  if (!m) return
  const d = attDate.value
  if (!S.attendance[d]) S.attendance[d] = {}
  if (status) S.attendance[d][m.sid] = status
  else delete S.attendance[d][m.sid]
  save()
  attMenu.value = null
}

function closeAttMenu(): void {
  attMenu.value = null
}

function onDocPointerDown(e: PointerEvent): void {
  if (!attMenu.value) return
  const t = e.target as Element
  if (t.closest && t.closest('.att-menu')) return
  closeAttMenu()
}

function onDocKeyDown(e: KeyboardEvent): void {
  if (e.key === 'Escape') closeAttMenu()
}

function keepCard(): void {
  window.clearTimeout(hideT)
}

function openPointPop(st: Student, x: number, y: number): void {
  popCustom.value = ''
  pop.value = { x, y, sid: st.id }
}

function closePop(): void {
  pop.value = null
}

function popAdd(d: number, r: string): void {
  if (!pop.value) return
  addPoint(pop.value.sid, d, r)
  pop.value = null
}

function popCustomAdd(d: number): void {
  if (!pop.value) return
  const r = popCustom.value.trim() || (d > 0 ? '表现好' : '需改进')
  addPoint(pop.value.sid, d, r)
  pop.value = null
}

/* ---------- 座位点击 ---------- */
function onSeatClick(seatKey: string, sid: string | null, ev: MouseEvent): void {
  window.clearTimeout(cardT)
  cardOn.value = false
  const st = sid ? stuById(sid) : null
  if (clsMode.value === 'seat') {
    if (!pickedSeat.value) {
      if (st) pickedSeat.value = seatKey
      return
    }
    if (pickedSeat.value === seatKey) {
      pickedSeat.value = null
      return
    }
    moveSeat(pickedSeat.value, seatKey)
    pickedSeat.value = null
    return
  }
  if (!st) {
    openStudentForm(null, { seat: seatKey })
    return
  }
  if (clsMode.value === 'att') return
  if (clsMode.value === 'points') {
    openPointPop(st, ev.clientX, ev.clientY)
    return
  }
  openStudent(st.id, clsMode.value === 'grade' ? 'scores' : 'overview')
}

/* ---------- 指针交互 ---------- */
interface DownState {
  x: number
  y: number
  seat: Element | null
  tch: Element | null
  moved: boolean
  vx: number
  vy: number
  kind: 'drag' | 'click'
  pan: boolean
  id: number
}
let down: DownState | null = null

function onWheel(e: WheelEvent): void {
  const st = stageEl.value
  if (!st) return
  if (!(e.ctrlKey || e.metaKey)) return
  e.preventDefault()
  const r = st.getBoundingClientRect()
  zoomAt(Math.exp(-e.deltaY * 0.0022), e.clientX - r.left, e.clientY - r.top)
}

function onPointerDown(e: PointerEvent): void {
  if (e.button !== 0) return
  const t = e.target as Element
  const seat = t.closest ? t.closest('.seat') : null
  const tch = t.closest ? t.closest('.teacher') : null
  const v = view.value
  down = {
    x: e.clientX,
    y: e.clientY,
    seat,
    tch,
    moved: false,
    vx: v.x,
    vy: v.y,
    kind: clsMode.value === 'seat' && seat && seat.classList.contains('has') ? 'drag' : 'click',
    pan: e.ctrlKey || e.metaKey,
    id: e.pointerId
  }
}

function onPointerMove(e: PointerEvent): void {
  const d = down
  if (!d) return
  const dx = e.clientX - d.x
  const dy = e.clientY - d.y
  if (!d.moved && Math.abs(dx) + Math.abs(dy) > 5) {
    d.moved = true
    cardOn.value = false
    window.clearTimeout(cardT)
    const st = stageEl.value
    if (st) {
      try {
        st.setPointerCapture(d.id)
      } catch {
        /* ignore */
      }
    }
    if (d.kind === 'drag' && d.seat) {
      const stu = stuById(d.seat.getAttribute('data-sid'))
      if (stu) {
        const g = document.createElement('div')
        g.id = 'dragGhost'
        g.style.cssText = 'position:fixed;z-index:70;pointer-events:none;border-radius:50%;box-shadow:0 10px 30px rgba(0,0,0,.18);background:#fff'
        g.innerHTML = ART.avatar(stu, 54, { color: ART.groupColor(stu.group || 0) })
        document.body.appendChild(g)
        d.seat.classList.add('dragging')
      }
    } else if (st && d.pan) st.classList.add('panning')
  }
  if (!d.moved) return
  if (d.kind === 'drag') {
    const gh = document.getElementById('dragGhost')
    if (gh) {
      gh.style.left = e.clientX - 27 + 'px'
      gh.style.top = e.clientY - 27 + 'px'
    }
    const under = document.elementFromPoint(e.clientX, e.clientY)
    const tgt = under && under.closest ? under.closest('.seat') : null
    document.querySelectorAll('.scene-svg .seat.drop-on').forEach((x) => {
      if (x !== tgt) x.classList.remove('drop-on')
    })
    if (tgt && tgt !== d.seat) tgt.classList.add('drop-on')
  } else if (d.pan) {
    const v = view.value
    v.x = d.vx + dx
    v.y = d.vy + dy
    v.fit = false
    applyView()
  }
}

function endPointer(e: PointerEvent): void {
  const d = down
  if (!d) return
  down = null
  const st = stageEl.value
  if (st) {
    st.classList.remove('panning')
    try {
      st.releasePointerCapture(d.id)
    } catch {
      /* ignore */
    }
  }
  const seatNode: Element | null = d.seat
  if (d.kind === 'drag' && d.moved) {
    const gh = document.getElementById('dragGhost')
    if (gh) gh.remove()
    const tgt = document.querySelector('.scene-svg .seat.drop-on')
    if (seatNode) seatNode.classList.remove('dragging')
    if (tgt && seatNode) moveSeat(seatNode.getAttribute('data-seat') || '', tgt.getAttribute('data-seat') || '')
    return
  }
  if (d.moved || e.type === 'pointercancel') return
  if (seatNode) {
    onSeatClick(seatNode.getAttribute('data-seat') || '', seatNode.getAttribute('data-sid'), e)
  } else if (d.tch) {
    showCard(teacherCardHtml(), d.tch)
  }
}

function onOver(e: MouseEvent): void {
  const t = e.target as Element
  const el = t.closest ? t.closest('.seat.has, .teacher') : null
  if (!el) return
  if (el === hoverEl) {
    window.clearTimeout(hideT)
    return
  }
  hoverEl = el
  scheduleCard(el)
}

function onOut(e: MouseEvent): void {
  const t = e.target as Element
  const el = t.closest ? t.closest('.seat.has, .teacher') : null
  const rel = e.relatedTarget as Node | null
  if (el && !(rel && el.contains(rel))) {
    hoverEl = null
    scheduleHide()
  }
}

/* ---------- 排座动作 ---------- */
function shuffleArr<T>(a: T[]): T[] {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const t = a[i]
    a[i] = a[j]
    a[j] = t
  }
  return a
}

function snapshotSeats(): void {
  seatUndo.value = S.students.map((s) => [s.id, s.seat, s.group])
}

function placePairs(pairs: (Student | null)[][]): void {
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

function seatShuffle(): void {
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

function seatMentor(): void {
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

function seatGender(): void {
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

function seatUndoAct(): void {
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

function seatPrint(): void {
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

function autoGroupsImpl(): void {
  S.students.forEach((s) => {
    if (s.seat) s.group = Math.floor(+s.seat.split('-')[1] / 2)
  })
}

/* ---------- 随机点名 ---------- */
function closePick(): void {
  if (picking.value) {
    pickToken++
    picking.value = false
  }
  pickStudent.value = null
  if (stageEl.value) stageEl.value.classList.remove('picking')
  document.querySelectorAll('.scene-svg .seat.picked').forEach((e) => e.classList.remove('picked', 'turn', 'hand'))
  const t = document.querySelector('.scene-svg .teacher')
  if (t) t.classList.remove('point')
}

function seatEl(seat: string): Element | null {
  return document.querySelector('.scene-svg .seat[data-seat="' + seat + '"]')
}

function doPick(): void {
  if (picking.value) return
  closePick()
  const day = S.attendance[todayStr()] || {}
  const pool = S.students.filter((s) => s.seat && day[s.id] !== 'leave' && day[s.id] !== 'absent')
  if (!pool.length) {
    toast('教室里还没有同学')
    return
  }
  let fresh = pool.filter((s) => recentPicks.indexOf(s.id) < 0)
  if (!fresh.length) {
    recentPicks = []
    fresh = pool
  }
  const final = fresh[Math.floor(Math.random() * fresh.length)]
  recentPicks.push(final.id)
  if (recentPicks.length > Math.min(8, pool.length - 1)) recentPicks.shift()
  picking.value = true
  cardOn.value = false
  if (stageEl.value) stageEl.value.classList.add('picking')
  const steps = REDUCED ? 1 : 16
  let i = 0
  let delay = 55
  let last: Element | null = null
  const token = ++pickToken
  const alive = (): boolean => pickToken === token && !!stageEl.value
  function step(): void {
    if (!alive()) {
      if (pickToken === token) picking.value = false
      return
    }
    const cand = i < steps - 1 ? pool[Math.floor(Math.random() * pool.length)] : final
    if (last) last.classList.remove('picked')
    last = seatEl(cand.seat as string)
    if (last) last.classList.add('picked')
    i++
    if (i < steps) {
      delay *= 1.16
      window.setTimeout(step, delay)
    } else window.setTimeout(done, 120)
  }
  function done(): void {
    if (!alive()) {
      if (pickToken === token) picking.value = false
      return
    }
    picking.value = false
    const el = seatEl(final.seat as string)
    if (el) el.classList.add('turn', 'hand', 'picked')
    const tch = document.querySelector('.scene-svg .teacher')
    if (tch) tch.classList.add('point')
    pickStudent.value = final
  }
  step()
}

function pickGood(): void {
  const s = pickStudent.value
  closePick()
  if (s) addPoint(s.id, 1, '回答问题')
}

/* ---------- 空闲动画 ---------- */
function idleTick(): void {
  if (!S.settings.anim || REDUCED || document.hidden || down || picking.value) return
  if (pickStudent.value) return
  const seats = Array.from(document.querySelectorAll('.scene-svg .seat.has:not(.ghost):not(.dim)'))
  if (!seats.length) return
  const el = seats[Math.floor(Math.random() * seats.length)]
  if (el.matches(':hover') || el.classList.contains('turn') || el.classList.contains('hand') || el.classList.contains('sleep')) return
  const acts = ['turn', 'turn', 'turn', 'hand', 'sleep']
  const a = acts[Math.floor(Math.random() * acts.length)]
  el.classList.add(a)
  window.setTimeout(() => el.classList.remove(a), a === 'sleep' ? 4200 : a === 'hand' ? 2400 : 1900)
  const t = document.querySelector('.scene-svg .teacher')
  if (t) {
    const pu = t.querySelector('.t-pupil') as HTMLElement | null
    if (pu) pu.style.transform = 'translateX(' + (Math.random() * 3 - 1.5).toFixed(1) + 'px)'
    if (Math.random() < 0.14 && !t.classList.contains('point')) {
      t.classList.add('point')
      window.setTimeout(() => {
        if (!pickStudent.value) t.classList.remove('point')
      }, 2600)
    }
  }
}

/* ---------- 模式栏 ---------- */
const attStat = computed(() => {
  const day = S.attendance[attDate.value] || {}
  const c = { leave: 0, absent: 0, late: 0 }
  Object.keys(day).forEach((k) => {
    if (stuById(k) && c[day[k]] !== undefined) c[day[k]]++
  })
  const total = S.students.length
  const present = total - c.leave - c.absent
  return { c, total, present }
})

const examList = computed(() => examsSorted().reverse())

watch(examList, (list) => {
  if (!gradeExam.value || !examById(gradeExam.value)) gradeExam.value = list.length ? list[0].id : null
})

function setMode(m: typeof clsMode.value): void {
  clsMode.value = m
  pickedSeat.value = null
  if (m === 'att' && !attDate.value) attDate.value = todayStr()
  closePick()
  cardOn.value = false
  closePop()
  closeAttMenu()
}

function attClear(): void {
  S.attendance[attDate.value] = {}
  save()
  toast('已标记为全部出勤')
}

function attExport(): void {
  const d = parseDate(attDate.value) || new Date()
  const ym = d.getFullYear() + '-' + (d.getMonth() + 1 < 10 ? '0' : '') + (d.getMonth() + 1)
  const days = Object.keys(S.attendance).filter((k) => k.indexOf(ym) === 0).sort()
  const rows: string[][] = [['学号', '姓名'].concat(days.map((k) => k.slice(5))).concat(['请假', '缺勤', '迟到'])]
  S.students.slice().sort((a, b) => String(a.no).localeCompare(String(b.no), 'zh', { numeric: true })).forEach((s) => {
    const c = { leave: 0, absent: 0, late: 0 }
    const r = [s.no, s.name].concat(
      days.map((k) => {
        const v = S.attendance[k][s.id]
        if (v) c[v]++
        return v ? ATT[v].t : ''
      })
    )
    rows.push(r.concat([String(c.leave), String(c.absent), String(c.late)]))
  })
  downloadFile(S.settings.className + '-考勤-' + ym + '.csv', toCSV(rows), 'text/csv;charset=utf-8')
}

/* ---------- 生命周期 ---------- */
let ro: ResizeObserver | null = null
let idleTimer: number | undefined
let clockTimer: number | undefined

function measure(): void {
  const st = stageEl.value
  if (!st) return
  stageW.value = st.clientWidth
  stageH.value = st.clientHeight
}

watch([scene, stageW, stageH], () => {
  nextTick(() => {
    tickClock()
    if (view.value.fit) fitView()
    else applyView()
  })
})

watch(extra, () => {
  view.value.fit = true
})

onMounted(() => {
  if (!attDate.value) attDate.value = todayStr()
  measure()
  nextTick(() => {
    if (!entered.value && !REDUCED) {
      entered.value = true
      const svg = innerEl.value && innerEl.value.firstElementChild
      if (svg) {
        svg.classList.add('enter')
        Array.from(svg.querySelectorAll('.seat .stu-in')).forEach((g, i) => {
          ;(g as HTMLElement).style.animationDelay = Math.floor(i / 8) * 70 + (i % 8) * 18 + 'ms'
        })
        window.setTimeout(() => svg.classList.remove('enter'), 1400)
      }
    }
    fitView()
    tickClock()
  })
  if ('ResizeObserver' in window && stageEl.value) {
    ro = new ResizeObserver(() => {
      measure()
    })
    ro.observe(stageEl.value)
  }
  idleTimer = window.setInterval(idleTick, 2300)
  clockTimer = window.setInterval(tickClock, 20000)
  document.addEventListener('pointerdown', onDocPointerDown, true)
  document.addEventListener('keydown', onDocKeyDown)
})

onBeforeUnmount(() => {
  if (ro) ro.disconnect()
  window.clearInterval(idleTimer)
  window.clearInterval(clockTimer)
  document.removeEventListener('pointerdown', onDocPointerDown, true)
  document.removeEventListener('keydown', onDocKeyDown)
  floatHook.fn = null
  closePick()
  const g = document.getElementById('dragGhost')
  if (g) g.remove()
})

defineExpose({ floatAt })
</script>

<template>
  <div class="class-page">
    <div
      ref="stageEl"
      class="stage"
      @wheel="onWheel"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="endPointer"
      @pointercancel="endPointer"
      @contextmenu="onSeatContext"
      @mouseover="onOver"
      @mouseout="onOut"
    >
      <div ref="innerEl" class="stage-inner" :style="innerStyle" v-html="scene.svg"></div>
    </div>

    <div class="class-title">
      {{ S.settings.className
      }}<small
        >{{ S.settings.school || '' }}{{ weekNo() ? (S.settings.school ? ' · ' : '') + '第 ' + weekNo() + ' 周' : '' }}</small
      >
    </div>

    <div v-if="S.demo" class="demo-bar">
      正在查看示例班级
      <button class="btn btn-xs btn-dark" @click="openDemoClear()">开始录入我的班级</button>
    </div>

    <div class="top-tools">
      <button class="btn btn-dark" @click="doPick"><Icon name="dice" />随机点名</button>
      <div class="zoom">
        <button title="缩小" aria-label="缩小" @click="zoomOut"><Icon name="zout" /></button>
        <button class="zoom-fit" title="恢复默认大小" @click="fitView">适应</button>
        <button title="放大" aria-label="放大" @click="zoomIn"><Icon name="zin" /></button>
      </div>
      <button class="btn btn-light btn-icon rail-toggle" title="班级概况" aria-label="班级概况" @click="railOpen = !railOpen">
        <Icon name="side" />
      </button>
    </div>

    <div class="dock">
      <!-- 考勤 -->
      <div v-if="clsMode === 'att'" class="subbar">
        <input v-model="attDate" class="inp" type="date" aria-label="考勤日期" />
        <span>应到 <b class="num">{{ attStat.total }}</b> · 实到 <b class="num">{{ attStat.present }}</b></span>
        <span class="muted">请假 {{ attStat.c.leave }} · 缺勤 {{ attStat.c.absent }} · 迟到 {{ attStat.c.late }}</span>
        <span class="muted">右键学生选择考勤状态</span>
        <button class="btn btn-sm btn-light" @click="attClear">全部出勤</button>
        <button class="btn btn-sm btn-light" @click="attExport">导出本月</button>
      </div>
      <!-- 点评 -->
      <div v-else-if="clsMode === 'points'" class="subbar">
        <span class="muted">点学生选择加分或扣分理由</span>
        <button class="btn btn-sm btn-light" @click="addPointAll()">全班 +1</button>
        <button class="btn btn-sm btn-dark" @click="openPointBoard()">积分榜</button>
      </div>
      <!-- 成绩 -->
      <div v-else-if="clsMode === 'grade'" class="subbar">
        <template v-if="!examList.length">
          <span class="muted">还没有考试成绩</span>
          <button class="btn btn-sm btn-dark" @click="go('scores')">去录入成绩</button>
        </template>
        <template v-else>
          <select v-model="gradeExam" class="sel" aria-label="选择考试">
            <option v-for="e in examList" :key="e.id" :value="e.id">{{ e.name }}</option>
          </select>
          <span class="legend-ramp"
            >后<i v-for="c in CH.SEQ" :key="c" :style="{ background: c }"></i>前</span
          >
          <span class="muted">桌面颜色越深，班级排名越靠前；↑↓ 表示进退 5 名以上</span>
          <button class="btn btn-sm btn-light" @click="go('analysis')">完整分析</button>
        </template>
      </div>
      <!-- 排座 -->
      <div v-else-if="clsMode === 'seat'" class="subbar">
        <span class="muted">拖动学生换座，或先后点两个座位</span>
        <button class="btn btn-sm btn-light" @click="seatShuffle"><Icon name="shuffle" />随机打乱</button>
        <button class="btn btn-sm btn-light" @click="seatMentor">优带弱同桌</button>
        <button class="btn btn-sm btn-light" @click="seatGender">男女同桌</button>
        <button class="btn btn-sm btn-ghost" @click="seatUndoAct">撤销</button>
        <button class="btn btn-sm btn-dark" @click="seatPrint"><Icon name="print" />打印座位表</button>
      </div>

      <div class="seg">
        <button v-for="m in MODES" :key="m.id" :class="{ on: clsMode === m.id }" @click="setMode(m.id)">
          {{ m.t }}
        </button>
      </div>
    </div>

    <!-- 随机点名结果 -->
    <div v-if="pickStudent" class="pick-card">
      <StudentAvatar :st="pickStudent" :size="60" />
      <div>
        <div class="muted" style="font-size: 12px">请回答问题</div>
        <div class="nm">{{ pickStudent.name }}</div>
        <div class="muted" style="font-size: 12px">
          {{ pickStudent.no || '' }}{{ pickStudent.role ? ' · ' + pickStudent.role : '' }}
        </div>
      </div>
      <div style="display: flex; flex-direction: column; gap: 6px; margin-left: 10px">
        <button class="btn btn-sm btn-dark" @click="pickGood">回答得好 +1</button>
        <button class="btn btn-sm btn-light" @click="doPick"><Icon name="dice" />再抽一个</button>
      </div>
      <button class="modal-x" style="align-self: flex-start" aria-label="关闭" @click="closePick">
        <Icon name="x" />
      </button>
    </div>

    <div class="empty-class" :class="{ hide: S.students.length > 0 }">
      <TeacherAvatar :gender="S.settings.teacher.gender" :size="64" />
      <div>
        <div style="font-weight: 700; font-size: 15px">教室还空着</div>
        <div class="muted" style="font-size: 13px; margin: 2px 0 10px">
          点任意一个座位添加学生，或者从 Excel 一次导入整班名单
        </div>
        <div style="display: flex; gap: 8px">
          <button class="btn btn-sm btn-dark" @click="openStudentForm(null, {})">
            <Icon name="userplus" />添加学生
          </button>
          <button class="btn btn-sm btn-light" @click="openImportStudents()"><Icon name="up" />批量导入</button>
        </div>
      </div>
    </div>

    <!-- 悬浮卡 -->
    <div
      ref="cardEl"
      class="hcard"
      :class="{ on: cardOn }"
      :style="{ left: cardPos.x + 'px', top: cardPos.y + 'px', '--ax': cardPos.ax + 'px' }"
      @click="onCardClick"
      @mouseenter="keepCard"
      @mouseleave="scheduleHide"
      v-html="cardHtml"
    ></div>

    <!-- 点评浮层 -->
    <div v-if="pop && popSt" class="pop" :style="popStyle">
      <div class="pop-title">
        <StudentAvatar :st="popSt" :size="26" />{{ popSt.name
        }}<span class="muted" style="font-weight: 400; margin-left: auto"
          >当前 {{ popPoints > 0 ? '+' : '' }}{{ popPoints }}</span
        >
      </div>
      <div class="chips">
        <button
          v-for="r in S.settings.reasons"
          :key="r.t"
          :class="r.d > 0 ? 'plus' : 'minus'"
          @click="popAdd(r.d, r.t)"
        >
          {{ r.t }} {{ r.d > 0 ? '+' : '' }}{{ r.d }}
        </button>
      </div>
      <div style="display: flex; gap: 6px; margin-top: 10px">
        <input v-model="popCustom" class="inp" placeholder="自定义理由" style="height: 30px; font-size: 12.5px" />
        <button class="btn btn-xs btn-dark" @click="popCustomAdd(1)">+1</button>
        <button class="btn btn-xs btn-light" @click="popCustomAdd(-1)">-1</button>
      </div>
    </div>

    <!-- 考勤右键菜单 -->
    <div v-if="attMenu && attMenuSt" class="att-menu" :style="attMenuStyle">
      <div class="att-menu-head">
        <span>{{ attMenuSt.name }}</span>
        <span class="muted">当前 {{ attMenuLabel }}</span>
      </div>
      <button class="att-def" :class="{ on: !attMenuCur }" @click="setAtt(null)">
        <i></i>出勤<Icon v-if="!attMenuCur" name="check" :size="14" cls="ck" />
      </button>
      <button class="att-leave" :class="{ on: attMenuCur === 'leave' }" @click="setAtt('leave')">
        <i></i>请假<Icon v-if="attMenuCur === 'leave'" name="check" :size="14" cls="ck" />
      </button>
      <button class="att-absent" :class="{ on: attMenuCur === 'absent' }" @click="setAtt('absent')">
        <i></i>缺勤<Icon v-if="attMenuCur === 'absent'" name="check" :size="14" cls="ck" />
      </button>
      <button class="att-late" :class="{ on: attMenuCur === 'late' }" @click="setAtt('late')">
        <i></i>迟到<Icon v-if="attMenuCur === 'late'" name="check" :size="14" cls="ck" />
      </button>
    </div>
  </div>
</template>
