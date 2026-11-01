<script setup lang="ts">
/** 学生头像（由 ART 生成 SVG） */
import { computed } from 'vue'
import { ART } from '@lib/art'
import type { Student } from '@core/types'

const props = withDefaults(defineProps<{ st: Student; size?: number; bg?: boolean }>(), {
  size: 28,
  bg: true
})

const svg = computed(() => ART.avatar(props.st, props.size, { bg: props.bg ? undefined : false }))
</script>

<template>
  <span class="ava-wrap" v-html="svg" />
</template>

<style scoped>
.ava-wrap {
  display: inline-flex;
  flex: none;
}
.ava-wrap :deep(svg.ava) {
  border-radius: 50%;
}
</style>
