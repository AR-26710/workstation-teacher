/**
 * 教室页：悬浮卡逻辑（学生/教师信息卡）
 */
import { nextTick, ref } from 'vue'
import { S } from '@core/app'
import { ATT } from '@core/state'
import { attToday, daysToBirthday, latestExam, prevExam, stuById } from '@core/select'
import { pointsOf } from '@core/select'
import { rankMap } from '@core/stats'
import { parseDate } from '@core/utils'
import { ART } from '@lib/art'
import { addPoint, openStudent } from '@ui/student/actions'
import { go } from '@ui/shell/router'
import { toast } from '@ui/shell/toast'
import { clsMode } from '@ui/classroom/mode'
import { clamp } from '@core/utils'
import type { Student } from '@core/types'

interface DownState {
  moved: boolean
}

export function useHoverCard(opts: { picking: { value: boolean }; getDown: () => DownState | null }) {
  const cardEl = ref<HTMLElement | null>(null)
  const cardOn = ref(false)
  const cardHtml = ref('')
  const cardPos = ref({ x: 0, y: 0, ax: 150 })
  let cardT: number | undefined
  let hideT: number | undefined

  function seatTextOf(seat: string | null): string {
    if (!seat) return '未排座'
    const p = seat.split('-')
    return '第' + (+p[0] + 1) + '排 第' + (+p[1] + 1) + '座'
  }

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
      const down = opts.getDown()
      if (down || opts.picking.value || clsMode.value === 'seat' || clsMode.value === 'att' || clsMode.value === 'points') return
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

  function keepCard(): void {
    window.clearTimeout(hideT)
  }

  return { cardEl, cardOn, cardHtml, cardPos, scheduleCard, scheduleHide, onCardClick, keepCard }
}
