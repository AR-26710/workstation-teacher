<script setup lang="ts">
/** 成绩分析 - 历次考试趋势小图 */
import ChartView from '@components/common/ChartView.vue'

interface TrendSeries {
  labs: string[]
  series: { sn: string; vals: (number | null)[] }[]
  gLo: number
  gHi: number
}

defineProps<{
  trendSeries: TrendSeries | null
  trendChart: (se: { sn: string; vals: (number | null)[] }) => (w: number) => string
}>()

function lastVal(vals: (number | null)[]): string {
  for (let q = vals.length - 1; q >= 0; q--) if (vals[q] !== null) return Math.round(vals[q] as number) + '%'
  return '—'
}
</script>

<template>
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
</template>
