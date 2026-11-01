/**
 * Toast 提示服务
 */
import { reactive } from 'vue'

export interface ToastItem {
  id: number
  msg: string
}

export const toasts = reactive<ToastItem[]>([])

let seq = 0

export function toast(msg: string): void {
  const id = ++seq
  toasts.push({ id, msg })
  window.setTimeout(() => {
    const i = toasts.findIndex((t) => t.id === id)
    if (i >= 0) toasts.splice(i, 1)
  }, 2000)
}
