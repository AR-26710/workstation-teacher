<script setup lang="ts">
/** 成绩分析 - 需要关注名单（进步之星、退步、不及格） */
import { S } from '@core/app'
import { openStudent } from '@ui/student/actions'
import { openAITemplate } from '@ui/ai'
import StudentAvatar from '@components/student/StudentAvatar.vue'
import Icon from '@components/common/Icon.vue'
import type { Exam, ExamRow } from '@core/types'

interface MoveItem {
  r: ExamRow
  ch: number | null
}
interface FailItem {
  r: ExamRow
  n: number
}

defineProps<{
  cx: Exam | null
  ups: MoveItem[]
  downs: MoveItem[]
  fails: FailItem[]
}>()

function stuOf(sid: string) {
  return S.students.filter((x) => x.id === sid)[0]
}

function nameOf(sid: string): string {
  const s = stuOf(sid)
  return s ? s.name : ''
}

function negCh(m: MoveItem): number {
  return m.ch ? -m.ch : 0
}
</script>

<template>
  <div class="panel">
    <div class="panel-title">需要关注</div>
    <div class="panel-sub">{{ cx ? '对比「' + cx.name + '」' : '选择对比考试可看进退步' }}</div>
    <template v-if="cx">
      <div class="flabel" style="margin: 4px 0 6px"><Icon name="star" /> 进步之星</div>
      <div class="warn-list">
        <button
          v-for="m in ups"
          :key="m.r.sid"
          class="mini-item"
          style="background: var(--fill)"
          @click="openStudent(m.r.sid)"
        >
          <StudentAvatar :st="stuOf(m.r.sid)" :size="26" />
          <span class="grow">{{ nameOf(m.r.sid) }}</span>
          <span class="r"><span class="up">↑ {{ m.ch }} 名</span> · 第 {{ m.r.rank }}</span>
        </button>
        <div v-if="!ups.length" class="muted" style="font-size: 12.5px">暂无</div>
      </div>
      <div class="flabel" style="margin: 16px 0 6px">退步 5 名以上</div>
      <div class="warn-list">
        <button
          v-for="m in downs"
          :key="m.r.sid"
          class="mini-item"
          style="background: var(--fill)"
          @click="openStudent(m.r.sid)"
        >
          <StudentAvatar :st="stuOf(m.r.sid)" :size="26" />
          <span class="grow">{{ nameOf(m.r.sid) }}</span>
          <span class="r"><span class="dn">↓ {{ negCh(m) }} 名</span> · 第 {{ m.r.rank }}</span>
        </button>
        <div v-if="!downs.length" class="muted" style="font-size: 12.5px">没有明显退步的同学</div>
      </div>
    </template>
    <div class="flabel" style="margin: 16px 0 6px">两科及以上不及格</div>
    <div class="warn-list">
      <button
        v-for="x in fails.slice(0, 8)"
        :key="x.r.sid"
        class="mini-item"
        style="background: var(--fill)"
        @click="openStudent(x.r.sid)"
      >
        <StudentAvatar :st="stuOf(x.r.sid)" :size="26" />
        <span class="grow">{{ nameOf(x.r.sid) }}</span>
        <span class="r"><span class="dn">{{ x.n }} 科</span></span>
      </button>
      <div v-if="!fails.length" class="muted" style="font-size: 12.5px">没有</div>
    </div>
    <div style="margin-top: 14px">
      <button class="btn btn-light btn-sm" @click="openAITemplate('parent-batch', {})">
        <Icon name="spark" />给退步同学家长写沟通消息
      </button>
    </div>
  </div>
</template>
