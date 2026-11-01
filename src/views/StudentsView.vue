<script setup lang="ts">
/** 学生档案：名单、筛选、排序、导入导出 */
import { computed, ref } from 'vue'
import { S } from '@core/app'
import { daysToBirthday, latestExam, pointsOf, prevExam, studentsByNo } from '@core/select'
import { rankMap } from '@core/stats'
import { downloadFile, toCSV } from '@core/files'
import { seatText } from '@core/select'
import { openImportStudents, openStudentForm } from '@ui/forms'
import Icon from '@components/common/Icon.vue'
import StudentFilterBar from '@components/student/StudentFilterBar.vue'
import StudentTable from '@components/student/StudentTable.vue'

const q = ref('')
const filter = ref('all')
const sort = ref('no')
const dir = ref(1)

const filtered = computed(() => {
  const kw = q.value.trim()
  const f = filter.value
  const m = new Date().getMonth() + 1
  const lat = latestExam()
  const rm = lat ? rankMap(lat) : {}
  const list = S.students.filter((s) => {
    if (kw && s.name.indexOf(kw) < 0 && String(s.no).indexOf(kw) < 0 && (s.tags || []).join(',').indexOf(kw) < 0) return false
    if (f === 'M') return s.gender !== 'F'
    if (f === 'F') return s.gender === 'F'
    if (f === 'cadre') return !!s.role
    if (f === 'focus') return (s.tags || []).indexOf('重点关注') >= 0
    if (f === 'board') return s.boarding || (s.tags || []).indexOf('住校') >= 0
    if (f === 'bday') {
      const b = s.birthday ? new Date(s.birthday.replace(/-/g, '/')) : null
      return !!b && b.getMonth() + 1 === m
    }
    if (f === 'noseat') return !s.seat
    return true
  })
  const k = sort.value
  const d = dir.value
  list.sort((a, b) => {
    let va: number
    let vb: number
    if (k === 'rank') {
      va = rm[a.id] ? rm[a.id].rank : 999
      vb = rm[b.id] ? rm[b.id].rank : 999
    } else if (k === 'pts') {
      va = -pointsOf(a.id)
      vb = -pointsOf(b.id)
    } else if (k === 'bday') {
      va = daysToBirthday(a) ?? 999
      vb = daysToBirthday(b) ?? 999
    } else if (k === 'name') return a.name.localeCompare(b.name, 'zh') * d
    else return String(a.no).localeCompare(String(b.no), 'zh', { numeric: true }) * d
    return (va - vb) * d
  })
  return { list, rm, lat }
})

const prevMap = computed(() => {
  const lat = filtered.value.lat
  const pe = lat ? prevExam(lat) : null
  return pe ? rankMap(pe) : {}
})

const boys = computed(() => S.students.filter((s) => s.gender !== 'F').length)

function setSort(k: string): void {
  if (sort.value === k) dir.value = -dir.value
  else {
    sort.value = k
    dir.value = 1
  }
}

function exportList(): void {
  const rows = [
    ['学号', '姓名', '性别', '生日', '职务', '座位', '家长姓名', '关系', '家长电话', '家庭结构', '家庭备注', '学习情况', '性格特长', '健康情况', '标签', '积分']
  ]
  studentsByNo().forEach((s) => {
    const p = s.parents[0] || {}
    rows.push([
      s.no,
      s.name,
      s.gender === 'F' ? '女' : '男',
      s.birthday,
      s.role,
      seatText(s.seat),
      p.name || '',
      p.rel || '',
      p.phone || '',
      s.family,
      s.familyNote,
      s.study,
      s.personality,
      s.health,
      (s.tags || []).join('、'),
      String(pointsOf(s.id))
    ])
  })
  downloadFile(S.settings.className + '-学生名单.csv', toCSV(rows), 'text/csv;charset=utf-8')
}
</script>

<template>
  <div class="page scroll">
    <div class="page-head">
      <div>
        <h1 class="page-title">学生档案</h1>
        <div class="page-desc">
          共 {{ S.students.length }} 人 · 男 {{ boys }} · 女 {{ S.students.length - boys }}
        </div>
      </div>
      <div class="grow"></div>
      <button class="btn btn-light" @click="openImportStudents()"><Icon name="up" />批量导入</button>
      <button class="btn btn-light" @click="exportList"><Icon name="down" />导出名单</button>
      <button class="btn btn-dark" @click="openStudentForm(null, {})"><Icon name="userplus" />添加学生</button>
    </div>

    <StudentFilterBar v-model:q="q" v-model:filter="filter" />

    <StudentTable
      :list="filtered.list"
      :rm="filtered.rm"
      :lat="filtered.lat"
      :prev-map="prevMap"
      :sort="sort"
      :dir="dir"
      @set-sort="setSort"
    />
  </div>
</template>
