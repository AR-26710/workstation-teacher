<script setup lang="ts">
/** 成绩录入 - 成绩录入表格（支持 Excel 整块粘贴） */
import { computed } from 'vue'
import { save } from '@core/app'
import { rankMap } from '@core/stats'
import { parseScore, setScore } from '@core/importers'
import { parseTable } from '@core/files'
import { fmtNum } from '@core/utils'
import { studentsByNo } from '@core/select'
import { toast } from '@ui/shell/toast'
import type { Exam } from '@core/types'

const props = defineProps<{
  ex: Exam
}>()

const ranks = computed(() => rankMap(props.ex))
const list = computed(() => studentsByNo())

function cellText(e: Exam, sid: string, sub: string): string {
  const v = (e.scores[sid] || {})[sub]
  if (v === null) return '缺'
  if (v === undefined) return ''
  return String(v)
}

function cellCls(v: number | null | undefined, full: number): string {
  if (v === null) return ' miss'
  if (typeof v !== 'number') return ''
  if (v > full || v < 0) return ' bad'
  if (v < full * 0.6) return ' low'
  return ''
}

function onCell(e: Event, sid: string, sub: string, full: number): void {
  const t = e.target as HTMLInputElement
  const cur = props.ex
  const v = parseScore(t.value)
  setScore(cur, sid, sub, v)
  t.className = 'sc-in' + cellCls(v, full)
  save()
}

function onKey(e: KeyboardEvent, ri: number, ci: number): void {
  const t = e.target as HTMLInputElement
  let nx: HTMLInputElement | null = null
  if (e.key === 'Enter' || e.key === 'ArrowDown') nx = cellAt(ri + (e.shiftKey && e.key === 'Enter' ? -1 : 1), ci)
  else if (e.key === 'ArrowUp') nx = cellAt(ri - 1, ci)
  else if (e.key === 'ArrowRight' && t.selectionStart === t.value.length) nx = cellAt(ri, ci + 1)
  else if (e.key === 'ArrowLeft' && t.selectionStart === 0) nx = cellAt(ri, ci - 1)
  if (nx) {
    e.preventDefault()
    nx.focus()
  }
}

function onFocus(e: Event): void {
  const t = e.target as HTMLInputElement
  if (t.select) t.select()
}

function cellAt(r: number, c: number): HTMLInputElement | null {
  return document.querySelector<HTMLInputElement>('.grid-tbl .sc-in[data-r="' + r + '"][data-c="' + c + '"]')
}

function onPaste(e: ClipboardEvent, ri: number, ci: number): void {
  const text = (e.clipboardData || (window as unknown as { clipboardData: DataTransfer }).clipboardData).getData('text')
  if (!/[\t\n]/.test(text.replace(/[\r\n]+$/, ''))) return
  e.preventDefault()
  const cur = props.ex
  const rows = parseTable(text, true)
  let n = 0
  let bad = 0
  rows.forEach((row, i) => {
    row.forEach((val, j) => {
      const cell = cellAt(ri + i, ci + j)
      if (!cell) return
      const v = parseScore(val)
      const full = +cell.getAttribute('data-full')!
      cell.value = v === null ? '缺' : v === undefined ? '' : String(v)
      setScore(cur, cell.getAttribute('data-sid')!, cell.getAttribute('data-sub')!, v)
      cell.className = 'sc-in' + cellCls(v, full)
      if (typeof v === 'number' && (v > full || v < 0)) bad++
      n++
    })
  })
  save()
  toast('已填入 ' + n + ' 个分数' + (bad ? '，' + bad + ' 个超出满分已标红' : ''))
}
</script>

<template>
  <div class="tbl-wrap" style="max-height: calc(100vh - 250px)">
    <table class="tbl grid-tbl">
      <thead>
        <tr>
          <th>学号</th>
          <th>姓名</th>
          <th v-for="s in ex.subjects" :key="s.name" class="c">{{ s.name }} <small>{{ s.full }}</small></th>
          <th class="c">总分</th>
          <th class="c">排名</th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="!list.length">
          <td :colspan="ex.subjects.length + 4">
            <div class="empty">班里还没有学生，先去「学生档案」添加</div>
          </td>
        </tr>
        <tr v-for="(st, ri) in list" :key="st.id" :data-sid="st.id">
          <td class="num muted">{{ st.no || '' }}</td>
          <td><b style="font-weight: 500">{{ st.name }}</b></td>
          <td v-for="(sb, ci) in ex.subjects" :key="sb.name" class="cell">
            <input
              class="sc-in"
              :class="cellCls((ex.scores[st.id] || {})[sb.name], sb.full).trim()"
              :data-r="ri"
              :data-c="ci"
              :data-sid="st.id"
              :data-sub="sb.name"
              :data-full="sb.full"
              :value="cellText(ex, st.id, sb.name)"
              :aria-label="st.name + ' ' + sb.name"
              inputmode="decimal"
              @input="onCell($event, st.id, sb.name, sb.full)"
              @keydown="onKey($event, ri, ci)"
              @paste="onPaste($event, ri, ci)"
              @focus="onFocus"
            />
          </td>
          <td class="tot">{{ ranks[st.id] ? fmtNum(ranks[st.id].total, 1) : '' }}</td>
          <td class="rk">{{ ranks[st.id] ? ranks[st.id].rank : '' }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
