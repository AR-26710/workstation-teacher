<script setup lang="ts">
import { toasts } from '@ui/shell/toast'
</script>

<template>
  <TransitionGroup name="toast" tag="div" class="toasts">
    <div v-for="t in toasts" :key="t.id" class="toast">{{ t.msg }}</div>
  </TransitionGroup>
</template>
