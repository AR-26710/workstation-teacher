<script setup lang="ts">
/** 教室页右侧概况栏 */
import { computed, ref } from 'vue'
import { S, save } from '@core/app'
import { ATT } from '@core/state'
import { age, daysToBirthday, examsSorted, latestExam, stuById, weekNo } from '@core/select'
import { examStats } from '@core/stats'
import { CH } from '@lib/charts'
import { WEEK, fmtMD, fmtNum, pad2, pct, parseDate, uid, todayStr } from '@core/utils'
import { exportBackup } from '@core/backup'
import { openStudent } from '@ui/student/actions'
import { openAITemplate } from '@ui/ai'
import { clsMode } from '@ui/classroom/mode'
import { go, railCollapsed } from '@ui/shell/router'
import StudentAvatar from '@components/student/StudentAvatar.vue'
import Icon from '@components/common/Icon.vue'
import type { Student } from '@core/types'

const now = computed(() => new Date())

const stat = computed(() => {
  const day = S.attendance[todayStr()] || {}
  const c = { leave: 0, absent: 0, late: 0 }
  Object.keys(day).forEach((k) => {
    const v = day[k]
    if (stuById(k) && c[v] !== undefined) c[v]++
  })
  const total = S.students.length
  const present = total - c.leave - c.absent
  const boys = S.students.filter((s) => s.gender !== 'F').length
  return { day, c, total, present, boys }
})

const segs = computed(() => {
  const { total, present, c } = stat.value
  if (!total) return [] as [string, number][]
  return (
    [
      ['#171717', present - c.late],
      ['#2f7ff0', c.late],
      ['#e89a0c', c.leave],
      ['#e5483b', c.absent]
    ] as [string, number][]
  ).filter((s) => s[1] > 0)
})

const offList = computed(() => {
  const { day } = stat.value
  return Object.keys(day)
    .map((k) => stuById(k))
    .filter((s): s is Student => !!s)
    .slice(0, 4)
})

const birthdays = computed(() =>
  S.students
    .map((s) => ({ s, d: daysToBirthday(s) }))
    .filter((x): x is { s: Student; d: number } => x.d !== null && x.d <= 7)
    .sort((a, b) => a.d - b.d)
    .slice(0, 5)
)

const exam = computed(() => latestExam())

const examInfo = computed(() => {
  const e = exam.value
  if (!e) return null
  const st = examStats(e)
  const trend = examsSorted().map((x) => {
    const s = examStats(x)
    return s.rate === undefined ? null : s.rate * 100
  })
  return { st, trend }
})

const newTodo = ref('')

function addTodo(): void {
  const v = newTodo.value.trim()
  if (!v) return
  S.todos.push({ id: uid('t'), text: v, done: false })
  save()
  newTodo.value = ''
}

function delTodo(id: string): void {
  S.todos = S.todos.filter((t) => t.id !== id)
  save()
}

interface FeedItem {
  t: number
  html: string
}

const feed = computed<FeedItem[]>(() => {
  const list: FeedItem[] = []
  S.points.slice(0, 12).forEach((p) => {
    const s = stuById(p.sid)
    if (s) list.push({ t: p.t, html: `<b>${s.name}</b> <span class="pt ${p.d > 0 ? 'up' : 'dn'}">${p.d > 0 ? '+' : ''}${p.d}</span> ${p.r}` })
  })
  S.records.forEach((r) => {
    const s = stuById(r.sid)
    const dt = parseDate(r.date)
    if (s && dt) list.push({ t: dt.getTime() + 43200000, html: `<b>${s.name}</b> ${r.type}：${r.text}` })
  })
  return list.sort((a, b) => b.t - a.t).slice(0, 6)
})

function birthdayText(d: number, st: Student): string {
  if (d === 0) return '今天'
  if (d === 1) return '明天'
  return fmtMD(st.birthday.replace(/^\d+/, String(now.value.getFullYear()))) + ' · ' + d + ' 天后'
}

function yearsText(d: number, st: Student): string {
  const a = age(st)
  if (a === null) return ''
  return ' · ' + (d === 0 ? a : a + 1) + ' 岁'
}
</script>

<template>
  <aside class="rail">
    <button
      class="rail-collapse"
      title="折叠概况栏"
      aria-label="折叠概况栏"
      @click="railCollapsed = true"
    >
      <Icon name="side" />
    </button>
    <!-- 今天 -->
    <div class="rail-sec">
      <div class="rail-k">今天</div>
      <div class="rail-date">{{ now.getMonth() + 1 }}月{{ now.getDate() }}日 星期{{ WEEK[now.getDay()] }}</div>
      <div class="muted" style="font-size: 12px; margin-top: 2px">
        {{ S.settings.term || '' }}{{ weekNo() ? (S.settings.term ? ' · ' : '') + '第 ' + weekNo() + ' 周' : '' }}
      </div>
      <div class="trio">
        <div><b>{{ stat.total }}</b><span>在籍</span></div>
        <div><b>{{ stat.boys }}</b><span>男生</span></div>
        <div><b>{{ stat.total - stat.boys }}</b><span>女生</span></div>
      </div>
    </div>

    <!-- 出勤 -->
    <div class="rail-sec">
      <div class="rail-k">今日出勤<button @click="clsMode = 'att'">去点名</button></div>
      <div class="rail-big">{{ stat.present }}<small>/ {{ stat.total }} 人</small></div>
      <div class="attbar">
        <i v-for="(s, i) in segs" :key="i" :style="{ background: s[0], flex: s[1] }" />
      </div>
      <div class="muted" style="font-size: 12px">
        请假 {{ stat.c.leave }} · 缺勤 {{ stat.c.absent }} · 迟到 {{ stat.c.late }}
      </div>
      <div v-if="offList.length" class="mini-list">
        <button v-for="s in offList" :key="s.id" class="mini-item" @click="openStudent(s.id)">
          <StudentAvatar :st="s" :size="24" />
          <span class="grow">{{ s.name }}</span>
          <span class="tag" :class="ATT[stat.day[s.id]].tone">{{ ATT[stat.day[s.id]].t }}</span>
        </button>
      </div>
    </div>

    <!-- 近 7 天生日 -->
    <div class="rail-sec">
      <div class="rail-k">近 7 天生日</div>
      <div v-if="birthdays.length" class="mini-list">
        <div v-for="x in birthdays" :key="x.s.id" class="mini-item">
          <StudentAvatar :st="x.s" :size="28" />
          <span class="grow">
            <b style="font-weight: 600">{{ x.s.name }}</b><br />
            <span class="muted" style="font-size: 12px">{{ birthdayText(x.d, x.s) }}{{ yearsText(x.d, x.s) }}</span>
          </span>
          <button class="btn btn-xs btn-light" title="让 AI 写一段生日祝福" @click="openAITemplate('birthday', { sid: x.s.id })">
            <Icon name="cake" />祝福
          </button>
        </div>
      </div>
      <div v-else class="muted" style="font-size: 12.5px; margin-top: 4px">近 7 天没有同学过生日</div>
    </div>

    <!-- 最近考试 -->
    <div class="rail-sec">
      <div class="rail-k">最近考试<button @click="go('analysis')">查看分析</button></div>
      <div
        v-if="exam && examInfo"
        style="display: flex; align-items: flex-end; justify-content: space-between; gap: 8px"
      >
        <div>
          <div style="font-weight: 600">{{ exam.name }}</div>
          <div class="rail-big">{{ fmtNum(examInfo.st.avg, 1) }}<small>/ {{ examInfo.st.full }} 平均</small></div>
          <div class="muted" style="font-size: 12px">
            及格率 {{ pct(examInfo.st.pass) }} · 优秀率 {{ pct(examInfo.st.good) }}
          </div>
        </div>
        <div title="历次平均得分率" v-html="CH.spark(examInfo.trend, 92, 40, CH.C.s1)" />
      </div>
      <div v-else class="muted" style="font-size: 12.5px; margin-top: 4px">还没有成绩，去「成绩录入」添加</div>
    </div>

    <!-- 待办 -->
    <div class="rail-sec">
      <div class="rail-k">待办</div>
      <label v-for="t in S.todos" :key="t.id" class="todo" :class="{ done: t.done }">
        <input type="checkbox" :checked="t.done" @change="() => { t.done = !t.done; save() }" />
        <span>{{ t.text }}</span>
        <button class="x" aria-label="删除" @click.prevent="delTodo(t.id)">×</button>
      </label>
      <div class="todo-add">
        <input v-model="newTodo" class="inp" placeholder="添加一件要做的事" @keydown.enter="addTodo" />
        <button class="btn btn-sm btn-dark btn-icon" style="width: 32px; height: 32px" aria-label="添加" @click="addTodo">
          <Icon name="plus" />
        </button>
      </div>
    </div>

    <!-- 班级动态 -->
    <div class="rail-sec">
      <div class="rail-k">班级动态</div>
      <div class="feed">
        <div v-for="(f, i) in feed" :key="i" class="feed-item">
          <span class="d">{{ pad2(new Date(f.t).getMonth() + 1) }}-{{ pad2(new Date(f.t).getDate()) }}</span>
          <span v-html="f.html" />
        </div>
        <div v-if="!feed.length" class="muted" style="font-size: 12.5px">
          切到「点评」给同学加分，动态会出现在这里
        </div>
      </div>
    </div>

    <div class="privacy">
      <Icon name="lock" />
      <span>数据只保存在这台电脑的浏览器里</span>
      <button @click="exportBackup()">备份</button>
    </div>
  </aside>
</template>
