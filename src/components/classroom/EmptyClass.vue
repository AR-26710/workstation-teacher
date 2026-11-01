<script setup lang="ts">
/** 教室页空教室提示 */
import TeacherAvatar from '@components/common/TeacherAvatar.vue'
import Icon from '@components/common/Icon.vue'
import { openStudentForm, openImportStudents } from '@ui/forms'

defineProps<{
  gender: string
}>()
</script>

<template>
  <div class="empty-class">
    <TeacherAvatar :gender="gender" :size="64" />
    <div>
      <div style="font-weight: 700; font-size: 15px">教室还空着</div>
      <div class="muted" style="font-size: 13px; margin: 2px 0 10px">
        点任意一个座位添加学生，或者从 Excel 一次导入整班名单
      </div>
      <div style="display: flex; gap: 8px">
        <button class="btn btn-sm btn-dark" @click="openStudentForm(null, {})">
          <Icon name="userplus" />添加学生
        </button>
        <button class="btn btn-sm btn-light" @click="openImportStudents()"><Icon name="up" />批量导入</button>
      </div>
    </div>
  </div>
</template>
