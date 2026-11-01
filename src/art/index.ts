/**
 * ART · 教室场景与角色（纯 SVG 字符串生成器，无第三方依赖）
 * 视觉风格：白色 3D 家具 + 右上方打光的长软阴影 + 黑色扁平角色 + 彩色围巾
 */

const INK = '#171717'

export interface GroupMeta {
  name: string
  color: string
}

const GROUPS: GroupMeta[] = [
  { name: '第一组', color: '#e5483b' },
  { name: '第二组', color: '#2f7ff0' },
  { name: '第三组', color: '#f2b01e' },
  { name: '第四组', color: '#14b0a6' },
  { name: '第五组', color: '#7a5af5' },
  { name: '第六组', color: '#3ea35c' }
]

type Attrs = Record<string, string | number | boolean | undefined>

export interface Layout {
  rows: number
  pairs: number
  DW: number
  DD: number
  DF: number
  LEG: number
  PAIR: number
  AISLE: number
  SIDE: number
  WT: number
  SIDEL: number
  SIDER: number
  FRONT: number
  PLAT: number
  ROW: number
  gridW: number
  W: number
  gx0: number
  gx1: number
  row0: number
  BACK: number
  H: number
  subjects?: string[]
  seatX(c: number): number
  seatY(r: number): number
  headX(c: number): number
  headY(r: number): number
}

/* ---------- 基础绘制原语 ---------- */
function r1(v: number): number {
  return Math.round(v * 10) / 10
}

function at(o: Attrs): string {
  let s = ''
  for (const k in o) {
    const v = o[k]
    if (v === undefined || v === null || v === false) continue
    s += ' ' + k + '="' + v + '"'
  }
  return s
}

function T(name: string, o: Attrs, inner?: string): string {
  return '<' + name + at(o) + (inner === undefined ? '/>' : '>' + inner + '</' + name + '>')
}

function rect(x: number, y: number, w: number, h: number, rx: number, fill: string | null, extra?: Attrs): string {
  const o: Attrs = { x: r1(x), y: r1(y), width: r1(w), height: r1(h) }
  if (rx) o.rx = rx
  if (fill) o.fill = fill
  if (extra) for (const k in extra) o[k] = extra[k]
  return T('rect', o)
}

function circ(cx: number, cy: number, r: number, fill: string | null, extra?: Attrs): string {
  const o: Attrs = { cx: r1(cx), cy: r1(cy), r }
  if (fill) o.fill = fill
  if (extra) for (const k in extra) o[k] = extra[k]
  return T('circle', o)
}

function ell(cx: number, cy: number, rx: number, ry: number, fill: string | null, extra?: Attrs): string {
  const o: Attrs = { cx: r1(cx), cy: r1(cy), rx, ry }
  if (fill) o.fill = fill
  if (extra) for (const k in extra) o[k] = extra[k]
  return T('ellipse', o)
}

function path(d: string, fill: string | null, extra?: Attrs): string {
  const o: Attrs = { d }
  if (fill) o.fill = fill
  if (extra) for (const k in extra) o[k] = extra[k]
  return T('path', o)
}

function poly(pts: [number, number][], fill: string | null, extra?: Attrs): string {
  const o: Attrs = { points: pts.map((p) => r1(p[0]) + ',' + r1(p[1])).join(' ') }
  if (fill) o.fill = fill
  if (extra) for (const k in extra) o[k] = extra[k]
  return T('polygon', o)
}

function txt(x: number, y: number, s: string, extra?: Attrs): string {
  const o: Attrs = { x: r1(x), y: r1(y) }
  if (extra) for (const k in extra) o[k] = extra[k]
  return T('text', o, s)
}

function escx(s: string | null | undefined): string {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function hash(str: string): number {
  let h = 2166136261
  const s = String(str)
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

export function rng(seedIn: number): () => number {
  let seed = seedIn
  return function () {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function groupColor(i: number): string {
  return GROUPS[((i % GROUPS.length) + GROUPS.length) % GROUPS.length].color
}

/* ---------- 布局 ---------- */
/** extra：根据屏幕宽高比加宽教室两侧（放图书角、生物角等），避免左右大片留白 */
export function layout(rows: number, pairs: number, extra: number): Layout {
  const L = { rows, pairs } as Layout
  extra = Math.max(0, Math.round(extra || 0))
  L.DW = 92
  L.DD = 44
  L.DF = 10
  L.LEG = 18
  L.PAIR = L.DW * 2
  L.AISLE = 58
  L.SIDE = 96
  L.WT = 16
  const ae = pairs > 1 ? Math.min(56, Math.floor(extra * 0.07)) : 0
  L.AISLE += ae
  extra -= ae * (pairs - 1)
  const half = Math.min(320, Math.floor(extra / 2)) // 两侧各最多加宽 320
  L.SIDEL = L.SIDE + half
  L.SIDER = L.SIDE + half
  L.FRONT = 214 // 前墙立面高度
  L.PLAT = 92 // 讲台地台进深
  L.ROW = 112 // 行距
  L.gridW = pairs * L.PAIR + (pairs - 1) * L.AISLE
  L.W = L.gridW + L.SIDEL + L.SIDER + 2 * L.WT
  L.gx0 = L.WT + L.SIDEL
  L.gx1 = L.gx0 + L.gridW
  L.row0 = L.FRONT + L.PLAT + 36
  L.BACK = 96
  L.H = L.row0 + rows * L.ROW + L.BACK + L.WT
  L.seatX = function (c: number): number {
    const p = Math.floor(c / 2)
    const s = c % 2
    return L.gx0 + p * (L.PAIR + L.AISLE) + s * L.DW
  }
  L.seatY = function (r: number): number {
    return L.row0 + r * L.ROW
  }
  L.headX = function (c: number): number {
    return L.seatX(c) + L.DW / 2
  }
  L.headY = function (r: number): number {
    return L.seatY(r) + L.DD + 2
  }
  return L
}

/* ---------- 公共 defs ---------- */
function defs(): string {
  return (
    '<defs>' +
    '<filter id="fxShadow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="9"/></filter>' +
    '<filter id="fxShadowS" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="2.2"/></filter>' +
    '<filter id="fxLight" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="7"/></filter>' +
    '<linearGradient id="gFloor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#efefed"/><stop offset="1" stop-color="#f3f3f1"/></linearGradient>' +
    '<linearGradient id="gWall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f9f9f8"/><stop offset=".8" stop-color="#f1f1ef"/><stop offset="1" stop-color="#e9e9e7"/></linearGradient>' +
    '<linearGradient id="gDeskTop" x1="0" y1="0" x2=".3" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#f5f5f4"/></linearGradient>' +
    '<linearGradient id="gDeskFace" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e9e9e8"/><stop offset="1" stop-color="#dededc"/></linearGradient>' +
    '<linearGradient id="gChair" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#eeeeed"/></linearGradient>' +
    '<linearGradient id="gChalk" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2d3833"/><stop offset="1" stop-color="#222b27"/></linearGradient>' +
    '<linearGradient id="gScreen" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4b9bff"/><stop offset="1" stop-color="#2a6fe0"/></linearGradient>' +
    '<linearGradient id="gPlat" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f7f7f6"/><stop offset="1" stop-color="#fbfbfa"/></linearGradient>' +
    '<linearGradient id="gLectFace" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f4f4f3"/><stop offset="1" stop-color="#e7e7e5"/></linearGradient>' +
    '<linearGradient id="gWallAO" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity=".07"/><stop offset="1" stop-color="#000" stop-opacity="0"/></linearGradient>' +
    '<linearGradient id="gWallAOx" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#000" stop-opacity=".05"/><stop offset="1" stop-color="#000" stop-opacity="0"/></linearGradient>' +
    '<linearGradient id="gWallAOxr" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stop-color="#000" stop-opacity=".05"/><stop offset="1" stop-color="#000" stop-opacity="0"/></linearGradient>' +
    '<linearGradient id="gGlass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#d9e9fb"/><stop offset="1" stop-color="#eef5fd"/></linearGradient>' +
    '<pattern id="pTiles" width="88" height="88" patternUnits="userSpaceOnUse"><path d="M88 0H0V88" fill="none" stroke="#000" stroke-opacity=".03"/></pattern>' +
    '</defs>'
  )
}

/* ---------- 角色：学生（背面坐姿，原点=头部中心） ---------- */
export interface FigureStudent {
  id?: string
  name?: string
  gender?: string
}

function studentFigure(st: FigureStudent, color: string): string {
  const g = st.gender === 'F'
  const v = hash(st.id || st.name || '') % 3
  let s = ''
  // 举手的手臂（默认隐藏）
  s +=
    '<g class="arm">' +
    path('M14 16 C 20 4 23 -10 22 -30', 'none', { stroke: INK, 'stroke-width': 8, 'stroke-linecap': 'round' }) +
    circ(22, -33, 5.6, INK) +
    '</g>'
  // 身体
  s += path('M-22 44 C-23 24 -14 12 0 12 C14 12 23 24 22 44 Z', INK, { class: 'body' })
  // 围巾
  s +=
    '<g class="scarf">' +
    path('M-13 10.5 Q0 17 13 10.5 L14 16.5 Q0 23.5 -14 16.5 Z', color) +
    path('M7 18 L13 30 L7.5 31.5 L4 19.5 Z', color) +
    '</g>'
  // 头部
  let head = ''
  if (g) {
    if (v === 0) {
      // 双马尾
      head += ell(-17, 9, 6.2, 10, INK, { transform: 'rotate(28 -17 9)' }) + ell(17, 9, 6.2, 10, INK, { transform: 'rotate(-28 17 9)' })
      head += circ(-14.5, 1.5, 2.6, color) + circ(14.5, 1.5, 2.6, color)
    } else if (v === 1) {
      // 波波头
      head += path('M-19 -2 C-21 10 -19 18 -13 20 L13 20 C19 18 21 10 19 -2 Z', INK)
      head += rect(8, -13, 7, 3.2, 1.6, color, { transform: 'rotate(-30 11 -11)' })
    } else {
      // 丸子头
      head += circ(0, -18, 8.5, INK)
      head += rect(-6, -12.5, 12, 3.2, 1.6, color)
    }
  } else {
    head += circ(-16.5, 2, 4.4, INK) + circ(16.5, 2, 4.4, INK) // 耳朵
  }
  head += circ(0, 0, 17, INK)
  if (g) {
    if (v === 0) head += path('M-2 -21 C 2 -26 9 -25 10 -19 C 6 -21 3 -20 -2 -21 Z', INK)
    if (v === 1) head += path('M-17 -4 C -15 -18 15 -18 17 -4 C 9 -12 -9 -12 -17 -4 Z', INK)
  } else {
    if (v === 0) head += path('M-7 -14 L-5 -23 L-1 -16 L3 -25 L5 -15 L10 -21 L9 -12 Z', INK)
    else if (v === 1) head += path('M-12 -12 C -10 -24 6 -27 14 -18 C 8 -19 2 -18 -2 -14 Z', INK)
    else head += path('M-3 -16 C -2 -24 5 -26 8 -22 C 4 -21 2 -19 2 -15 Z', INK)
  }
  // 正脸（回头时显示）
  head +=
    '<g class="face">' +
    ell(-6.6, -0.5, 4.3, 5.1, '#fff') +
    ell(6.6, -0.5, 4.3, 5.1, '#fff') +
    circ(-5.6, 0.4, 2.3, INK) +
    circ(7.6, 0.4, 2.3, INK) +
    ell(-11, 7, 3, 1.7, '#ff8f86', { opacity: '.55' }) +
    ell(11, 7, 3, 1.7, '#ff8f86', { opacity: '.55' }) +
    '</g>'
  s += '<g class="head">' + head + '</g>'
  s +=
    '<g class="zz">' +
    txt(16, -18, 'z', { 'font-size': 11, 'font-weight': 700, fill: '#9a9a9a' }) +
    txt(24, -28, 'z', { 'font-size': 8, 'font-weight': 700, fill: '#b5b5b5' }) +
    '</g>'
  return s
}

/* ---------- 角色：头像（正面，用于卡片） ---------- */
export function avatar(st: FigureStudent & { group?: number }, size: number, opts: { color?: string; bg?: string | false } = {}): string {
  const color = opts.color || groupColor(st.group || 0)
  const g = st.gender === 'F'
  const v = hash(st.id || st.name || '') % 3
  let s = ''
  s += path('M-26 58 C-27 32 -16 18 0 18 C16 18 27 32 26 58 Z', INK)
  s += path('M-14 16 Q0 24 14 16 L15 23 Q0 31 -15 23 Z', color)
  s += path('M-5 25 L-10 39 L-3 40 L1 27 Z', color)
  let head = ''
  if (g) {
    if (v === 0) {
      head +=
        ell(-17, 9, 6.2, 10, INK, { transform: 'rotate(28 -17 9)' }) +
        ell(17, 9, 6.2, 10, INK, { transform: 'rotate(-28 17 9)' }) +
        circ(-14.5, 1.5, 2.6, color) +
        circ(14.5, 1.5, 2.6, color)
    } else if (v === 1) {
      head += path('M-19 -2 C-21 10 -19 18 -13 20 L13 20 C19 18 21 10 19 -2 Z', INK)
    } else {
      head += circ(0, -18, 8.5, INK) + rect(-6, -12.5, 12, 3.2, 1.6, color)
    }
  } else {
    head += circ(-16.5, 2, 4.4, INK) + circ(16.5, 2, 4.4, INK)
  }
  head += circ(0, 0, 17, INK)
  if (g) {
    if (v === 1) head += rect(8, -13, 7, 3.2, 1.6, color, { transform: 'rotate(-30 11 -11)' })
  } else {
    if (v === 0) head += path('M-7 -14 L-5 -23 L-1 -16 L3 -25 L5 -15 L10 -21 L9 -12 Z', INK)
    else if (v === 1) head += path('M-12 -12 C -10 -24 6 -27 14 -18 C 8 -19 2 -18 -2 -14 Z', INK)
    else head += path('M-3 -16 C -2 -24 5 -26 8 -22 C 4 -21 2 -19 2 -15 Z', INK)
  }
  head += ell(-6.6, -0.5, 4.3, 5.1, '#fff') + ell(6.6, -0.5, 4.3, 5.1, '#fff') + circ(-5.6, 0.4, 2.3, INK) + circ(7.6, 0.4, 2.3, INK)
  head += ell(-11, 7, 3, 1.7, '#ff8f86', { opacity: '.55' }) + ell(11, 7, 3, 1.7, '#ff8f86', { opacity: '.55' })
  s += head
  const bg = opts.bg === false ? '' : circ(0, 8, 46, opts.bg || '#f3f3f2')
  return '<svg class="ava" viewBox="-46 -38 92 92" width="' + size + '" height="' + size + '" aria-hidden="true">' + bg + '<g transform="translate(0,6)">' + s + '</g></svg>'
}

/* ---------- 角色：老师（正面站立，原点=头部中心） ---------- */
function teacherFigure(t: { gender?: string }): string {
  const f = t.gender === 'F'
  let s = ''
  // 指示棒手臂（默认隐藏，点名/讲课时抬起）
  s +=
    '<g class="t-arm">' +
    path('M30 44 C 44 30 52 14 58 -4', 'none', { stroke: INK, 'stroke-width': 11, 'stroke-linecap': 'round' }) +
    circ(59, -7, 6.5, INK) +
    path('M60 -8 L 92 -56', 'none', { stroke: '#c9a46c', 'stroke-width': 3, 'stroke-linecap': 'round' }) +
    '</g>'
  s += path('M-44 92 C-46 52 -30 26 0 26 C30 26 46 52 44 92 Z', INK)
  if (f) {
    s += path('M-14 24 Q0 33 14 24 L16 32 Q0 42 -16 32 Z', '#ef5b4c')
    s += path('M5 33 L13 50 L5 52 L1 35 Z', '#ef5b4c')
    s += rect(-26, 58, 13, 17, 2, '#fff') + rect(-26, 58, 13, 4, 2, '#2f7ff0')
  } else {
    s += path('M-10 26 L0 42 L10 26 Z', '#fff')
    s += path('M-3.6 33 L3.6 33 L5.4 62 L0 69 L-5.4 62 Z', '#2f7ff0')
    s += rect(-28, 58, 13, 17, 2, '#fff') + rect(-28, 58, 13, 4, 2, '#2f7ff0')
  }
  let head = ''
  if (f) {
    // 丸子头：头顶发髻 + 发圈
    head += circ(3, -29, 12, INK)
    head += path('M-4 -33 C 0 -40 10 -38 11 -30', 'none', { stroke: '#3b3b3a', 'stroke-width': 1.6, 'stroke-linecap': 'round' })
  } else {
    head += circ(-22.5, 3, 5.5, INK) + circ(22.5, 3, 5.5, INK)
  }
  head += circ(0, 0, 23, INK)
  if (f) {
    head += path('M-20 -10 C -14 -22 6 -26 18 -14', 'none', { stroke: '#3b3b3a', 'stroke-width': 1.4, 'stroke-linecap': 'round' })
    head += rect(-5, -24.5, 16, 4.4, 2.2, '#ef5b4c', { transform: 'rotate(-5 3 -22)' })
    head += circ(-15.5, -14.5, 2.4, '#ffffff', { opacity: '.9' }) + circ(-12, -17.5, 2.4, '#ffffff', { opacity: '.9' })
  } else head += path('M-18 -12 C -16 -30 12 -36 24 -16 C 22 -22 12 -22 6 -20 C 2 -27 -10 -24 -18 -12 Z', INK)
  head += ell(-8.5, 1, 4.6, 5.4, '#fff') + ell(8.5, 1, 4.6, 5.4, '#fff')
  head += '<g class="t-pupil">' + circ(-8, 2.4, 2.5, INK) + circ(9, 2.4, 2.5, INK) + '</g>'
  if (f) {
    head += path('M-13 -4.5 L-15.5 -7', 'none', { stroke: INK, 'stroke-width': 1.6, 'stroke-linecap': 'round' })
    head += path('M13 -4.5 L15.5 -7', 'none', { stroke: INK, 'stroke-width': 1.6, 'stroke-linecap': 'round' })
    head += ell(-14, 10, 3.4, 2, '#ff8f86', { opacity: '.5' }) + ell(14, 10, 3.4, 2, '#ff8f86', { opacity: '.5' })
  } else {
    head += rect(-16, -6, 15, 13, 4, 'none', { stroke: '#fff', 'stroke-width': 1.7 })
    head += rect(1, -6, 15, 13, 4, 'none', { stroke: '#fff', 'stroke-width': 1.7 })
    head += path('M-1 -1 L1 -1', 'none', { stroke: '#fff', 'stroke-width': 1.7 })
  }
  s += '<g class="t-head">' + head + '</g>'
  return s
}

export function teacherAvatar(t: { gender?: string }, size: number, bg?: string | false): string {
  return (
    '<svg class="ava" viewBox="-60 -50 120 120" width="' +
    size +
    '" height="' +
    size +
    '" aria-hidden="true">' +
    (bg === false ? '' : circ(0, 10, 60, bg || '#f3f3f2')) +
    '<g transform="translate(0,4)">' +
    teacherFigure(t) +
    '</g></svg>'
  )
}

/* ---------- 课桌 ---------- */
const BOOK = ['#efe4d1', '#dbe7f6', '#f2dada', '#dfeee1', '#ebe9e4', '#f6ecc9']
const SPINE = ['#cdb894', '#9fbde3', '#dfa9a9', '#a8cdb0', '#c9c6be', '#e2c66e']

function deskProps(x: number, y: number, W: number, seed: number): string {
  const R = rng(seed)
  let s = ''
  const leftKind = Math.floor(R() * 4)
  const rightKind = Math.floor(R() * 4)

  function books(bx: number, by: number): string {
    const n = 2 + Math.floor(R() * 2)
    let out = ''
    for (let i = 0; i < n; i++) {
      const c = Math.floor(R() * BOOK.length)
      const ang = r1((R() - 0.5) * 14)
      const ox = bx + i * 1.6
      const oy = by - i * 2.2
      out +=
        '<g transform="rotate(' +
        ang +
        ' ' +
        r1(ox + 10) +
        ' ' +
        r1(oy + 13) +
        ')">' +
        rect(ox, oy, 21, 26, 1.5, BOOK[c], { stroke: SPINE[c], 'stroke-width': 0.8 }) +
        rect(ox, oy, 3, 26, 1, SPINE[c]) +
        '</g>'
    }
    return out
  }
  function openBook(bx: number, by: number): string {
    return (
      '<g transform="rotate(' +
      r1((R() - 0.5) * 10) +
      ' ' +
      r1(bx + 13) +
      ' ' +
      r1(by + 10) +
      ')">' +
      rect(bx, by, 26, 19, 1.5, '#fff', { stroke: '#dcdcda', 'stroke-width': 0.8 }) +
      path('M' + r1(bx + 13) + ' ' + r1(by + 1) + 'V' + r1(by + 18), 'none', { stroke: '#d6d6d3', 'stroke-width': 0.8 }) +
      path(
        'M' +
          r1(bx + 3) +
          ' ' +
          r1(by + 6) +
          'h7M' +
          r1(bx + 3) +
          ' ' +
          r1(by + 10) +
          'h7M' +
          r1(bx + 3) +
          ' ' +
          r1(by + 14) +
          'h5M' +
          r1(bx + 16) +
          ' ' +
          r1(by + 6) +
          'h7M' +
          r1(bx + 16) +
          ' ' +
          r1(by + 10) +
          'h6',
        'none',
        { stroke: '#cfcfcc', 'stroke-width': 0.9 }
      ) +
      '</g>'
    )
  }
  function bottle(bx: number, by: number): string {
    const caps = ['#2f7ff0', '#e5483b', '#14b0a6', '#f2b01e', '#171717']
    return circ(bx, by, 6.2, '#eaf3fc', { stroke: '#bcd5ee', 'stroke-width': 0.9 }) + circ(bx, by, 3.2, caps[Math.floor(R() * caps.length)])
  }
  function pencil(bx: number, by: number): string {
    const cs = ['#171717', '#e5483b', '#2f7ff0', '#7a5af5', '#f2b01e']
    return (
      '<g transform="rotate(' +
      r1((R() - 0.5) * 12) +
      ' ' +
      r1(bx + 11) +
      ' ' +
      r1(by + 4) +
      ')">' +
      rect(bx, by, 22, 7, 3.5, cs[Math.floor(R() * cs.length)]) +
      rect(bx + 3, by + 3, 10, 1.6, 0.8, '#fff', { opacity: '.6' }) +
      '</g>'
    )
  }
  const Lkinds = [books, openBook, pencil, books]
  const Rkinds = [bottle, books, openBook, pencil]
  const lk = Lkinds[leftKind]
  if (lk === pencil) s += pencil(x + 5, y + 30)
  else if (lk === openBook) s += openBook(x + 3, y + 19)
  else s += lk(x + 5, y + 15)
  const rk = Rkinds[rightKind]
  if (rk === bottle) s += bottle(x + W - 13, y + 30)
  else if (rk === pencil) s += pencil(x + W - 27, y + 30)
  else if (rk === openBook) s += openBook(x + W - 29, y + 19)
  else s += rk(x + W - 29, y + 15)
  return s
}

function desk(L: Layout, x: number, y: number): string {
  const W = L.DW
  const D = L.DD
  const F = L.DF
  const G = L.LEG
  let s = ''
  s += rect(x + 4, y + D + F - 2, W - 8, G - 2, 2, '#000', { 'fill-opacity': '.045' })
  s += rect(x + 6, y + D + F - 3, 4, G, 1, '#d2d3d5') + rect(x + W - 10, y + D + F - 3, 4, G, 1, '#d2d3d5')
  s += rect(x + 0.5, y + D - 2, W - 1, F + 2, 2, 'url(#gDeskFace)')
  s += rect(x + 4, y + D + 1, W - 8, F - 4, 1, '#d4d4d2')
  s += rect(x, y, W, D, 3, 'url(#gDeskTop)', { stroke: '#e3e3e1', 'stroke-width': 0.8 })
  return s
}

function chairSeat(cx: number, cy: number): string {
  return rect(cx - 25, cy + 20, 50, 15, 5, '#f0f0ef', { stroke: '#e0e0de', 'stroke-width': 0.8 })
}

function chairBack(cx: number, cy: number): string {
  return (
    rect(cx - 20, cy + 50, 3.4, 14, 1, '#cfd0d2') +
    rect(cx + 16.6, cy + 50, 3.4, 14, 1, '#cfd0d2') +
    rect(cx - 24, cy + 32, 48, 20, 6, 'url(#gChair)', { stroke: '#dfdfdd', 'stroke-width': 0.8 }) +
    rect(cx - 18, cy + 35, 36, 2.4, 1.2, '#fff')
  )
}

/* ---------- 阴影 ---------- */
function deskShadow(L: Layout, x: number, y: number): string {
  const W = L.DW
  const D = L.DD
  return poly(
    [
      [x + W - 2, y + 4],
      [x + W - 2, y + D],
      [x + 2, y + D],
      [x - 40, y + D + 50],
      [x + W - 46, y + D + 50],
      [x + W - 30, y + 30]
    ],
    '#000',
    { 'fill-opacity': '.15' }
  )
}

function seatShadow(cx: number, cy: number): string {
  return (
    poly(
      [
        [cx + 24, cy + 34],
        [cx - 24, cy + 34],
        [cx - 58, cy + 76],
        [cx - 12, cy + 76]
      ],
      '#000',
      { 'fill-opacity': '.12' }
    ) + ell(cx - 8, cy + 22, 24, 10, '#000', { 'fill-opacity': '.07' })
  )
}

/* ---------- 前墙：黑板 + 智慧屏 + 时钟 ---------- */
export interface BoardData {
  leftTitle?: string
  leftLines?: string[]
  rightTitle?: string
  rightLines?: string[]
  screenTop?: string
  countLabel?: string
  days?: number | null
  screenBottom?: string
  stars?: { name: string; pts: string }[]
  bdays?: { name: string; date: string }[]
}

function frontWall(L: Layout, b: BoardData): string {
  let s = ''
  const W = L.W
  s += rect(0, 0, W, L.FRONT, 0, 'url(#gWall)')
  s += rect(0, 0, W, 10, 0, '#ffffff')
  s += rect(0, 10, W, 1, 0, '#e4e4e2')
  s += rect(0, L.FRONT - 8, W, 8, 0, '#e6e6e4')
  s += rect(0, L.FRONT - 8, W, 1, 0, '#dcdcda')
  const BW = Math.min(800, L.gridW + 40)
  const BH = 106
  const bx = (W - BW) / 2
  const by = 28
  const SW = 292
  const pw = (BW - SW - 16) / 2
  // 黑板阴影
  s += rect(bx - 4, by + 4, BW + 8, BH + 10, 6, '#000', { 'fill-opacity': '.10', filter: 'url(#fxShadowS)' })
  s += rect(bx - 6, by - 6, BW + 12, BH + 12, 5, '#dcdddf')
  s += rect(bx - 6, by - 6, BW + 12, 2, 1, '#eeeeef')
  // 左板
  s += rect(bx, by, pw, BH, 2, 'url(#gChalk)')
  // 右板
  s += rect(bx + BW - pw, by, pw, BH, 2, 'url(#gChalk)')
  // 智慧屏
  const sx = bx + pw + 8
  s += rect(sx, by - 2, SW, BH + 4, 4, '#141414')
  s += rect(sx + 5, by + 3, SW - 10, BH - 6, 2, 'url(#gScreen)')
  s += rect(sx + 5, by + 3, SW - 10, (BH - 6) * 0.45, 2, '#fff', { opacity: '.06' })
  // 黑板内容
  const chalk = 'font-family="Kaiti SC, STKaiti, KaiTi, 楷体, serif" fill="#f1f1ec"'
  s += '<g class="board-left" ' + chalk + '>'
  s += txt(bx + 16, by + 24, escx(b.leftTitle || '今日课程'), { 'font-size': 14, opacity: '.95' })
  ;(b.leftLines || []).slice(0, 4).forEach((ln, i) => {
    s += txt(bx + 16, by + 47 + i * 17, escx(ln), { 'font-size': 12.5, opacity: '.78' })
  })
  s += '</g>'
  const rx0 = bx + BW - pw + 16
  s += '<g class="board-right" ' + chalk + '>'
  s += txt(rx0, by + 24, escx(b.rightTitle || '值日'), { 'font-size': 14, opacity: '.95' })
  ;(b.rightLines || []).slice(0, 4).forEach((ln, i) => {
    s += txt(rx0, by + 47 + i * 17, escx(ln), { 'font-size': 12.5, opacity: '.78' })
  })
  s += '</g>'
  // 智慧屏内容
  const cxs = sx + SW / 2
  s += '<g class="screen" font-family="inherit" fill="#fff" text-anchor="middle">'
  s += txt(cxs, by + 26, escx(b.screenTop || ''), { 'font-size': 12, opacity: '.85' })
  if (b.days !== undefined && b.days !== null) {
    s += txt(cxs - 26, by + 74, escx('距' + (b.countLabel || '期末')), { 'font-size': 13, opacity: '.92', 'text-anchor': 'end' })
    s += txt(cxs, by + 79, escx(String(b.days)), { 'font-size': 40, 'font-weight': 700, 'letter-spacing': '-1' })
    s += txt(cxs + 30, by + 74, '天', { 'font-size': 13, opacity: '.92', 'text-anchor': 'start' })
  }
  s += txt(cxs, by + 97, escx(b.screenBottom || ''), { 'font-size': 10.5, opacity: '.7' })
  s += '</g>'
  // 粉笔槽
  s += rect(bx - 4, by + BH + 6, BW + 8, 6, 2, '#d3d4d6')
  s += rect(bx + 40, by + BH + 6.8, 16, 3.4, 1.7, '#fbfbfb') + rect(bx + 62, by + BH + 6.8, 12, 3.4, 1.7, '#f6c9cf') + rect(bx + 80, by + BH + 6.8, 13, 3.4, 1.7, '#f4e3a1')
  s += rect(bx + BW - 80, by + BH + 4.5, 30, 6.5, 1.5, '#6b6f73') + rect(bx + BW - 80, by + BH + 4.5, 30, 2.4, 1, '#9a9ea2')
  // 两侧墙面
  const segL = bx - 6
  const segR = W - (bx + BW + 6)
  function paper(px: number, py: number): string {
    return (
      '<g transform="rotate(-3 ' +
      r1(px + 22) +
      ' ' +
      r1(py + 28) +
      ')">' +
      rect(px + 2, py + 3, 44, 58, 1, '#000', { 'fill-opacity': '.08', filter: 'url(#fxShadowS)' }) +
      rect(px, py, 44, 58, 1, '#fff') +
      rect(px + 8, py + 9, 28, 3, 1, '#e5483b', { opacity: '.85' }) +
      rect(px + 7, py + 19, 30, 1.6, 0.8, '#d5d5d3') +
      rect(px + 7, py + 25, 26, 1.6, 0.8, '#d5d5d3') +
      rect(px + 7, py + 31, 30, 1.6, 0.8, '#d5d5d3') +
      rect(px + 7, py + 37, 22, 1.6, 0.8, '#d5d5d3') +
      rect(px + 7, py + 43, 28, 1.6, 0.8, '#d5d5d3') +
      circ(px + 22, py + 2, 2.2, '#2f7ff0') +
      '</g>'
    )
  }
  function clock(clx: number, cly: number): string {
    let c = circ(clx + 2, cly + 4, 23, '#000', { 'fill-opacity': '.08', filter: 'url(#fxShadowS)' })
    c += circ(clx, cly, 23, '#fff', { stroke: '#dadad8', 'stroke-width': 2.5 })
    for (let i = 0; i < 12; i++) {
      const a = (i * Math.PI) / 6
      c += T('line', {
        x1: r1(clx + Math.sin(a) * 17),
        y1: r1(cly - Math.cos(a) * 17),
        x2: r1(clx + Math.sin(a) * (i % 3 === 0 ? 13.5 : 15)),
        y2: r1(cly - Math.cos(a) * (i % 3 === 0 ? 13.5 : 15)),
        stroke: '#9a9a98',
        'stroke-width': i % 3 === 0 ? 1.6 : 1
      })
    }
    c +=
      '<g class="clock" data-cx="' +
      r1(clx) +
      '" data-cy="' +
      r1(cly) +
      '">' +
      T('line', {
        class: 'clock-h',
        x1: r1(clx),
        y1: r1(cly),
        x2: r1(clx),
        y2: r1(cly - 9),
        stroke: INK,
        'stroke-width': 2.4,
        'stroke-linecap': 'round'
      }) +
      T('line', {
        class: 'clock-m',
        x1: r1(clx),
        y1: r1(cly),
        x2: r1(clx),
        y2: r1(cly - 14),
        stroke: INK,
        'stroke-width': 1.6,
        'stroke-linecap': 'round'
      }) +
      circ(clx, cly, 2, '#e5483b') +
      '</g>'
    return c
  }
  // 展板：白底卡片 + 标题 + 最多 3 行名字
  function board(x: number, y: number, w: number, title: string, color: string, rows: [string, string?][], act: string | null): string {
    const h = 112
    let g = '<g class="wall-board"' + (act ? ' data-sact="' + act + '"' : '') + '>'
    g += rect(x + 3, y + 5, w, h, 6, '#000', { 'fill-opacity': '.09', filter: 'url(#fxShadowS)' })
    g += rect(x, y, w, h, 6, '#ffffff', { stroke: '#e3e3e1', 'stroke-width': 0.8 })
    g += rect(x, y, w, 4, 2, color)
    g += txt(x + 14, y + 26, escx(title), { 'font-size': 13, 'font-weight': 700, fill: '#2a2a29' })
    if (!rows.length) g += txt(x + 14, y + 56, '暂时还没有', { 'font-size': 11.5, fill: '#a8a8a5' })
    rows.slice(0, 3).forEach((r, i) => {
      const yy = y + 40 + i * 23
      g += rect(x + 10, yy, w - 20, 19, 9.5, '#f5f5f4')
      g += circ(x + 21, yy + 9.5, 5, i === 0 ? color : '#d9d9d6')
      g += txt(x + 32, yy + 13.5, escx(r[0]), { 'font-size': 11.5, 'font-weight': 600, fill: '#2a2a29' })
      if (r[1]) g += txt(x + w - 16, yy + 13.5, escx(r[1]), { 'font-size': 10.5, fill: '#8b8a85', 'text-anchor': 'end' })
    })
    return g + '</g>'
  }
  if (segL >= 260) {
    const bwL = Math.min(210, segL - 110)
    s += board(
      segL - 90 - bwL,
      26,
      bwL,
      '本周之星',
      '#f2b01e',
      (b.stars || []).map((x) => [x.name, x.pts] as [string, string]),
      'pt-board'
    )
    s += paper(segL - 72, 40)
  } else if (segL > 70) s += paper(segL / 2 - 22, 46)
  if (segR >= 260) {
    const bwR = Math.min(210, segR - 110)
    s += clock(bx + BW + 6 + 52, 72)
    s += board(
      bx + BW + 6 + 96,
      26,
      bwR,
      '本月寿星',
      '#e5483b',
      (b.bdays || []).map((x) => [x.name, x.date] as [string, string]),
      null
    )
  } else if (segR > 60) s += clock(bx + BW + 6 + segR / 2, 70)
  return s
}

/* ---------- 讲台 ---------- */
function podium(L: Layout, t: { gender?: string; label?: string }): string {
  let s = ''
  const W = L.W
  const pw = Math.min(L.gridW + 60, 900)
  const px = (W - pw) / 2
  const py = L.FRONT
  const ph = L.PLAT - 8
  // 地台
  s += rect(px, py, pw, ph, 0, 'url(#gPlat)')
  s += rect(px, py, pw, 1, 0, '#e8e8e6')
  s += rect(px, py + ph, pw, 8, 0, '#e4e4e2')
  s += rect(px, py + ph, pw, 1, 0, '#d9d9d7')
  s += poly(
    [
      [px + pw, py + ph + 8],
      [px, py + ph + 8],
      [px - 18, py + ph + 34],
      [px + pw - 18, py + ph + 34]
    ],
    '#000',
    { 'fill-opacity': '.07', filter: 'url(#fxShadow)' }
  )
  // 作业筐
  const hx = px + 60
  const hy = py + 22
  s += rect(hx - 8, hy + 10, 70, 46, 6, '#000', { 'fill-opacity': '.07', filter: 'url(#fxShadowS)' })
  s += rect(hx, hy, 70, 46, 5, '#ffffff', { stroke: '#dcdcda', 'stroke-width': 0.9 })
  s += rect(hx + 5, hy + 5, 60, 36, 3, '#f1f1ef')
  s += rect(hx + 9, hy + 9, 24, 28, 1.5, '#dbe7f6', {
    stroke: '#9fbde3',
    'stroke-width': 0.7,
    transform: 'rotate(-6 ' + (hx + 21) + ' ' + (hy + 23) + ')'
  })
  s += rect(hx + 32, hy + 8, 24, 28, 1.5, '#f6ecc9', {
    stroke: '#e2c66e',
    'stroke-width': 0.7,
    transform: 'rotate(5 ' + (hx + 44) + ' ' + (hy + 22) + ')'
  })
  s += rect(hx + 20, hy + 11, 24, 28, 1.5, '#ffffff', { stroke: '#d5d5d3', 'stroke-width': 0.7 })
  // 讲桌
  const lw = 240
  const lx = (W - lw) / 2
  const ly = py + 12
  const ld = 46
  const lf = 30
  const tx = W / 2 - 34
  const ty = ly - 52
  s +=
    '<g class="teacher" transform="translate(' +
    r1(tx) +
    ',' +
    r1(ty) +
    ') scale(1.2)">' +
    '<rect x="-60" y="-50" width="120" height="110" fill="transparent"/><g class="t-in">' +
    teacherFigure(t) +
    '</g></g>'
  s += poly(
    [
      [lx + lw, ly + 6],
      [lx + lw, ly + ld + lf],
      [lx, ly + ld + lf],
      [lx - 40, ly + ld + lf + 34],
      [lx + lw - 40, ly + ld + lf + 34],
      [lx + lw - 26, ly + 40]
    ],
    '#000',
    { 'fill-opacity': '.12', filter: 'url(#fxShadow)' }
  )
  s += rect(lx, ly + ld - 2, lw, lf + 2, 2, 'url(#gLectFace)', { stroke: '#e1e1df', 'stroke-width': 0.8 })
  // 讲桌铭牌
  s += rect(lx + lw / 2 - 58, ly + ld + 6, 116, 18, 9, '#ffffff', { stroke: '#dcdcda', 'stroke-width': 0.8 })
  s += txt(lx + lw / 2, ly + ld + 19, escx(t.label || ''), { class: 'plate', 'text-anchor': 'middle' })
  s += rect(lx, ly, lw, ld, 3, 'url(#gDeskTop)', { stroke: '#e1e1df', 'stroke-width': 0.8 })
  // 桌面物件
  s += rect(lx + 156, ly + 7, 60, 33, 3, '#e4e5e7', { stroke: '#d1d2d4', 'stroke-width': 0.8 })
  s += circ(lx + 186, ly + 23, 4, '#cfd0d3')
  s += rect(lx + 16, ly + 12, 30, 26, 1.5, '#dbe7f6', {
    stroke: '#9fbde3',
    'stroke-width': 0.8,
    transform: 'rotate(-4 ' + (lx + 31) + ' ' + (ly + 25) + ')'
  })
  s += rect(lx + 20, ly + 9, 30, 26, 1.5, '#efe4d1', { stroke: '#cdb894', 'stroke-width': 0.8 })
  s += rect(lx + 24, ly + 6, 30, 26, 1.5, '#f2dada', {
    stroke: '#dfa9a9',
    'stroke-width': 0.8,
    transform: 'rotate(3 ' + (lx + 39) + ' ' + (ly + 19) + ')'
  })
  s +=
    circ(lx + 132, ly + 26, 8.5, '#ffffff', { stroke: '#d7d7d5', 'stroke-width': 1 }) +
    circ(lx + 132, ly + 26, 6, '#8a5a3c') +
    circ(lx + 132, ly + 26, 6, 'none', { stroke: '#2f7ff0', 'stroke-width': 1.2 })
  s +=
    rect(lx + 70, ly + 18, 22, 15, 1.5, '#fff', { stroke: '#d7d7d5', 'stroke-width': 0.8 }) +
    rect(lx + 73, ly + 21, 3, 9, 1, '#f1f1ec') +
    rect(lx + 78, ly + 21, 3, 9, 1, '#f6c9cf') +
    rect(lx + 83, ly + 21, 3, 9, 1, '#f4e3a1') +
    rect(lx + 88, ly + 21, 2, 9, 1, '#cfe3f7')
  return s
}

/* ---------- 房间：地板、墙体、窗、门、后排陈设 ---------- */
function room(L: Layout): string {
  let s = ''
  const W = L.W
  const H = L.H
  const WT = L.WT
  s += rect(WT, L.FRONT, W - 2 * WT, H - L.FRONT - WT, 0, 'url(#gFloor)')
  s += rect(WT, L.FRONT, W - 2 * WT, H - L.FRONT - WT, 0, 'url(#pTiles)')
  // 窗户投下的光斑
  const nwin = Math.max(3, L.rows - 2)
  const span = (H - L.FRONT - 160) / nwin
  let lights = ''
  for (let i = 0; i < nwin; i++) {
    const y1 = L.FRONT + 120 + i * span
    const y2 = y1 + span * 0.62
    const xw = W - WT
    lights += poly(
      [
        [xw, y1],
        [xw, y2],
        [xw - 300, y2 + 120],
        [xw - 300, y1 + 120]
      ],
      '#fff',
      { 'fill-opacity': '.75' }
    )
  }
  s += '<g filter="url(#fxLight)">' + lights + '</g>'
  // 墙根暗角
  s += rect(WT, L.FRONT, W - 2 * WT, 26, 0, 'url(#gWallAO)')
  s += rect(WT, L.FRONT, 22, H - L.FRONT - WT, 0, 'url(#gWallAOx)')
  s += rect(W - WT - 22, L.FRONT, 22, H - L.FRONT - WT, 0, 'url(#gWallAOxr)')
  // 左右墙 + 后墙
  s += rect(0, L.FRONT - 2, WT, H - L.FRONT + 2, 0, '#fcfcfb') + rect(WT - 1, L.FRONT, 1, H - L.FRONT - WT, 0, '#e2e2e0')
  s += rect(W - WT, L.FRONT - 2, WT, H - L.FRONT + 2, 0, '#fcfcfb') + rect(W - WT, L.FRONT, 1, H - L.FRONT - WT, 0, '#e2e2e0')
  s += rect(0, H - WT, W, WT, 0, '#fcfcfb') + rect(WT, H - WT, W - 2 * WT, 1, 0, '#e2e2e0')
  // 右墙窗户
  for (let j = 0; j < nwin; j++) {
    const wy = L.FRONT + 120 + j * span
    s += rect(W - WT + 3, wy, WT - 6, span * 0.62, 1, 'url(#gGlass)', { stroke: '#c9dcf1', 'stroke-width': 0.8 })
    s += rect(W - WT + 3, wy + span * 0.31 - 1, WT - 6, 2, 0, '#c9dcf1')
  }
  // 左墙前门、后门
  function door(y: number): string {
    return (
      rect(0, y, WT, 70, 0, '#f0f0ee') +
      rect(0, y, WT, 2, 0, '#d9d9d7') +
      rect(0, y + 68, WT, 2, 0, '#d9d9d7') +
      rect(WT + 6, y + 12, 26, 46, 4, '#e9e9e6', { stroke: '#dededb', 'stroke-width': 0.8 }) +
      rect(WT + 10, y + 16, 18, 38, 2, 'none', { stroke: '#dcdcd9', 'stroke-width': 0.8, 'stroke-dasharray': '2 2' })
    )
  }
  s += door(L.FRONT + 6)
  s += door(H - WT - 150)
  // 后墙储物柜
  const lockN = Math.floor((W - 2 * WT - 360) / 58)
  const lw = 54
  const lx0 = (W - lockN * 58) / 2 + 2
  const ly = H - WT - 40
  s += poly(
    [
      [lx0 + lockN * 58, ly],
      [lx0, ly],
      [lx0 - 30, ly + 30],
      [lx0 + lockN * 58 - 30, ly + 30]
    ],
    '#000',
    { 'fill-opacity': '.05', filter: 'url(#fxShadow)' }
  )
  for (let k = 0; k < lockN; k++) {
    const x = lx0 + k * 58
    s += rect(x, ly, lw, 38, 3, '#ffffff', { stroke: '#e1e1df', 'stroke-width': 0.8 })
    s += rect(x + lw / 2 - 6, ly + 8, 12, 3, 1.5, '#d6d6d4')
    s += rect(x + 6, ly + 26, 10, 6, 1, ['#f3d9d6', '#dbe7f6', '#f6ecc9', '#dcefe9'][k % 4])
  }
  // 绿植
  function plant(cx: number, cy: number, r: number): string {
    return (
      ell(cx - 8, cy + 10, r + 4, r * 0.5, '#000', { 'fill-opacity': '.08', filter: 'url(#fxShadowS)' }) +
      circ(cx, cy, r * 0.62, '#efe9df', { stroke: '#ddd4c5', 'stroke-width': 1 }) +
      ell(cx - r * 0.35, cy - r * 0.2, r * 0.55, r * 0.32, '#5fb276', {
        transform: 'rotate(-30 ' + r1(cx - r * 0.35) + ' ' + r1(cy - r * 0.2) + ')'
      }) +
      ell(cx + r * 0.38, cy - r * 0.1, r * 0.55, r * 0.3, '#3f9a5e', {
        transform: 'rotate(25 ' + r1(cx + r * 0.38) + ' ' + r1(cy - r * 0.1) + ')'
      }) +
      ell(cx, cy + r * 0.38, r * 0.5, r * 0.28, '#7cc48a', {
        transform: 'rotate(80 ' + r1(cx) + ' ' + r1(cy + r * 0.38) + ')'
      }) +
      ell(cx + r * 0.05, cy - r * 0.45, r * 0.42, r * 0.26, '#8fd09c', {
        transform: 'rotate(-80 ' + r1(cx + r * 0.05) + ' ' + r1(cy - r * 0.45) + ')'
      }) +
      circ(cx, cy, r * 0.14, '#2f7d4c')
    )
  }
  const shade = (x: number, y: number, w: number, h: number, rx = 6, op = '.08'): string =>
    rect(x - 12, y + 12, w + 4, h + 2, rx, '#000', { 'fill-opacity': op, filter: 'url(#fxShadow)' })
  const cabinet = (x: number, y: number, w: number, h: number): string =>
    shade(x, y, w, h, 4, '.08') + rect(x, y, w, h, 3, '#ffffff', { stroke: '#e1e1df', 'stroke-width': 0.8 })
  const BOOKC = ['#e5483b', '#2f7ff0', '#f2b01e', '#14b0a6', '#7a5af5', '#ebe9e4', '#dbe7f6', '#f2dada', '#dfeee1']
  function shelfV(x: number, y: number, w: number, h: number): string {
    let g = cabinet(x, y, w, h)
    for (let m = 0; m * 9 + 12 < h; m++) {
      const len = Math.min(w - 10, 16 + (hash('v' + x + y + m) % Math.max(4, w - 20)))
      g += rect(x + 5, y + 6 + m * 9, len, 6, 1, BOOKC[(m * 7 + Math.round(x)) % BOOKC.length], { opacity: m % 3 === 0 ? '.9' : '.55' })
    }
    return g
  }
  function shelfH(x: number, y: number, w: number, h: number): string {
    let g = cabinet(x, y, w, h)
    for (let m = 0; m * 9 + 12 < w; m++) {
      const len = Math.min(h - 10, 14 + (hash('h' + x + y + m) % Math.max(4, h - 18)))
      g += rect(x + 6 + m * 9, y + 5, 6, len, 1, BOOKC[(m * 5 + Math.round(y)) % BOOKC.length], { opacity: m % 3 === 1 ? '.9' : '.55' })
    }
    return g
  }
  function rug(x: number, y: number, w: number, h: number, fill: string, line: string): string {
    return (
      rect(x, y, w, h, Math.min(28, h / 2), fill, { stroke: line, 'stroke-width': 1 }) +
      rect(x + 8, y + 8, w - 16, h - 16, Math.min(22, h / 2 - 8), 'none', {
        stroke: line,
        'stroke-width': 1,
        'stroke-dasharray': '3 5'
      })
    )
  }
  function beanbag(bx: number, by: number, c: string, cs: string): string {
    return (
      ell(bx - 7, by + 9, 20, 16, '#000', { 'fill-opacity': '.08', filter: 'url(#fxShadowS)' }) +
      ell(bx, by, 19, 16, c, { stroke: cs, 'stroke-width': 1 }) +
      ell(bx - 3, by - 4, 9, 6, '#fff', { opacity: '.5' })
    )
  }
  function roundTable(cx: number, cy: number, r: number): string {
    return (
      circ(cx - 9, cy + 11, r + 1, '#000', { 'fill-opacity': '.09', filter: 'url(#fxShadow)' }) +
      circ(cx, cy, r, '#ffffff', { stroke: '#e0e0de', 'stroke-width': 0.9 })
    )
  }
  const zoneLabel = (x: number, y: number, t: string): string => txt(x, y, t, { class: 'zone-lbl', 'text-anchor': 'middle' })

  const gx0 = L.gx0
  const gx1 = L.gx1
  const lxA = WT + 8
  const lxB = gx0 - 70
  const zl = lxB - lxA
  const rx1 = W - WT - 8
  const rx0 = gx1 + 70
  const zr = rx1 - rx0
  const y0 = L.row0 - 6
  const y1 = H - WT - 64
  const zh = y1 - y0
  // 饮水机 + 前角绿植（右前）
  const wx = W - WT - 92
  const wy2 = L.FRONT + 22
  s += rect(wx - 6, wy2 + 6, 34, 34, 4, '#000', { 'fill-opacity': '.08', filter: 'url(#fxShadowS)' })
  s += rect(wx, wy2, 32, 32, 4, '#ffffff', { stroke: '#dededc', 'stroke-width': 0.8 })
  s += circ(wx + 16, wy2 + 16, 11, '#cfe3f7', { stroke: '#a9c9ec', 'stroke-width': 1 }) + circ(wx + 16, wy2 + 16, 4.5, '#2f7ff0', { opacity: '.85' })
  s += plant(W - WT - 40, L.FRONT + 46, 20)
  if (zl < 130) {
    // 窄布局：书架缩在左后
    s += shelfV(WT + 18, H - WT - 132, 50, 120)
    const gx = WT + 34
    const gy = H - WT - 186
    s += circ(gx + 3, gy + 4, 12, '#000', { 'fill-opacity': '.08', filter: 'url(#fxShadowS)' })
    s += circ(gx, gy, 12, '#e9e9e7', { stroke: '#d4d4d2', 'stroke-width': 1 }) + circ(gx, gy, 8.5, '#d9d9d7')
  } else {
    // —— 左侧上：图书角 ——
    const bandA = zh * 0.5
    const ay = y0
    s += shelfV(lxA, ay, 42, bandA - 30)
    if (zl >= 220) s += shelfH(lxA + 52, ay, Math.min(zl - 60, 220), 40)
    const rgW = Math.min(zl - 60, 290)
    const rgH = Math.min(bandA - (zl >= 220 ? 92 : 44), 220)
    const rgX = lxA + 56 + (zl - 60 - rgW) / 2
    const rgY = ay + (zl >= 220 ? 56 : 8) + (bandA - (zl >= 220 ? 92 : 44) - rgH) / 2
    s += rug(rgX, rgY, rgW, rgH, '#f3f1ed', '#e6e1d8')
    const tcx = rgX + rgW / 2
    let tcy = rgY + rgH / 2
    const tr = Math.min(30, rgW * 0.16)
    const readTable = (): string =>
      roundTable(tcx, tcy, tr) +
      '<g transform="rotate(-12 ' +
      r1(tcx - 4) +
      ' ' +
      r1(tcy) +
      ')">' +
      rect(tcx - 18, tcy - 9, 26, 18, 1.5, '#fff', { stroke: '#d8d8d5', 'stroke-width': 0.8 }) +
      T('line', { x1: r1(tcx - 5), y1: r1(tcy - 8), x2: r1(tcx - 5), y2: r1(tcy + 8), stroke: '#d6d6d3', 'stroke-width': 0.8 }) +
      '</g>' +
      circ(tcx + 13, tcy + 10, 5.5, '#fff', { stroke: '#d7d7d5', 'stroke-width': 1 }) +
      circ(tcx + 13, tcy + 10, 3.6, '#8a5a3c')
    let bags: [number, number, string, string][] = [
      [-1, -0.55, '#dbe7f6', '#b9cfec'],
      [1, -0.5, '#f6ecc9', '#e6d394'],
      [-0.85, 0.7, '#f3d9d6', '#e3b6b0'],
      [0.9, 0.65, '#dcefe9', '#a9d5c5']
    ]
    const ox = Math.min(rgW / 2 - 28, tr + 40)
    const oy = Math.min(rgH / 2 - 24, tr + 20)
    if (rgW >= 250 && rgH >= 180) {
      // 双人小沙发靠在地毯上沿
      const sfW = 120
      const sfX = tcx - sfW / 2
      const sfY = rgY + 14
      s += rect(sfX - 8, sfY + 10, sfW + 4, 36, 10, '#000', { 'fill-opacity': '.08', filter: 'url(#fxShadowS)' })
      s +=
        rect(sfX, sfY, sfW, 38, 10, '#ffffff', { stroke: '#dcdcda', 'stroke-width': 0.9 }) +
        rect(sfX + 6, sfY + 12, sfW / 2 - 9, 22, 6, '#f1f1ef') +
        rect(sfX + sfW / 2 + 3, sfY + 12, sfW / 2 - 9, 22, 6, '#f1f1ef')
      s += rect(sfX + 14, sfY + 15, 18, 12, 4, '#f6ecc9') + rect(sfX + sfW - 32, sfY + 15, 18, 12, 4, '#dbe7f6')
      tcy += 22
      bags = [
        [-1, 0.75, '#dbe7f6', '#b9cfec'],
        [1, 0.75, '#f6ecc9', '#e6d394'],
        [-1.25, -0.1, '#f3d9d6', '#e3b6b0'],
        [1.25, -0.1, '#dcefe9', '#a9d5c5']
      ]
    }
    s += readTable()
    bags.slice(0, rgW >= 170 ? 4 : 3).forEach((p) => {
      s += beanbag(tcx + p[0] * ox, tcy + p[1] * oy * 1.4, p[2], p[3])
    })
    if (rgW >= 200) {
      s +=
        circ(rgX + rgW - 22, rgY + rgH - 22, 11, '#fff', { stroke: '#dcdcda', 'stroke-width': 1 }) +
        circ(rgX + rgW - 22, rgY + rgH - 22, 5, '#ffe7a3')
    }
    s += zoneLabel(rgX + rgW / 2, rgY + rgH + 20, '图书角')
    // —— 左侧中：荣誉展柜 ——
    const by2 = ay + bandA + 8
    const bh2 = Math.min(150, zh * 0.24)
    s += cabinet(lxA, by2, 42, bh2)
    s +=
      circ(lxA + 21, by2 + 22, 11, '#cfe3f7', { stroke: '#8fb7e6', 'stroke-width': 1 }) +
      path('M' + (lxA + 14) + ' ' + (by2 + 18) + 'q5 -4 9 1 q3 5 8 1', 'none', {
        stroke: '#5fb276',
        'stroke-width': 2.2,
        'stroke-linecap': 'round'
      })
    for (let tp = 0; tp < 3 && by2 + 52 + tp * 30 < by2 + bh2 - 6; tp++) {
      const ty = by2 + 52 + tp * 30
      s +=
        circ(lxA + 21, ty, 9, '#f6d37a', { stroke: '#d9ad3c', 'stroke-width': 1 }) +
        circ(lxA + 21, ty, 4, '#e9bd4f') +
        rect(lxA + 9, ty - 2, 4, 5, 2, '#d9ad3c') +
        rect(lxA + 29, ty - 2, 4, 5, 2, '#d9ad3c')
    }
    if (zl >= 180) {
      // 墙边奖状
      const cw = Math.min(zl - 70, 150)
      s += cabinet(lxA + 56, by2 + 8, cw, 52)
      for (let cq = 0; cq * 46 + 40 < cw; cq++) {
        s +=
          rect(lxA + 64 + cq * 46, by2 + 14, 38, 40, 2, '#fff7f0', { stroke: '#e8b9a3', 'stroke-width': 1.2 }) +
          rect(lxA + 70 + cq * 46, by2 + 22, 26, 3, 1, '#e5483b', { opacity: '.8' }) +
          circ(lxA + 83 + cq * 46, by2 + 42, 5, '#f2c14e')
      }
      s += zoneLabel(lxA + 56 + cw / 2, by2 + 78, '荣誉展柜')
    }
    // —— 左侧下：卫生角 ——
    const gyy = Math.max(by2 + bh2 + 40, y1 - 120)
    const gxx = lxA + 18
    if (gyy + 40 < H - WT - 150 || gyy < y1) {
      s +=
        circ(gxx + 3, gyy + 4, 13, '#000', { 'fill-opacity': '.08', filter: 'url(#fxShadowS)' }) +
        circ(gxx, gyy, 13, '#e9e9e7', { stroke: '#d4d4d2', 'stroke-width': 1 }) +
        circ(gxx, gyy, 9, '#d9d9d7')
      s +=
        circ(gxx + 31, gyy + 4, 13, '#000', { 'fill-opacity': '.08', filter: 'url(#fxShadowS)' }) +
        circ(gxx + 28, gyy, 13, '#dbe7f6', { stroke: '#a9c3e6', 'stroke-width': 1 }) +
        circ(gxx + 28, gyy, 9, '#c6d9f2')
      s += T('line', { x1: gxx + 52, y1: gyy - 20, x2: gxx + 60, y2: gyy + 38, stroke: '#c9a46c', 'stroke-width': 3, 'stroke-linecap': 'round' })
      s += path('M' + (gxx + 52) + ' ' + (gyy + 36) + 'l15 -2 l4 17 l-21 3 z', '#e8d6a8', {
        stroke: '#d6bf86',
        'stroke-width': 0.8
      })
      s +=
        T('line', { x1: gxx + 74, y1: gyy - 18, x2: gxx + 78, y2: gyy + 34, stroke: '#9fb4c9', 'stroke-width': 3, 'stroke-linecap': 'round' }) +
        ell(gxx + 78, gyy + 38, 10, 6, '#e6ecf2', { stroke: '#c5d2df', 'stroke-width': 1 })
      s += zoneLabel(gxx + 40, gyy + 64, '卫生角')
      if (zl >= 200) s += plant(lxB - 30, gyy + 4, 24)
    }
  }
  if (zr >= 130) {
    // —— 右侧上：作业收纳架（按科目分格） ——
    const subs = (L.subjects || ['语文', '数学', '英语', '物理', '道法', '历史']).slice(0, 6)
    const hwW = Math.min(zr - 64, 40 + subs.length * 34)
    const hwX = rx0 + Math.max(0, (zr - 56 - hwW) / 2)
    const hwY = y0
    if (hwW >= 120) {
      const cell = (hwW - 12) / subs.length
      s += cabinet(hwX, hwY, hwW, 62)
      subs.forEach((nm, i) => {
        const cx2 = hwX + 6 + i * cell
        s += rect(cx2 + 2, hwY + 6, cell - 4, 50, 2, '#f4f4f3')
        const n = 1 + (hash(nm) % 3)
        for (let q = 0; q < n; q++) {
          s += rect(cx2 + 6 + q * 1.5, hwY + 12 + q * 2, cell - 12, 20, 1.5, ['#dbe7f6', '#f6ecc9', '#f3d9d6', '#dfeee1'][(i + q) % 4], {
            stroke: '#d3d3d0',
            'stroke-width': 0.6
          })
        }
        s += txt(cx2 + cell / 2, hwY + 50, escx(nm.slice(0, 2)), { 'font-size': 9.5, fill: '#8b8a85', 'text-anchor': 'middle' })
      })
      s += zoneLabel(hwX + hwW / 2, hwY + 82, '作业收纳')
    }
    // —— 右侧中：生物角 ——
    const cbW = 46
    const cbX = rx1 - cbW
    const cbY = y0 + 8
    const cbH = Math.min(zh * 0.56, 330)
    s += cabinet(cbX, cbY, cbW, cbH)
    const tkY = cbY + 92
    const tkH = Math.min(96, cbH * 0.34)
    s +=
      rect(cbX + 8, cbY + 10, 30, 38, 2, '#fff', { stroke: '#d8d8d5', 'stroke-width': 0.8 }) +
      rect(cbX + 17, cbY + 7, 12, 5, 2, '#9a9ea2') +
      rect(cbX + 12, cbY + 19, 22, 1.6, 0.8, '#d5d5d3') +
      rect(cbX + 12, cbY + 25, 18, 1.6, 0.8, '#d5d5d3') +
      rect(cbX + 12, cbY + 31, 22, 1.6, 0.8, '#d5d5d3') +
      path('M' + (cbX + 13) + ' ' + (cbY + 40) + 'l4 3 l7 -7', 'none', { stroke: '#5fb276', 'stroke-width': 1.6, 'stroke-linecap': 'round' })
    s +=
      circ(cbX + cbW / 2, cbY + 68, 11, '#efe9df', { stroke: '#ddd4c5', 'stroke-width': 0.9 }) +
      ell(cbX + cbW / 2 - 4, cbY + 66, 6, 3.5, '#5fb276', {
        transform: 'rotate(-30 ' + (cbX + cbW / 2 - 4) + ' ' + (cbY + 66) + ')'
      }) +
      ell(cbX + cbW / 2 + 4, cbY + 67, 6, 3.5, '#7cc48a', {
        transform: 'rotate(30 ' + (cbX + cbW / 2 + 4) + ' ' + (cbY + 67) + ')'
      })
    s += rect(cbX + 5, tkY, cbW - 10, tkH, 3, '#d7ebfb', { stroke: '#9cc6ec', 'stroke-width': 1.2 })
    s += rect(cbX + 8, tkY + 3, cbW - 16, tkH - 6, 2, '#bfe0f8', { opacity: '.8' })
    s += path(
      'M' + (cbX + 13) + ' ' + (tkY + tkH - 4) + 'q3 -16 -1 -26 M' + (cbX + 31) + ' ' + (tkY + tkH - 4) + 'q-3 -12 2 -20',
      'none',
      { stroke: '#4fa968', 'stroke-width': 2, 'stroke-linecap': 'round' }
    )
    ;(
      [
        [0.35, 0.3, '#f28c38'],
        [0.62, 0.58, '#e5483b'],
        [0.4, 0.78, '#f2b01e']
      ] as [number, number, string][]
    ).forEach((f) => {
      const fx = cbX + 6 + (cbW - 12) * f[0]
      const fy = tkY + tkH * f[1]
      s +=
        '<g class="fish">' +
        ell(fx, fy, 4.5, 2.6, f[2]) +
        path('M' + r1(fx + 4) + ' ' + r1(fy) + 'l4 -3 v6 z', f[2]) +
        circ(fx - 2.2, fy - 0.6, 0.7, '#171717') +
        '</g>'
    })
    for (let pz = 0; pz < 4; pz++) {
      const py = tkY + tkH + 24 + pz * 32
      if (py + 12 > cbY + cbH) break
      s += circ(cbX + cbW / 2, py, 11, '#efe9df', { stroke: '#ddd4c5', 'stroke-width': 0.9 })
      s += path(
        'M' +
          (cbX + cbW / 2) +
          ' ' +
          (py - 8) +
          'l3 6 l6 -1 l-4 5 l3 6 l-8 -3 l-8 3 l3 -6 l-4 -5 l6 1 z',
        ['#7cc48a', '#5fb276', '#8fd09c', '#4fa968'][pz]
      )
    }
    if (zr >= 170) {
      s += plant(cbX - 40, tkY + tkH / 2, 30)
      s +=
        ell(cbX - 30, tkY + tkH + 40, 9, 6, '#cfe3f7', { stroke: '#8fb7e6', 'stroke-width': 1 }) +
        T('line', {
          x1: r1(cbX - 22),
          y1: r1(tkY + tkH + 38),
          x2: r1(cbX - 12),
          y2: r1(tkY + tkH + 30),
          stroke: '#8fb7e6',
          'stroke-width': 2.2,
          'stroke-linecap': 'round'
        })
    }
    s += zoneLabel(cbX - (zr >= 170 ? 40 : 6), tkY + tkH + 78, '生物角')
    // —— 右侧：体育器材筐 ——
    const tBand = y1 - (cbY + cbH) - 20
    if (tBand >= 250) {
      const eqX = rx1 - 76
      const eqY = cbY + cbH + 30
      s += cabinet(eqX, eqY, 70, 52)
      s += rect(eqX + 4, eqY + 4, 62, 44, 3, '#f1f1ef')
      s +=
        circ(eqX + 20, eqY + 22, 12, '#f08a3c', { stroke: '#c96a24', 'stroke-width': 1 }) +
        path('M' + (eqX + 8) + ' ' + (eqY + 22) + 'h24M' + (eqX + 20) + ' ' + (eqY + 10) + 'v24', 'none', {
          stroke: '#a85618',
          'stroke-width': 1
        })
      s +=
        circ(eqX + 47, eqY + 26, 11, '#ffffff', { stroke: '#cfcfcc', 'stroke-width': 1 }) +
        path('M' + (eqX + 47) + ' ' + (eqY + 21) + 'l4.5 3.2 l-1.7 5.3 h-5.6 l-1.7 -5.3 z', '#2a2a29')
      s += ell(eqX + 38, eqY + 40, 9, 4, 'none', { stroke: '#2f7ff0', 'stroke-width': 2 })
      s += zoneLabel(eqX + 35, eqY + 72, '器材筐')
    }
    // —— 右侧下：谈心角 ——
    if (zr >= 170 && tBand >= 120) {
      const tw = Math.min(zr - 20, 230)
      const th = Math.min(tBand >= 250 ? tBand - 120 : tBand - 20, 170)
      const tx0 = rx0 + (zr - tw) / 2 + 6
      const ty0 = y1 - th
      s += rug(tx0, ty0, tw, th, '#f1f4f8', '#dfe5ee')
      const tcx2 = tx0 + tw / 2
      const tcy2 = ty0 + th / 2
      s += roundTable(tcx2, tcy2, 22)
      s +=
        circ(tcx2 - 7, tcy2 - 4, 4.5, '#fff', { stroke: '#d7d7d5', 'stroke-width': 1 }) +
        circ(tcx2 + 8, tcy2 + 4, 4.5, '#fff', { stroke: '#d7d7d5', 'stroke-width': 1 }) +
        rect(tcx2 - 5, tcy2 + 8, 10, 6, 1.5, '#dbe7f6')
      ;[-1, 1].forEach((dx) => {
        const chx = tcx2 + dx * 46
        s += rect(chx - 20, tcy2 - 6, 30, 30, 8, '#000', { 'fill-opacity': '.07', filter: 'url(#fxShadowS)' })
        s += rect(chx - 15, tcy2 - 15, 30, 30, 8, '#ffffff', { stroke: '#dcdcda', 'stroke-width': 0.9 })
        s += rect(chx + (dx > 0 ? 9 : -15), tcy2 - 15, 6, 30, 3, '#ececea')
      })
      if (tw >= 200) s += plant(tx0 + tw - 22, ty0 + 24, 16)
      s += zoneLabel(tcx2, ty0 + th - 14, '谈心角')
    } else s += plant(W - WT - 44, H - WT - 70, 26)
  } else {
    s += plant(W - WT - 44, H - WT - 70, 26)
  }
  return s
}

/* ---------- 整个场景 ---------- */
export interface SceneData {
  rows: number
  pairs: number
  extra: number
  subjects?: string[]
  seats: Record<string, { id: string; name: string; gender?: string; group?: number }>
  teacher?: { gender?: string; label?: string }
  board?: BoardData
  views?: Record<string, { cls?: string; badge?: string; badgeTone?: string; chip?: string; chipTone?: string; tint?: string; color?: string }>
  seatNos?: boolean
}

export function scene(data: SceneData): { svg: string; L: Layout } {
  const L = layout(data.rows, data.pairs, data.extra)
  L.subjects = data.subjects
  const cols = data.pairs * 2
  let out =
    '<svg class="scene-svg" viewBox="0 0 ' +
    L.W +
    ' ' +
    L.H +
    '" width="' +
    L.W +
    '" height="' +
    L.H +
    '" xmlns="http://www.w3.org/2000/svg">' +
    defs()
  out += room(L)
  out += frontWall(L, data.board || {})
  out += podium(L, data.teacher || {})
  // 阴影层
  let sh = ''
  for (let r = 0; r < data.rows; r++) {
    for (let c = 0; c < cols; c++) {
      sh += deskShadow(L, L.seatX(c), L.seatY(r))
      sh += seatShadow(L.headX(c), L.headY(r))
    }
  }
  out += '<g filter="url(#fxShadow)">' + sh + '</g>'
  // 课桌 + 学生，逐行绘制（越往下越靠近镜头）
  for (let r2 = 0; r2 < data.rows; r2++) {
    let rowS = ''
    for (let c2 = 0; c2 < cols; c2++) {
      const key = r2 + '-' + c2
      const st = data.seats[key]
      const x = L.seatX(c2)
      const y = L.seatY(r2)
      const cx = L.headX(c2)
      const cy = L.headY(r2)
      const v = (st && data.views && data.views[st.id]) || {}
      const cls = 'seat' + (st ? ' has' : ' empty') + (v.cls ? ' ' + v.cls : '')
      rowS += '<g class="' + cls + '" data-seat="' + key + '"' + (st ? ' data-sid="' + st.id + '"' : '') + '>'
      rowS += rect(x + 2, y - 6, L.DW - 4, L.ROW - 4, 10, 'transparent', { class: 'hit' })
      rowS += '<g class="desk-g">' + desk(L, x, y)
      if (v.tint) rowS += rect(x, y, L.DW, L.DD, 3, v.tint, { class: 'tint' })
      rowS += deskProps(x, y, L.DW, hash(key + (st ? st.id : '')))
      rowS += '</g>'
      if (st) rowS += txt(cx, y + 12.5, escx(st.name), { class: 'lbl', 'text-anchor': 'middle' })
      rowS += chairSeat(cx, cy)
      if (st) {
        const color = v.color || groupColor(st.group || 0)
        rowS += '<g class="stu" transform="translate(' + r1(cx) + ',' + r1(cy) + ')"><g class="stu-in">' + studentFigure(st, color) + '</g></g>'
      } else {
        rowS +=
          '<g class="add" transform="translate(' +
          r1(cx) +
          ',' +
          r1(cy) +
          ')">' +
          circ(0, 2, 16, '#fff', { stroke: '#c9c9c7', 'stroke-width': 1.2, 'stroke-dasharray': '3 3' }) +
          path('M-6 2H6M0 -4V8', 'none', { stroke: '#9a9a98', 'stroke-width': 1.6, 'stroke-linecap': 'round' }) +
          '</g>'
      }
      rowS += chairBack(cx, cy)
      if (v.badge) {
        const bw = Math.max(26, v.badge.length * 7 + 12)
        rowS +=
          '<g class="badge ' +
          (v.badgeTone || '') +
          '" transform="translate(' +
          r1(x + L.DW - bw - 2) +
          ',' +
          r1(y - 15) +
          ')">' +
          rect(0, 0, bw, 17, 8.5, null, { class: 'badge-bg' }) +
          txt(bw / 2, 12.2, escx(v.badge), { 'text-anchor': 'middle', class: 'badge-tx' }) +
          '</g>'
      }
      if (v.chip) {
        rowS +=
          '<g class="chip ' +
          (v.chipTone || '') +
          '" transform="translate(' +
          r1(cx) +
          ',' +
          r1(cy - 2) +
          ')">' +
          rect(-17, -10, 34, 20, 10, null, { class: 'chip-bg' }) +
          txt(0, 4.4, escx(v.chip), { 'text-anchor': 'middle', class: 'chip-tx' }) +
          '</g>'
      }
      if (data.seatNos) rowS += txt(x + 6, y + L.DD - 5, r2 + 1 + '-' + (c2 + 1), { class: 'seatno' })
      rowS += '</g>'
    }
    out += '<g class="row">' + rowS + '</g>'
  }
  out += txt(L.W - L.WT - 10, L.H - 4.5, 'Developed by @赛博老爸', { class: 'wm', 'text-anchor': 'end' })
  out += '<g class="fx-layer"></g>'
  out += '</svg>'
  return { svg: out, L }
}

export const ART = {
  INK,
  GROUPS,
  groupColor,
  layout,
  scene,
  avatar,
  teacherAvatar,
  hash,
  rng
}
