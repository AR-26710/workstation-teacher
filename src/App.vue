<script setup lang="ts">
/**
 * 工作台外壳：侧边栏 + 主区 + 右侧概况栏 + 弹窗/抽屉/提示宿主
 */
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { S } from './core/app'
import { page, go, hasRail, railOpen, isPage } from './ui/router'
import { drawerSid } from './ui/drawer'
import { closeModal } from './ui/modal'
import { openStudent } from './ui/actions'
import { stuById } from './core/select'
import AppSidebar from './components/AppSidebar.vue'
import ClassRail from './components/ClassRail.vue'
import ModalHost from './components/ModalHost.vue'
import ToastHost from './components/ToastHost.vue'
import StudentDrawer from './components/StudentDrawer.vue'
import Icon from './components/Icon.vue'
import WelcomeView from './views/WelcomeView.vue'
import ClassroomView from './views/ClassroomView.vue'
import StudentsView from './views/StudentsView.vue'
import ScoresView from './views/ScoresView.vue'
import AnalysisView from './views/AnalysisView.vue'
import AiView from './views/AiView.vue'
import SettingsView from './views/SettingsView.vue'

const onboarded = computed(() => S.settings.onboarded)

const views: Record<string, unknown> = {
  class: ClassroomView,
  students: StudentsView,
  scores: ScoresView,
  analysis: AnalysisView,
  ai: AiView,
  settings: SettingsView
}

const current = computed(() => views[page.value])

const fsOn = ref(false)

function isFull(): boolean {
  return !!(document.fullscreenElement || (document as { webkitFullscreenElement?: Element }).webkitFullscreenElement)
}

function updateFs(): void {
  fsOn.value = isFull()
}

function toggleFullscreen(): void {
  const el = document.documentElement as HTMLElement & {
    webkitRequestFullscreen?: () => void | Promise<void>
  }
  try {
    if (isFull()) {
      const exit = document.exitFullscreen || (document as unknown as { webkitExitFullscreen?: () => void }).webkitExitFullscreen
      if (exit) exit.call(document)
      return
    }
    const req = el.requestFullscreen || el.webkitRequestFullscreen
    if (!req) return
    const p = req.call(el) as Promise<void> | undefined
    if (p && p.catch) p.catch(() => undefined)
  } catch {
    /* 浏览器不允许全屏时忽略 */
  }
}

/** 图表 / 图内 data-tip 悬浮提示（全局委托） */
const tip = ref<HTMLElement | null>(null)
function onMove(e: MouseEvent): void {
  const el = tip.value
  if (!el) return
  const t = e.target as HTMLElement | null
  const hit = t && t.closest ? t.closest('[data-tip]') : null
  if (!hit) {
    el.classList.remove('on')
    return
  }
  el.innerHTML = hit.getAttribute('data-tip') || ''
  const w = el.offsetWidth
  const h = el.offsetHeight
  let x = e.clientX + 14
  let y = e.clientY - h - 12
  if (x + w > window.innerWidth - 8) x = e.clientX - w - 14
  if (y < 8) y = e.clientY + 18
  el.style.left = x + 'px'
  el.style.top = y + 'px'
  el.classList.add('on')
}

/** Esc：先关弹窗，再关抽屉 */
function onKey(e: KeyboardEvent): void {
  if (e.key !== 'Escape') return
  if (drawerSid.value) {
    drawerSid.value = null
    return
  }
  closeModal()
}

function onHash(): void {
  const h = (location.hash || '').replace('#/', '')
  if (onboarded.value && isPage(h) && h !== page.value) go(h)
}

onMounted(() => {
  document.addEventListener('mousemove', onMove)
  document.addEventListener('keydown', onKey)
  window.addEventListener('hashchange', onHash)
  ;['fullscreenchange', 'webkitfullscreenchange'].forEach((ev) => document.addEventListener(ev, updateFs))
})

onUnmounted(() => {
  document.removeEventListener('mousemove', onMove)
  document.removeEventListener('keydown', onKey)
  window.removeEventListener('hashchange', onHash)
  ;['fullscreenchange', 'webkitfullscreenchange'].forEach((ev) => document.removeEventListener(ev, updateFs))
})

function onPickStudent(sid: string): void {
  if (stuById(sid)) openStudent(sid)
}
</script>

<template>
  <template v-if="!onboarded">
    <WelcomeView />
    <ToastHost />
  </template>

  <template v-else>
    <div class="app" :class="{ 'with-rail': hasRail(), 'rail-open': railOpen }">
      <AppSidebar @pick-student="onPickStudent" />
      <main class="main">
        <component :is="current" :key="page" />
      </main>
      <ClassRail v-if="hasRail()" />
      <button
        class="btn btn-light btn-sm fs-global"
        :title="fsOn ? '退出全屏（Esc）' : '全屏显示整个工作台（适合投屏上课）'"
        @click="toggleFullscreen"
      >
        <Icon :name="fsOn ? 'unfull' : 'fit'" />
        {{ fsOn ? '退出全屏' : '全屏' }}
      </button>
    </div>

    <ModalHost />
    <StudentDrawer v-if="drawerSid" />
    <ToastHost />
    <div ref="tip" id="tip" class="tip" />
  </template>
</template>
