/**
 * 会话区「滚动到底部」回调的注册点
 *
 * 由 AiView 在挂载时注册，AI 调度层流式输出时调用。
 * 这样调度层就不必反向依赖页面组件。
 */

export const threadHook: { fn: (() => void) | null } = { fn: null }

export function scrollThread(): void {
  if (threadHook.fn) threadHook.fn()
}
