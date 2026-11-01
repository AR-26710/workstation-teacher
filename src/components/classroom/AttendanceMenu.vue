<script setup lang="ts">
/** 教室页「考勤」模式：右键学生弹出的考勤状态菜单 */
import { computed } from 'vue'
import { S } from '@core/app'
import { ATT } from '@core/state'
import { attDate } from '@ui/classroom/mode'
import { stuById } from '@core/select'
import Icon from '@components/common/Icon.vue'
import type { Student } from '@core/types'

const props = defineProps<{
  attMenu: { x: number; y: number; sid: string } | null
}>()

const emit = defineEmits<{
  close: []
  setStatus: [status: 'leave' | 'absent' | 'late' | null]
}>()

const attMenuSt = computed<Student | null>(() => (props.attMenu ? stuById(props.attMenu.sid) : null))
const attMenuCur = computed<'leave' | 'absent' | 'late' | null>(() => {
  if (!props.attMenu) return null
  const day = S.attendance[attDate.value]
  return day?.[props.attMenu.sid] || null
})
const attMenuLabel = computed(() => (attMenuCur.value ? ATT[attMenuCur.value].t : '出勤'))
const attMenuStyle = computed(() => {
  const p = props.attMenu
  if (!p) return {}
  const w = 168
  const h = 190
  const left = Math.min(p.x, window.innerWidth - w - 8)
  const top = p.y + h + 16 > window.innerHeight ? Math.max(8, p.y - h) : p.y
  return { left: left + 'px', top: top + 'px' }
})
</script>

<template>
  <div v-if="attMenu && attMenuSt" class="att-menu" :style="attMenuStyle">
    <div class="att-menu-head">
      <span>{{ attMenuSt.name }}</span>
      <span class="muted">当前 {{ attMenuLabel }}</span>
    </div>
    <button class="att-def" :class="{ on: !attMenuCur }" @click="emit('setStatus', null)">
      <i></i>出勤<Icon v-if="!attMenuCur" name="check" :size="14" cls="ck" />
    </button>
    <button class="att-leave" :class="{ on: attMenuCur === 'leave' }" @click="emit('setStatus', 'leave')">
      <i></i>请假<Icon v-if="attMenuCur === 'leave'" name="check" :size="14" cls="ck" />
    </button>
    <button class="att-absent" :class="{ on: attMenuCur === 'absent' }" @click="emit('setStatus', 'absent')">
      <i></i>缺勤<Icon v-if="attMenuCur === 'absent'" name="check" :size="14" cls="ck" />
    </button>
    <button class="att-late" :class="{ on: attMenuCur === 'late' }" @click="emit('setStatus', 'late')">
      <i></i>迟到<Icon v-if="attMenuCur === 'late'" name="check" :size="14" cls="ck" />
    </button>
  </div>
</template>
