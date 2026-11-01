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
import { countdownDays, examById, examsSorted, latestExam, pointsOf, prevExam, seatMap, stuById, weekNo } from '@core/select'
import { monthBirthdays, rankMap, weekStars } from '@core/stats'
import { WEEK, clamp, parseDate, todayStr } from '@core/utils'
import { clsMode, attDate, gradeExam, view, REDUCED } from '@ui/classroom/mode'
import { railCollapsed } from '@ui/shell/router'
import { addPoint, moveSeat, openStudent } from '@ui/student/actions'
import { floatHook } from '@ui/classroom/float'
import { openStudentForm, openDemoClear } from '@ui/forms'
import { useRandomPick } from '@ui/classroom/pick'
import { useHoverCard } from '@ui/classroom/card'
import Icon from '@components/common/Icon.vue'
import ClassroomDock from '@components/classroom/ClassroomDock.vue'
import PointPopover from '@components/classroom/PointPopover.vue'
import AttendanceMenu from '@components/classroom/AttendanceMenu.vue'
import PickCard from '@components/classroom/PickCard.vue'
import EmptyClass from '@components/classroom/EmptyClass.vue'
import type { Student } from '@core/types'

const NS = 'http://www.w3.org/2000/svg'

const stageEl = ref<HTMLElement | null>(null)
const innerEl = ref<HTMLElement | null>(null)
const stageW = ref(0)
const stageH = ref(0)

const entered = ref(false)

/* ---------- 随机点名 ---------- */
const { pickedSeat, picking, pickStudent, closePick, doPick, pickGood } = useRandomPick(stageEl)

/* ---------- 悬浮卡 ---------- */
let down: { moved: boolean } | null = null
const { cardOn, cardHtml, cardPos, scheduleCard, scheduleHide, onCardClick, keepCard } = useHoverCard({
  picking,
  getDown: () => down
})

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

/* ---------- 点评浮层 ---------- */
const pop = ref<{ x: number; y: number; sid: string } | null>(null)
const popCustom = ref('')
const popSt = computed(() => (pop.value ? stuById(pop.value.sid) : null))
const popPoints = computed(() => (pop.value ? pointsOf(pop.value.sid) : 0))
const popStyle = computed<Record<string, string>>(() => {
  const p = pop.value
  if (!p) return {} as Record<string, string>
  const w = 286
  const h = 230
  const left = clamp(p.x - w / 2, 10, window.innerWidth - w - 10)
  const top = p.y + h + 20 > window.innerHeight ? p.y - h - 14 : p.y + 14
  return { left: left + 'px', top: top + 'px' }
})

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

/* ---------- 考勤右键菜单 ---------- */
const attMenu = ref<{ x: number; y: number; sid: string } | null>(null)

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
  const t = e.target as Element
  const inside = (sel: string): boolean => !!(t.closest && t.closest(sel))
  if (pop.value && !inside('.pop') && !inside('.seat')) closePop()
  if (attMenu.value && !inside('.att-menu')) closeAttMenu()
}

function onDocKeyDown(e: KeyboardEvent): void {
  if (e.key !== 'Escape') return
  closeAttMenu()
  closePop()
}

/* ---------- 座位点击 ---------- */
function onSeatClick(seatKey: string, sid: string | null, ev: MouseEvent): void {
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
    closePop()
    openStudentForm(null, { seat: seatKey })
    return
  }
  if (clsMode.value === 'att') return
  if (clsMode.value === 'points') {
    if (pop.value && pop.value.sid === st.id) closePop()
    else openPointPop(st, ev.clientX, ev.clientY)
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
let downState: DownState | null = null

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
  downState = {
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
  down = downState
}

function onPointerMove(e: PointerEvent): void {
  const d = downState
  if (!d) return
  const dx = e.clientX - d.x
  const dy = e.clientY - d.y
  if (!d.moved && Math.abs(dx) + Math.abs(dy) > 5) {
    d.moved = true
    cardOn.value = false
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
  const d = downState
  if (!d) return
  downState = null
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
    scheduleCard(d.tch)
  }
}

function onOver(e: MouseEvent): void {
  const t = e.target as Element
  const el = t.closest ? t.closest('.seat.has, .teacher') : null
  if (!el) return
  scheduleCard(el)
}

function onOut(e: MouseEvent): void {
  const t = e.target as Element
  const el = t.closest ? t.closest('.seat.has, .teacher') : null
  const rel = e.relatedTarget as Node | null
  if (el && !(rel && el.contains(rel))) {
    scheduleHide()
  }
}

/* ---------- 空闲动画 ---------- */
function idleTick(): void {
  if (!S.settings.anim || REDUCED || document.hidden || downState || picking.value) return
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

/* ---------- 模式切换（由 ClassroomDock 直接改 clsMode，这里监听做清理） ---------- */
watch(clsMode, (m) => {
  pickedSeat.value = null
  if (m === 'att' && !attDate.value) attDate.value = todayStr()
  closePick()
  cardOn.value = false
  closePop()
  closeAttMenu()
})

watch(
  () => examsSorted(),
  () => {
    if (!gradeExam.value || !examById(gradeExam.value)) {
      const list = examsSorted()
      gradeExam.value = list.length ? list[list.length - 1].id : null
    }
  }
)

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
      <button class="btn btn-xs btn-dark" @click="openDemoClear">开始录入我的班级</button>
    </div>

    <div class="top-tools">
      <button class="btn btn-dark" @click="doPick"><Icon name="dice" />随机点名</button>
      <div class="zoom">
        <button title="缩小" aria-label="缩小" @click="zoomOut"><Icon name="zout" /></button>
        <button class="zoom-fit" title="恢复默认大小" @click="fitView">适应</button>
        <button title="放大" aria-label="放大" @click="zoomIn"><Icon name="zin" /></button>
      </div>
      <button
        class="btn btn-light btn-icon rail-toggle"
        :title="railCollapsed ? '展开班级概况' : '折叠班级概况'"
        aria-label="班级概况"
        @click="railCollapsed = !railCollapsed"
      >
        <Icon name="side" />
      </button>
    </div>

    <ClassroomDock />

    <PickCard v-if="pickStudent" :student="pickStudent" @good="pickGood" @repick="doPick" @close="closePick" />

    <EmptyClass :gender="S.settings.teacher.gender" :class="{ hide: S.students.length > 0 }" />

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

    <PointPopover
      :pop="pop"
      :pop-custom="popCustom"
      :pop-st="popSt"
      :pop-points="popPoints"
      :pop-style="popStyle"
      @update:pop-custom="popCustom = $event"
      @close="closePop"
      @add="popAdd"
      @custom-add="popCustomAdd"
    />

    <AttendanceMenu :att-menu="attMenu" @close="closeAttMenu" @set-status="setAtt" />
  </div>
</template>
