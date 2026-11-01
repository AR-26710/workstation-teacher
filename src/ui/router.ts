/**
 * 极简路由：hash 同步 + 页面切换
 */
import { ref } from 'vue'

export type PageName = 'class' | 'students' | 'scores' | 'analysis' | 'ai' | 'settings'

export const PAGES: PageName[] = ['class', 'students', 'scores', 'analysis', 'ai', 'settings']

/** 哪些页面带右侧概况栏 */
export const RAIL_PAGES: PageName[] = ['class']

export const page = ref<PageName>('class')
export const pageOpts = ref<Record<string, string> | null>(null)
export const railOpen = ref(false)

export function isPage(v: string): v is PageName {
  return (PAGES as string[]).indexOf(v) >= 0
}

export function go(p: PageName, opts?: Record<string, string> | null): void {
  page.value = p
  pageOpts.value = opts || null
  railOpen.value = false
  try {
    if (location.hash !== '#/' + p) history.replaceState(null, '', '#/' + p)
  } catch {
    /* ignore */
  }
}

export function hasRail(): boolean {
  return RAIL_PAGES.indexOf(page.value) >= 0
}
