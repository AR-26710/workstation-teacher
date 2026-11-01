<script setup lang="ts">
/** 从示例班级切换到自己的班级 */
import { ref } from 'vue'
import { S, save, replaceState } from '../../core/app'
import { SUBJECT_PRESETS, defaultState } from '../../core/state'
import { deepClone } from '../../core/utils'
import { closeModal } from '../../ui/shell/modal'
import { toast } from '../../ui/shell/toast'
import { go } from '../../ui/shell/router'

const name = ref('')
const stage = ref('初中')
const school = ref('')

function ok(): void {
  const n = name.value.trim()
  if (!n) {
    toast('请填写班级名称')
    return
  }
  const keep = { teacher: deepClone(S.settings.teacher), ai: deepClone(S.settings.ai) }
  const st = defaultState()
  st.settings.teacher = keep.teacher
  st.settings.ai = keep.ai
  st.settings.className = n
  st.settings.school = school.value.trim()
  st.settings.stage = stage.value
  st.settings.onboarded = true
  const preset = SUBJECT_PRESETS[stage.value] || SUBJECT_PRESETS['初中']
  st.settings.subjects = preset.slice(0, stage.value === '小学' ? 3 : 6).map((x) => ({ name: x[0], full: x[1] }))
  replaceState(st)
  save(true)
  closeModal()
  go('class')
  toast('示例数据已清空')
}
</script>

<template>
  <div>
    <p style="margin: 0 0 14px; color: var(--ink2); line-height: 1.7">
      会清空示例学生、成绩和记录，保留你的形象和 AI 设置。
    </p>
    <div class="row2">
      <div class="field">
        <label>班级名称<span class="req">*</span></label>
        <input v-model="name" class="inp" placeholder="例如：初二（3）班" />
      </div>
      <div class="field">
        <label>学段</label>
        <select v-model="stage" class="sel">
          <option>小学</option>
          <option>初中</option>
          <option>高中</option>
        </select>
      </div>
    </div>
    <div class="field">
      <label>学校</label>
      <input v-model="school" class="inp" placeholder="选填" />
    </div>

    <div class="modal-foot" style="margin: 12px -22px -8px; padding-bottom: 8px">
      <button class="btn btn-light" style="margin-right: auto" @click="closeModal()">取消</button>
      <button class="btn btn-dark" @click="ok">清空并开始</button>
    </div>
  </div>
</template>
