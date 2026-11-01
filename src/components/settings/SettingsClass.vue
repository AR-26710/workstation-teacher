<script setup lang="ts">
/** 设置 - 班级信息 */
import { computed } from 'vue'
import { S, save } from '@core/app'

const settings = computed(() => S.settings)
</script>

<template>
  <div class="panel set-sec">
    <div class="panel-title" style="margin-bottom: 14px">班级信息</div>
    <div class="row2">
      <div class="field">
        <label>班级名称</label>
        <input v-model="settings.className" class="inp" placeholder="如：初二（3）班" @input="save()" />
      </div>
      <div class="field">
        <label>学校</label>
        <input v-model="settings.school" class="inp" placeholder="选填" @input="save()" />
      </div>
    </div>
    <div class="row3">
      <div class="field">
        <label>学段</label>
        <select v-model="settings.stage" class="sel" @change="save()">
          <option>小学</option>
          <option>初中</option>
          <option>高中</option>
        </select>
      </div>
      <div class="field">
        <label>年级</label>
        <input v-model="settings.grade" class="inp" placeholder="如：初二" @input="save()" />
      </div>
      <div class="field">
        <label>学期</label>
        <input v-model="settings.term" class="inp" placeholder="如：2026—2027 学年 第一学期" @input="save()" />
      </div>
    </div>
    <div class="row2">
      <div class="field">
        <label>开学日期</label>
        <input v-model="settings.termStart" class="inp" type="date" @input="save()" />
        <div class="hint">用来计算「第几周」</div>
      </div>
    </div>
  </div>
</template>
