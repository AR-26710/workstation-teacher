<script setup lang="ts">
/**
 * 图表容器：按容器实际宽度调用绘图函数，输出 SVG 字符串
 */
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = defineProps<{ fn: (w: number) => string }>()
const el = ref<HTMLElement | null>(null)
const html = ref('')
const width = ref(320)

let ro: ResizeObserver | null = null

function draw(): void {
  if (!el.value) return
  const w = Math.max(240, el.value.clientWidth)
  width.value = w
  html.value = props.fn(w)
}

onMounted(() => {
  draw()
  if ('ResizeObserver' in window) {
    ro = new ResizeObserver(() => draw())
    ro.observe(el.value as HTMLElement)
  }
})

onBeforeUnmount(() => {
  if (ro) ro.disconnect()
  ro = null
})

watch(() => props.fn, draw)
</script>

<template>
  <div ref="el" class="chart" v-html="html" />
</template>
