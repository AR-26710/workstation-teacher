<script setup lang="ts">
/** 设置 - 教室与黑板 */
import { computed } from 'vue'
import { S, save } from '@core/app'
import { fixSeats } from '@core/select'

const settings = computed(() => S.settings)
const cols = computed(() => settings.value.pairs * 2)
const capacity = computed(() => settings.value.rows * cols.value)
const unseated = computed(() => S.students.filter((s) => !s.seat).length)
const miniCells = computed(() => {
  const out: number[] = []
  for (let r = 0; r < settings.value.rows; r++) for (let c = 0; c < cols.value + settings.value.pairs - 1; c++) out.push(c % 3 === 2 ? 0 : 1)
  return out
})

function setRows(n: number): void {
  settings.value.rows = n
  fixSeats()
  save()
}

function setPairs(n: number): void {
  settings.value.pairs = n
  fixSeats()
  save()
}
</script>

<template>
  <div class="panel set-sec">
    <div class="panel-title">教室布局</div>
    <div class="panel-sub">双人同桌排列；改小后放不下的同学会变成「未排座」</div>
    <div style="display: flex; gap: 28px; align-items: flex-start; flex-wrap: wrap">
      <div style="min-width: 260px">
        <div class="field">
          <label>排数（前后）</label>
          <div class="chips">
            <button
              v-for="n in [4, 5, 6, 7, 8, 9]"
              :key="n"
              :class="{ on: settings.rows === n }"
              @click="setRows(n)"
            >
              {{ n }} 排
            </button>
          </div>
        </div>
        <div class="field">
          <label>组数（每组一列同桌）</label>
          <div class="chips">
            <button
              v-for="n in [2, 3, 4, 5]"
              :key="n"
              :class="{ on: settings.pairs === n }"
              @click="setPairs(n)"
            >
              {{ n }} 组
            </button>
          </div>
        </div>
        <div class="muted" style="font-size: 12.5px">
          共 {{ capacity }} 个座位，班里 {{ S.students.length }} 人{{ unseated ? '，' + unseated + ' 人未排座' : '' }}
        </div>
      </div>
      <div>
        <div class="muted" style="font-size: 12px; margin-bottom: 6px; text-align: center">讲台</div>
        <div class="mini-class" :style="{ gridTemplateColumns: 'repeat(' + (cols + settings.pairs - 1) + ',14px)' }">
          <template v-for="(c, i) in miniCells" :key="i">
            <i v-if="c"></i><span v-else></span>
          </template>
        </div>
      </div>
    </div>
    <div class="hr"></div>
    <label class="chk">
      <input v-model="settings.anim" type="checkbox" @change="save()" />
      教室小动画（同学偶尔回头、举手、打瞌睡）
    </label>
  </div>

  <div class="panel set-sec">
    <div class="panel-title">黑板与智慧屏</div>
    <div class="panel-sub">显示在教室前方，每行一条</div>
    <div class="row2">
      <div class="field">
        <label>左侧黑板 · 今日课程</label>
        <textarea v-model="settings.boardLeft" class="ta" style="min-height: 110px" @input="save()"></textarea>
      </div>
      <div class="field">
        <label>右侧黑板 · 今日事项</label>
        <textarea v-model="settings.boardRight" class="ta" style="min-height: 110px" @input="save()"></textarea>
      </div>
    </div>
    <div class="row2">
      <div class="field">
        <label>倒计时名称</label>
        <input v-model="settings.countdown.label" class="inp" placeholder="如：期末考试 / 中考" @input="save()" />
      </div>
      <div class="field">
        <label>倒计时日期</label>
        <input v-model="settings.countdown.date" class="inp" type="date" @input="save()" />
      </div>
    </div>
  </div>
</template>
