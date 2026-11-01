<script setup lang="ts">
/** 学生档案 - 学生名单表格 */
import { daysToBirthday, pointsOf, seatText, stuById } from '@core/select'
import { openStudent } from '@ui/student/actions'
import { openStudentForm } from '@ui/forms'
import StudentAvatar from '@components/student/StudentAvatar.vue'
import type { Student } from '@core/types'

interface RankEntry {
  rank: number
}

defineProps<{
  list: Student[]
  rm: Record<string, RankEntry>
  lat: { name: string } | null
  prevMap: Record<string, RankEntry>
  sort: string
  dir: number
}>()

const emit = defineEmits<{
  setSort: [key: string]
}>()

function arrow(k: string, sort: string, dir: number): string {
  return sort === k ? (dir > 0 ? ' ↑' : ' ↓') : ''
}

function edit(st: { id: string }): void {
  const s = stuById(st.id)
  if (s) openStudentForm(s, {})
}
</script>

<template>
  <div class="tbl-wrap">
    <table class="tbl">
      <thead>
        <tr>
          <th class="sortable" @click="emit('setSort', 'no')">学号{{ arrow('no', sort, dir) }}</th>
          <th class="sortable" @click="emit('setSort', 'name')">姓名{{ arrow('name', sort, dir) }}</th>
          <th>性别</th>
          <th>座位</th>
          <th>职务</th>
          <th class="sortable" @click="emit('setSort', 'bday')">生日{{ arrow('bday', sort, dir) }}</th>
          <th>主要联系人</th>
          <th>标签</th>
          <th class="sortable r" @click="emit('setSort', 'rank')">
            {{ lat ? lat.name + '排名' : '排名' }}{{ arrow('rank', sort, dir) }}
          </th>
          <th class="sortable r" @click="emit('setSort', 'pts')">积分{{ arrow('pts', sort, dir) }}</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="!list.length">
          <td colspan="11">
            <div class="empty">
              {{ list.length ? '没有符合条件的学生' : '还没有学生，点右上角「添加学生」或「批量导入」' }}
            </div>
          </td>
        </tr>
        <tr
          v-for="s in list"
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
            {{ rm[s.id] ? rm[s.id].rank : '—'
            }}<span
              v-if="rm[s.id] && prevMap[s.id] && prevMap[s.id].rank - rm[s.id].rank"
              :class="prevMap[s.id].rank - rm[s.id].rank > 0 ? 'up' : 'dn'"
              style="font-size: 12px"
              >{{
                prevMap[s.id].rank - rm[s.id].rank > 0
                  ? '↑' + (prevMap[s.id].rank - rm[s.id].rank)
                  : '↓' + (rm[s.id].rank - prevMap[s.id].rank)
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
</template>
