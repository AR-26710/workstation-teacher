<script setup lang="ts">
/** 无 API 时给出可复制的提示词 */
import { computed } from 'vue'
import { S } from '../core/app'
import { studentsByNo } from '../core/select'
import { Mask } from '../core/ai'
import { copyText } from '../core/files'
import { go } from '../ui/router'
import Icon from './Icon.vue'

defineProps<{ text: string }>()
const list = computed(() => studentsByNo())
</script>

<template>
  <div>
    <p style="margin: 0 0 10px; color: var(--ink2); font-size: 13px; line-height: 1.7">
      还没有配置 AI 接口也没关系：复制下面这段，打开 <b>豆包</b>、<b>DeepSeek</b>、<b>Kimi</b>、<b>通义</b>
      等任意一个网页版或 App，粘贴发送即可。<template v-if="S.settings.ai.mask"
        >学生姓名已替换成编号，拿到结果后对照编号即可。</template
      >
    </p>
    <div class="prompt-box">{{ text }}</div>
    <details v-if="S.settings.ai.mask" style="margin-top: 10px; font-size: 12.5px; color: var(--ink2)">
      <summary style="cursor: pointer">查看编号对照表</summary>
      <div style="margin-top: 6px; line-height: 1.9">
        <span v-for="s in list" :key="s.id" style="margin-right: 12px">{{ Mask.code(s) }}{{ s.name }}</span>
      </div>
    </details>
    <div class="modal-foot" style="margin: 12px -22px -8px; padding-bottom: 8px">
      <button class="btn btn-light" @click="go('settings', { sec: 'ai' })">配置 API，直接生成</button>
      <button class="btn btn-dark" @click="copyText(text)"><Icon name="copy" />复制提示词</button>
    </div>
  </div>
</template>
