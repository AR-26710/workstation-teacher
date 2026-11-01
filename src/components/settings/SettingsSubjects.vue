<script setup lang="ts">
/** 设置 - 学科与点评 */
import { computed, ref } from 'vue'
import { S, save } from '@core/app'
import { SUBJECT_PRESETS } from '@core/state'
import { toast } from '@ui/shell/toast'

const settings = computed(() => S.settings)
const newSub = ref('')
const newSubFull = ref('100')
const newRs = ref('')
const newRsD = ref('1')

function addSubject(): void {
  const n = newSub.value.trim()
  const f = parseFloat(newSubFull.value) || 100
  if (!n) return
  if (!settings.value.subjects.some((s) => s.name === n)) settings.value.subjects.push({ name: n, full: f })
  save()
  newSub.value = ''
}

function delSubject(i: number): void {
  settings.value.subjects.splice(i, 1)
  save()
}

function resetSubjects(): void {
  const p = SUBJECT_PRESETS[settings.value.stage] || SUBJECT_PRESETS['初中']
  settings.value.subjects = p.map((x) => ({ name: x[0], full: x[1] }))
  save()
  toast('已按' + settings.value.stage + '重置科目')
}

function addReason(): void {
  const t = newRs.value.trim()
  const d = parseInt(newRsD.value, 10) || 1
  if (!t) return
  settings.value.reasons.push({ t, d })
  save()
  newRs.value = ''
}

function delReason(i: number): void {
  settings.value.reasons.splice(i, 1)
  save()
}
</script>

<template>
  <div class="panel set-sec">
    <div class="panel-title">科目与满分</div>
    <div class="panel-sub">新建考试时默认勾选这些科目</div>
    <div class="sub-list">
      <span v-for="(s, i) in settings.subjects" :key="s.name" class="sub-item">
        {{ s.name }}
        <input
          :value="s.full"
          :aria-label="s.name + '满分'"
          @input="s.full = parseFloat(($event.target as HTMLInputElement).value) || s.full; save()"
        />
        <button :aria-label="'删除' + s.name" @click="delSubject(i)">×</button>
      </span>
    </div>
    <div style="display: flex; gap: 6px; margin-top: 12px; flex-wrap: wrap">
      <input v-model="newSub" class="inp" placeholder="科目名" style="width: 140px; height: 32px" />
      <input v-model="newSubFull" class="inp num" style="width: 72px; height: 32px" />
      <button class="btn btn-light btn-sm" @click="addSubject">添加科目</button>
      <button class="btn btn-ghost btn-sm" @click="resetSubjects">按学段重置</button>
    </div>
  </div>

  <div class="panel set-sec">
    <div class="panel-title">点评项目</div>
    <div class="panel-sub">教室「点评」模式里可选的加分、扣分理由</div>
    <div class="sub-list">
      <span
        v-for="(r, i) in settings.reasons"
        :key="i"
        class="sub-item"
        :style="{ background: r.d > 0 ? 'var(--green-soft)' : 'var(--red-soft)' }"
      >
        {{ r.t }}
        <input
          :value="r.d"
          aria-label="分值"
          @input="r.d = parseInt(($event.target as HTMLInputElement).value, 10) || r.d; save()"
        />
        <button aria-label="删除" @click="delReason(i)">×</button>
      </span>
    </div>
    <div style="display: flex; gap: 6px; margin-top: 12px">
      <input v-model="newRs" class="inp" placeholder="理由，如：课堂笔记工整" style="width: 220px; height: 32px" />
      <input v-model="newRsD" class="inp num" style="width: 64px; height: 32px" />
      <button class="btn btn-light btn-sm" @click="addReason">添加</button>
    </div>
  </div>
</template>
