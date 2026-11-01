/**
 * 弹窗服务：用组件作为 body，按钮数组作为 footer
 */
import { reactive } from 'vue'
import type { Component } from 'vue'
import ConfirmBody from '../components/ConfirmBody.vue'

export interface ModalBtn {
  t: string
  cls?: string
  /** 点击后执行；返回 false 时不关闭弹窗 */
  act?: () => void | boolean | Promise<void | boolean>
}

export interface ModalOptions {
  title: string
  component: Component
  props?: Record<string, unknown>
  wide?: boolean
  /** 默认 [{ t: '取消', cls: 'btn-light' }]；'none' 表示不显示底栏 */
  foot?: ModalBtn[] | 'none'
  /** 关闭后的回调 */
  onClose?: () => void
  /** 供业务代码临时挂载数据（等价于旧版的 modalCtx） */
  ctx?: Record<string, unknown>
}

export const modalState = reactive<{ open: boolean; o: ModalOptions | null; seq: number }>({
  open: false,
  o: null,
  seq: 0
})

export function openModal(o: ModalOptions): void {
  modalState.o = o
  modalState.seq++
  modalState.open = true
}

export function closeModal(): void {
  const cur = modalState.o
  modalState.open = false
  modalState.o = null
  if (cur && cur.onClose) cur.onClose()
}

/** 确认框 */
export function confirm(
  title: string,
  msg: string,
  okText: string,
  onOk: () => void,
  danger = false
): void {
  openModal({
    title,
    component: ConfirmBody,
    props: { msg },
    foot: [
      { t: '取消', cls: 'btn-light' },
      {
        t: okText || '确定',
        cls: danger ? 'btn-red' : 'btn-dark',
        act: () => {
          onOk()
        }
      }
    ]
  })
}
