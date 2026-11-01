<script setup lang="ts">
/**
 * 弹窗宿主：头部标题 + 组件正文 + 底部按钮
 */
import { computed } from 'vue'
import { modalState, closeModal, type ModalBtn } from '@ui/shell/modal'
import Icon from './Icon.vue'

const o = computed(() => modalState.o)

const buttons = computed<ModalBtn[]>(() => {
  const f = modalState.o?.foot
  if (!f || f === 'none') return []
  return f
})
const showFoot = computed(() => {
  const f = modalState.o?.foot
  return f !== 'none'
})

async function onBtn(b: ModalBtn): Promise<void> {
  if (b.act) {
    const r = await b.act()
    if (r === false) return
  }
  closeModal()
}
</script>

<template>
  <div v-if="o && modalState.open" class="modal-root">
    <div class="mask" @click="closeModal()" />
    <div class="modal" :class="{ wide: o.wide }" role="dialog" aria-modal="true">
      <div class="modal-head">
        <div class="modal-title" v-html="o.title" />
        <button class="modal-x" aria-label="关闭" @click="closeModal()"><Icon name="x" /></button>
      </div>
      <div class="modal-body">
        <component :is="o.component" v-bind="o.props || {}" :key="modalState.seq" />
      </div>
      <div v-if="showFoot" class="modal-foot">
        <button
          v-for="(b, i) in buttons"
          :key="i"
          class="btn"
          :class="b.cls || 'btn-light'"
          @click="onBtn(b)"
        >
          {{ b.t }}
        </button>
      </div>
    </div>
  </div>
</template>
