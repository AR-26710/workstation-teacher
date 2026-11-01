/**
 * AI 协议客户端：OpenAI 兼容接口 + Claude 原生协议，支持流式输出
 *
 * 职责：只负责"怎么把请求发出去、怎么把流读回来、怎么把错误翻译成人话"。
 * 不含提示词构造（见 aicontext/）与对话调度（见 ui/ai/）。
 */

import { S } from '@core/app'
import { notify } from '@core/notify'
import { presetOf, tempOf } from './presets'

export interface AiError extends Error {
  isAI: true
  status?: number
  abort?: boolean
}

function httpErr(status: number, text: string): AiError {
  let msg = ''
  let detail = ''
  try {
    const j = JSON.parse(text) as { error?: { message?: string; msg?: string }; message?: string }
    detail = (j.error && (j.error.message || j.error.msg)) || j.message || ''
  } catch {
    detail = String(text || '').slice(0, 160)
  }
  if (status === 401 || status === 403) msg = 'API Key 无效或没有权限，请到「设置 → AI 接口」检查。'
  else if (status === 404) msg = '接口地址或模型名不对，请检查 Base URL 和模型名称。'
  else if (status === 429) msg = '请求太频繁或额度用完了，稍后再试，或到服务商后台看看余额。'
  else if (status === 402) msg = '账户余额不足，请到服务商后台充值。'
  else if (status >= 500) msg = 'AI 服务暂时出错（' + status + '），稍后再试。'
  else msg = '请求被拒绝（' + status + '）。'
  const e = new Error(msg + (detail ? '\n服务返回：' + detail : '')) as AiError
  e.isAI = true
  e.status = status
  return e
}

export const AIC = {
  ready(): boolean {
    const a = S.settings.ai
    return !!(a.base && a.model && (a.key || /localhost|127\.0\.0\.1/.test(a.base)))
  },
  isClaude(): boolean {
    const a = S.settings.ai
    return a.provider === 'claude' || /anthropic\.com/.test(a.base)
  },
  label(): string {
    const a = S.settings.ai
    return presetOf(a.provider).name.replace(/（.*）/, '') + ' · ' + (a.model || '未填模型')
  },
  httpErr,
  /** 流式调用；onDelta(增量, 全文) */
  stream(
    messages: { role: string; content: string }[],
    onDelta: (delta: string, full: string) => void,
    signal?: AbortSignal | null,
    maxTokens?: number
  ): Promise<string> {
    const a = S.settings.ai
    const base = String(a.base || '').replace(/\/+$/, '')
    let req: RequestInit
    let url: string
    if (AIC.isClaude()) {
      const sys = messages
        .filter((m) => m.role === 'system')
        .map((m) => m.content)
        .join('\n\n')
      url = base + '/messages'
      req = {
        method: 'POST',
        signal: signal || null,
        headers: {
          'content-type': 'application/json',
          'x-api-key': a.key,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({
          model: a.model,
          max_tokens: maxTokens || 4096,
          system: sys,
          stream: true,
          temperature: Math.min(1, tempOf(a)),
          messages: messages.filter((m) => m.role !== 'system')
        })
      }
    } else {
      url = base + '/chat/completions'
      const hd: Record<string, string> = { 'Content-Type': 'application/json' }
      if (a.key) hd.Authorization = 'Bearer ' + a.key
      const body: Record<string, unknown> = { model: a.model, messages, stream: true, temperature: tempOf(a) }
      if (maxTokens) body.max_tokens = maxTokens
      req = { method: 'POST', signal: signal || null, headers: hd, body: JSON.stringify(body) }
    }

    let full = ''
    const push = (t: string): void => {
      if (t) {
        full += t
        onDelta(t, full)
      }
    }

    return fetch(url, req)
      .then((res) => {
        if (!res.ok) return res.text().then((t) => {
          throw httpErr(res.status, t)
        })
        const ct = res.headers.get('content-type') || ''
        if (ct.indexOf('application/json') >= 0) {
          return res.json().then((j: { choices?: { message?: { content?: string } }[]; content?: { text?: string }[] }) => {
            const t =
              j.choices && j.choices[0] && j.choices[0].message
                ? j.choices[0].message.content
                : j.content && j.content[0]
                  ? j.content[0].text
                  : ''
            push(t || '')
            return full
          })
        }
        const reader = (res.body as ReadableStream<Uint8Array>).getReader()
        const dec = new TextDecoder('utf-8')
        let buf = ''
        function pump(): Promise<string> {
          return reader.read().then((r) => {
            if (r.done) return full
            buf += dec.decode(r.value, { stream: true })
            const lines = buf.split('\n')
            buf = lines.pop() || ''
            lines.forEach((ln) => {
              ln = ln.trim()
              if (ln.indexOf('data:') !== 0) return
              const p = ln.slice(5).trim()
              if (!p || p === '[DONE]') return
              try {
                const j = JSON.parse(p) as {
                  error?: unknown
                  type?: string
                  delta?: { text?: string }
                  choices?: { delta?: { content?: string } }[]
                }
                if (j.error) throw httpErr(400, JSON.stringify(j.error))
                if (j.type === 'content_block_delta' && j.delta) push(j.delta.text || '')
                else if (j.choices && j.choices[0] && j.choices[0].delta) push(j.choices[0].delta.content || '')
              } catch (e) {
                const err = e as { isAI?: boolean }
                if (err && err.isAI) throw e
              }
            })
            return pump()
          })
        }
        return pump()
      })
      .catch((e: unknown) => {
        const err = e as { isAI?: boolean; name?: string }
        if (err && err.isAI) throw e
        if (err && err.name === 'AbortError') {
          const ab = new Error('已停止生成') as AiError
          ab.isAI = true
          ab.abort = true
          throw ab
        }
        const ne = new Error(
          '连不上 AI 服务。常见原因：① 网络不通或地址填错；② 这家服务不允许网页直接调用（跨域限制）。可以换 DeepSeek、Kimi 等试试，或运行开源包里的 ai-proxy.js 做本地中转。'
        ) as AiError
        ne.isAI = true
        throw ne
      })
  }
}

/** 测试连接用的极短请求 */
export function testConnection(): Promise<{ text: string; ms: number }> {
  const t0 = Date.now()
  return AIC.stream([{ role: 'user', content: '请只回复四个字：连接成功' }], () => undefined, null, 20).then((txt) => ({
    text: txt,
    ms: Date.now() - t0
  }))
}

export function toastAiError(e: unknown): void {
  const err = e as Error
  notify(err.message || '生成失败')
}
