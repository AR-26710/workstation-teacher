<script setup lang="ts">
/** 成绩分析 - KPI 指标行 */
import { examById, shortExam, stuById } from '@core/select'
import { fmtNum, pct, round1 } from '@core/utils'
import type { ExamStats } from '@core/types'

interface Delta {
  cls: string
  text: string
}

const props = defineProps<{
  es: ExamStats
  cs: ExamStats | null
  cxId: string | null
}>()

function nameOf(sid: string): string {
  const s = stuById(sid)
  return s ? s.name : ''
}

function delta(cur: number | undefined, prev: number | undefined | null, isPct: boolean): Delta {
  if (!props.cs || prev === undefined || prev === null || cur === undefined) return { cls: '', text: '—' }
  const v = cur - prev
  if (Math.abs(v) < 1e-9) return { cls: '', text: '与上次持平' }
  const arrow = v > 0 ? '↑ ' : '↓ '
  const amount = isPct ? round1(Math.abs(v) * 100) + ' 个百分点' : fmtNum(Math.abs(v), 1)
  const cx = props.cxId ? examById(props.cxId) : null
  return { cls: v > 0 ? 'up' : 'dn', text: arrow + amount + ' 较' + (cx ? shortExam(cx.name) : '') }
}
</script>

<template>
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
</template>
