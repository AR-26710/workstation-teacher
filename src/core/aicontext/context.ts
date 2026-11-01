/**
 * AI 上下文摘要：系统提示词 + 班级 / 学生 / 考试三类上下文
 *
 * 职责：把领域数据"翻译"成给大模型的文字摘要。
 * 只依赖 core 的查询与统计，不含模板定义，也不含调度逻辑。
 */

import { S } from '../app'
import { age, latestExam, stuById, weekNo } from '../select'
import { examFull, examStats, rankMap, stuTrend, subjectStats } from '../stats'
import { fmtNum, pct, round1 } from '../utils'
import type { Exam, Student } from '../types'

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
