/**
 * 通知端口（依赖倒置）
 *
 * core 层是纯领域逻辑，不应该知道"提示长什么样"。
 * 但它确实需要在存储写满、复制失败、AI 出错时告诉用户。
 * 这里只声明一个「说一句话」的抽象，具体实现（Toast）由 UI 层启动时注入，
 * 从而切断 core → ui 的反向依赖。
 */

export type Notifier = (msg: string) => void

/** 默认实现是空操作：UI 未注册时静默降级，不抛错 */
let impl: Notifier = () => undefined

/** 由入口（main.ts）在应用启动前调用一次 */
export function setNotifier(fn: Notifier): void {
  impl = fn
}

/** core 层统一通过它向用户发提示 */
export function notify(msg: string): void {
  impl(msg)
}
