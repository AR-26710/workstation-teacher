/**
 * 全局响应式状态 + 自动持久化
 */
import { reactive, watch } from 'vue'
import { migrate, defaultState, STORE_KEY } from './state'
import { Store } from './storage'
import type { AppState } from './types'
import { toast } from '../ui/toast'

export const S = reactive<AppState>(defaultState())

let timer: number | undefined
let persisted = false

function write(): void {
  const ok = Store.set(STORE_KEY, JSON.stringify(S))
  if (!ok) toast('存储空间不足，请到设置里导出备份')
}

/** 写入磁盘（默认防抖 250ms，now=true 立即写） */
export function save(now = false): void {
  if (now) {
    clearTimeout(timer)
    write()
    return
  }
  clearTimeout(timer)
  timer = window.setTimeout(write, 250)
}

export function load(): AppState | null {
  const raw = Store.get(STORE_KEY)
  if (!raw) return null
  try {
    return migrate(JSON.parse(raw) as Partial<AppState>)
  } catch {
    return null
  }
}

/** 整体替换状态（载入示例 / 恢复备份 / 清空数据） */
export function replaceState(next: AppState): void {
  Object.keys(S).forEach((k) => {
    delete (S as Record<string, unknown>)[k]
  })
  Object.assign(S, next)
}

/** 启动持久化监听（在 main.ts 里调用一次） */
export function startPersistence(): void {
  if (persisted) return
  persisted = true
  watch(S, () => save(), { deep: true })
}

export function isStorageOk(): boolean {
  return Store.ok()
}
