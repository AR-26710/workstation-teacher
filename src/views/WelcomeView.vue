<script setup lang="ts">
/** 首次欢迎页：选形象 → 选示例或空班级 → 进入工作台 */
import { ref } from 'vue'
import { S, save, replaceState } from '../core/app'
import { SUBJECT_PRESETS, defaultState } from '../core/state'
import { demoState } from '../core/demo'
import { go } from '../ui/shell/router'
import { toast } from '../ui/shell/toast'
import BrandMark from '../components/common/BrandMark.vue'
import TeacherAvatar from '../components/common/TeacherAvatar.vue'
import Icon from '../components/common/Icon.vue'
import type { Gender } from '../core/types'

const g = ref<Gender>('F')
const mode = ref<'demo' | 'blank'>('demo')
const name = ref('李老师')
const subject = ref('')
const className = ref('')
const stage = ref('初中')

function pickGender(v: Gender): void {
  g.value = v
  if (name.value === '李老师' || name.value === '王老师') name.value = v === 'F' ? '李老师' : '王老师'
}

function pickMode(m: 'demo' | 'blank'): void {
  mode.value = m
}

function start(): void {
  const n = name.value.trim() || '老师'
  const sub = subject.value.trim()
  if (mode.value === 'demo') {
    const st = demoState()
    st.settings.teacher = { name: n, gender: g.value, subject: sub || '数学' }
    replaceState(st)
  } else {
    const cn = className.value.trim()
    if (!cn) {
      toast('请填写班级名称')
      return
    }
    const st = defaultState()
    st.settings.className = cn
    st.settings.stage = stage.value
    const preset = SUBJECT_PRESETS[stage.value] || SUBJECT_PRESETS['初中']
    st.settings.subjects = preset.slice(0, stage.value === '小学' ? 3 : 6).map((x) => ({ name: x[0], full: x[1] }))
    st.settings.teacher = { name: n, gender: g.value, subject: sub }
    replaceState(st)
  }
  S.settings.onboarded = true
  save(true)
  go('class')
}
</script>

<template>
  <div class="welcome">
    <div class="welcome-in">
      <div style="display: flex; justify-content: center; margin-bottom: 18px">
        <BrandMark :size="48" />
      </div>
      <h1>你好，我是你的班主任工作台</h1>
      <p class="lead">先选一个你的形象，它会站在教室讲台上</p>

      <div class="w-avatars">
        <button :class="{ on: g === 'F' }" @click="pickGender('F')">
          <span class="circle"><TeacherAvatar gender="F" :size="96" :bg="false" /></span>女老师
        </button>
        <button :class="{ on: g === 'M' }" @click="pickGender('M')">
          <span class="circle"><TeacherAvatar gender="M" :size="96" :bg="false" /></span>男老师
        </button>
      </div>

      <div class="w-form">
        <div class="field">
          <label>怎么称呼你</label>
          <input v-model="name" class="inp" placeholder="如：李老师" />
        </div>
        <div class="field">
          <label>任教学科</label>
          <input v-model="subject" class="inp" placeholder="如：数学" />
        </div>
      </div>

      <div class="w-mode">
        <button :class="{ on: mode === 'demo' }" @click="pickMode('demo')">
          <b>先看看示例班级</b>46 名虚拟学生和 4 次考试，随时可以清空
        </button>
        <button :class="{ on: mode === 'blank' }" @click="pickMode('blank')">
          <b>直接用我的班级</b>空教室，自己添加或从 Excel 导入学生
        </button>
      </div>

      <div v-show="mode === 'blank'" style="max-width: 440px; margin: -12px auto 22px">
        <div class="w-form">
          <div class="field">
            <label>班级名称</label>
            <input v-model="className" class="inp" placeholder="如：初二（3）班" />
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
      </div>

      <button class="btn btn-dark w-go" @click="start">开启工作台</button>

      <div class="muted" style="font-size: 12px; margin-top: 16px">
        <Icon name="lock" /> 所有数据只保存在这台电脑的浏览器里
      </div>
      <div class="sign" style="padding-top: 28px">Developed by @赛博老爸</div>
    </div>
  </div>
</template>
