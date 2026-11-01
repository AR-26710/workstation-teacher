/**
 * AI 助手页面级状态与对话 / 批量任务调度
 */
import { reactive, ref } from 'vue'
import { S, save } from '../../core/app'
import { AIC, Mask } from '../../core/ai'
import {
  TPLS,
  batchCombinedPrompt,
  batchJobs,
  classContext,
  commentPrompt,
  examContext,
  fullPrompt,
  studentContext,
  sysPrompt,
  tplById,
  userContent,
  type Tpl,
  type TplJob,
  type TplValues
} from '../../core/aicontext'
import { examById, prevExam, stuById } from '../../core/select'
import { uid, todayStr } from '../../core/utils'
import { toast } from '../shell/toast'
import { openModal, closeModal } from '../shell/modal'
import { closeDrawer } from '../shell/drawer'
import { go } from '../shell/router'
import { tplReader } from './tplReader'
import { scrollThread } from './thread'
import TemplateFormModal from '../../components/ai/TemplateFormModal.vue'
import PromptCopyModal from '../../components/ai/PromptCopyModal.vue'
import type { BatchItem, Chat, ChatMessage } from '../../core/types'

/** 滚动回调注册点：AiView 挂载时注册，见 ui/ai/thread.ts */
export { threadHook } from './thread'

/** 当前打开的对话 id；null 表示回到助手首页 */
export const activeChatId = ref<string | null>(null)

export const AIP = reactive({
  tab: 'rec',
  busy: false,
  ctx: { cls: false, sid: '', exam: '' }
})

let ctrl: AbortController | null = null

/** 从侧栏「最近对话」进入某个对话 */
export function openChatById(id: string): void {
  activeChatId.value = id
  go('ai')
}

/** 新建对话 */
export function newChat(): void {
  activeChatId.value = null
  go('ai')
}

export function chatById(id: string | null): Chat | null {
  if (!id) return null
  for (let i = 0; i < S.chats.length; i++) if (S.chats[i].id === id) return S.chats[i]
  return null
}

export const activeChat = (): Chat | null => chatById(activeChatId.value)

/* ---------- 模板入口 ---------- */

export interface TplPre {
  sid?: string | null
  exam?: string | null
  cmp?: string | null
}

export function openAITemplate(id: string, pre: TplPre = {}): void {
  const tpl = tplById(id)
  if (!tpl) return
  closeDrawer()
  openModal({
    title:
      '<span style="display:inline-flex;align-items:center;gap:8px"><i style="width:22px;height:22px;border-radius:7px;display:inline-grid;place-items:center;font-style:normal;font-size:12px;background:' +
      tpl.color +
      '1a;color:' +
      tpl.color +
      '">' +
      tpl.ico +
      '</i>' +
      tpl.title +
      '</span>',
    component: TemplateFormModal,
    props: { tplId: id, pre },
    wide: true,
    foot: [
      { t: '复制提示词', cls: 'btn-light', act: () => tplCopy(tpl) },
      { t: AIC.ready() ? '开始生成' : '生成（复制提示词）', cls: 'btn-dark', act: () => tplGo(tpl) }
    ]
  })
}

function readValues(): TplValues | null {
  if (!tplReader.fn) return null
  return tplReader.fn()
}

function tplGo(tpl: Tpl): boolean {
  const v = readValues()
  if (!v) return false
  if (tpl.batch) {
    startBatch(tpl, v)
    return true
  }
  if (!tpl.build) return false
  const job = tpl.build(v)
  job.tpl = tpl.id
  startChat(job)
  return true
}

function tplCopy(tpl: Tpl): boolean {
  const v = readValues()
  if (!v) return false
  if (tpl.batch) {
    copyPromptModal(batchCombinedPrompt(tpl, v))
    return false
  }
  if (!tpl.build) return false
  copyPromptModal(fullPrompt(tpl.build(v)))
  return false
}

export function copyPromptModal(text: string): void {
  openModal({
    title: '复制提示词，粘贴到任意 AI 网页版',
    component: PromptCopyModal,
    props: { text },
    wide: true,
    foot: [
      { t: '配置 API，直接生成', cls: 'btn-light', act: () => go('settings', { sec: 'ai' }) },
      { t: '复制提示词', cls: 'btn-dark', act: () => undefined }
    ]
  })
}

/* ---------- 对话 ---------- */

function busyGuard(): boolean {
  if (AIP.busy) {
    toast('上一个任务还在生成，等它写完或先点「停止」')
    return true
  }
  return false
}

export function startChat(job: TplJob): void {
  if (!AIC.ready()) {
    copyPromptModal(fullPrompt(job))
    return
  }
  if (busyGuard()) return
  closeModal()
  const c: Chat = {
    id: uid('c'),
    title: job.title || '新对话',
    date: Date.now(),
    tpl: job.tpl || '',
    sid: job.sid || null,
    saveAs: job.saveAs || null,
    msgs: [{ role: 'user', show: job.show, content: userContent(job) }]
  }
  S.chats.unshift(c)
  save(true)
  activeChatId.value = c.id
  closeDrawer()
  go('ai')
  runChat(c)
}

export function sendDirect(text: string): void {
  if (!text) return
  if (AIP.busy) return
  const ctx: string[] = []
  if (AIP.ctx.cls) ctx.push(classContext())
  if (AIP.ctx.sid) {
    const s = stuById(AIP.ctx.sid)
    if (s) ctx.push(studentContext(s))
  }
  if (AIP.ctx.exam) {
    const ex = examById(AIP.ctx.exam)
    if (ex) ctx.push(examContext(ex, prevExam(ex)))
  }
  startChat({ title: text.slice(0, 26), show: text, prompt: text, ctx, sid: AIP.ctx.sid || null })
  AIP.ctx.cls = false
  AIP.ctx.sid = ''
  AIP.ctx.exam = ''
}

export function followUp(text: string): void {
  const c = activeChat()
  if (!c || busyGuard()) return
  c.msgs.push({ role: 'user', show: text, content: Mask.apply(text) })
  save(true)
  runChat(c)
}

export function runChat(c: Chat): void {
  const msgs = [{ role: 'system', content: sysPrompt() }].concat(
    c.msgs
      .filter((m) => !m.err && !m.batch && (m.role === 'user' || (m.content && m.content.trim())))
      .map((m) => ({ role: m.role, content: m.role === 'assistant' ? Mask.apply(m.content) : m.content }))
  )
  const bot: ChatMessage = { role: 'assistant', content: '', streaming: true }
  c.msgs.push(bot)
  AIP.busy = true
  const ac = new AbortController()
  ctrl = ac
  let raf: number | null = null
  AIC.stream(
    msgs,
    (_d, full) => {
      bot.content = Mask.restore(full)
      if (raf === null) {
        raf = requestAnimationFrame(() => {
          raf = null
          save()
          scrollThread()
        })
      }
    },
    ac.signal
  )
    .then(() => {
      bot.streaming = false
      AIP.busy = false
      c.date = Date.now()
      save()
      scrollThread()
    })
    .catch((e: Error) => {
      bot.streaming = false
      AIP.busy = false
      if (!bot.content) bot.err = e.message
      else bot.content += '\n\n（' + e.message + '）'
      save()
    })
}

export function stopGen(): void {
  if (ctrl) ctrl.abort()
}

export function regenChat(): void {
  const c = activeChat()
  if (!c || AIP.busy) return
  while (c.msgs.length && c.msgs[c.msgs.length - 1].role === 'assistant') c.msgs.pop()
  if (!c.msgs.length) return
  runChat(c)
}

export function delChat(): void {
  const c = activeChat()
  if (!c) return
  S.chats = S.chats.filter((x) => x.id !== c.id)
  activeChatId.value = null
  save()
}

/* ---------- 批量 ---------- */

export function startBatch(tpl: Tpl, v: TplValues): void {
  const jobs = batchJobs(tpl, v)
  if (!jobs.length) {
    toast(tpl.id === 'parent-batch' ? '没有退步 5 名以上的同学' : '请至少选择一位学生')
    return
  }
  if (!AIC.ready()) {
    copyPromptModal(batchCombinedPrompt(tpl, v))
    return
  }
  if (busyGuard()) return
  closeModal()
  const title =
    tpl.id === 'comments' ? '期末评语 · ' + jobs.length + ' 人' : '退步同学家长沟通 · ' + jobs.length + ' 人'
  const items: BatchItem[] = jobs.map((j) => ({ sid: j.sid, prompt: j.prompt, text: '', st: 'wait' }))
  const c: Chat = {
    id: uid('c'),
    title,
    date: Date.now(),
    tpl: tpl.id,
    batchOnly: true,
    saveAs: tpl.id === 'comments' ? 'comment' : null,
    msgs: [
      {
        role: 'user',
        show:
          tpl.id === 'comments'
            ? '帮我给 ' + jobs.length + ' 位同学写期末评语（' + v.style + '，' + v.len + '，' + v.person + '）'
            : '给退步 5 名以上同学的家长写' + v.channel + '（' + jobs.length + ' 人）',
        content: ''
      },
      { role: 'assistant', content: '', batch: { kind: tpl.id, items } }
    ]
  }
  S.chats.unshift(c)
  save(true)
  activeChatId.value = c.id
  go('ai')
  runBatch(c)
}

export function runBatch(c: Chat): void {
  const m = c.msgs[1]
  if (!m.batch) return
  const items = m.batch.items
  let i = 0
  AIP.busy = true
  const ac = new AbortController()
  ctrl = ac
  function next(): void {
    while (i < items.length && items[i].st === 'done') i++
    if (i >= items.length || ac.signal.aborted) {
      AIP.busy = false
      items.forEach((x) => {
        if (x.st === 'run') x.st = 'wait'
      })
      save()
      return
    }
    const it = items[i]
    it.st = 'run'
    it.text = ''
    let raf: number | null = null
    AIC.stream([{ role: 'system', content: sysPrompt() }, { role: 'user', content: it.prompt }], (_d, full) => {
      it.text = Mask.restore(full)
      if (raf === null) {
        raf = requestAnimationFrame(() => {
          raf = null
          save()
        })
      }
    }, ac.signal)
      .then(() => {
        it.st = 'done'
        it.text = it.text.trim()
        save()
        i++
        next()
      })
      .catch((e: Error & { abort?: boolean }) => {
        it.st = e.abort ? 'wait' : 'err'
        it.err = e.message
        save()
        if (e.abort) {
          AIP.busy = false
          return
        }
        i++
        next()
      })
  }
  next()
}

export function resumeBatch(): void {
  const c = activeChat()
  if (!c || AIP.busy) return
  const b = c.msgs[1] && c.msgs[1].batch
  if (!b) return
  b.items.forEach((x) => {
    if (x.st === 'err') x.st = 'wait'
  })
  runBatch(c)
}

export function saveBatchOne(k: number): void {
  const c = activeChat()
  if (!c) return
  const b = c.msgs[1] && c.msgs[1].batch
  if (!b) return
  const it = b.items[k]
  const s = stuById(it.sid)
  if (!s) return
  s.comments.push({ id: uid('c'), text: it.text, date: todayStr(), src: 'AI' })
  it.saved = true
  save()
  toast('已保存到 ' + s.name + ' 的档案')
}

export function saveBatchAll(): void {
  const c = activeChat()
  if (!c) return
  const b = c.msgs[1] && c.msgs[1].batch
  if (!b) return
  let n = 0
  b.items.forEach((it) => {
    const s = stuById(it.sid)
    if (s && it.st === 'done' && !it.saved && it.text) {
      s.comments.push({ id: uid('c'), text: it.text, date: todayStr(), src: 'AI' })
      it.saved = true
      n++
    }
  })
  save()
  toast(n ? '已保存 ' + n + ' 条评语到学生档案' : '都已经保存过了')
}

/** 消息保存为评语 / 成长记录 */
export function saveMsgAsComment(i: number): void {
  const c = activeChat()
  if (!c) return
  const s = stuById(c.sid)
  if (!s) return
  s.comments.push({ id: uid('c'), text: (c.msgs[i].content || '').trim(), date: todayStr(), src: 'AI' })
  save()
  toast('已保存到 ' + s.name + ' 的评语')
}

export function saveMsgAsRecord(i: number): void {
  const c = activeChat()
  if (!c) return
  const s = stuById(c.sid)
  if (!s) return
  S.records.push({
    id: uid('r'),
    sid: s.id,
    type: '其他',
    text: c.title + '：' + (c.msgs[i].content || '').replace(/[#*>`]/g, '').slice(0, 200),
    date: todayStr()
  })
  save()
  toast('已记到 ' + s.name + ' 的成长记录')
}

/** 各种模板入口（供设置页等直接调用） */
export { TPLS, commentPrompt, sysPrompt }
