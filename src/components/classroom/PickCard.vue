<script setup lang="ts">
/** 教室页随机点名结果展示卡 */
import StudentAvatar from '@components/student/StudentAvatar.vue'
import Icon from '@components/common/Icon.vue'
import type { Student } from '@core/types'

defineProps<{
  student: Student
}>()

const emit = defineEmits<{
  good: []
  repick: []
  close: []
}>()
</script>

<template>
  <div class="pick-card">
    <StudentAvatar :st="student" :size="60" />
    <div>
      <div class="muted" style="font-size: 12px">请回答问题</div>
      <div class="nm">{{ student.name }}</div>
      <div class="muted" style="font-size: 12px">
        {{ student.no || '' }}{{ student.role ? ' · ' + student.role : '' }}
      </div>
    </div>
    <div style="display: flex; flex-direction: column; gap: 6px; margin-left: 10px">
      <button class="btn btn-sm btn-dark" @click="emit('good')">回答得好 +1</button>
      <button class="btn btn-sm btn-light" @click="emit('repick')"><Icon name="dice" />再抽一个</button>
    </div>
    <button class="modal-x" style="align-self: flex-start" aria-label="关闭" @click="emit('close')">
      <Icon name="x" />
    </button>
  </div>
</template>
