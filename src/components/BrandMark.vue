<script setup lang="ts">
/** 品牌标记（侧栏 logo / 关于页）与 AI 助理头像 */
import { computed } from 'vue'

const props = withDefaults(defineProps<{ kind?: 'brand' | 'ai'; size?: number }>(), {
  kind: 'brand',
  size: 30
})

const svg = computed(() => {
  const s = props.size
  if (props.kind === 'ai') {
    return (
      '<svg class="ava" viewBox="-24 -24 48 48" width="' +
      s +
      '" height="' +
      s +
      '" aria-hidden="true"><circle r="24" fill="#171717"/>' +
      '<circle cx="0" cy="-1" r="11" fill="#fff"/><path d="M-5 -10 L-3 -15 L0 -11 L3 -16 L5 -10 Z" fill="#fff"/>' +
      '<ellipse cx="-4" cy="-1" rx="2.6" ry="3.1" fill="#171717"/><ellipse cx="4" cy="-1" rx="2.6" ry="3.1" fill="#171717"/>' +
      '<path d="M-10 10 Q0 15 10 10 L11 15 Q0 20 -11 15 Z" fill="#2f7ff0"/></svg>'
    )
  }
  return (
    '<svg class="brand-mark" viewBox="-24 -24 48 48" width="' +
    s +
    '" height="' +
    s +
    '" aria-hidden="true"><rect x="-24" y="-24" width="48" height="48" rx="13" fill="#171717"/>' +
    '<circle cx="0" cy="-2" r="11" fill="#fff"/><path d="M-5 -11 L-3 -16 L0 -12 L3 -17 L5 -11 Z" fill="#fff"/>' +
    '<ellipse cx="-4" cy="-2" rx="2.6" ry="3.1" fill="#171717"/><ellipse cx="4" cy="-2" rx="2.6" ry="3.1" fill="#171717"/>' +
    '<path d="M-10 9 Q0 14 10 9 L11 14 Q0 19 -11 14 Z" fill="#e5483b"/></svg>'
  )
})
</script>

<template>
  <span class="mark-wrap" v-html="svg" />
</template>

<style scoped>
.mark-wrap {
  display: inline-flex;
  flex: none;
}
</style>
