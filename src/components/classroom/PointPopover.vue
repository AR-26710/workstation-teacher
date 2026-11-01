<script setup lang="ts">
/** 教室页「点评」模式：点击学生后弹出的加分/扣分浮层 */
import { S } from '@core/app'
import StudentAvatar from '@components/student/StudentAvatar.vue'
import Icon from '@components/common/Icon.vue'
import type { Student } from '@core/types'

defineProps<{
  pop: { x: number; y: number; sid: string } | null
  popCustom: string
  popSt: Student | null
  popPoints: number
  popStyle: Record<string, string>
}>()

const emit = defineEmits<{
  'update:popCustom': [value: string]
  close: []
  add: [delta: number, reason: string]
  customAdd: [delta: number]
}>()

function onCustomInput(e: Event): void {
  emit('update:popCustom', (e.target as HTMLInputElement).value)
}
</script>

<template>
  <div v-if="pop && popSt" class="pop" :style="popStyle">
    <div class="pop-title">
      <StudentAvatar :st="popSt" :size="26" />{{ popSt.name
      }}<span class="muted" style="font-weight: 400; margin-left: auto">当前 {{ popPoints > 0 ? '+' : '' }}{{ popPoints }}</span>
      <button class="pop-x" aria-label="关闭" title="关闭" @click="emit('close')"><Icon name="x" :size="14" /></button>
    </div>
    <div class="chips">
      <button
        v-for="r in S.settings.reasons"
        :key="r.t"
        :class="r.d > 0 ? 'plus' : 'minus'"
        @click="emit('add', r.d, r.t)"
      >
        {{ r.t }} {{ r.d > 0 ? '+' : '' }}{{ r.d }}
      </button>
    </div>
    <div style="display: flex; gap: 6px; margin-top: 10px">
      <input
        :value="popCustom"
        class="inp"
        placeholder="自定义理由"
        style="height: 30px; font-size: 12.5px"
        @input="onCustomInput"
      />
      <button class="btn btn-xs btn-dark" @click="emit('customAdd', 1)">+1</button>
      <button class="btn btn-xs btn-light" @click="emit('customAdd', -1)">-1</button>
    </div>
  </div>
</template>
