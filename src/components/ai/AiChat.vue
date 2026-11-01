<script setup lang="ts">
/** AI 助手对话页：流式输出 / 批量任务 */
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { S } from '@core/app'
import { AIC } from '@core/ai'
import { sysPrompt } from '@core/aicontext'
import { stuById } from '@core/select'
import { mdToHtml, exportWord } from '@core/markdown'
import { copyText } from '@core/files'
import {
  AIP,
  activeChatId,
  chatById,
  copyPromptModal,
  followUp,
  newChat,
  regenChat,
  resumeBatch,
  saveBatchAll,
  saveBatchOne,
  saveMsgAsComment,
  saveMsgAsRecord,
  stopGen,
  threadHook,
  delChat
} from '@ui/ai'
import { go } from '@ui/shell/router'
import BrandMark from '@components/common/BrandMark.vue'
import StudentAvatar from '@components/student/StudentAvatar.vue'
import Icon from '@components/common/Icon.vue'
import type { ChatMessage } from '@core/types'

const chat = computed(() => chatById(activeChatId.value))
const input = ref('')
const threadEl = ref<HTMLElement | null>(null)

function scrollBottom(): void {
  const el = threadEl.value
  if (el) el.scrollTop = el.scrollHeight
}

onMounted(() => {
  threadHook.fn = scrollBottom
  nextTick(scrollBottom)
})

onBeforeUnmount(() => {
  threadHook.fn = null
})

function send(): void {
  const t = input.value.trim()
  if (!t) return
  followUp(t)
  input.value = ''
}

function onKey(e: KeyboardEvent): void {
  if (e.key === 'Enter' && !e.shiftKey && !(e as unknown as { isComposing: boolean }).isComposing) {
    e.preventDefault()
    send()
  }
}

function isLast(i: number): boolean {
  const c = chat.value
  return !!c && i === c.msgs.length - 1
}

function chatWord(): void {
  const c = chat.value
  if (!c) return
  const md = c.msgs
    .filter((m) => m.role === 'assistant' && !m.err)
    .map((m) => {
      if (m.batch) {
        return m.batch.items
          .filter((x) => x.text)
          .map((x) => {
            const s = stuById(x.sid)
            return '### ' + (s ? s.name : '') + '\n\n' + x.text
          })
          .join('\n\n')
      }
      return m.content
    })
    .join('\n\n---\n\n')
  exportWord(c.title, md)
}

function msgWord(i: number): void {
  const c = chat.value
  if (!c) return
  exportWord(c.title, c.msgs[i].content)
}

function copyPrompt(): void {
  const c = chat.value
  if (!c) return
  const text = sysPrompt() + '\n\n' + c.msgs.filter((x) => x.role === 'user').map((x) => x.content).join('\n\n')
  copyPromptModal(text)
}

function mdFull(m: { content: string; streaming?: boolean }): string {
  return mdToHtml(m.content) + (m.streaming ? '<span class="cursor"></span>' : '')
}

function batchDone(m: ChatMessage): number {
  return m.batch ? m.batch.items.filter((x) => x.st === 'done').length : 0
}

function batchTotal(m: ChatMessage): number {
  return m.batch ? m.batch.items.length : 0
}

function goSettingsAi(): void {
  go('settings', { sec: 'ai' })
}
</script>

<template>
  <template v-if="chat">
    <div class="thread-head">
      <button class="btn btn-ghost btn-sm" @click="newChat()"><Icon name="back" />新对话</button>
      <div class="t">{{ chat.title }}</div>
      <button class="api-pill" :class="{ ok: AIC.ready() }" title="AI 接口设置" @click="goSettingsAi">
        <i></i>{{ AIC.ready() ? AIC.label() : '未配置 AI 接口 · 生成时可复制提示词' }}
      </button>
      <button class="btn btn-ghost btn-sm" @click="chatWord"><Icon name="doc" />导出 Word</button>
      <button class="btn btn-ghost btn-sm btn-icon" title="删除对话" aria-label="删除对话" @click="delChat">
        <Icon name="trash" />
      </button>
    </div>

    <div ref="threadEl" class="ai-thread scroll">
      <div class="ai-wrap">
        <template v-for="(m, i) in chat.msgs" :key="i">
          <div v-if="m.role === 'user'" class="msg user">
            <div class="bubble">{{ m.show || m.content }}</div>
          </div>
          <div v-else class="msg bot">
            <BrandMark kind="ai" :size="30" />
            <div class="body">
              <div class="who">班级助理{{ m.streaming ? ' · 正在写…' : '' }}</div>
              <div v-if="m.err" class="msg-err">
                {{ m.err }}
                <div style="margin-top: 8px; display: flex; gap: 6px">
                  <button v-if="isLast(i)" class="btn btn-xs btn-dark" @click="regenChat">重试</button>
                  <button class="btn btn-xs btn-light" @click="goSettingsAi">检查 AI 设置</button>
                  <button class="btn btn-xs btn-light" @click="copyPrompt">改为复制提示词</button>
                </div>
              </div>
              <template v-else-if="m.batch">
                <div class="md" style="padding: 14px 16px">
                  <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px">
                    <b>{{ AIP.busy && activeChatId === chat.id ? '正在生成 ' : '已完成 ' }}{{ batchDone(m) }} / {{ batchTotal(m) }}</b>
                    <div class="prog" style="flex: 1; margin: 0">
                      <i :style="{ width: Math.round((batchDone(m) / batchTotal(m)) * 100) + '%' }"></i>
                    </div>
                    <button v-if="!AIP.busy && batchDone(m) < batchTotal(m)" class="btn btn-xs btn-dark" @click="resumeBatch">
                      继续生成
                    </button>
                    <button v-if="m.batch.kind === 'comments' && batchDone(m)" class="btn btn-xs btn-dark" @click="saveBatchAll">
                      全部保存到档案
                    </button>
                  </div>
                  <div class="batch-item" v-for="(it, k) in m.batch.items" :key="it.sid">
                    <div class="h">
                      <StudentAvatar :st="S.students.filter((x) => x.id === it.sid)[0]" :size="24" />{{
                        stuById(it.sid)?.name
                      }}<span class="grow"></span>
                      <span v-if="it.st === 'run'" class="tag blue">生成中</span>
                      <span v-else-if="it.st === 'wait'" class="tag gray">排队中</span>
                      <span v-else-if="it.st === 'err'" class="tag red" :title="it.err || ''">失败</span>
                      <template v-if="it.st === 'done'">
                        <button class="btn btn-xs btn-ghost" @click="copyText(it.text)"><Icon name="copy" />复制</button>
                        <button v-if="m.batch.kind === 'comments'" class="btn btn-xs btn-ghost" @click="saveBatchOne(k)">
                          保存到档案
                        </button>
                      </template>
                    </div>
                    <div class="tx">{{ it.text || (it.st === 'err' ? it.err : '') }}</div>
                  </div>
                </div>
              </template>
              <div v-else class="md" v-html="mdFull(m)"></div>

              <div v-if="!m.streaming && !m.err && !m.batch" class="msg-tools">
                <button class="btn btn-xs btn-ghost" @click="copyText(m.content)"><Icon name="copy" />复制</button>
                <button class="btn btn-xs btn-ghost" @click="msgWord(i)"><Icon name="doc" />导出 Word</button>
                <button v-if="chat.saveAs === 'comment' && chat.sid" class="btn btn-xs btn-ghost" @click="saveMsgAsComment(i)">
                  <Icon name="check" />保存为评语
                </button>
                <button v-else-if="chat.sid" class="btn btn-xs btn-ghost" @click="saveMsgAsRecord(i)">
                  记到成长记录
                </button>
                <button v-if="isLast(i)" class="btn btn-xs btn-ghost" @click="regenChat">
                  <Icon name="refresh" />重新生成
                </button>
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>

    <div class="ai-foot">
      <div class="ai-wrap" style="max-width: 820px; margin: 0 auto">
        <div class="composer">
          <textarea
            v-model="input"
            :placeholder="chat.batchOnly ? '批量任务不支持追问' : '继续追问，比如：再精简一点 / 换成更正式的语气'"
            :disabled="chat.batchOnly"
            @keydown="onKey"
          ></textarea>
          <div class="composer-bar">
            <span class="muted" style="font-size: 12px">Enter 发送 · Shift + Enter 换行</span>
            <span class="grow"></span>
            <button v-if="AIP.busy" class="btn btn-sm btn-light" @click="stopGen"><Icon name="stop" />停止</button>
            <button v-else class="send" aria-label="发送" :disabled="chat.batchOnly" @click="send">
              <Icon name="send" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </template>
</template>

<style scoped>
.msg-err {
  white-space: pre-line;
}
</style>
