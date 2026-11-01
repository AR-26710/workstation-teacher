<script setup lang="ts">
/** 设置 - 教师形象 */
import { computed } from 'vue'
import { S, save } from '@core/app'
import TeacherAvatar from '@components/common/TeacherAvatar.vue'
import type { Gender } from '@core/types'

const settings = computed(() => S.settings)

function setGender(g: Gender): void {
  settings.value.teacher.gender = g
  save()
}
</script>

<template>
  <div class="panel set-sec">
    <div class="panel-title" style="margin-bottom: 14px">教师形象</div>
    <div class="gender-pick">
      <button :class="{ on: settings.teacher.gender === 'F' }" @click="setGender('F')">
        <TeacherAvatar gender="F" :size="88" />女老师
      </button>
      <button :class="{ on: settings.teacher.gender === 'M' }" @click="setGender('M')">
        <TeacherAvatar gender="M" :size="88" />男老师
      </button>
    </div>
    <div class="row2" style="margin-top: 18px">
      <div class="field">
        <label>称呼</label>
        <input v-model="settings.teacher.name" class="inp" placeholder="如：李老师" @input="save()" />
      </div>
      <div class="field">
        <label>任教学科</label>
        <input v-model="settings.teacher.subject" class="inp" placeholder="如：数学" @input="save()" />
      </div>
    </div>
  </div>
</template>
