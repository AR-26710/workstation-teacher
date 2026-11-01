/**
 * 极简路由：hash 同步 + 页面切换
 */
import { ref, watch } from 'vue'
import { Store } from '@core/storage'

export type PageName = 'class' | 'students' | 'scores' | 'analysis' | 'ai' | 'settings'

export const PAGES: PageName[] = ['class', 'students', 'scores', 'analysis', 'ai', 'settings']

/** 哪些页面带右侧概况栏 */
export const RAIL_PAGES: PageName[] = ['class']

export const page = ref<PageName>('class')
export const pageOpts = ref<Record<string, string> | null>(null)

/** 左侧导航栏是否折叠（仅图标） */
export const sideCollapsed = ref<boolean>(Store.get('wt_side_collapsed') === '1')

/** 右侧概况栏是否折叠 */
export const railCollapsed = ref<boolean>(Store.get('wt_rail_collapsed') === '1')

watch(sideCollapsed, (v) => Store.set('wt_side_collapsed', v ? '1' : '0'))
watch(railCollapsed, (v) => Store.set('wt_rail_collapsed', v ? '1' : '0'))

export function isPage(v: string): v is PageName {
  return (PAGES as string[]).indexOf(v) >= 0
}

export function go(p: PageName, opts?: Record<string, string> | null): void {
  page.value = p
  pageOpts.value = opts || null
  try {
    if (location.hash !== '#/' + p) history.replaceState(null, '', '#/' + p)
  } catch {
    /* ignore */
  }
}

export function hasRail(): boolean {
  return RAIL_PAGES.indexOf(page.value) >= 0
}
