<script setup lang="ts">
/** 学生档案：名单、筛选、排序、导入导出 */
import { computed, ref } from 'vue'
import { S } from '../core/app'
import {
  daysToBirthday,
  latestExam,
  pointsOf,
  prevExam,
  seatText,
  stuById,
  studentsByNo
} from '../core/select'
import { rankMap } from '../core/stats'
import { downloadFile, toCSV } from '../core/files'
import { openStudent, openStudentForm } from '../ui/actions'
import { openImportStudents } from '../ui/forms'
import StudentAvatar from '../components/StudentAvatar.vue'
import Icon from '../components/Icon.vue'

const STU_FILTERS: [string, string][] = [
  ['all', '全部'],
  ['M', '男生'],
  ['F', '女生'],
  ['cadre', '班干部'],
  ['focus', '重点关注'],
  ['board', '住校'],
  ['bday', '本月生日'],
  ['noseat', '未排座']
]

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

function arrow(k: string): string {
  return sort.value === k ? (dir.value > 0 ? ' ↑' : ' ↓') : ''
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

function edit(st: { id: string }): void {
  const s = stuById(st.id)
  if (s) openStudentForm(s, {})
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

    <div class="filterbar">
      <input v-model="q" class="inp" placeholder="搜索姓名、学号或标签" />
      <div class="chips">
        <button
          v-for="f in STU_FILTERS"
          :key="f[0]"
          :class="{ on: filter === f[0] }"
          @click="filter = f[0]"
        >
          {{ f[1] }}
        </button>
      </div>
    </div>

    <div class="tbl-wrap">
      <table class="tbl">
        <thead>
          <tr>
            <th class="sortable" @click="setSort('no')">学号{{ arrow('no') }}</th>
            <th class="sortable" @click="setSort('name')">姓名{{ arrow('name') }}</th>
            <th>性别</th>
            <th>座位</th>
            <th>职务</th>
            <th class="sortable" @click="setSort('bday')">生日{{ arrow('bday') }}</th>
            <th>主要联系人</th>
            <th>标签</th>
            <th class="sortable r" @click="setSort('rank')">
              {{ filtered.lat ? filtered.lat.name + '排名' : '排名' }}{{ arrow('rank') }}
            </th>
            <th class="sortable r" @click="setSort('pts')">积分{{ arrow('pts') }}</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="!filtered.list.length">
            <td colspan="11">
              <div class="empty">
                {{
                  S.students.length
                    ? '没有符合条件的学生'
                    : '还没有学生，点右上角「添加学生」或「批量导入」'
                }}
              </div>
            </td>
          </tr>
          <tr
            v-for="s in filtered.list"
            :key="s.id"
            class="click"
            @click="openStudent(s.id)"
          >
            <td class="num muted">{{ s.no || '' }}</td>
            <td>
              <div class="nm"><StudentAvatar :st="s" :size="28" />{{ s.name }}</div>
            </td>
            <td>{{ s.gender === 'F' ? '女' : '男' }}</td>
            <td class="sub">{{ seatText(s.seat) }}</td>
            <td>
              <span v-if="s.role" class="tag gray">{{ s.role }}</span>
              <span v-else class="muted">—</span>
            </td>
            <td class="num">
              {{ s.birthday ? s.birthday.slice(5) : '—'
              }}<span v-if="daysToBirthday(s) === 0" class="tag red">今天</span>
            </td>
            <td>
              <template v-if="s.parents && s.parents[0]">
                {{ s.parents[0].name }}
                <span class="muted">{{ s.parents[0].rel || '' }}</span><br />
                <span class="num muted" style="font-size: 12px">{{ s.parents[0].phone || '' }}</span>
              </template>
              <span v-else class="muted">—</span>
            </td>
            <td>
              <div class="tags">
                <span v-for="t in (s.tags || []).slice(0, 3)" :key="t" class="tag">{{ t }}</span>
                <span v-if="(s.tags || []).length > 3" class="tag gray"
                  >+{{ (s.tags || []).length - 3 }}</span
                >
              </div>
            </td>
            <td class="r num">
              {{ filtered.rm[s.id] ? filtered.rm[s.id].rank : '—'
              }}<span
                v-if="filtered.rm[s.id] && prevMap[s.id] && prevMap[s.id].rank - filtered.rm[s.id].rank"
                :class="prevMap[s.id].rank - filtered.rm[s.id].rank > 0 ? 'up' : 'dn'"
                style="font-size: 12px"
                >{{
                  prevMap[s.id].rank - filtered.rm[s.id].rank > 0
                    ? '↑' + (prevMap[s.id].rank - filtered.rm[s.id].rank)
                    : '↓' + (filtered.rm[s.id].rank - prevMap[s.id].rank)
                }}</span
              >
            </td>
            <td class="r num">{{ pointsOf(s.id) > 0 ? '+' : '' }}{{ pointsOf(s.id) }}</td>
            <td class="r">
              <span class="ops"
                ><button class="btn btn-xs btn-ghost" @click.stop="edit(s)">编辑</button></span
              >
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
