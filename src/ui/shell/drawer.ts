/**
 * 学生档案抽屉（全局单例）
 */
import { ref } from 'vue'

export const drawerSid = ref<string | null>(null)

export function openDrawer(sid: string): void {
  drawerSid.value = sid
}

export function closeDrawer(): void {
  drawerSid.value = null
}
