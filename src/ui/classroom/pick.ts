/**
 * 教室页：随机点名逻辑
 */
import { ref } from 'vue'
import { S } from '@core/app'
import { todayStr } from '@core/utils'
import { addPoint } from '@ui/student/actions'
import { toast } from '@ui/shell/toast'
import { REDUCED } from '@ui/classroom/mode'
import type { Student } from '@core/types'

export function useRandomPick(stageEl: { value: HTMLElement | null }) {
  const pickedSeat = ref<string | null>(null)
  const picking = ref(false)
  const pickStudent = ref<Student | null>(null)
  let pickToken = 0
  let recentPicks: string[] = []

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

  return { pickedSeat, picking, pickStudent, closePick, doPick, pickGood }
}
