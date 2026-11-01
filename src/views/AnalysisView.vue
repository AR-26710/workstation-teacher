<script setup lang="ts">
/** 成绩分析：总体指标、各科得分率、分数段、历次趋势、排名与关注名单 */
import { computed, ref, watch } from 'vue'
import { S } from '@core/app'
import { examById, examsSorted, prevExam, shortExam, stuById } from '@core/select'
import { examStats, rankMap } from '@core/stats'
import { fmtNum, pct, round1 } from '@core/utils'
import { CH } from '@lib/charts'
import { openStudent } from '@ui/student/actions'
import { openAITemplate } from '@ui/ai'
import { go } from '@ui/shell/router'
import ChartView from '@components/common/ChartView.vue'
import StudentAvatar from '@components/student/StudentAvatar.vue'
import TeacherAvatar from '@components/common/TeacherAvatar.vue'
import Icon from '@components/common/Icon.vue'
import type { Student } from '@core/types'

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

interface Delta {
  cls: string
  text: string
}

function delta(cur: number | undefined, prev: number | undefined | null, isPct: boolean): Delta {
  if (!cs.value || prev === undefined || prev === null || cur === undefined) return { cls: '', text: '—' }
  const v = cur - prev
  if (Math.abs(v) < 1e-9) return { cls: '', text: '与上次持平' }
  const arrow = v > 0 ? '↑ ' : '↓ '
  const amount = isPct ? round1(Math.abs(v) * 100) + ' 个百分点' : fmtNum(Math.abs(v), 1)
  return { cls: v > 0 ? 'up' : 'dn', text: arrow + amount + ' 较' + (cx.value ? shortExam(cx.value.name) : '') }
}

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

function lastVal(vals: (number | null)[]): string {
  for (let q = vals.length - 1; q >= 0; q--) if (vals[q] !== null) return round1(vals[q] as number) + '%'
  return '—'
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

function subDelta(name: string): string {
  const e = es.value
  const c = cs.value
  if (!e || !c) return ''
  const s = e.subs.filter((x) => x.name === name)[0]
  const p = c.subs.filter((q) => q.name === name)[0]
  const dv = p && p.n && s.n ? ((s.rate as number) - (p.rate as number)) * 100 : null
  if (dv === null) return '—'
  return (dv >= 0 ? '+' : '') + round1(dv)
}

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

function aiParentBatch(): void {
  const e = ex.value
  if (!e) return
  openAITemplate('parent-batch', { exam: e.id, cmp: cmpId.value || null })
}

function nameOf(sid: string): string {
  const s = stuById(sid)
  return s ? s.name : ''
}

function isLowSub(v: number | null | undefined, full: number): boolean {
  return typeof v === 'number' && v < full * 0.6
}

function chUp(m: { ch: number | null }): string {
  return m.ch && m.ch > 0 ? '↑' + m.ch : ''
}

function chDown(m: { ch: number | null }): string {
  return m.ch && m.ch < 0 ? '↓' + -m.ch : ''
}

function negCh(m: { ch: number | null }): number {
  return m.ch ? -m.ch : 0
}

function stuOf(sid: string): Student {
  return S.students.filter((x) => x.id === sid)[0]
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
      <div class="stat-row">
        <div class="kpi">
          <div class="k">平均分</div>
          <div class="v">{{ fmtNum(es.avg, 1) }}<small>/ {{ es.full }}</small></div>
          <div class="d" :class="delta(es.rate, cs && cs.rate, true).cls">
            {{ delta(es.rate, cs && cs.rate, true).text }}
          </div>
        </div>
        <div class="kpi">
          <div class="k">最高分</div>
          <div class="v">{{ fmtNum(es.max, 1) }}</div>
          <div class="d muted">{{ nameOf(es.table[0].sid) }}</div>
        </div>
        <div class="kpi">
          <div class="k">及格率</div>
          <div class="v">{{ pct(es.pass) }}</div>
          <div class="d" :class="delta(es.pass, cs && cs.pass, true).cls">
            {{ delta(es.pass, cs && cs.pass, true).text }}
          </div>
        </div>
        <div class="kpi">
          <div class="k">优秀率</div>
          <div class="v">{{ pct(es.good) }}</div>
          <div class="d" :class="delta(es.good, cs && cs.good, true).cls">
            {{ delta(es.good, cs && cs.good, true).text }}
          </div>
        </div>
        <div class="kpi">
          <div class="k">标准差</div>
          <div class="v">{{ fmtNum(es.sd, 1) }}</div>
          <div class="d muted">越小说明分数越集中</div>
        </div>
      </div>

      <div class="grid2">
        <div class="panel">
          <div class="panel-title">各科平均得分率</div>
          <div class="panel-sub">平均分 ÷ 满分；红线为 60% 及格线</div>
          <ChartView :fn="subBars" />
        </div>
        <div class="panel">
          <div class="panel-title">总分分数段</div>
          <div class="panel-sub">每段 {{ fmtNum(bins.step, 0) }} 分，柱上为人数</div>
          <ChartView :fn="binBars" />
          <div class="legend">
            <span><i class="sq" style="background: #9ec5f4"></i>不及格段</span>
            <span><i class="sq" :style="{ background: CH.C.s1 }"></i>及格段</span>
            <span><i class="sq" style="background: #256abf"></i>优秀段</span>
          </div>
        </div>
      </div>

      <div v-if="trendSeries" class="panel" style="margin-top: 16px">
        <div class="panel-title">历次考试趋势</div>
        <div class="panel-sub">
          班级平均得分率，各图纵轴一致（{{ trendSeries.gLo }}%–{{ trendSeries.gHi }}%）便于横向比较；没考的场次留空
        </div>
        <div class="small-mult">
          <div v-for="se in trendSeries.series" :key="se.sn" class="sm-cell">
            <div class="t">{{ se.sn }}<span>{{ lastVal(se.vals) }}</span></div>
            <ChartView :fn="trendChart(se)" />
          </div>
        </div>
      </div>

      <div class="grid2" style="margin-top: 16px">
        <div class="panel" style="padding: 20px 0 6px">
          <div style="padding: 0 20px">
            <div class="panel-title">班级排名</div>
            <div class="panel-sub">点姓名打开学生档案</div>
          </div>
          <div style="max-height: 460px; overflow: auto">
            <table class="tbl">
              <thead>
                <tr>
                  <th>名次</th>
                  <th>姓名</th>
                  <th v-for="s in ex.subjects" :key="s.name" class="r">{{ s.name }}</th>
                  <th class="r">总分</th>
                  <th v-if="cx" class="r">进退</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="m in moves" :key="m.r.sid" class="click" @click="openStudent(m.r.sid)">
                  <td class="num">{{ m.r.rank }}</td>
                  <td>
                    <div class="nm"><StudentAvatar :st="stuOf(m.r.sid)" :size="22" />{{ nameOf(m.r.sid) }}</div>
                  </td>
                  <td v-for="s in ex.subjects" :key="s.name" class="r num" :class="{ dn: isLowSub(m.r.subs[s.name], s.full) }">
                    {{ m.r.subs[s.name] === null ? '缺' : m.r.subs[s.name] === undefined ? '—' : m.r.subs[s.name] }}
                  </td>
                  <td class="r num"><b>{{ fmtNum(m.r.total, 1) }}</b></td>
                  <td v-if="cx" class="r num">
                    <span v-if="m.ch === null" class="muted">—</span>
                    <span v-else-if="m.ch === 0" class="muted">0</span>
                    <span v-else :class="m.ch > 0 ? 'up' : 'dn'">{{ chUp(m) }}{{ chDown(m) }}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="panel">
          <div class="panel-title">需要关注</div>
          <div class="panel-sub">{{ cx ? '对比「' + cx.name + '」' : '选择对比考试可看进退步' }}</div>
          <template v-if="cx">
            <div class="flabel" style="margin: 4px 0 6px"><Icon name="star" /> 进步之星</div>
            <div class="warn-list">
              <button
                v-for="m in ups"
                :key="m.r.sid"
                class="mini-item"
                style="background: var(--fill)"
                @click="openStudent(m.r.sid)"
              >
                <StudentAvatar :st="stuOf(m.r.sid)" :size="26" />
                <span class="grow">{{ nameOf(m.r.sid) }}</span>
                <span class="r"><span class="up">↑ {{ m.ch }} 名</span> · 第 {{ m.r.rank }}</span>
              </button>
              <div v-if="!ups.length" class="muted" style="font-size: 12.5px">暂无</div>
            </div>
            <div class="flabel" style="margin: 16px 0 6px">退步 5 名以上</div>
            <div class="warn-list">
              <button
                v-for="m in downs"
                :key="m.r.sid"
                class="mini-item"
                style="background: var(--fill)"
                @click="openStudent(m.r.sid)"
              >
                <StudentAvatar :st="stuOf(m.r.sid)" :size="26" />
                <span class="grow">{{ nameOf(m.r.sid) }}</span>
                <span class="r"><span class="dn">↓ {{ negCh(m) }} 名</span> · 第 {{ m.r.rank }}</span>
              </button>
              <div v-if="!downs.length" class="muted" style="font-size: 12.5px">没有明显退步的同学</div>
            </div>
          </template>
          <div class="flabel" style="margin: 16px 0 6px">两科及以上不及格</div>
          <div class="warn-list">
            <button
              v-for="x in fails.slice(0, 8)"
              :key="x.r.sid"
              class="mini-item"
              style="background: var(--fill)"
              @click="openStudent(x.r.sid)"
            >
              <StudentAvatar :st="stuOf(x.r.sid)" :size="26" />
              <span class="grow">{{ nameOf(x.r.sid) }}</span>
              <span class="r"><span class="dn">{{ x.n }} 科</span></span>
            </button>
            <div v-if="!fails.length" class="muted" style="font-size: 12.5px">没有</div>
          </div>
          <div style="margin-top: 14px">
            <button class="btn btn-light btn-sm" @click="aiParentBatch">
              <Icon name="spark" />给退步同学家长写沟通消息
            </button>
          </div>
        </div>
      </div>

      <div class="panel" style="margin-top: 16px; padding: 20px 0 6px">
        <div style="padding: 0 20px">
          <div class="panel-title">各科明细</div>
          <div class="panel-sub">及格 = 满分的 60%，优秀 = 满分的 85%</div>
        </div>
        <table class="tbl">
          <thead>
            <tr>
              <th>科目</th>
              <th class="r">满分</th>
              <th class="r">平均分</th>
              <th class="r">得分率</th>
              <th class="r">最高</th>
              <th class="r">最低</th>
              <th class="r">及格率</th>
              <th class="r">优秀率</th>
              <th class="r">不及格人数</th>
              <th v-if="cs" class="r">得分率变化</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="s in es.subs" :key="s.name">
              <td><b style="font-weight: 600">{{ s.name }}</b></td>
              <td class="r num">{{ s.full }}</td>
              <td class="r num">{{ fmtNum(s.avg, 1) }}</td>
              <td class="r num">{{ pct(s.rate) }}</td>
              <td class="r num">{{ s.max === undefined ? '—' : s.max }}</td>
              <td class="r num">{{ s.min === undefined ? '—' : s.min }}</td>
              <td class="r num">{{ pct(s.pass) }}</td>
              <td class="r num">{{ pct(s.good) }}</td>
              <td class="r num">{{ s.low || 0 }}</td>
              <td v-if="cs" class="r num">
                <span
                  :class="subDelta(s.name).indexOf('-') === 0 ? 'dn' : 'up'"
                  v-if="subDelta(s.name) !== '—'"
                  >{{ subDelta(s.name) }}</span
                >
                <span v-else class="muted">—</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </div>
</template>
