<script setup lang="ts">
/** 学生档案 - 筛选栏（搜索 + 标签筛选） */
const STU_FILTERS: [string, string][] = [
  ['all', '全部'],
  ['M', '男生'],
  ['F', '女生'],
  ['cadre', '班干部'],
  ['focus', '重点关注'],
  ['board', '住校'],
  ['bday', '本月生日'],
  ['noseat', '未排座']
]

defineProps<{
  q: string
  filter: string
}>()

const emit = defineEmits<{
  'update:q': [value: string]
  'update:filter': [value: string]
}>()
</script>

<template>
  <div class="filterbar">
    <input
      :value="q"
      class="inp"
      placeholder="搜索姓名、学号或标签"
      @input="emit('update:q', ($event.target as HTMLInputElement).value)"
    />
    <div class="chips">
      <button
        v-for="f in STU_FILTERS"
        :key="f[0]"
        :class="{ on: filter === f[0] }"
        @click="emit('update:filter', f[0])"
      >
        {{ f[1] }}
      </button>
    </div>
  </div>
</template>
