<script setup lang="ts">
/** AI 助手首页：模板 + 直接提问 */
import { computed, ref } from 'vue'
import { S, save } from '@core/app'
import { AIC } from '@core/ai'
import { TPL_CATS, TPLS } from '@core/aicontext'
import { studentsByNo, examsSorted } from '@core/select'
import { fmtTime } from '@core/utils'
import { AIP, sendDirect, openAITemplate, activeChatId } from '@ui/ai'
import { go } from '@ui/shell/router'
import BrandMark from '@components/common/BrandMark.vue'
import Icon from '@components/common/Icon.vue'

const input = ref('')
const tplList = computed(() =>
  TPLS.filter((x) => x.cat !== 'hidden' && (AIP.tab === 'rec' ? x.rec : x.cat === AIP.tab))
)
const students = computed(() => studentsByNo())
const exams = computed(() => examsSorted().reverse())
const recent = computed(() => S.chats.slice(0, 8))

function send(): void {
  const t = input.value.trim()
  if (!t) return
  sendDirect(t)
  input.value = ''
}

function onKey(e: KeyboardEvent): void {
  if (e.key === 'Enter' && !e.shiftKey && !(e as unknown as { isComposing: boolean }).isComposing) {
    e.preventDefault()
    send()
  }
}

function toggleCtxCls(): void {
  AIP.ctx.cls = !AIP.ctx.cls
}

function goSettingsAi(): void {
  go('settings', { sec: 'ai' })
}
</script>

<template>
  <div class="ai-home scroll">
    <div class="ai-wrap">
      <div class="ai-hello">
        <BrandMark kind="ai" :size="60" />
        <div>
          <h1>班级助理</h1>
          <p>
            {{ S.settings.teacher.name }}，备课、写材料、家校沟通都可以交给我 ·
            <button class="api-pill" :class="{ ok: AIC.ready() }" title="AI 接口设置" @click="goSettingsAi">
              <i></i>{{ AIC.ready() ? AIC.label() : '未配置 AI 接口 · 生成时可复制提示词' }}
            </button>
          </p>
        </div>
      </div>

      <div class="composer">
        <textarea
          v-model="input"
          placeholder="直接说要做什么，比如：帮我写一份期中考试后的家长会发言稿，15 分钟左右"
          @keydown="onKey"
        ></textarea>
        <div class="composer-bar">
          <button class="ctx-chip" :class="{ on: AIP.ctx.cls }" @click="toggleCtxCls">
            <Icon :name="AIP.ctx.cls ? 'check' : 'plus'" />班级概况
          </button>
          <select v-model="AIP.ctx.sid" class="ctx-chip" :class="{ on: AIP.ctx.sid }">
            <option value="">+ 学生档案</option>
            <option v-for="s in students" :key="s.id" :value="s.id">{{ s.name }}</option>
          </select>
          <select v-model="AIP.ctx.exam" class="ctx-chip" :class="{ on: AIP.ctx.exam }">
            <option value="">+ 考试数据</option>
            <option v-for="e in exams" :key="e.id" :value="e.id">{{ e.name }}</option>
          </select>
          <span class="grow"></span>
          <label class="chk muted" style="font-size: 12px" title="学生姓名会替换成【学生07】这样的编号再发给 AI，结果回来后自动换回真名">
            <input v-model="S.settings.ai.mask" type="checkbox" @change="save()" />隐去学生姓名
          </label>
          <button class="send" aria-label="发送" @click="send"><Icon name="send" /></button>
        </div>
      </div>

      <div class="tpl-tabs">
        <button v-for="c in TPL_CATS" :key="c[0]" :class="{ on: AIP.tab === c[0] }" @click="AIP.tab = c[0]">
          {{ c[1] }}
        </button>
      </div>

      <div class="tpl-grid">
        <button v-for="x in tplList" :key="x.id" class="tpl" @click="openAITemplate(x.id, {})">
          <div class="t">
            <i :style="{ background: x.color + '1a', color: x.color }">{{ x.ico }}</i>{{ x.title }}
          </div>
          <div class="d">{{ x.desc }}</div>
        </button>
      </div>

      <div v-if="recent.length">
        <div class="tpl-tabs"><button class="on" style="cursor: default">最近对话</button></div>
        <div class="mini-list">
          <button
            v-for="c in recent"
            :key="c.id"
            class="mini-item"
            style="background: #fff; box-shadow: 0 0 0 1px var(--line); margin-bottom: 6px; padding: 10px 14px"
            @click="activeChatId = c.id"
          >
            <span class="grow"><b style="font-weight: 600">{{ c.title }}</b></span>
            <span class="r">{{ fmtTime(c.date) }}</span>
          </button>
        </div>
      </div>

      <div class="ai-note">
        <Icon name="lock" /> 只有你点击发送时，才会把选中的资料发给你配置的 AI 服务；家长电话等联系方式从不发送
      </div>
    </div>
  </div>
</template>
