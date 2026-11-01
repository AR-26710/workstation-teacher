<script setup lang="ts">
/** 教师头像 */
import { computed } from 'vue'
import { ART } from '../art'

const props = withDefaults(defineProps<{ gender?: string; size?: number; bg?: boolean }>(), {
  gender: 'F',
  size: 32,
  bg: true
})

const svg = computed(() => ART.teacherAvatar({ gender: props.gender }, props.size, props.bg ? undefined : false))
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
