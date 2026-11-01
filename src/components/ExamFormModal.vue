<script setup lang="ts">
/** 新建 / 编辑考试（弹窗内容） */
import { computed, onMounted, reactive, ref } from 'vue'
import { S, save } from '../core/app'
import { examById, examsSorted } from '../core/select'
import { todayStr, uid } from '../core/utils'
import { closeModal, confirm } from '../ui/modal'
import { toast } from '../ui/toast'
import { go } from '../ui/router'
import type { Exam, Subject } from '../core/types'

const EXAM_TYPES = ['月考', '期中', '期末', '周测', '单元测', '模拟考', '其他']

const props = defineProps<{ id?: string | null }>()

const isNew = computed(() => !props.id)
const name = ref('')
const date = ref(todayStr())
const type = ref('月考')
const subs = ref<Subject[]>([])
const chosen = reactive<Record<string, number>>({})
const newSub = ref('')
const newFull = ref('100')

onMounted(() => {
  const list = S.settings.subjects.slice()
  if (props.id) {
    const ex = examById(props.id)
    if (ex) {
      name.value = ex.name
      date.value = ex.date
      type.value = ex.type || '月考'
      ex.subjects.forEach((s) => {
        chosen[s.name] = s.full
        if (!list.some((x) => x.name === s.name)) list.push({ name: s.name, full: s.full })
      })
    }
  } else {
    list.forEach((s) => {
      chosen[s.name] = s.full
    })
  }
  subs.value = list
})

function toggle(name2: string): void {
  if (chosen[name2] !== undefined) delete chosen[name2]
  else {
    const s = subs.value.filter((x) => x.name === name2)[0]
    chosen[name2] = s ? s.full : 100
  }
}

function setFull(i: number, e: Event): void {
  const v = parseFloat((e.target as HTMLInputElement).value)
  const s = subs.value[i]
  if (v > 0) {
    s.full = v
    if (chosen[s.name] !== undefined) chosen[s.name] = v
  }
}

function addSub(): void {
  const n = newSub.value.trim()
  const f = parseFloat(newFull.value) || 100
  if (!n) return
  if (!subs.value.some((s) => s.name === n)) subs.value.push({ name: n, full: f })
  chosen[n] = f
  newSub.value = ''
}

function submit(): void {
  const nm = name.value.trim()
  if (!nm) {
    toast('请填写考试名称')
    return
  }
  if (!date.value) {
    toast('请选择考试日期')
    return
  }
  const picked = subs.value.filter((s) => chosen[s.name] !== undefined).map((s) => ({ name: s.name, full: chosen[s.name] }))
  if (!picked.length) {
    toast('至少选一个科目')
    return
  }
  if (props.id) {
    const ex = examById(props.id)
    if (ex) {
      ex.name = nm
      ex.date = date.value
      ex.type = type.value
      ex.subjects = picked
    }
  } else {
    const nx: Exam = { id: uid('ex'), name: nm, date: date.value, type: type.value, subjects: picked, scores: {} }
    S.exams.push(nx)
    examsSorted()
  }
  picked.forEach((s) => {
    if (!S.settings.subjects.some((x) => x.name === s.name)) S.settings.subjects.push({ name: s.name, full: s.full })
  })
  save()
  closeModal()
  go('scores')
}

function onDelete(): void {
  const ex = examById(props.id)
  if (!ex) return
  confirm('删除考试', '确定删除「' + ex.name + '」及其全部成绩吗？此操作无法恢复。', '删除', () => {
    S.exams = S.exams.filter((e) => e.id !== ex.id)
    save()
    closeModal()
    go('scores')
    toast('已删除')
  }, true)
}
</script>

<template>
  <div>
    <div class="row2">
      <div class="field">
        <label>考试名称<span class="req">*</span></label>
        <input v-model="name" class="inp" placeholder="如：十一月月考" />
      </div>
      <div class="field">
        <label>考试日期<span class="req">*</span></label>
        <input v-model="date" class="inp" type="date" />
      </div>
    </div>

    <div class="field">
      <label>类型</label>
      <div class="chips">
        <button
          v-for="t in EXAM_TYPES"
          :key="t"
          type="button"
          :class="{ on: type === t }"
          @click="type = t"
        >
          {{ t }}
        </button>
      </div>
    </div>

    <div class="field">
      <label>科目与满分</label>
      <div class="hint">点科目名勾选或取消，右侧数字是满分</div>
      <div class="sub-list" style="margin-top: 6px">
        <span
          v-for="(s, i) in subs"
          :key="s.name"
          class="sub-item"
          :style="chosen[s.name] !== undefined ? 'background:#171717;color:#fff' : ''"
        >
          <span style="cursor: pointer" @click="toggle(s.name)">{{ s.name }}</span>
          <input
            :value="chosen[s.name] !== undefined ? chosen[s.name] : s.full"
            :disabled="chosen[s.name] === undefined"
            :aria-label="s.name + '满分'"
            @input="setFull(i, $event)"
          />
        </span>
      </div>
      <div style="display: flex; gap: 6px; margin-top: 10px">
        <input v-model="newSub" class="inp" placeholder="添加科目，如：化学" style="width: 180px; height: 32px" />
        <input v-model="newFull" class="inp num" style="width: 72px; height: 32px" />
        <button class="btn btn-light btn-sm" @click="addSub">添加</button>
      </div>
    </div>

    <div class="modal-foot" style="margin: 12px -22px -8px; padding-bottom: 8px">
      <button
        v-if="!isNew"
        class="btn btn-ghost"
        style="margin-right: auto; color: var(--red)"
        @click="onDelete"
      >
        删除考试
      </button>
      <button class="btn btn-light" @click="closeModal()">取消</button>
      <button class="btn btn-dark" @click="submit">{{ isNew ? '创建并录入' : '保存' }}</button>
    </div>
  </div>
</template>
