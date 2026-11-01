<script setup lang="ts">
/** 设置 - 关于 */
import { VERSION } from '@core/state'
import BrandMark from '@components/common/BrandMark.vue'
</script>

<template>
  <div class="panel set-sec">
    <div style="display: flex; gap: 14px; align-items: center">
      <BrandMark :size="52" />
      <div>
        <div style="font-size: 18px; font-weight: 700">班主任工作台</div>
        <div class="muted" style="font-size: 13px">个人工作台系列 · 第 1 期 · v{{ VERSION }}</div>
      </div>
    </div>
    <div style="font-size: 13.5px; line-height: 1.9; color: var(--ink2); margin-top: 14px">
      一个打开就能用的工作台：学生档案、考勤、课堂点评、排座位、成绩录入与分析，外加可接入任意大模型的 AI
      助手。所有数据都留在你自己的电脑上。<br />开源版只做 PC 端；手机端和更多职业版本会陆续推出。
    </div>
    <div
      style="
        font-size: 13px;
        line-height: 1.8;
        color: var(--ink2);
        margin-top: 12px;
        padding: 12px 14px;
        background: var(--fill);
        border-radius: 12px;
      "
    >
      <b style="color: var(--ink)">开源协议</b><br />个人可以免费使用、修改和二次开发，分享时请保留作者署名和协议；禁止任何形式的商业使用。完整条款见随软件附带的
      LICENSE 文件。
    </div>
    <div class="sign" style="padding: 14px 0 0; font-size: 11px">Developed by @赛博老爸</div>
  </div>
</template>
