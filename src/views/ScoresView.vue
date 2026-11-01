<script setup lang="ts">
/** 成绩录入：考试列表 + 表格录入（支持 Excel 整块粘贴） */
import { computed, ref, watch } from 'vue'
import { S, save } from '../core/app'
import { examById, examsSorted, studentsByNo } from '../core/select'
import { entryProgress, examFull, rankMap } from '../core/stats'
import { parseScore, setScore } from '../core/importers'
import { downloadFile, parseTable, toCSV } from '../core/files'
import { fmtNum } from '../core/utils'
import { go } from '../ui/router'
import { openExamForm, openScoreImport } from '../ui/forms'
import { toast } from '../ui/toast'
import TeacherAvatar from '../components/TeacherAvatar.vue'
import Icon from '../components/Icon.vue'
import type { Exam } from '../core/types'

const exs = computed(() => examsSorted().reverse())
const examId = ref<string | null>(null)

watch(
  exs,
  (list) => {
    if (!examId.value || !examById(examId.value)) examId.value = list.length ? list[0].id : null
  },
  { immediate: true }
)

const ex = computed<Exam | null>(() => examById(examId.value))
const ranks = computed(() => (ex.value ? rankMap(ex.value) : {}))
const list = computed(() => studentsByNo())

function progress(e: Exam): { n: number; total: number; pct: number } {
  const p = entryProgress(e)
  return { n: p.n, total: p.total, pct: p.total ? Math.round((p.n / p.total) * 100) : 0 }
}

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
  const cur = ex.value
  if (!cur) return
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
  const cur = ex.value
  if (!cur) return
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

function exportCsv(): void {
  const e = ex.value
  if (!e) return
  const rm = rankMap(e)
  const rows = [['学号', '姓名'].concat(e.subjects.map((s) => s.name)).concat(['总分', '排名'])]
  studentsByNo().forEach((st) => {
    const row = e.scores[st.id] || {}
    const r = rm[st.id]
    rows.push(
      [st.no, st.name]
        .concat(e.subjects.map((s) => {
          const v = row[s.name]
          return v === null ? '缺考' : v === undefined ? '' : String(v)
        }))
        .concat([r ? String(r.total) : '', r ? String(r.rank) : ''])
    )
  })
  downloadFile(S.settings.className + '-' + e.name + '-成绩.csv', toCSV(rows), 'text/csv;charset=utf-8')
}

function pickExam(id: string): void {
  examId.value = id
}

/** 导入后刷新：表格由响应式数据驱动，无需额外处理 */
const importHook = computed(() => S.exams.length)
</script>

<template>
  <div class="page scroll">
    <div class="page-head">
      <div>
        <h1 class="page-title">成绩录入</h1>
        <div class="page-desc">选中一场考试，直接在表格里输入分数，或从 Excel 复制整块粘贴</div>
      </div>
      <div class="grow"></div>
      <button class="btn btn-dark" @click="openExamForm(null)"><Icon name="plus" />新建考试</button>
    </div>

    <template v-if="!exs.length">
      <div class="panel">
        <div class="empty">
          <TeacherAvatar :gender="S.settings.teacher.gender" :size="72" :bg="false" />
          还没有考试。新建一场考试，选好科目和满分，就能开始录入。
          <div style="margin-top: 14px">
            <button class="btn btn-dark" @click="openExamForm(null)"><Icon name="plus" />新建考试</button>
          </div>
        </div>
      </div>
    </template>

    <template v-else>
      <div class="score-layout">
        <div class="exam-list">
          <button
            v-for="e in exs"
            :key="e.id"
            class="exam-item"
            :class="{ on: e.id === examId }"
            @click="pickExam(e.id)"
          >
            <div class="t">
              {{ e.name }}<span class="tag gray" style="height: 19px; font-size: 11px">{{ e.type || '考试' }}</span>
            </div>
            <div class="m">
              {{ e.date }} · {{ e.subjects.length }} 科 · 已录 {{ progress(e).n }}/{{ progress(e).total }}
            </div>
            <div class="prog"><i :style="{ width: progress(e).pct + '%' }"></i></div>
          </button>
        </div>

        <div v-if="ex" :key="ex.id + '-' + importHook">
          <div class="page-head" style="margin-bottom: 12px">
            <div>
              <div style="font-size: 17px; font-weight: 700">{{ ex.name }}</div>
              <div class="page-desc">{{ ex.date }} · {{ ex.type || '' }} · 满分 {{ examFull(ex) }}</div>
            </div>
            <div class="grow"></div>
            <button class="btn btn-light btn-sm" @click="openExamForm(ex.id)"><Icon name="edit" />编辑考试</button>
            <button class="btn btn-light btn-sm" @click="openScoreImport(ex.id, ex.name)">
              <Icon name="up" />按表头导入
            </button>
            <button class="btn btn-light btn-sm" @click="exportCsv"><Icon name="down" />导出</button>
            <button class="btn btn-dark btn-sm" @click="go('analysis')"><Icon name="chart" />看分析</button>
          </div>

          <div class="paste-hint">
            <Icon name="copy" />
            <span
              >在 Excel 里按学号顺序选中分数区域复制，点一下表格里的起始格子，<span class="kbd">Ctrl</span> +
              <span class="kbd">V</span> 即可整块填入。缺考填「缺」，回车跳到下一位同学。</span
            >
          </div>

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
        </div>
      </div>
    </template>
  </div>
</template>
