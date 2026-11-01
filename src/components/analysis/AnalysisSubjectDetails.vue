<script setup lang="ts">
/** 成绩分析 - 各科明细表 */
import { round1 } from '@core/utils'
import { fmtNum, pct } from '@core/utils'
import type { ExamStats } from '@core/types'

defineProps<{
  es: ExamStats
  cs: ExamStats | null
}>()

function subDelta(name: string, es: ExamStats, cs: ExamStats | null): string {
  if (!cs) return ''
  const s = es.subs.filter((x) => x.name === name)[0]
  const p = cs.subs.filter((q) => q.name === name)[0]
  const dv = p && p.n && s.n ? ((s.rate as number) - (p.rate as number)) * 100 : null
  if (dv === null) return '—'
  return (dv >= 0 ? '+' : '') + round1(dv)
}
</script>

<template>
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
              :class="subDelta(s.name, es, cs).indexOf('-') === 0 ? 'dn' : 'up'"
              v-if="subDelta(s.name, es, cs) !== '—'"
              >{{ subDelta(s.name, es, cs) }}</span
            >
            <span v-else class="muted">—</span>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
