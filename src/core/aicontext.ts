/**
 * AI 上下文与提示词模板：系统提示、班级 / 学生 / 考试摘要、模板定义
 */
import { S } from './app'
import { Mask } from './ai'
import { examsSorted, latestExam, prevExam, stuById, studentsByNo, weekNo, age, examById } from './select'
import { examFull, examStats, rankMap, stuTrend, subjectStats } from './stats'
import { fmtNum, pct, round1 } from './utils'
import type { Exam, Student } from './types'

/* ---------- 上下文 ---------- */

export function sysPrompt(): string {
  const st = S.settings
  const t = st.teacher
  return (
    '你是一名经验丰富、温和务实的中国中小学班主任助理，熟悉课程标准、班级管理与家校沟通。\n' +
    '写作要求：\n1. 使用简体中文，语气真诚具体、有温度，避免空话套话和夸张表述；\n2. 用 Markdown 组织内容（标题、列表、必要时用表格），老师可以直接复制使用；\n' +
    '3. 只依据老师提供的信息，不编造具体事实、成绩、奖项或数据；信息不够时用「（可补充：……）」提示老师；\n' +
    '4. 涉及学生时以成长和鼓励为导向，不贴标签，不公开排名羞辱学生，注意保护隐私；\n' +
    '5. 资料里「【学生07】」这样的占位符代表某位学生，请原样保留，不要改写，也不要替换成其他名字。\n' +
    '当前老师：' +
    t.name +
    '，' +
    (st.school ? st.school + ' ' : '') +
    st.className +
    ' 班主任' +
    (t.subject ? '，任教' + t.subject : '') +
    '；学段：' +
    st.stage +
    '。'
  )
}

export function classContext(): string {
  const st = S.settings
  const n = S.students.length
  const boys = S.students.filter((s) => s.gender !== 'F').length
  const cadres = S.students.filter((s) => s.role).map((s) => s.role + ' ' + s.name)
  const tagCount: Record<string, number> = {}
  S.students.forEach((s) => {
    ;(s.tags || []).forEach((t) => {
      tagCount[t] = (tagCount[t] || 0) + 1
    })
  })
  const wk = weekNo()
  let h =
    '【班级概况】\n' +
    (st.school ? '学校：' + st.school + '；' : '') +
    '班级：' +
    st.className +
    '；学段：' +
    st.stage +
    (st.term ? '；' + st.term : '') +
    (wk ? '；当前第 ' + wk + ' 周' : '') +
    '\n'
  h += '人数：' + n + ' 人（男 ' + boys + '，女 ' + (n - boys) + '）\n'
  if (cadres.length) h += '班干部：' + cadres.join('、') + '\n'
  const tg = Object.keys(tagCount).map((k) => k + ' ' + tagCount[k] + ' 人')
  if (tg.length) h += '学生标签统计：' + tg.join('、') + '\n'
  const lat = latestExam()
  if (lat) {
    const es = examStats(lat)
    if (es.n) {
      h +=
        '最近考试：' +
        lat.name +
        '（' +
        lat.date +
        '），平均分 ' +
        fmtNum(es.avg, 1) +
        '/' +
        es.full +
        '，及格率 ' +
        pct(es.pass) +
        '，优秀率 ' +
        pct(es.good) +
        '；各科平均得分率：' +
        es.subs.map((s) => s.name + ' ' + pct(s.rate)).join('、') +
        '\n'
    }
  }
  const since = Date.now() - 30 * 86400000
  const pl = S.points.filter((p) => p.t >= since)
  if (pl.length) {
    const plus: Record<string, number> = {}
    const minus: Record<string, number> = {}
    pl.forEach((p) => {
      const o = p.d > 0 ? plus : minus
      o[p.r] = (o[p.r] || 0) + 1
    })
    const top = (o: Record<string, number>): string =>
      Object.keys(o)
        .sort((a, b) => o[b] - o[a])
        .slice(0, 4)
        .map((k) => k + '(' + o[k] + '次)')
        .join('、')
    h +=
      '近 30 天课堂点评：加分 ' +
      pl.filter((p) => p.d > 0).length +
      ' 次，扣分 ' +
      pl.filter((p) => p.d < 0).length +
      ' 次；常见加分：' +
      (top(plus) || '无') +
      '；常见扣分：' +
      (top(minus) || '无') +
      '\n'
  }
  const recs = S.records.slice().sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 6)
  if (recs.length) {
    h +=
      '近期班级记录：' +
      recs
        .map((r) => {
          const s = stuById(r.sid)
          return r.date.slice(5) + ' ' + (s ? s.name : '') + ' ' + r.type + '：' + r.text
        })
        .join('；') +
      '\n'
  }
  return h
}

export function studentContext(s: Student): string {
  let h =
    '【学生档案】\n姓名：' +
    s.name +
    '；性别：' +
    (s.gender === 'F' ? '女' : '男') +
    (age(s) !== null ? '；年龄：' + age(s) + ' 岁' : '') +
    (s.role ? '；职务：' + s.role : '') +
    (s.tags && s.tags.length ? '；标签：' + s.tags.join('、') : '') +
    '\n'
  h += '家庭：' + (s.family || '未填') + (s.familyNote ? '；' + s.familyNote : '') + '\n'
  if (s.study) h += '学习情况：' + s.study + '\n'
  if (s.personality) h += '性格特长：' + s.personality + '\n'
  if (s.health) h += '健康情况：' + s.health + '\n'
  if (s.note) h += '其他备注：' + s.note + '\n'
  const tr = stuTrend(s.id).filter((t) => t.total !== null)
  if (tr.length) {
    h +=
      '成绩：' +
      tr.map((t) => t.ex.name + ' 总分 ' + fmtNum(t.total, 1) + '/' + examFull(t.ex) + '，班级第 ' + t.rank + '/' + t.n + ' 名').join('；') +
      '\n'
    const le = tr[tr.length - 1].ex
    const row = le.scores[s.id] || {}
    h +=
      le.name +
      ' 各科：' +
      le.subjects
        .map((sb) => {
          const v = row[sb.name]
          const cs = subjectStats(le, sb.name)
          return sb.name + ' ' + (v === null ? '缺考' : v === undefined ? '无' : v + '/' + sb.full) + '（班均 ' + fmtNum(cs.avg, 1) + '）'
        })
        .join('、') +
      '\n'
  }
  const pts = S.points.filter((p) => p.sid === s.id)
  if (pts.length) {
    const plus: Record<string, number> = {}
    const minus: Record<string, number> = {}
    pts.forEach((p) => {
      const o = p.d > 0 ? plus : minus
      o[p.r] = (o[p.r] || 0) + 1
    })
    let total = 0
    pts.forEach((p) => {
      total += p.d
    })
    h +=
      '课堂点评：累计 ' +
      (total > 0 ? '+' : '') +
      total +
      ' 分；加分原因：' +
      (Object.keys(plus).map((k) => k + plus[k] + '次').join('、') || '无') +
      '；扣分原因：' +
      (Object.keys(minus).map((k) => k + minus[k] + '次').join('、') || '无') +
      '\n'
  }
  const recs = S.records.filter((r) => r.sid === s.id).sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 6)
  if (recs.length) h += '成长记录：' + recs.map((r) => r.date + ' ' + r.type + '：' + r.text).join('；') + '\n'
  const c = { leave: 0, absent: 0, late: 0 }
  Object.keys(S.attendance).forEach((k) => {
    const v = S.attendance[k][s.id]
    if (v) c[v]++
  })
  if (c.leave + c.absent + c.late) h += '考勤：请假 ' + c.leave + ' 天，缺勤 ' + c.absent + ' 天，迟到 ' + c.late + ' 次\n'
  return h
}

export function examContext(ex: Exam, cx: Exam | null): string {
  const es = examStats(ex)
  if (!es.n) return '【考试数据】' + ex.name + ' 还没有录入成绩\n'
  let h =
    '【考试数据】' + ex.name + '（' + ex.date + '，' + (ex.type || '') + '），参考 ' + es.n + ' 人，满分 ' + es.full + '\n'
  h +=
    '总分：平均 ' +
    fmtNum(es.avg, 1) +
    '，最高 ' +
    fmtNum(es.max, 1) +
    '，最低 ' +
    fmtNum(es.min, 1) +
    '，及格率 ' +
    pct(es.pass) +
    '，优秀率 ' +
    pct(es.good) +
    '，标准差 ' +
    fmtNum(es.sd, 1) +
    '\n'
  h +=
    '各科：\n' +
    es.subs
      .map(
        (s) =>
          '- ' +
          s.name +
          '（满分 ' +
          s.full +
          '）：平均 ' +
          fmtNum(s.avg, 1) +
          '，得分率 ' +
          pct(s.rate) +
          '，及格率 ' +
          pct(s.pass) +
          '，优秀率 ' +
          pct(s.good) +
          '，最高 ' +
          s.max +
          '，最低 ' +
          s.min +
          '，不及格 ' +
          s.low +
          ' 人'
      )
      .join('\n') +
    '\n'
  h +=
    '前 5 名：' +
    es.table
      .slice(0, 5)
      .map((r) => (stuById(r.sid) as Student).name + ' ' + fmtNum(r.total, 1))
      .join('、') +
    '\n'
  if (cx) {
    const cs = examStats(cx)
    const cm = rankMap(cx)
    if (cs.n) {
      h +=
        '与「' +
        cx.name +
        '」相比：平均得分率 ' +
        pct(cs.rate) +
        ' → ' +
        pct(es.rate) +
        '；各科得分率变化：' +
        es.subs
          .map((s) => {
            const p = cs.subs.filter((q) => q.name === s.name)[0]
            if (!p || !p.n) return s.name + '（上次未考）'
            const dv = ((s.rate || 0) - (p.rate || 0)) * 100
            return s.name + ' ' + (dv >= 0 ? '+' : '') + round1(dv) + ' 个百分点'
          })
          .join('、') +
        '\n'
      const mv = es.table
        .map((r) => ({ s: stuById(r.sid) as Student, ch: cm[r.sid] ? cm[r.sid].rank - r.rank : null, rank: r.rank }))
        .filter((x) => x.ch !== null)
      const up = mv.filter((x) => (x.ch as number) >= 5).sort((a, b) => (b.ch as number) - (a.ch as number))
      const dn = mv.filter((x) => (x.ch as number) <= -5).sort((a, b) => (a.ch as number) - (b.ch as number))
      h += '进步 5 名以上：' + (up.map((x) => x.s.name + '（↑' + x.ch + '，现第 ' + x.rank + '）').join('、') || '无') + '\n'
      h += '退步 5 名以上：' + (dn.map((x) => x.s.name + '（↓' + -(x.ch as number) + '，现第 ' + x.rank + '）').join('、') || '无') + '\n'
    }
  }
  const fails = es.table.filter((r) => {
    let n = 0
    ex.subjects.forEach((s) => {
      const v = r.subs[s.name]
      if (typeof v === 'number' && v < s.full * 0.6) n++
    })
    return n >= 2
  })
  h +=
    '两科及以上不及格：' +
    fails.length +
    ' 人' +
    (fails.length ? '（' + fails.map((r) => (stuById(r.sid) as Student).name).join('、') + '）' : '') +
    '\n'
  return h
}

/* ---------- 模板 ---------- */

export type TplValue = string | boolean | string[] | undefined

export type TplField =
  | [string, 'text', string, (string | (() => string))?, string?, number?]
  | [string, 'textarea', string, (string | (() => string))?, string?, number?]
  | [string, 'select', string, (string[] | (() => string[]))?, string?, number?]
  | [string, 'check', string, (boolean | (() => boolean))?, string?, number?]
  | [string, 'student', string, (string | (() => string))?, string?, number?]
  | [string, 'students', string, (string | (() => string))?, string?, number?]
  | [string, 'exam', string, (string | (() => string))?, string?, number?]
  | [string, 'exam0', string, (string | (() => string))?, string?, number?]

export interface TplValues {
  [k: string]: string | boolean | string[]
}

export interface TplJob {
  title: string
  show: string
  prompt: string
  ctx?: string[]
  sid?: string | null
  saveAs?: string | null
  tpl?: string
}

export interface Tpl {
  id: string
  cat: string
  rec?: number
  color: string
  ico: string
  title: string
  desc: string
  batch?: boolean
  fields: TplField[]
  build?: (v: TplValues) => TplJob
}

export const TPL_CATS: [string, string][] = [
  ['rec', '推荐'],
  ['teach', '教学备课'],
  ['manage', '班级管理'],
  ['home', '家校沟通'],
  ['grow', '学生成长']
]

export const TPLS: Tpl[] = [
  {
    id: 'lesson',
    cat: 'teach',
    rec: 1,
    color: '#2f7ff0',
    ico: '教',
    title: '备课教案',
    desc: '输入课题，生成教学目标、重难点、教学过程、板书和分层作业',
    fields: [
      ['subject', 'text', '学科', () => S.settings.teacher.subject],
      ['grade', 'text', '年级', () => S.settings.grade],
      ['topic', 'text', '课题', '', '如：分式的加减（第 1 课时）', 1],
      ['hours', 'select', '课时', ['1 课时（45 分钟）', '2 课时', '复习课']],
      ['extra', 'textarea', '学情或特别要求', '', '选填：比如班里计算基础偏弱，需要多一些练习']
    ],
    build: (v) => ({
      title: v.topic + ' · 教案',
      show: '帮我写一份教案：' + v.grade + v.subject + '《' + v.topic + '》，' + v.hours + (v.extra ? '\n要求：' + v.extra : ''),
      prompt:
        '请为' +
        S.settings.stage +
        v.grade +
        v.subject +
        '《' +
        v.topic +
        '》写一份完整教案（' +
        v.hours +
        '）。\n结构：一、教学目标（核心素养导向）；二、教学重难点；三、教学准备；四、教学过程（导入、新授、练习、小结、作业，每个环节写清时间、教师活动、学生活动和设计意图，用表格呈现）；五、板书设计；六、分层作业（基础、提高、拓展）；七、课后反思提示。' +
        (v.extra ? '\n学情与要求：' + v.extra : '')
    })
  },
  {
    id: 'ppt',
    cat: 'teach',
    color: '#2f7ff0',
    ico: '课',
    title: '课件大纲',
    desc: '按页列出课件结构、每页要点、互动设计和配图建议',
    fields: [
      ['subject', 'text', '学科', () => S.settings.teacher.subject],
      ['topic', 'text', '课题', '', '如：光的反射', 1],
      ['pages', 'select', '页数', ['12 页左右', '8 页左右', '16 页左右', '20 页左右']]
    ],
    build: (v) => ({
      title: v.topic + ' · 课件大纲',
      show: '帮我设计《' + v.topic + '》的课件大纲，' + v.pages,
      prompt:
        '请为' +
        S.settings.stage +
        v.subject +
        '《' +
        v.topic +
        '》设计课件大纲，' +
        v.pages +
        '。每页写：页标题、要点（不超过 4 条）、互动或提问设计、配图建议。最后给出 3 条讲课节奏提醒。'
    })
  },
  {
    id: 'homework',
    cat: 'teach',
    color: '#2f7ff0',
    ico: '练',
    title: '分层作业',
    desc: '基础、提高、拓展三层作业，附参考答案和讲评要点',
    fields: [
      ['subject', 'text', '学科', () => S.settings.teacher.subject],
      ['topic', 'text', '知识点', '', '如：一元一次方程的应用', 1],
      ['count', 'select', '每层题量', ['3 题', '5 题', '2 题']]
    ],
    build: (v) => ({
      title: v.topic + ' · 分层作业',
      show: '帮我出《' + v.topic + '》的分层作业，每层 ' + v.count,
      prompt:
        '请为' +
        S.settings.stage +
        S.settings.grade +
        v.subject +
        '「' +
        v.topic +
        '」设计分层作业：基础层、提高层、拓展层各 ' +
        v.count +
        '，题目贴近生活、难度梯度清晰。每层后面给出参考答案和简短讲评要点，最后说明每层适合哪类同学。'
    })
  },
  {
    id: 'meeting',
    cat: 'manage',
    rec: 1,
    color: '#14b0a6',
    ico: '班',
    title: '班会课方案',
    desc: '主题班会的目标、流程、互动环节和总结，可结合班级情况',
    fields: [
      ['theme', 'text', '班会主题', '', '如：期中考试后的反思与调整', 1],
      ['dur', 'select', '时长', ['40 分钟', '45 分钟', '20 分钟']],
      ['form', 'select', '形式', ['讨论交流', '情景游戏', '演讲分享', '视频引导']],
      ['useClass', 'check', '参考本班情况（成绩、点评等，已脱敏）', true]
    ],
    build: (v) => ({
      title: v.theme + ' · 班会方案',
      show: '帮我设计一节主题班会：' + v.theme + '（' + v.dur + '，' + v.form + '）',
      prompt:
        '请设计一节主题班会课方案。主题：' +
        v.theme +
        '；时长：' +
        v.dur +
        '；形式以' +
        v.form +
        '为主。\n内容：活动目标、课前准备（含学生分工）、活动流程（每个环节写时间、做法和主持词要点）、互动环节设计、班主任总结发言（300 字左右）、课后延伸。',
      ctx: v.useClass ? [classContext()] : []
    })
  },
  {
    id: 'activity',
    cat: 'manage',
    color: '#14b0a6',
    ico: '策',
    title: '活动策划',
    desc: '班级活动策划书，含分工、流程、预算与安全预案',
    fields: [
      ['name', 'text', '活动名称', '', '如：秋季班级趣味运动会', 1],
      ['when', 'text', '时间地点', '', '如：11 月 15 日下午，学校操场'],
      ['people', 'text', '参与人数', () => '全班 ' + S.students.length + ' 人'],
      ['budget', 'text', '预算', '', '选填']
    ],
    build: (v) => ({
      title: v.name + ' · 策划书',
      show: '帮我写一份活动策划：' + v.name + (v.when ? '（' + v.when + '）' : ''),
      prompt:
        '请为「' +
        v.name +
        '」写一份班级活动策划书。时间地点：' +
        (v.when || '待定') +
        '；参与：' +
        v.people +
        '；预算：' +
        (v.budget || '尽量节省') +
        '。\n包括：活动目的、活动内容与流程（时间表）、人员分工（可以安排班干部）、物资与预算清单、安全预案、宣传与总结方式。',
      ctx: [classContext()]
    })
  },
  {
    id: 'summary',
    cat: 'manage',
    color: '#14b0a6',
    ico: '总',
    title: '工作总结 / 计划',
    desc: '根据本学期班级数据，写班主任工作总结或下学期计划',
    fields: [
      ['kind', 'select', '类型', ['学期工作总结', '月度工作总结', '下学期工作计划']],
      ['focus', 'textarea', '想重点写的工作', '', '选填：比如这学期重点抓了作业习惯和家校沟通']
    ],
    build: (v) => ({
      title: S.settings.className + ' · ' + v.kind,
      show: '帮我写一份' + v.kind + (v.focus ? '，重点：' + v.focus : ''),
      prompt:
        '请根据下面的班级数据写一份班主任' +
        v.kind +
        '，1500 字左右。结构：班级基本情况、主要工作与成效（班风学风、学业、德育与活动、家校沟通、安全）、存在的问题、下一步措施。数据要引用得具体，但不要罗列学生全名排名。' +
        (v.focus ? '\n老师希望重点写：' + v.focus : ''),
      ctx: [classContext()].concat(latestExam() ? [examContext(latestExam() as Exam, prevExam(latestExam()))] : [])
    })
  },
  {
    id: 'notice',
    cat: 'home',
    rec: 1,
    color: '#f2a71b',
    ico: '通',
    title: '家长群通知',
    desc: '放假、活动、缴费等通知，清楚礼貌，要点不遗漏',
    fields: [
      ['matter', 'textarea', '通知事项', '', '如：周五下午秋游，需要带午餐和水，回执周四前交', 1],
      ['when', 'text', '时间', ''],
      ['need', 'textarea', '需要家长配合的事', '', '选填']
    ],
    build: (v) => ({
      title: '家长群通知',
      show: '帮我写一条家长群通知：' + v.matter,
      prompt:
        '请写一条发在家长微信群里的班级通知。事项：' +
        v.matter +
        '；时间：' +
        (v.when || '见事项') +
        '；需要家长配合：' +
        (v.need || '无') +
        '。\n要求：开头称呼「各位家长」，分点写清时间、地点、要求，语气礼貌简洁，300 字以内，结尾请家长收到回复。再额外给一个 100 字以内的精简版。'
    })
  },
  {
    id: 'parent',
    cat: 'home',
    rec: 1,
    color: '#f2a71b',
    ico: '谈',
    title: '家长沟通话术',
    desc: '针对某位同学的情况，写给家长的微信消息或通话提纲',
    fields: [
      ['student', 'student', '学生', '', '', 1],
      ['reason', 'select', '沟通事由', ['成绩波动', '作业问题', '课堂表现', '行为习惯', '表扬进步', '情绪与身体', '其他']],
      ['detail', 'textarea', '具体情况', '', '选填：比如最近三次数学作业没交，上课容易走神'],
      ['channel', 'select', '沟通方式', ['微信消息', '电话沟通提纲', '面谈提纲']]
    ],
    build: (v) => {
      const s = stuById(String(v.student)) as Student
      return {
        title: s.name + ' · 家长沟通',
        show: '帮我给' + s.name + '的家长写' + v.channel + '，事由：' + v.reason + (v.detail ? '（' + v.detail + '）' : ''),
        prompt:
          '请帮我准备与这位同学家长的沟通内容，形式：' +
          v.channel +
          '；事由：' +
          v.reason +
          '。' +
          (v.detail ? '具体情况：' + v.detail + '。' : '') +
          '\n要求：先肯定孩子的优点，再具体说明情况和事实，提出 2–3 条家校可以一起做的具体办法，语气尊重、不指责家长。微信消息控制在 250 字以内；提纲要分点并预判家长可能的回应。',
        ctx: [studentContext(s)],
        sid: s.id
      }
    }
  },
  {
    id: 'pmeeting',
    cat: 'home',
    color: '#f2a71b',
    ico: '会',
    title: '家长会发言稿',
    desc: '结合最近一次考试数据，写班主任家长会发言',
    fields: [
      ['exam', 'exam', '结合哪次考试'],
      ['mins', 'select', '发言时长', ['15 分钟', '10 分钟', '20 分钟']],
      ['focus', 'textarea', '想强调的事', '', '选填：比如手机管理、作息、期末复习安排']
    ],
    build: (v) => {
      const ex = examById(String(v.exam))
      return {
        title: '家长会发言稿',
        show: '帮我写家长会发言稿（' + v.mins + '）' + (ex ? '，结合' + ex.name : '') + (v.focus ? '，重点：' + v.focus : ''),
        prompt:
          '请写一份班主任家长会发言稿，时长约' +
          v.mins +
          '（按每分钟 200 字估算）。结构：问候与感谢、班级近况、考试情况分析（整体与各科，只说群体数据，不点名批评）、表扬进步（可以点名表扬）、存在的问题、家校配合建议（具体可执行）、结束语。' +
          (v.focus ? '\n重点强调：' + v.focus : ''),
        ctx: [classContext()].concat(ex ? [examContext(ex, prevExam(ex))] : [])
      }
    }
  },
  {
    id: 'comments',
    cat: 'grow',
    rec: 1,
    color: '#e5483b',
    ico: '评',
    title: '期末评语（批量）',
    desc: '读取每位同学的档案、成绩和点评，逐个生成个性化评语',
    batch: true,
    fields: [
      ['students', 'students', '选择学生'],
      ['style', 'select', '风格', ['温暖鼓励', '客观中肯', '文艺诗意']],
      ['len', 'select', '字数', ['120 字左右', '80 字左右', '180 字左右']],
      ['person', 'select', '人称', ['第二人称「你」', '第三人称「该生」']]
    ]
  },
  {
    id: 'report',
    cat: 'grow',
    rec: 1,
    color: '#e5483b',
    ico: '析',
    title: '成绩分析报告',
    desc: '班级整体、各科表现、进退步分析和下一步教学建议',
    fields: [
      ['exam', 'exam', '分析哪次考试'],
      ['cmp', 'exam0', '对比考试']
    ],
    build: (v) => {
      const ex = examById(String(v.exam)) as Exam
      const cx = v.cmp ? examById(String(v.cmp)) : null
      return {
        title: ex.name + ' · 成绩分析',
        show: '帮我写「' + ex.name + '」的成绩分析报告' + (cx ? '，对比' + cx.name : ''),
        prompt:
          '请根据考试数据写一份班级成绩分析报告。结构：一、总体情况（用表格列出关键指标）；二、各科分析（优势与薄弱）；三、学生层面（进步、退步、学困生，给出关注建议）；四、原因分析（可能的原因，标注需要老师核实）；五、下一步措施（班主任与各科老师分别做什么）。',
        ctx: [examContext(ex, cx)]
      }
    }
  },
  {
    id: 'talk',
    cat: 'grow',
    color: '#e5483b',
    ico: '心',
    title: '谈心谈话提纲',
    desc: '为一次个别谈话做准备：开场、倾听、引导与约定',
    fields: [
      ['student', 'student', '学生', '', '', 1],
      ['topic', 'textarea', '谈话话题', '', '如：最近和同学闹矛盾，情绪低落']
    ],
    build: (v) => {
      const s = stuById(String(v.student)) as Student
      return {
        title: s.name + ' · 谈话提纲',
        show: '帮我准备和' + s.name + '的谈心谈话' + (v.topic ? '：' + v.topic : ''),
        prompt:
          '请帮我准备一次与这位同学的个别谈心谈话。话题：' +
          (v.topic || '近期状态') +
          '。\n给出：谈话目标、合适的时间地点、开场白（2 种）、倾听与提问清单（开放式问题）、可能的情况与应对、最后的小约定和后续跟进方式。语气要像一位信任孩子的老师。',
        ctx: [studentContext(s)],
        sid: s.id
      }
    }
  },
  {
    id: 'birthday',
    cat: 'grow',
    color: '#e5483b',
    ico: '生',
    title: '生日祝福',
    desc: '给过生日的同学写一段专属祝福，可以发在班级群或写在贺卡上',
    fields: [
      ['student', 'student', '学生', '', '', 1],
      ['style', 'select', '风格', ['温暖', '幽默', '诗意']]
    ],
    build: (v) => {
      const s = stuById(String(v.student)) as Student
      return {
        title: s.name + ' · 生日祝福',
        show: '帮我给' + s.name + '写一段生日祝福（' + v.style + '）',
        prompt:
          '今天是这位同学的生日，请以班主任的口吻写 3 段不同的生日祝福（' +
          v.style +
          '风格），每段 60 字以内，结合 TA 的特点，不要提成绩排名。',
        ctx: [studentContext(s)],
        sid: s.id
      }
    }
  },
  {
    id: 'comment1',
    cat: 'hidden',
    color: '#e5483b',
    ico: '评',
    title: '个人评语',
    desc: '',
    fields: [
      ['student', 'student', '学生', '', '', 1],
      ['style', 'select', '风格', ['温暖鼓励', '客观中肯', '文艺诗意']],
      ['len', 'select', '字数', ['120 字左右', '80 字左右', '180 字左右']],
      ['person', 'select', '人称', ['第二人称「你」', '第三人称「该生」']]
    ],
    build: (v) => {
      const s = stuById(String(v.student)) as Student
      return {
        title: s.name + ' · 评语',
        show: '帮我给' + s.name + '写一段期末评语（' + v.style + '，' + v.len + '）',
        prompt: commentPrompt(v),
        ctx: [studentContext(s)],
        sid: s.id,
        saveAs: 'comment'
      }
    }
  },
  {
    id: 'parent-batch',
    cat: 'hidden',
    color: '#f2a71b',
    ico: '谈',
    title: '退步同学家长沟通',
    desc: '',
    batch: true,
    fields: [
      ['exam', 'exam', '考试'],
      ['cmp', 'exam0', '和哪次考试比'],
      ['channel', 'select', '沟通方式', ['微信消息', '电话沟通提纲']]
    ]
  }
]

export function tplById(id: string): Tpl | null {
  for (let i = 0; i < TPLS.length; i++) if (TPLS[i].id === id) return TPLS[i]
  return null
}

export function commentPrompt(v: TplValues): string {
  return (
    '请为这位同学写一段期末评语。风格：' +
    v.style +
    '；字数：' +
    v.len +
    '；人称：' +
    v.person +
    '。\n要求：从档案、成绩、点评和成长记录里找 1–2 个具体细节来写，先肯定优点，再用委婉、可操作的方式提出 1 条期望；不要出现排名和分数，不要套话；只输出评语正文，不要标题和其他说明。'
  )
}

/* ---------- 批量任务 ---------- */

export interface BatchJob {
  sid: string
  prompt: string
}

export function batchJobs(tpl: Tpl, v: TplValues): BatchJob[] {
  if (tpl.id === 'comments') {
    const sids = (v.students as string[]) || []
    return sids.map((sid) => {
      const s = stuById(sid) as Student
      return { sid, prompt: Mask.apply(studentContext(s) + '\n【任务】\n' + commentPrompt(v)) }
    })
  }
  if (tpl.id === 'parent-batch') {
    const ex = examById(String(v.exam))
    const pe = v.cmp ? examById(String(v.cmp)) : ex ? prevExam(ex) : null
    if (!ex || !pe || pe === ex) return []
    const rm = rankMap(ex)
    const pm = rankMap(pe)
    return S.students
      .filter((s) => rm[s.id] && pm[s.id] && pm[s.id].rank - rm[s.id].rank <= -5)
      .map((s) => ({
        sid: s.id,
        prompt: Mask.apply(
          studentContext(s) +
            '\n【任务】\n这位同学在「' +
            ex.name +
            '」中比「' +
            pe.name +
            '」退步了 ' +
            (rm[s.id].rank - pm[s.id].rank) +
            ' 名。请写一条给家长的' +
            v.channel +
            '：先肯定孩子的优点，再客观说明变化（不要直接说排名，用各科表现描述），提出 2 条家校配合的具体办法，语气尊重温和，250 字以内。只输出正文。'
        )
      }))
  }
  return []
}

export function batchCombinedPrompt(tpl: Tpl, v: TplValues): string {
  const jobs = batchJobs(tpl, v)
  if (!jobs.length) return '（没有符合条件的学生）'
  const head = sysPrompt() + '\n\n下面有 ' + jobs.length + ' 位同学的资料，请逐一完成任务，每位同学用「### 【学生编号】」或「### 姓名」作为小标题分隔。\n\n'
  return head + jobs.map((j, i) => '=== 第 ' + (i + 1) + ' 位 ===\n' + j.prompt).join('\n\n')
}

/** 给网页版 AI 用的完整提示词 */
export function fullPrompt(job: TplJob): string {
  return Mask.apply(sysPrompt() + '\n\n' + (job.ctx || []).join('\n') + '\n' + job.prompt)
}

/** 走 API 时真正作为 user 消息发送的内容 */
export function userContent(job: TplJob): string {
  return Mask.apply((job.ctx && job.ctx.length ? job.ctx.join('\n') + '\n【任务】\n' : '') + job.prompt)
}

/** 模板字段的默认值（支持函数） */
export function fieldDefault(f: TplField): unknown {
  const d = f[3] as unknown
  return typeof d === 'function' ? (d as () => unknown)() : d
}

/** 学生下拉用的排序名单 */
export function tplStudentList(): Student[] {
  return studentsByNo()
}

/** 考试下拉（新 → 旧） */
export function tplExamList(): Exam[] {
  return examsSorted().reverse()
}
