<script setup lang="ts">
/** 学生档案抽屉：概览 / 档案 / 成绩 / 成长记录 / 评语 */
import { computed, ref } from 'vue'
import { S, save } from '../core/app'
import { age, daysToBirthday, examsSorted, groupName, latestExam, seatText, shortExam, stuById } from '../core/select'
import { examFull, examStats, rankMap, stuTrend, subjectStats } from '../core/stats'
import { RECORD_TYPES } from '../core/state'
import { fmtMD, fmtNum, fmtTime, todayStr, uid } from '../core/utils'
import { copyText } from '../core/files'
import { CH } from '../charts'
import { drawerSid, closeDrawer } from '../ui/drawer'
import { drawerTab, openStudent, openStudentForm } from '../ui/actions'
import { openAITemplate } from '../ui/ai'
import { toast } from '../ui/toast'
import StudentAvatar from './StudentAvatar.vue'
import ChartView from './ChartView.vue'
import Icon from './Icon.vue'
import type { Exam, RecordItem, Student } from '../core/types'

const st = computed<Student | null>(() => stuById(drawerSid.value))
const tab = drawerTab

const TABS: [string, string][] = [
  ['overview', '概览'],
  ['profile', '档案'],
  ['scores', '成绩'],
  ['records', '成长记录'],
  ['comments', '评语']
]

const trend = computed(() => (st.value ? stuTrend(st.value.id) : []))
const lat = computed(() => latestExam())

/* ---------- 概览 ---------- */
interface TrendPointLike {
  ex: Exam
  total: number | null
  rank: number | null
  n: number
  rate: number | null
}

const cur = computed<{ cur: TrendPointLike | null; prv: TrendPointLike | null }>(() => {
  const t = trend.value
  let c: TrendPointLike | null = null
  let p: TrendPointLike | null = null
  for (let i = t.length - 1; i >= 0; i--) {
    if (t[i].total !== null) {
      if (!c) c = t[i]
      else {
        p = t[i]
        break
      }
    }
  }
  return { cur: c, prv: p }
})

const attMonth = computed(() => {
  const s = st.value
  const o = { leave: 0, absent: 0, late: 0 }
  if (!s) return o
  const key = todayStr().slice(0, 7)
  Object.keys(S.attendance).forEach((k) => {
    if (k.indexOf(key) === 0) {
      const v = S.attendance[k][s.id]
      if (v === 'absent') o.absent++
      if (v === 'leave') o.leave++
      if (v === 'late') o.late++
    }
  })
  return o
})

const pointListAll = computed(() => (st.value ? S.points.filter((p) => p.sid === st.value!.id) : []))
const pointCount = computed(() => pointListAll.value.length)
const pointTotal = computed(() => pointListAll.value.reduce((a, p) => a + p.d, 0))

const recentRecords = computed(() => {
  if (!st.value) return []
  return S.records.filter((r) => r.sid === st.value!.id).sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 3)
})

const lineChart = computed(() => (w: number) => {
  const s = st.value
  if (!s) return ''
  const me = trend.value.map((t) => (t.rate === null ? null : t.rate * 100))
  const cls = trend.value.map((t) => {
    const x = examStats(t.ex)
    return x.rate === undefined ? null : x.rate * 100
  })
  return CH.lines(
    [
      { name: s.name, color: CH.C.s1, values: me },
      { name: '班级平均', color: CH.C.base, values: cls }
    ],
    trend.value.map((t) => shortExam(t.ex.name)),
    w,
    {
      h: 210,
      min: 40,
      max: 100,
      fmt: (v: number) => Math.round(v) + '%',
      tipFmt: (v: number) => Math.round(v * 10) / 10 + '%'
    }
  )
})

const radarExam = computed<Exam | null>(() => (cur.value.cur ? cur.value.cur.ex : lat.value))

const radarChart = computed(() => (w: number) => {
  const s = st.value
  const le = radarExam.value
  if (!s || !le) return ''
  const axes = le.subjects.map((x) => x.name)
  const row = le.scores[s.id] || {}
  const me = le.subjects.map((x) => (typeof row[x.name] === 'number' ? (row[x.name] as number) / x.full : 0))
  const cls = le.subjects.map((x) => subjectStats(le, x.name).rate || 0)
  return CH.radar(
    axes,
    [
      { name: '班级平均', color: CH.C.base, values: cls, fill: false },
      { name: s.name, color: CH.C.s1, values: me }
    ],
    w,
    { h: 210 }
  )
})

/* ---------- 成绩 ---------- */
const examRows = computed(() => {
  const list = examsSorted()
  const subs: string[] = []
  list.forEach((e) => e.subjects.forEach((x) => { if (subs.indexOf(x.name) < 0) subs.push(x.name) }))
  return { subs, exs: list.slice().reverse() }
})

function subFull(e: Exam, name: string): number {
  const f = e.subjects.filter((x) => x.name === name)[0]
  return f ? f.full : 100
}

function scoreText(e: Exam, sid: string, name: string): string {
  const v = (e.scores[sid] || {})[name]
  if (v === null) return '缺'
  if (typeof v !== 'number') return '—'
  return String(v)
}

function isLow(e: Exam, sid: string, name: string): boolean {
  const v = (e.scores[sid] || {})[name]
  return typeof v === 'number' && v < subFull(e, name) * 0.6
}

const rankChart = computed(() => (w: number) => {
  const n = S.students.length
  const vals = trend.value.map((t) => (t.rank === null ? null : n - t.rank + 1))
  return CH.lines(
    [{ name: '排名', color: CH.C.s1, values: vals }],
    trend.value.map((t) => shortExam(t.ex.name)),
    w,
    {
      h: 200,
      min: 1,
      max: n,
      fmt: (v: number) => '第' + Math.round(n - v + 1),
      tipFmt: (v: number) => '第 ' + Math.round(n - v + 1) + ' 名'
    }
  )
})

/* ---------- 成长记录 ---------- */
const recType = ref(RECORD_TYPES[0])
const recDate = ref(todayStr())
const recText = ref('')

const records = computed(() => {
  if (!st.value) return []
  return S.records.filter((r) => r.sid === st.value!.id).sort((a, b) => (a.date < b.date ? 1 : -1))
})

const pointList = computed(() => pointListAll.value.slice(0, 40))

function addRecord(): void {
  const s = st.value
  const t = recText.value.trim()
  if (!s || !t) return
  S.records.push({ id: uid('r'), sid: s.id, type: recType.value, text: t, date: recDate.value || todayStr() })
  save()
  recText.value = ''
  toast('已记录')
}

function delRecord(id: string): void {
  S.records = S.records.filter((r) => r.id !== id)
  save()
}

function delPoint(id: string): void {
  S.points = S.points.filter((p) => p.id !== id)
  save()
}

/* ---------- 评语 ---------- */
const cmtText = ref('')
const comments = computed(() => (st.value ? (st.value.comments || []).slice().reverse() : []))

function addComment(): void {
  const s = st.value
  const t = cmtText.value.trim()
  if (!s || !t) return
  s.comments.push({ id: uid('c'), text: t, date: todayStr(), src: '手写' })
  save()
  cmtText.value = ''
  toast('评语已保存')
}

function delComment(id: string): void {
  const s = st.value
  if (!s) return
  s.comments = s.comments.filter((c) => c.id !== id)
  save()
}

function recTone(r: RecordItem): string {
  if (r.type === '表扬' || r.type === '获奖') return 'green'
  if (r.type === '提醒') return 'red'
  return 'gray'
}

function rankOf(e: Exam, sid: string): string {
  const r = rankMap(e)[sid]
  return r ? String(r.rank) : '—'
}

function totalOf(e: Exam, sid: string): string {
  const r = rankMap(e)[sid]
  return r ? fmtNum(r.total, 1) : '—'
}
</script>

<template>
  <template v-if="st">
    <div class="mask" @click="closeDrawer()"></div>
    <div class="drawer" role="dialog">
      <div class="dr-hero">
        <StudentAvatar :st="st" :size="84" />
        <div style="min-width: 0">
          <div class="dr-name">
            {{ st.name }}
            <span v-if="st.role" class="tag gray" style="font-size: 12px">{{ st.role }}</span>
          </div>
          <div class="dr-meta">
            {{ st.no || '' }} · {{ st.gender === 'F' ? '女' : '男'
            }}{{ age(st) !== null ? ' · ' + age(st) + ' 岁' : '' }} · {{ seatText(st.seat)
            }}{{ st.seat ? ' · ' + groupName(st.group || 0) : '' }}
          </div>
          <div v-if="st.tags && st.tags.length" class="tags" style="margin-top: 8px">
            <span v-for="t in st.tags" :key="t" class="tag">{{ t }}</span>
          </div>
        </div>
        <div class="dr-tools">
          <button class="btn btn-sm btn-light" @click="openAITemplate('comment1', { sid: st.id })">
            <Icon name="spark" />AI 写评语
          </button>
          <button class="btn btn-sm btn-light" @click="openAITemplate('parent', { sid: st.id })">家长沟通</button>
          <button class="btn btn-sm btn-dark" @click="openStudentForm(st, {})">编辑档案</button>
          <button class="modal-x" aria-label="关闭" @click="closeDrawer()"><Icon name="x" /></button>
        </div>
      </div>

      <div class="tabs">
        <button v-for="t in TABS" :key="t[0]" :class="{ on: tab === t[0] }" @click="openStudent(st.id, t[0])">
          {{ t[1] }}
        </button>
      </div>

      <div class="drawer-body">
        <!-- 概览 -->
        <template v-if="tab === 'overview'">
          <div class="kpis">
            <div class="kpi">
              <div class="k">{{ cur.cur ? cur.cur.ex.name + ' 总分' : '最近总分' }}</div>
              <div class="v">
                {{ cur.cur ? fmtNum(cur.cur.total, 1) : '—'
                }}<small v-if="cur.cur">/ {{ examFull(cur.cur.ex) }}</small>
              </div>
              <div class="d">
                <template v-if="cur.cur">
                  班级第 {{ cur.cur.rank }} 名
                  <span
                    v-if="cur.prv && cur.prv.rank !== null && cur.cur.rank !== null && cur.prv.rank - cur.cur.rank"
                    :class="cur.prv.rank - cur.cur.rank > 0 ? 'up' : 'dn'"
                    >{{ cur.prv.rank - cur.cur.rank > 0 ? '↑' : '↓'
                    }}{{ Math.abs(cur.prv.rank - cur.cur.rank) }}</span
                  >
                </template>
                <span v-else class="muted">暂无成绩</span>
              </div>
            </div>
            <div class="kpi">
              <div class="k">累计积分</div>
              <div class="v">{{ pointTotal > 0 ? '+' : '' }}{{ pointTotal }}</div>
              <div class="d muted">{{ pointCount }} 次点评</div>
            </div>
            <div class="kpi">
              <div class="k">本月考勤</div>
              <div class="v">
                {{
                  attMonth.absent + attMonth.leave + attMonth.late === 0
                    ? '全勤'
                    : attMonth.leave + attMonth.absent
                }}<small v-if="attMonth.absent + attMonth.leave">天未到</small>
              </div>
              <div class="d muted">
                请假 {{ attMonth.leave }} · 缺勤 {{ attMonth.absent }} · 迟到 {{ attMonth.late }}
              </div>
            </div>
            <div class="kpi">
              <div class="k">生日</div>
              <div class="v" style="font-size: 19px">{{ st.birthday ? fmtMD(st.birthday) : '—' }}</div>
              <div class="d muted">
                {{
                  daysToBirthday(st) === null
                    ? '未填写'
                    : daysToBirthday(st) === 0
                      ? '就是今天'
                      : daysToBirthday(st) + ' 天后'
                }}
              </div>
            </div>
          </div>

          <div v-if="trend.length" class="grid2">
            <div class="panel">
              <div class="panel-title">总分得分率</div>
              <div class="panel-sub">与班级平均对比</div>
              <ChartView :fn="lineChart" />
              <div class="legend">
                <span><i :style="{ background: CH.C.s1 }"></i>{{ st.name }}</span>
                <span><i :style="{ background: CH.C.base }"></i>班级平均</span>
              </div>
            </div>
            <div class="panel">
              <div class="panel-title">学科画像</div>
              <div class="panel-sub">{{ radarExam ? radarExam.name : '' }} 各科得分率</div>
              <ChartView :fn="radarChart" />
              <div class="legend">
                <span><i :style="{ background: CH.C.s1 }"></i>{{ st.name }}</span>
                <span><i :style="{ background: CH.C.base }"></i>班级平均</span>
              </div>
            </div>
          </div>

          <div class="panel" style="margin-top: 16px">
            <div class="info-grid">
              <div class="k">学习情况</div>
              <div>{{ st.study || '未填写' }}</div>
              <div class="k">性格特长</div>
              <div>{{ st.personality || '未填写' }}</div>
              <div class="k">家庭情况</div>
              <div>{{ st.family || '' }}{{ st.familyNote ? ' · ' + st.familyNote : '' }}</div>
              <template v-if="st.health">
                <div class="k">健康</div>
                <div>{{ st.health }}</div>
              </template>
            </div>
          </div>

          <div v-if="recentRecords.length" class="panel" style="margin-top: 16px">
            <div class="panel-title" style="margin-bottom: 12px">最近记录</div>
            <div class="timeline">
              <div v-for="r in recentRecords" :key="r.id" class="tl-item" :class="'t-' + r.type">
                <div class="tl-top">
                  <span class="num">{{ r.date }}</span><span class="tag gray">{{ r.type }}</span>
                </div>
                <div class="tl-txt">{{ r.text }}</div>
              </div>
            </div>
          </div>
        </template>

        <!-- 档案 -->
        <template v-else-if="tab === 'profile'">
          <div class="panel" style="margin-top: 18px">
            <div class="panel-title" style="margin-bottom: 12px">基本信息</div>
            <div class="info-grid">
              <div class="k">姓名</div>
              <div>{{ st.name }}</div>
              <div class="k">学号</div>
              <div class="num">{{ st.no || '—' }}</div>
              <div class="k">性别</div>
              <div>{{ st.gender === 'F' ? '女' : '男' }}</div>
              <div class="k">生日</div>
              <div>{{ st.birthday || '—' }}</div>
              <div class="k">职务</div>
              <div>{{ st.role || '—' }}</div>
              <div class="k">座位</div>
              <div>{{ seatText(st.seat) }}</div>
              <div class="k">住宿</div>
              <div>{{ st.boarding ? '住校' : '走读' }}</div>
            </div>
          </div>
          <div class="panel" style="margin-top: 16px">
            <div class="panel-title" style="margin-bottom: 12px">家庭与联系人</div>
            <div class="info-grid">
              <div class="k">家庭结构</div>
              <div>{{ st.family || '—' }}</div>
              <template v-for="(p, i) in st.parents || []" :key="i">
                <div class="k">{{ i === 0 ? '主要联系人' : '其他联系人' }}</div>
                <div>
                  {{ p.name }} <span class="muted">{{ p.rel }}{{ p.job ? ' · ' + p.job : '' }}</span>
                  <span class="num">{{ p.phone }}</span>
                  <button v-if="p.phone" class="btn btn-xs btn-ghost" @click="copyText(p.phone)">
                    <Icon name="copy" />
                  </button>
                </div>
              </template>
              <div class="k">家庭备注</div>
              <div>{{ st.familyNote || '—' }}</div>
            </div>
          </div>
          <div class="panel" style="margin-top: 16px">
            <div class="panel-title" style="margin-bottom: 12px">学习与成长</div>
            <div class="info-grid">
              <div class="k">学习情况</div>
              <div>{{ st.study || '—' }}</div>
              <div class="k">性格特长</div>
              <div>{{ st.personality || '—' }}</div>
              <div class="k">健康情况</div>
              <div>{{ st.health || '—' }}</div>
              <div class="k">其他备注</div>
              <div>{{ st.note || '—' }}</div>
            </div>
          </div>
          <div style="margin-top: 14px; text-align: right">
            <button class="btn btn-dark" @click="openStudentForm(st, {})"><Icon name="edit" />编辑档案</button>
          </div>
        </template>

        <!-- 成绩 -->
        <template v-else-if="tab === 'scores'">
          <div v-if="!examRows.exs.length" class="empty" style="margin-top: 20px">还没有考试成绩</div>
          <template v-else>
            <div class="tbl-wrap" style="margin-top: 18px">
              <table class="tbl">
                <thead>
                  <tr>
                    <th>考试</th>
                    <th v-for="s in examRows.subs" :key="s" class="c">{{ s }}</th>
                    <th class="c">总分</th>
                    <th class="c">排名</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="e in examRows.exs" :key="e.id">
                    <td>
                      <b style="font-weight: 600">{{ e.name }}</b><br />
                      <span class="muted num" style="font-size: 12px">{{ e.date }}</span>
                    </td>
                    <td v-for="s in examRows.subs" :key="s" class="c">
                      <template v-if="!e.subjects.some((x) => x.name === s)">
                        <span class="muted">—</span>
                      </template>
                      <span v-else-if="(e.scores[st.id] || {})[s] === null" class="tag amber">缺考</span>
                      <span v-else class="num" :class="{ dn: isLow(e, st.id, s) }">{{ scoreText(e, st.id, s) }}</span>
                    </td>
                    <td class="c num"><b>{{ totalOf(e, st.id) }}</b></td>
                    <td class="c num">{{ rankOf(e, st.id) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div class="muted" style="font-size: 12px; margin-top: 8px">
              红色为不及格（低于满分的 60%）
            </div>
            <div class="panel" style="margin-top: 16px">
              <div class="panel-title">班级排名变化</div>
              <div class="panel-sub">越靠上排名越前</div>
              <ChartView :fn="rankChart" />
            </div>
          </template>
        </template>

        <!-- 成长记录 -->
        <template v-else-if="tab === 'records'">
          <div class="panel" style="margin-top: 18px">
            <div class="panel-title" style="margin-bottom: 12px">新增记录</div>
            <div class="row3" style="grid-template-columns: 120px 150px 1fr">
              <div class="field">
                <label>类型</label>
                <select v-model="recType" class="sel">
                  <option v-for="t in RECORD_TYPES" :key="t">{{ t }}</option>
                </select>
              </div>
              <div class="field">
                <label>日期</label>
                <input v-model="recDate" class="inp" type="date" />
              </div>
              <div class="field">
                <label>内容</label>
                <input
                  v-model="recText"
                  class="inp"
                  placeholder="例如：主动帮同学讲题，课上表扬"
                  @keydown.enter="addRecord"
                />
              </div>
            </div>
            <div style="text-align: right">
              <button class="btn btn-dark btn-sm" @click="addRecord">添加记录</button>
            </div>
          </div>
          <div class="panel" style="margin-top: 16px">
            <div class="panel-title" style="margin-bottom: 12px">成长时间线</div>
            <div v-if="records.length" class="timeline">
              <div v-for="r in records" :key="r.id" class="tl-item" :class="'t-' + r.type">
                <div class="tl-top">
                  <span class="num">{{ r.date }}</span>
                  <span class="tag" :class="recTone(r)">{{ r.type }}</span>
                  <button class="del" @click="delRecord(r.id)">删除</button>
                </div>
                <div class="tl-txt">{{ r.text }}</div>
              </div>
            </div>
            <div v-else class="empty">
              还没有记录。谈话、家访、获奖都可以记在这里，写期末评语时 AI 会参考。
            </div>
          </div>
          <div class="panel" style="margin-top: 16px">
            <div class="panel-title" style="margin-bottom: 10px">
              点评明细
              <span class="muted" style="font-weight: 400; font-size: 12.5px"
                >共 {{ pointCount }} 次 · 合计 {{ pointTotal > 0 ? '+' : '' }}{{ pointTotal }}</span
              >
            </div>
            <table v-if="pointList.length" class="tbl">
              <tbody>
                <tr v-for="p in pointList" :key="p.id">
                  <td class="num muted" style="width: 110px">{{ fmtTime(p.t) }}</td>
                  <td>{{ p.r }}</td>
                  <td class="r num" :class="p.d > 0 ? 'up' : 'dn'"><b>{{ p.d > 0 ? '+' : '' }}{{ p.d }}</b></td>
                  <td class="r" style="width: 50px">
                    <button class="btn btn-xs btn-ghost" @click="delPoint(p.id)">撤销</button>
                  </td>
                </tr>
              </tbody>
            </table>
            <div v-else class="empty">在教室的「点评」模式里点这位同学即可加减分</div>
          </div>
        </template>

        <!-- 评语 -->
        <template v-else>
          <div class="panel" style="margin-top: 18px">
            <div class="panel-title" style="margin-bottom: 10px">写一条评语</div>
            <textarea
              v-model="cmtText"
              class="ta"
              placeholder="可以自己写，也可以点右上角「AI 写评语」，生成后保存到这里"
              style="min-height: 96px"
            ></textarea>
            <div style="display: flex; gap: 8px; justify-content: flex-end; margin-top: 10px">
              <button class="btn btn-light btn-sm" @click="openAITemplate('comment1', { sid: st.id })">
                <Icon name="spark" />AI 生成
              </button>
              <button class="btn btn-dark btn-sm" @click="addComment">保存评语</button>
            </div>
          </div>
          <div style="margin-top: 16px">
            <div v-for="c in comments" :key="c.id" class="cmt">
              <div class="cmt-meta">
                <span>{{ c.date }}</span>
                <span class="tag" :class="c.src === 'AI' ? 'blue' : 'gray'">{{
                  c.src === 'AI' ? 'AI 生成' : '手写'
                }}</span>
                <span class="grow"></span>
                <button class="btn btn-xs btn-ghost" @click="copyText(c.text)"><Icon name="copy" />复制</button>
                <button class="btn btn-xs btn-ghost" @click="delComment(c.id)">删除</button>
              </div>
              {{ c.text }}
            </div>
            <div v-if="!comments.length" class="empty">还没有评语</div>
          </div>
        </template>
      </div>
    </div>
  </template>
</template>
