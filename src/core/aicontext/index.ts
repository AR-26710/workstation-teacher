/**
 * AI 上下文与提示词模块（聚合出口）
 *
 * aicontext 按职责拆成 context / templates / batch / prompt 四块，
 * 本文件只做统一再导出，外部仍可 import { ... } from '@/core/aicontext'。
 */

export * from './context'
export * from './templates'
export * from './batch'
export * from './prompt'
