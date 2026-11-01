<script setup lang="ts">
/** 成绩录入 - 左侧考试列表 */
import { entryProgress } from '@core/stats'
import type { Exam } from '@core/types'

defineProps<{
  exs: Exam[]
  examId: string | null
}>()

const emit = defineEmits<{
  pick: [id: string]
}>()

function progress(e: Exam): { n: number; total: number; pct: number } {
  const p = entryProgress(e)
  return { n: p.n, total: p.total, pct: p.total ? Math.round((p.n / p.total) * 100) : 0 }
}
</script>

<template>
  <div class="exam-list">
    <button
      v-for="e in exs"
      :key="e.id"
      class="exam-item"
      :class="{ on: e.id === examId }"
      @click="emit('pick', e.id)"
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
</template>
