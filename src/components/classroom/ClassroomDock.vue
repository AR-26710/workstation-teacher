<script setup lang="ts">
/** 教室页底部模式栏：各模式子工具栏 + 模式切换 */
import { computed } from 'vue'
import { S } from '@core/app'
import { ATT } from '@core/state'
import { examsSorted, stuById } from '@core/select'
import { clsMode, attDate, gradeExam, MODES } from '@ui/classroom/mode'
import { addPointAll } from '@ui/student/actions'
import { openPointBoard } from '@ui/forms'
import { go } from '@ui/shell/router'
import { save } from '@core/app'
import { downloadFile, toCSV } from '@core/files'
import { parseDate } from '@core/utils'
import { toast } from '@ui/shell/toast'
import { CH } from '@lib/charts'
import { seatShuffle, seatMentor, seatGender, seatUndoAct, seatPrint } from '@ui/classroom/seat'
import Icon from '@components/common/Icon.vue'

const attStat = computed(() => {
  const day = S.attendance[attDate.value] || {}
  const c = { leave: 0, absent: 0, late: 0 }
  Object.keys(day).forEach((k) => {
    if (stuById(k) && c[day[k]] !== undefined) c[day[k]]++
  })
  const total = S.students.length
  const present = total - c.leave - c.absent
  return { c, total, present }
})

const examList = computed(() => examsSorted().reverse())

function setMode(m: typeof clsMode.value): void {
  clsMode.value = m
}

function attClear(): void {
  S.attendance[attDate.value] = {}
  save()
  toast('已标记为全部出勤')
}

function attExport(): void {
  const d = parseDate(attDate.value) || new Date()
  const ym = d.getFullYear() + '-' + (d.getMonth() + 1 < 10 ? '0' : '') + (d.getMonth() + 1)
  const days = Object.keys(S.attendance).filter((k) => k.indexOf(ym) === 0).sort()
  const rows: string[][] = [['学号', '姓名'].concat(days.map((k) => k.slice(5))).concat(['请假', '缺勤', '迟到'])]
  S.students.slice().sort((a, b) => String(a.no).localeCompare(String(b.no), 'zh', { numeric: true })).forEach((s) => {
    const c = { leave: 0, absent: 0, late: 0 }
    const r = [s.no, s.name].concat(
      days.map((k) => {
        const v = S.attendance[k][s.id]
        if (v) c[v]++
        return v ? ATT[v].t : ''
      })
    )
    rows.push(r.concat([String(c.leave), String(c.absent), String(c.late)]))
  })
  downloadFile(S.settings.className + '-考勤-' + ym + '.csv', toCSV(rows), 'text/csv;charset=utf-8')
}
</script>

<template>
  <div class="dock">
    <!-- 考勤 -->
    <div v-if="clsMode === 'att'" class="subbar">
      <input v-model="attDate" class="inp" type="date" aria-label="考勤日期" />
      <span>应到 <b class="num">{{ attStat.total }}</b> · 实到 <b class="num">{{ attStat.present }}</b></span>
      <span class="muted">请假 {{ attStat.c.leave }} · 缺勤 {{ attStat.c.absent }} · 迟到 {{ attStat.c.late }}</span>
      <span class="muted">右键学生选择考勤状态</span>
      <button class="btn btn-sm btn-light" @click="attClear">全部出勤</button>
      <button class="btn btn-sm btn-light" @click="attExport">导出本月</button>
    </div>
    <!-- 点评 -->
    <div v-else-if="clsMode === 'points'" class="subbar">
      <span class="muted">点学生选择加分或扣分理由</span>
      <button class="btn btn-sm btn-light" @click="addPointAll()">全班 +1</button>
      <button class="btn btn-sm btn-dark" @click="openPointBoard()">积分榜</button>
    </div>
    <!-- 成绩 -->
    <div v-else-if="clsMode === 'grade'" class="subbar">
      <template v-if="!examList.length">
        <span class="muted">还没有考试成绩</span>
        <button class="btn btn-sm btn-dark" @click="go('scores')">去录入成绩</button>
      </template>
      <template v-else>
        <select v-model="gradeExam" class="sel" aria-label="选择考试">
          <option v-for="e in examList" :key="e.id" :value="e.id">{{ e.name }}</option>
        </select>
        <span class="legend-ramp">后<i v-for="c in CH.SEQ" :key="c" :style="{ background: c }"></i>前</span>
        <span class="muted">桌面颜色越深，班级排名越靠前；↑↓ 表示进退 5 名以上</span>
        <button class="btn btn-sm btn-light" @click="go('analysis')">完整分析</button>
      </template>
    </div>
    <!-- 排座 -->
    <div v-else-if="clsMode === 'seat'" class="subbar">
      <span class="muted">拖动学生换座，或先后点两个座位</span>
      <button class="btn btn-sm btn-light" @click="seatShuffle"><Icon name="shuffle" />随机打乱</button>
      <button class="btn btn-sm btn-light" @click="seatMentor">优带弱同桌</button>
      <button class="btn btn-sm btn-light" @click="seatGender">男女同桌</button>
      <button class="btn btn-sm btn-ghost" @click="seatUndoAct">撤销</button>
      <button class="btn btn-sm btn-dark" @click="seatPrint"><Icon name="print" />打印座位表</button>
    </div>

    <div class="seg">
      <button v-for="m in MODES" :key="m.id" :class="{ on: clsMode === m.id }" @click="setMode(m.id)">
        {{ m.t }}
      </button>
    </div>
  </div>
</template>
