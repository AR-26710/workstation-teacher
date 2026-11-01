<script setup lang="ts">
/** 成绩分析 - 各科得分率柱图 + 总分分数段柱图 */
import { fmtNum } from '@core/utils'
import { CH } from '@lib/charts'
import ChartView from '@components/common/ChartView.vue'

defineProps<{
  subBars: (w: number) => string
  bins: { data: { label: string; value: number; tip: string; color: string }[]; step: number }
  binBars: (w: number) => string
}>()
</script>

<template>
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
</template>
