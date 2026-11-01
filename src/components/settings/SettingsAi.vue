<script setup lang="ts">
/** 设置 - AI 接口 */
import { computed, ref } from 'vue'
import { S, save } from '@core/app'
import { AI_PRESETS, AIC, presetOf, testConnection } from '@core/ai'
import Icon from '@components/common/Icon.vue'

const settings = computed(() => S.settings)
const aiTestRes = ref('')
const aiTesting = ref(false)
const keyType = ref<'password' | 'text'>('password')

function toggleKey(): void {
  keyType.value = keyType.value === 'password' ? 'text' : 'password'
}

const preset = computed(() => presetOf(settings.value.ai.provider))

function onProvider(): void {
  const p = preset.value
  const a = settings.value.ai
  if (p.id !== 'custom') {
    a.base = p.base
    a.model = p.model
  }
  save()
}

async function testAi(): Promise<void> {
  if (!AIC.ready()) {
    aiTestRes.value = '<span class="dn">请先填写接口地址、模型名称和 API Key</span>'
    return
  }
  aiTesting.value = true
  aiTestRes.value = '正在连接…'
  try {
    const r = await testConnection()
    aiTestRes.value =
      '<span class="up">连接成功（' + (r.ms / 1000).toFixed(1) + ' 秒）</span> <span class="muted">模型回复：' +
      String(r.text).slice(0, 30) +
      '</span>'
  } catch (e) {
    aiTestRes.value = '<span class="dn">' + (e as Error).message + '</span>'
  }
  aiTesting.value = false
}
</script>

<template>
  <div class="panel set-sec">
    <div class="panel-title">AI 接口</div>
    <div class="panel-sub">
      填一个 API Key 就能在工作台里直接生成。不配置也能用：生成时会给你一段提示词，复制到豆包、DeepSeek
      等网页版即可。
    </div>
    <div class="field">
      <label>服务商</label>
      <select v-model="settings.ai.provider" class="sel" @change="onProvider">
        <option v-for="p in AI_PRESETS" :key="p.id" :value="p.id">{{ p.name }}</option>
      </select>
      <div v-if="preset.site" class="hint">
        到 {{ preset.site }} 注册并创建 API Key{{ preset.hint ? '；' + preset.hint : '' }}
      </div>
      <div v-else-if="preset.hint" class="hint">{{ preset.hint }}</div>
    </div>
    <div class="field">
      <label>API Key</label>
      <div style="display: flex; gap: 6px">
        <input
          v-model="settings.ai.key"
          class="inp num"
          :type="keyType"
          placeholder="sk-..."
          autocomplete="off"
          @input="save()"
        />
        <button class="btn btn-light btn-icon" title="显示/隐藏" aria-label="显示或隐藏 Key" @click="toggleKey">
          <Icon name="eye" />
        </button>
      </div>
    </div>
    <div class="row2">
      <div class="field">
        <label>接口地址（Base URL）</label>
        <input v-model="settings.ai.base" class="inp" placeholder="https://.../v1" @input="save()" />
      </div>
      <div class="field">
        <label>模型名称</label>
        <input v-model="settings.ai.model" class="inp" placeholder="如：deepseek-chat" @input="save()" />
      </div>
    </div>
    <div class="row2">
      <div class="field">
        <label>创造性（temperature）</label>
        <input
          v-model.number="settings.ai.temp"
          class="inp num"
          type="number"
          step="0.1"
          min="0"
          max="1.5"
          @input="save()"
        />
        <div class="hint">写材料建议 0.6–0.8；越高越发散</div>
      </div>
      <div class="field">
        <label>隐私</label>
        <label class="chk" style="height: 38px">
          <input v-model="settings.ai.mask" type="checkbox" @change="save()" />发送前隐去学生姓名
        </label>
        <div class="hint">姓名替换成【学生07】这样的编号，结果回来后自动换回；家长电话从不发送</div>
      </div>
    </div>
    <div style="display: flex; gap: 10px; align-items: center">
      <button class="btn btn-dark" :disabled="aiTesting" @click="testAi">测试连接</button>
      <span class="muted" style="font-size: 13px" v-html="aiTestRes"></span>
    </div>
  </div>

  <div class="panel set-sec">
    <div class="panel-title">连不上？</div>
    <div style="font-size: 13px; line-height: 1.85; color: var(--ink2)">
      网页直接调用 AI 时，有些服务商会拦截（跨域限制）。DeepSeek、Kimi、OpenAI、Claude
      一般可以直接用；如果提示「连不上」，可以：<br />① 换一家服务商试试；② 用开源包里的
      <span class="kbd">ai-proxy.js</span>：电脑装好 Node.js 后运行
      <span class="kbd">node ai-proxy.js</span>，再把接口地址改成
      <span class="kbd">http://127.0.0.1:8787/</span> 加原地址，例如
      <span class="kbd">http://127.0.0.1:8787/https://api.deepseek.com</span>。<br />API Key
      只保存在这台电脑的浏览器里，不会上传到任何地方。
    </div>
  </div>
</template>
