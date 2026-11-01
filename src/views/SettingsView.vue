<script setup lang="ts">
/** 设置：班级信息 / 教师形象 / 教室与黑板 / 学科与点评 / AI 接口 / 数据与备份 / 关于 */
import { ref, watch } from 'vue'
import { pageOpts } from '@ui/shell/router'
import SettingsClass from '@components/settings/SettingsClass.vue'
import SettingsTeacher from '@components/settings/SettingsTeacher.vue'
import SettingsRoom from '@components/settings/SettingsRoom.vue'
import SettingsSubjects from '@components/settings/SettingsSubjects.vue'
import SettingsAi from '@components/settings/SettingsAi.vue'
import SettingsData from '@components/settings/SettingsData.vue'
import SettingsAbout from '@components/settings/SettingsAbout.vue'

const SET_SECS: [string, string][] = [
  ['class', '班级信息'],
  ['teacher', '教师形象'],
  ['room', '教室与黑板'],
  ['subjects', '学科与点评'],
  ['ai', 'AI 接口'],
  ['data', '数据与备份'],
  ['about', '关于']
]

const sec = ref('class')

watch(
  pageOpts,
  (o) => {
    if (o && o.sec) sec.value = o.sec
  },
  { immediate: true }
)
</script>

<template>
  <div class="page scroll">
    <div class="page-head">
      <div>
        <h1 class="page-title">设置</h1>
        <div class="page-desc">修改后自动保存</div>
      </div>
    </div>

    <div class="set-layout">
      <nav class="set-nav">
        <button v-for="s in SET_SECS" :key="s[0]" :class="{ on: sec === s[0] }" @click="sec = s[0]">
          {{ s[1] }}
        </button>
      </nav>

      <div>
        <SettingsClass v-if="sec === 'class'" />
        <SettingsTeacher v-else-if="sec === 'teacher'" />
        <SettingsRoom v-else-if="sec === 'room'" />
        <SettingsSubjects v-else-if="sec === 'subjects'" />
        <SettingsAi v-else-if="sec === 'ai'" />
        <SettingsData v-else-if="sec === 'data'" />
        <SettingsAbout v-else />
      </div>
    </div>
  </div>
</template>
