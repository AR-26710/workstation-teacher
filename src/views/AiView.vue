<script setup lang="ts">
/** AI 助手：首页（模板 + 直接提问）与对话页（流式输出 / 批量任务） */
import { computed } from 'vue'
import { activeChatId } from '@ui/ai'
import AiHome from '@components/ai/AiHome.vue'
import AiChat from '@components/ai/AiChat.vue'

const chat = computed(() => activeChatId.value)
</script>

<template>
  <div class="ai-page">
    <AiChat v-if="chat" />
    <AiHome v-else />
  </div>
</template>
