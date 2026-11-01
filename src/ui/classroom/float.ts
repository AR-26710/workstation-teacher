/**
 * 教室「飘分」动画回调的注册点
 *
 * 由 ClassroomView 在挂载时注册；加分动作（学生域）只管调用，
 * 不必知道动画在哪个页面组件上。
 */

export type FloatFn = (seat: string | null, text: string, color: string) => void

export const floatHook: { fn: FloatFn | null } = { fn: null }
