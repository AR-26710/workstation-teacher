<script setup lang="ts">
/** 左侧导航：品牌、全局搜索、主导航、最近对话、教师形象 */
import { computed, ref } from 'vue'
import { S } from '../../core/app'
import { page, go } from '../../ui/shell/router'
import { openChatById } from '../../ui/ai'
import Icon from '../common/Icon.vue'
import BrandMark from '../common/BrandMark.vue'
import TeacherAvatar from '../common/TeacherAvatar.vue'
import StudentAvatar from '../student/StudentAvatar.vue'

const emit = defineEmits<{ (e: 'pick-student', sid: string): void }>()

const q = ref('')

const results = computed(() => {
  const t = q.value.trim()
  if (!t) return []
  return S.students.filter((s) => s.name.indexOf(t) >= 0 || String(s.no).indexOf(t) >= 0).slice(0, 8)
})

const recent = computed(() => S.chats.slice(0, 6))
const teacher = computed(() => S.settings.teacher)

function pick(sid: string): void {
  q.value = ''
  emit('pick-student', sid)
}

function onEnter(): void {
  if (results.value.length) pick(results.value[0].id)
}

const NAV: { id: 'class' | 'students' | 'scores' | 'analysis' | 'ai'; ico: string; label: string }[] = [
  { id: 'class', ico: 'room', label: '教室' },
  { id: 'students', ico: 'users', label: '学生档案' },
  { id: 'scores', ico: 'edit', label: '成绩录入' },
  { id: 'analysis', ico: 'chart', label: '成绩分析' },
  { id: 'ai', ico: 'spark', label: 'AI 助手' }
]
</script>

<template>
  <aside class="side">
    <div class="brand">
      <BrandMark :size="30" />
      <div>
        <div class="brand-name">班主任工作台</div>
        <div class="brand-sub">{{ S.settings.className }}</div>
      </div>
    </div>

    <div class="search">
      <Icon name="search" />
      <input v-model="q" placeholder="搜索学生姓名 / 学号" autocomplete="off" @keydown.enter="onEnter" />
      <div v-if="results.length" class="search-pop">
        <button
          v-for="(s, i) in results"
          :key="s.id"
          :class="{ on: i === 0 }"
          @click="pick(s.id)"
        >
          <StudentAvatar :st="s" :size="24" />
          <span>{{ s.name }}</span>
          <span class="muted" style="margin-left: auto; font-size: 12px">{{ s.no }}</span>
        </button>
      </div>
      <div v-else-if="q.trim()" class="search-pop">
        <div class="muted" style="padding: 8px 10px; font-size: 12.5px">没有找到「{{ q.trim() }}」</div>
      </div>
    </div>

    <nav class="nav">
      <a
        v-for="n in NAV"
        :key="n.id"
        :href="'#/' + n.id"
        :class="{ on: page === n.id }"
        @click.prevent="go(n.id)"
      >
        <span class="ico"><Icon :name="n.ico" /></span>
        <span class="t">{{ n.label }}</span>
        <span v-if="n.id === 'students'" class="cnt">{{ S.students.length }}</span>
      </a>
    </nav>

    <div class="nav-label">最近对话</div>
    <div class="recent">
      <button v-for="c in recent" :key="c.id" class="nav-chat" :title="c.title" @click="openChatById(c.id)">
        {{ c.title }}
      </button>
      <div v-if="!recent.length" class="muted" style="font-size: 12px; padding: 2px 10px">还没有对话</div>
    </div>

    <div class="side-foot">
      <nav class="nav">
        <a href="#/settings" :class="{ on: page === 'settings' }" @click.prevent="go('settings')">
          <span class="ico"><Icon name="gear" /></span>
          <span class="t">设置</span>
        </a>
      </nav>
      <button class="me" @click="go('settings', { sec: 'teacher' })">
        <TeacherAvatar :gender="teacher.gender" :size="32" />
        <div>
          <div class="me-name">{{ teacher.name }}</div>
          <div class="me-sub">班主任{{ teacher.subject ? ' · ' + teacher.subject : '' }}</div>
        </div>
      </button>
      <div class="sign">Developed by @赛博老爸</div>
    </div>
  </aside>
</template>

<style scoped>
.nav-chat {
  font-size: 12.5px;
  color: var(--ink2);
  height: 30px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  display: block;
  line-height: 30px;
  width: 100%;
  text-align: left;
}
</style>
