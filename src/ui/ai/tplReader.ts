/**
 * 模板表单取值回调的注册点（打破循环依赖）
 *
 * 模板表单（TemplateFormModal）挂载时把 readValues 注册进来，
 * AI 调度层需要提交时再读取。
 * 双方都只依赖这个叶子模块，从而切断
 * ui/ai → components/TemplateFormModal → ui/ai 的环。
 */

import type { TplValues } from '@core/aicontext'

export const tplReader: { fn: (() => TplValues | null) | null } = { fn: null }
