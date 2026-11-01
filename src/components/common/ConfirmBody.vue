<script setup lang="ts">
defineProps<{ msg: string }>()
</script>

<template>
  <p style="margin: 4px 0 8px; color: var(--ink2); line-height: 1.7" v-html="msg" />
</template>
