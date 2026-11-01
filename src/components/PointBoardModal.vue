<script setup lang="ts">
/** 积分榜 */
import { computed } from 'vue'
import { S } from '../core/app'
import { groupName, pointsOf, stuById } from '../core/select'
import { ART } from '../art'
import { downloadFile, toCSV } from '../core/files'
import { fmtTime } from '../core/utils'
import { openStudent } from '../ui/actions'
import { closeModal } from '../ui/modal'
import StudentAvatar from './StudentAvatar.vue'
import type { Student } from '../core/types'

interface Row {
  st: Student
  pts: number
  plus: number
  minus: number
}

const list = computed<Row[]>(() =>
  S.students
    .map((s) => ({
      st: s,
      pts: pointsOf(s.id),
      plus: S.points.filter((p) => p.sid === s.id && p.d > 0).length,
      minus: S.points.filter((p) => p.sid === s.id && p.d < 0).length
    }))
    .sort((a, b) => b.pts - a.pts)
)

const groups = computed(() => {
  const gs: Record<number, number> = {}
  S.students.forEach((s) => {
    if (s.seat) {
      const g = s.group || 0
      gs[g] = (gs[g] || 0) + pointsOf(s.id)
    }
  })
  return Object.keys(gs)
    .sort((a, b) => gs[+b] - gs[+a])
    .map((g) => ({ g: +g, v: gs[+g] }))
})

function exportCsv(): void {
  const rows = [['日期', '姓名', '学号', '分值', '理由']]
  S.points.forEach((p) => {
    const s = stuById(p.sid)
    if (s) rows.push([fmtTime(p.t), s.name, s.no, String(p.d), p.r])
  })
  downloadFile(S.settings.className + '-点评记录.csv', toCSV(rows), 'text/csv;charset=utf-8')
}
</script>

<template>
  <div>
    <div v-if="groups.length" style="margin-bottom: 14px">
      <div class="flabel" style="margin-bottom: 8px">小组积分</div>
      <div class="tags">
        <span v-for="x in groups" :key="x.g" class="tag gray" style="height: 28px; padding: 0 10px; gap: 6px">
          <i
            :style="{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: ART.groupColor(x.g),
              display: 'inline-block'
            }"
          ></i>
          {{ groupName(x.g) }} <b class="num">{{ x.v > 0 ? '+' : '' }}{{ x.v }}</b>
        </span>
      </div>
    </div>

    <div class="tbl-wrap" style="box-shadow: none; max-height: 56vh">
      <table class="tbl">
        <thead>
          <tr>
            <th>名次</th>
            <th>姓名</th>
            <th class="r">积分</th>
            <th class="r">加分次数</th>
            <th class="r">扣分次数</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(x, i) in list" :key="x.st.id" class="click" @click="openStudent(x.st.id)">
            <td class="num">{{ i + 1 }}</td>
            <td>
              <div class="nm"><StudentAvatar :st="x.st" :size="24" />{{ x.st.name }}</div>
            </td>
            <td class="r num"><b>{{ x.pts > 0 ? '+' : '' }}{{ x.pts }}</b></td>
            <td class="r num">{{ x.plus }}</td>
            <td class="r num">{{ x.minus }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="modal-foot" style="margin: 12px -22px -8px; padding-bottom: 8px">
      <button class="btn btn-light" style="margin-right: auto" @click="exportCsv">导出 CSV</button>
      <button class="btn btn-dark" @click="closeModal()">好的</button>
    </div>
  </div>
</template>
