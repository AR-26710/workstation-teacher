<script setup lang="ts">
/** 成绩分析 - 班级排名表 */
import { S } from '@core/app'
import { fmtNum } from '@core/utils'
import { openStudent } from '@ui/student/actions'
import StudentAvatar from '@components/student/StudentAvatar.vue'
import type { Exam, ExamRow } from '@core/types'

interface MoveItem {
  r: ExamRow
  ch: number | null
}

defineProps<{
  ex: Exam
  cx: Exam | null
  moves: MoveItem[]
}>()

function stuOf(sid: string) {
  return S.students.filter((x) => x.id === sid)[0]
}

function nameOf(sid: string): string {
  const s = stuOf(sid)
  return s ? s.name : ''
}

function isLowSub(v: number | null | undefined, full: number): boolean {
  return typeof v === 'number' && v < full * 0.6
}

function chUp(m: MoveItem): string {
  return m.ch && m.ch > 0 ? '↑' + m.ch : ''
}

function chDown(m: MoveItem): string {
  return m.ch && m.ch < 0 ? '↓' + -m.ch : ''
}
</script>

<template>
  <div class="panel" style="padding: 20px 0 6px; display: flex; flex-direction: column">
    <div style="padding: 0 20px">
      <div class="panel-title">班级排名</div>
      <div class="panel-sub">点姓名打开学生档案</div>
    </div>
    <div style="flex: 1 1 460px; min-height: 0; overflow: auto">
      <table class="tbl">
        <thead>
          <tr>
            <th>名次</th>
            <th>姓名</th>
            <th v-for="s in ex.subjects" :key="s.name" class="r">{{ s.name }}</th>
            <th class="r">总分</th>
            <th v-if="cx" class="r">进退</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="m in moves" :key="m.r.sid" class="click" @click="openStudent(m.r.sid)">
            <td class="num">{{ m.r.rank }}</td>
            <td>
              <div class="nm"><StudentAvatar :st="stuOf(m.r.sid)" :size="22" />{{ nameOf(m.r.sid) }}</div>
            </td>
            <td v-for="s in ex.subjects" :key="s.name" class="r num" :class="{ dn: isLowSub(m.r.subs[s.name], s.full) }">
              {{ m.r.subs[s.name] === null ? '缺' : m.r.subs[s.name] === undefined ? '—' : m.r.subs[s.name] }}
            </td>
            <td class="r num"><b>{{ fmtNum(m.r.total, 1) }}</b></td>
            <td v-if="cx" class="r num">
              <span v-if="m.ch === null" class="muted">—</span>
              <span v-else-if="m.ch === 0" class="muted">0</span>
              <span v-else :class="m.ch > 0 ? 'up' : 'dn'">{{ chUp(m) }}{{ chDown(m) }}</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
