<script setup lang="ts">
/** 成绩分析：总体指标、各科得分率、分数段、历次趋势、排名与关注名单 */
import { computed, ref, watch } from 'vue'
import { S } from '@core/app'
import { examById, examsSorted, prevExam, shortExam } from '@core/select'
import { examStats, rankMap } from '@core/stats'
import { fmtNum, pct, round1 } from '@core/utils'
import { CH } from '@lib/charts'
import { openAITemplate } from '@ui/ai'
import { go } from '@ui/shell/router'
import TeacherAvatar from '@components/common/TeacherAvatar.vue'
import Icon from '@components/common/Icon.vue'
import AnalysisKpiRow from '@components/analysis/AnalysisKpiRow.vue'
import AnalysisBars from '@components/analysis/AnalysisBars.vue'
import AnalysisTrend from '@components/analysis/AnalysisTrend.vue'
import AnalysisRankingTable from '@components/analysis/AnalysisRankingTable.vue'
import AnalysisWatchLists from '@components/analysis/AnalysisWatchLists.vue'
import AnalysisSubjectDetails from '@components/analysis/AnalysisSubjectDetails.vue'

const exs = computed(() => examsSorted())
const examId = ref<string | null>(null)
const cmpId = ref<string>('')

watch(
  exs,
  (list) => {
    if (!examId.value || !examById(examId.value)) examId.value = list.length ? list[list.length - 1].id : null
  },
  { immediate: true }
)

let cmpInit = false
watch(
  [examId, exs],
  () => {
    const e = examById(examId.value)
    if (!e) return
    if (!cmpInit || (cmpId.value && !examById(cmpId.value)) || cmpId.value === examId.value) {
      const pe = prevExam(e)
      cmpId.value = pe ? pe.id : ''
      cmpInit = true
    }
  },
  { immediate: true }
)

const ex = computed(() => examById(examId.value))
const cx = computed(() => (cmpId.value ? examById(cmpId.value) : null))
const es = computed(() => (ex.value ? examStats(ex.value) : null))
const cs = computed(() => (cx.value ? examStats(cx.value) : null))

/* ---------- 各科得分率 ---------- */
const subBars = computed(() => (w: number) => {
  const e = es.value
  if (!e) return ''
  return CH.bars(
    e.subs.map((s) => ({
      label: s.name,
      value: (s.rate || 0) * 100,
      tip:
        '<b>' + s.name + '</b>（满分 ' + s.full + '）<br><span class="tk">平均</span> ' + fmtNum(s.avg, 1) +
        '<br><span class="tk">最高 / 最低</span> ' + s.max + ' / ' + s.min +
        '<br><span class="tk">及格率</span> ' + pct(s.pass) + '<br><span class="tk">优秀率</span> ' + pct(s.good)
    })),
    w,
    { h: 250, max: 100, ref: 60, refLabel: '及格', fmt: (v: number) => Math.round(v) + '%' }
  )
})

/* ---------- 分数段 ---------- */
const bins = computed(() => {
  const e = es.value
  if (!e) return { data: [], step: 0 }
  const n = 10
  const step = e.full / n
  const counts: number[] = []
  for (let i = 0; i < n; i++) counts.push(0)
  e.table.forEach((r) => {
    counts[Math.min(n - 1, Math.floor(r.total / step))]++
  })
  let lo = 0
  while (lo < n - 1 && counts[lo] === 0) lo++
  const data: { label: string; value: number; tip: string; color: string }[] = []
  for (let k = lo; k < n; k++) {
    const a = Math.round(k * step)
    const b = Math.round((k + 1) * step)
    data.push({
      label: a + '–' + b,
      value: counts[k],
      tip: '<b>' + a + '–' + b + ' 分</b><br>' + counts[k] + ' 人（' + pct(counts[k] / e.n) + '）',
      color: k >= n * 0.85 ? '#256abf' : k < n * 0.6 ? '#9ec5f4' : CH.C.s1
    })
  }
  return { data, step }
})

const binBars = computed(() => (w: number) => {
  return CH.bars(bins.value.data, w, { h: 250, fmt: (v: number) => String(Math.round(v)) })
})

/* ---------- 历次趋势 ---------- */
const trendSeries = computed(() => {
  const list = exs.value
  if (list.length <= 1) return null
  const subs: string[] = []
  list.forEach((e) => e.subjects.forEach((s) => { if (subs.indexOf(s.name) < 0) subs.push(s.name) }))
  const labs = list.map((e) => shortExam(e.name))
  const stats = list.map((e) => examStats(e))
  const series = ['总分'].concat(subs).map((sn) => ({
    sn,
    vals: stats.map((st) => {
      if (sn === '总分') return st.rate === undefined ? null : st.rate * 100
      const x = st.subs.filter((q) => q.name === sn)[0]
      return x && x.n ? (x.rate as number) * 100 : null
    })
  }))
  const all: number[] = []
  series.forEach((x) => x.vals.forEach((v) => { if (v !== null) all.push(v) }))
  const gLo = Math.max(0, Math.floor((Math.min.apply(null, all) - 4) / 5) * 5)
  const gHi = Math.min(100, Math.ceil((Math.max.apply(null, all) + 4) / 5) * 5)
  return { labs, series, gLo, gHi }
})

function trendChart(se: { sn: string; vals: (number | null)[] }): (w: number) => string {
  return (w: number) => {
    const t = trendSeries.value
    if (!t) return ''
    return CH.lines([{ name: se.sn, color: se.sn === '总分' ? CH.C.ink : CH.C.s1, values: se.vals }], t.labs, w, {
      h: 120,
      min: t.gLo,
      max: t.gHi,
      ticks: 2,
      ml: 38,
      mr: 10,
      mt: 14,
      mb: 24,
      endLabel: false,
      fmt: (v: number) => Math.round(v) + '%',
      tipFmt: (v: number) => round1(v) + '%'
    })
  }
}

/* ---------- 排名与关注名单 ---------- */
const moves = computed(() => {
  const e = es.value
  if (!e) return []
  const cm = cx.value ? rankMap(cx.value) : {}
  return e.table.map((r) => ({ r, ch: cm[r.sid] ? cm[r.sid].rank - r.rank : null }))
})

const ups = computed(() => moves.value.filter((m) => m.ch !== null && (m.ch as number) > 0).sort((a, b) => (b.ch as number) - (a.ch as number)).slice(0, 5))
const downs = computed(() => moves.value.filter((m) => m.ch !== null && (m.ch as number) <= -5).sort((a, b) => (a.ch as number) - (b.ch as number)).slice(0, 6))
const fails = computed(() => {
  const e = ex.value
  const st = es.value
  if (!e || !st) return []
  return st.table
    .map((r) => {
      let n = 0
      e.subjects.forEach((s) => {
        const v = r.subs[s.name]
        if (typeof v === 'number' && v < s.full * 0.6) n++
      })
      return { r, n }
    })
    .filter((x) => x.n >= 2)
    .sort((a, b) => b.n - a.n)
})

function onExamChange(v: string | null): void {
  examId.value = v
  cmpId.value = ''
  cmpInit = false
}

function aiReport(): void {
  const e = ex.value
  if (!e) return
  openAITemplate('report', { exam: e.id, cmp: cmpId.value || null })
}
</script>

<template>
  <div class="page scroll">
    <div class="page-head">
      <div>
        <h1 class="page-title">成绩分析</h1>
        <div class="page-desc" v-if="ex && es">
          {{ ex.date }} · {{ es.n }} 人参考 · 满分 {{ es.full }}
        </div>
      </div>
      <div class="grow"></div>
      <template v-if="exs.length">
        <select v-model="examId" class="sel" style="width: auto; height: 34px" aria-label="考试" @change="onExamChange(examId)">
          <option v-for="e in exs.slice().reverse()" :key="e.id" :value="e.id">{{ e.name }}</option>
        </select>
        <span class="muted" style="font-size: 13px">对比</span>
        <select v-model="cmpId" class="sel" style="width: auto; height: 34px" aria-label="对比考试">
          <option value="">不对比</option>
          <option v-for="e in exs.slice().reverse()" :key="e.id" :value="e.id">{{ e.name }}</option>
        </select>
        <button class="btn btn-dark" @click="aiReport"><Icon name="spark" />AI 写分析报告</button>
      </template>
    </div>

    <template v-if="!exs.length">
      <div class="panel">
        <div class="empty">
          <TeacherAvatar :gender="S.settings.teacher.gender" :size="72" :bg="false" />
          录入至少一场考试后，这里会自动生成分析。
          <div style="margin-top: 14px">
            <button class="btn btn-dark" @click="go('scores')">去录入成绩</button>
          </div>
        </div>
      </div>
    </template>

    <template v-else-if="es && !es.n">
      <div class="panel"><div class="empty">这场考试还没有录入成绩</div></div>
    </template>

    <template v-else-if="ex && es">
      <AnalysisKpiRow :es="es" :cs="cs" :cx-id="cmpId" />

      <AnalysisBars :sub-bars="subBars" :bins="bins" :bin-bars="binBars" />

      <AnalysisTrend :trend-series="trendSeries" :trend-chart="trendChart" />

      <div class="grid2" style="margin-top: 16px">
        <AnalysisRankingTable :ex="ex" :cx="cx" :moves="moves" />
        <AnalysisWatchLists :cx="cx" :ups="ups" :downs="downs" :fails="fails" />
      </div>

      <AnalysisSubjectDetails :es="es" :cs="cs" />
    </template>
  </div>
</template>
