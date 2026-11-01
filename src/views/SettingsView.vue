<script setup lang="ts">
/** 设置：班级信息 / 教师形象 / 教室与黑板 / 学科与点评 / AI 接口 / 数据与备份 / 关于 */
import { computed, ref, watch } from 'vue'
import { S, save, replaceState, isStorageOk } from '@core/app'
import { SUBJECT_PRESETS, VERSION, defaultState } from '@core/state'
import { fixSeats } from '@core/select'
import { demoState } from '@core/demo'
import { AI_PRESETS, AIC, presetOf, testConnection } from '@core/ai'
import { exportBackup, parseBackup, storageSizeKB } from '@core/backup'
import { deepClone, fmtTime } from '@core/utils'
import { pageOpts, go } from '@ui/shell/router'
import { confirm } from '@ui/shell/modal'
import { toast } from '@ui/shell/toast'
import BrandMark from '@components/common/BrandMark.vue'
import TeacherAvatar from '@components/common/TeacherAvatar.vue'
import Icon from '@components/common/Icon.vue'
import type { Gender } from '@core/types'

const SET_SECS: [string, string][] = [
  ['class', '班级信息'],
  ['teacher', '教师形象'],
  ['room', '教室与黑板'],
  ['subjects', '学科与点评'],
  ['ai', 'AI 接口'],
  ['data', '数据与备份'],
  ['about', '关于']
]

const sec = ref('class')

watch(
  pageOpts,
  (o) => {
    if (o && o.sec) sec.value = o.sec
  },
  { immediate: true }
)

const settings = computed(() => S.settings)

/* ---------- 教室布局 ---------- */
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

/* ---------- 学科与点评 ---------- */
const newSub = ref('')
const newSubFull = ref('100')
const newRs = ref('')
const newRsD = ref('1')

function addSubject(): void {
  const n = newSub.value.trim()
  const f = parseFloat(newSubFull.value) || 100
  if (!n) return
  if (!settings.value.subjects.some((s) => s.name === n)) settings.value.subjects.push({ name: n, full: f })
  save()
  newSub.value = ''
}

function delSubject(i: number): void {
  settings.value.subjects.splice(i, 1)
  save()
}

function resetSubjects(): void {
  const p = SUBJECT_PRESETS[settings.value.stage] || SUBJECT_PRESETS['初中']
  settings.value.subjects = p.map((x) => ({ name: x[0], full: x[1] }))
  save()
  toast('已按' + settings.value.stage + '重置科目')
}

function addReason(): void {
  const t = newRs.value.trim()
  const d = parseInt(newRsD.value, 10) || 1
  if (!t) return
  settings.value.reasons.push({ t, d })
  save()
  newRs.value = ''
}

function delReason(i: number): void {
  settings.value.reasons.splice(i, 1)
  save()
}

/* ---------- AI ---------- */
const aiTestRes = ref('')
const aiTesting = ref(false)
const keyType = ref<'password' | 'text'>('password')

function toggleKey(): void {
  keyType.value = keyType.value === 'password' ? 'text' : 'password'
}

const preset = computed(() => presetOf(settings.value.ai.provider))

function onProvider(): void {
  const p = preset.value
  const a = settings.value.ai
  if (p.id !== 'custom') {
    a.base = p.base
    a.model = p.model
  }
  save()
}

async function testAi(): Promise<void> {
  if (!AIC.ready()) {
    aiTestRes.value = '<span class="dn">请先填写接口地址、模型名称和 API Key</span>'
    return
  }
  aiTesting.value = true
  aiTestRes.value = '正在连接…'
  try {
    const r = await testConnection()
    aiTestRes.value =
      '<span class="up">连接成功（' + (r.ms / 1000).toFixed(1) + ' 秒）</span> <span class="muted">模型回复：' +
      String(r.text).slice(0, 30) +
      '</span>'
  } catch (e) {
    aiTestRes.value = '<span class="dn">' + (e as Error).message + '</span>'
  }
  aiTesting.value = false
}

/* ---------- 数据 ---------- */
const sizeKb = computed(() => storageSizeKB().toFixed(1))

async function onRestore(e: Event): Promise<void> {
  const input = e.target as HTMLInputElement
  const f = input.files && input.files[0]
  input.value = ''
  if (!f) return
  const d = await parseBackup(f)
  if (!d) {
    toast('这不是有效的备份文件')
    return
  }
  confirm(
    '从备份恢复',
    '备份里有 ' + d.students.length + ' 名学生、' + (d.exams || []).length + ' 场考试。恢复会覆盖当前全部数据，确定吗？',
    '恢复',
    () => {
      replaceState(d)
      save(true)
      go('class')
      toast('已恢复')
    }
  )
}

function loadDemo(): void {
  confirm('载入示例班级', '会用一个 46 人的示例班级覆盖当前数据（保留你的形象和 AI 设置）。', '载入', () => {
    const keep = { teacher: deepClone(S.settings.teacher), ai: deepClone(S.settings.ai) }
    const st = demoState()
    st.settings.teacher = keep.teacher
    st.settings.ai = keep.ai
    replaceState(st)
    save(true)
    go('class')
  }, true)
}

function wipe(): void {
  confirm('清空全部数据', '学生、成绩、考勤、点评、AI 对话都会被删除，无法恢复。确定吗？', '清空', () => {
    const keep = { teacher: deepClone(S.settings.teacher), ai: deepClone(S.settings.ai) }
    const st = defaultState()
    st.settings.teacher = keep.teacher
    st.settings.ai = keep.ai
    st.settings.onboarded = true
    replaceState(st)
    save(true)
    go('class')
    toast('已清空')
  }, true)
}

function setGender(g: Gender): void {
  settings.value.teacher.gender = g
  save()
}

function backupNow(): void {
  exportBackup()
  toast('备份已下载，请妥善保存')
}
</script>

<template>
  <div class="page scroll">
    <div class="page-head">
      <div>
        <h1 class="page-title">设置</h1>
        <div class="page-desc">修改后自动保存</div>
      </div>
    </div>

    <div class="set-layout">
      <nav class="set-nav">
        <button v-for="s in SET_SECS" :key="s[0]" :class="{ on: sec === s[0] }" @click="sec = s[0]">
          {{ s[1] }}
        </button>
      </nav>

      <div>
        <!-- 班级信息 -->
        <template v-if="sec === 'class'">
          <div class="panel set-sec">
            <div class="panel-title" style="margin-bottom: 14px">班级信息</div>
            <div class="row2">
              <div class="field">
                <label>班级名称</label>
                <input v-model="settings.className" class="inp" placeholder="如：初二（3）班" @input="save()" />
              </div>
              <div class="field">
                <label>学校</label>
                <input v-model="settings.school" class="inp" placeholder="选填" @input="save()" />
              </div>
            </div>
            <div class="row3">
              <div class="field">
                <label>学段</label>
                <select v-model="settings.stage" class="sel" @change="save()">
                  <option>小学</option>
                  <option>初中</option>
                  <option>高中</option>
                </select>
              </div>
              <div class="field">
                <label>年级</label>
                <input v-model="settings.grade" class="inp" placeholder="如：初二" @input="save()" />
              </div>
              <div class="field">
                <label>学期</label>
                <input v-model="settings.term" class="inp" placeholder="如：2026—2027 学年 第一学期" @input="save()" />
              </div>
            </div>
            <div class="row2">
              <div class="field">
                <label>开学日期</label>
                <input v-model="settings.termStart" class="inp" type="date" @input="save()" />
                <div class="hint">用来计算「第几周」</div>
              </div>
            </div>
          </div>
        </template>

        <!-- 教师形象 -->
        <template v-else-if="sec === 'teacher'">
          <div class="panel set-sec">
            <div class="panel-title" style="margin-bottom: 14px">教师形象</div>
            <div class="gender-pick">
              <button :class="{ on: settings.teacher.gender === 'F' }" @click="setGender('F')">
                <TeacherAvatar gender="F" :size="88" />女老师
              </button>
              <button :class="{ on: settings.teacher.gender === 'M' }" @click="setGender('M')">
                <TeacherAvatar gender="M" :size="88" />男老师
              </button>
            </div>
            <div class="row2" style="margin-top: 18px">
              <div class="field">
                <label>称呼</label>
                <input v-model="settings.teacher.name" class="inp" placeholder="如：李老师" @input="save()" />
              </div>
              <div class="field">
                <label>任教学科</label>
                <input v-model="settings.teacher.subject" class="inp" placeholder="如：数学" @input="save()" />
              </div>
            </div>
          </div>
        </template>

        <!-- 教室与黑板 -->
        <template v-else-if="sec === 'room'">
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
                  共 {{ capacity }} 个座位，班里 {{ S.students.length }} 人{{
                    unseated ? '，' + unseated + ' 人未排座' : ''
                  }}
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

        <!-- 学科与点评 -->
        <template v-else-if="sec === 'subjects'">
          <div class="panel set-sec">
            <div class="panel-title">科目与满分</div>
            <div class="panel-sub">新建考试时默认勾选这些科目</div>
            <div class="sub-list">
              <span v-for="(s, i) in settings.subjects" :key="s.name" class="sub-item">
                {{ s.name }}
                <input
                  :value="s.full"
                  :aria-label="s.name + '满分'"
                  @input="s.full = parseFloat(($event.target as HTMLInputElement).value) || s.full; save()"
                />
                <button :aria-label="'删除' + s.name" @click="delSubject(i)">×</button>
              </span>
            </div>
            <div style="display: flex; gap: 6px; margin-top: 12px; flex-wrap: wrap">
              <input v-model="newSub" class="inp" placeholder="科目名" style="width: 140px; height: 32px" />
              <input v-model="newSubFull" class="inp num" style="width: 72px; height: 32px" />
              <button class="btn btn-light btn-sm" @click="addSubject">添加科目</button>
              <button class="btn btn-ghost btn-sm" @click="resetSubjects">按学段重置</button>
            </div>
          </div>

          <div class="panel set-sec">
            <div class="panel-title">点评项目</div>
            <div class="panel-sub">教室「点评」模式里可选的加分、扣分理由</div>
            <div class="sub-list">
              <span
                v-for="(r, i) in settings.reasons"
                :key="i"
                class="sub-item"
                :style="{ background: r.d > 0 ? 'var(--green-soft)' : 'var(--red-soft)' }"
              >
                {{ r.t }}
                <input
                  :value="r.d"
                  aria-label="分值"
                  @input="r.d = parseInt(($event.target as HTMLInputElement).value, 10) || r.d; save()"
                />
                <button aria-label="删除" @click="delReason(i)">×</button>
              </span>
            </div>
            <div style="display: flex; gap: 6px; margin-top: 12px">
              <input v-model="newRs" class="inp" placeholder="理由，如：课堂笔记工整" style="width: 220px; height: 32px" />
              <input v-model="newRsD" class="inp num" style="width: 64px; height: 32px" />
              <button class="btn btn-light btn-sm" @click="addReason">添加</button>
            </div>
          </div>
        </template>

        <!-- AI 接口 -->
        <template v-else-if="sec === 'ai'">
          <div class="panel set-sec">
            <div class="panel-title">AI 接口</div>
            <div class="panel-sub">
              填一个 API Key 就能在工作台里直接生成。不配置也能用：生成时会给你一段提示词，复制到豆包、DeepSeek
              等网页版即可。
            </div>
            <div class="field">
              <label>服务商</label>
              <select v-model="settings.ai.provider" class="sel" @change="onProvider">
                <option v-for="p in AI_PRESETS" :key="p.id" :value="p.id">{{ p.name }}</option>
              </select>
              <div v-if="preset.site" class="hint">
                到 {{ preset.site }} 注册并创建 API Key{{ preset.hint ? '；' + preset.hint : '' }}
              </div>
              <div v-else-if="preset.hint" class="hint">{{ preset.hint }}</div>
            </div>
            <div class="field">
              <label>API Key</label>
              <div style="display: flex; gap: 6px">
                <input
                  v-model="settings.ai.key"
                  class="inp num"
                  :type="keyType"
                  placeholder="sk-..."
                  autocomplete="off"
                  @input="save()"
                />
                <button class="btn btn-light btn-icon" title="显示/隐藏" aria-label="显示或隐藏 Key" @click="toggleKey">
                  <Icon name="eye" />
                </button>
              </div>
            </div>
            <div class="row2">
              <div class="field">
                <label>接口地址（Base URL）</label>
                <input v-model="settings.ai.base" class="inp" placeholder="https://.../v1" @input="save()" />
              </div>
              <div class="field">
                <label>模型名称</label>
                <input v-model="settings.ai.model" class="inp" placeholder="如：deepseek-chat" @input="save()" />
              </div>
            </div>
            <div class="row2">
              <div class="field">
                <label>创造性（temperature）</label>
                <input
                  v-model.number="settings.ai.temp"
                  class="inp num"
                  type="number"
                  step="0.1"
                  min="0"
                  max="1.5"
                  @input="save()"
                />
                <div class="hint">写材料建议 0.6–0.8；越高越发散</div>
              </div>
              <div class="field">
                <label>隐私</label>
                <label class="chk" style="height: 38px">
                  <input v-model="settings.ai.mask" type="checkbox" @change="save()" />发送前隐去学生姓名
                </label>
                <div class="hint">姓名替换成【学生07】这样的编号，结果回来后自动换回；家长电话从不发送</div>
              </div>
            </div>
            <div style="display: flex; gap: 10px; align-items: center">
              <button class="btn btn-dark" :disabled="aiTesting" @click="testAi">测试连接</button>
              <span class="muted" style="font-size: 13px" v-html="aiTestRes"></span>
            </div>
          </div>

          <div class="panel set-sec">
            <div class="panel-title">连不上？</div>
            <div style="font-size: 13px; line-height: 1.85; color: var(--ink2)">
              网页直接调用 AI 时，有些服务商会拦截（跨域限制）。DeepSeek、Kimi、OpenAI、Claude
              一般可以直接用；如果提示「连不上」，可以：<br />① 换一家服务商试试；② 用开源包里的
              <span class="kbd">ai-proxy.js</span>：电脑装好 Node.js 后运行
              <span class="kbd">node ai-proxy.js</span>，再把接口地址改成
              <span class="kbd">http://127.0.0.1:8787/</span> 加原地址，例如
              <span class="kbd">http://127.0.0.1:8787/https://api.deepseek.com</span>。<br />API Key
              只保存在这台电脑的浏览器里，不会上传到任何地方。
            </div>
          </div>
        </template>

        <!-- 数据与备份 -->
        <template v-else-if="sec === 'data'">
          <div class="panel set-sec">
            <div class="panel-title">数据与备份</div>
            <div class="panel-sub">
              所有数据只保存在这台电脑的浏览器里，不会上传。清理浏览器数据、换电脑前，请先导出备份。
            </div>
            <div class="info-grid" style="margin-bottom: 16px">
              <div class="k">当前数据</div>
              <div>
                {{ S.students.length }} 名学生 · {{ S.exams.length }} 场考试 · {{ S.points.length }} 条点评 ·
                {{ S.records.length }} 条成长记录 · {{ S.chats.length }} 个 AI 对话
              </div>
              <div class="k">占用空间</div>
              <div class="num">{{ sizeKb }} KB</div>
              <div class="k">上次备份</div>
              <div>
                <span v-if="settings.lastBackup">{{ fmtTime(settings.lastBackup) }}</span>
                <span v-else class="dn">还没有备份过</span>
              </div>
              <div class="k">存储状态</div>
              <div>
                <span v-if="isStorageOk()">正常</span>
                <span v-else class="dn">浏览器禁止了本地存储，关闭页面后数据会丢失，请及时导出备份</span>
              </div>
            </div>
            <div style="display: flex; gap: 8px; flex-wrap: wrap">
              <button class="btn btn-dark" @click="backupNow"><Icon name="down" />导出备份</button>
              <label class="btn btn-light" style="cursor: pointer">
                <Icon name="up" />从备份恢复<input type="file" accept=".json" hidden @change="onRestore" />
              </label>
            </div>
          </div>

          <div class="panel set-sec">
            <div class="panel-title">重新开始</div>
            <div class="panel-sub">以下操作会覆盖当前数据，建议先导出备份</div>
            <div style="display: flex; gap: 8px; flex-wrap: wrap">
              <button class="btn btn-light" @click="loadDemo">载入示例班级</button>
              <button class="btn btn-light" style="color: var(--red)" @click="wipe">
                <Icon name="trash" />清空全部数据
              </button>
            </div>
          </div>
        </template>

        <!-- 关于 -->
        <template v-else>
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
      </div>
    </div>
  </div>
</template>
