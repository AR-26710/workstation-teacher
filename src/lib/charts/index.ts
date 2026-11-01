/**
 * CHARTS · 轻量 SVG 图表（细线、圆角柱头、浅网格、悬停提示）
 */
const C = {
  s1: '#2a78d6',
  s2: '#eb6834',
  s3: '#1baf7a',
  base: '#a3a29b',
  grid: '#ecebe6',
  axis: '#cfcec7',
  ink: '#171717',
  muted: '#8b8a85',
  crit: '#d03b3b',
  surface: '#ffffff'
}
const SEQ = ['#cde2fb', '#9ec5f4', '#6da7ec', '#3987e5', '#256abf']

function r1(v: number): number {
  return Math.round(v * 10) / 10
}

function attr(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

/** 估算文本宽度（中文按全宽计） */
function estW(t: string, fs: number): number {
  let w = 0
  const s = String(t)
  for (let i = 0; i < s.length; i++) w += s.charCodeAt(i) > 255 ? fs : fs * 0.58
  return w
}

function niceMax(v: number): number {
  if (v <= 0) return 1
  const p = Math.pow(10, Math.floor(Math.log10(v)))
  const n = v / p
  const m = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10
  return m * p
}

function colTop(x: number, y: number, w: number, h: number, r: number): string {
  if (h <= 0) return ''
  r = Math.min(r, h, w / 2)
  return (
    'M' +
    r1(x) +
    ' ' +
    r1(y + h) +
    'V' +
    r1(y + r) +
    'Q' +
    r1(x) +
    ' ' +
    r1(y) +
    ' ' +
    r1(x + r) +
    ' ' +
    r1(y) +
    'H' +
    r1(x + w - r) +
    'Q' +
    r1(x + w) +
    ' ' +
    r1(y) +
    ' ' +
    r1(x + w) +
    ' ' +
    r1(y + r) +
    'V' +
    r1(y + h) +
    'Z'
  )
}

export interface BarDatum {
  label: string
  value: number
  tip?: string
  color?: string
}

export interface BarOptions {
  h?: number
  max?: number
  fmt?: (v: number) => string
  ref?: number
  refLabel?: string
  color?: string
  valueLabels?: boolean
}

/** 柱状图 */
export function bars(data: BarDatum[], W: number, opts: BarOptions = {}): string {
  const H = opts.h || 240
  const ml = 40
  const mr = 12
  const mt = 18
  const mb = 30
  const iw = W - ml - mr
  const ih = H - mt - mb
  const max = opts.max || niceMax(Math.max(...data.map((d) => d.value || 0)) || 1)
  const fmt = opts.fmt || ((v: number) => String(Math.round(v)))
  let s = '<svg width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '" role="img">'
  const ticks = 4
  for (let i = 0; i <= ticks; i++) {
    const v = (max * i) / ticks
    const y = mt + ih - (ih * i) / ticks
    s += '<line class="' + (i === 0 ? 'base' : 'grid') + '" x1="' + ml + '" x2="' + (W - mr) + '" y1="' + r1(y) + '" y2="' + r1(y) + '"/>'
    s += '<text class="ax" x="' + (ml - 8) + '" y="' + r1(y + 3.5) + '" text-anchor="end">' + fmt(v) + '</text>'
  }
  const band = iw / data.length
  const bw = Math.min(24, band * 0.5)
  data.forEach((d, k) => {
    const cx = ml + band * k + band / 2
    const h = ih * Math.min(1, (d.value || 0) / max)
    const y = mt + ih - h
    s += '<rect x="' + r1(cx - band / 2) + '" y="' + mt + '" width="' + r1(band) + '" height="' + ih + '" fill="transparent" data-tip="' + attr(d.tip || d.label + '：' + fmt(d.value)) + '"/>'
    s += '<path d="' + colTop(cx - bw / 2, y, bw, h, 4) + '" fill="' + (d.color || opts.color || C.s1) + '" pointer-events="none"/>'
    if (opts.valueLabels !== false) s += '<text class="lab" x="' + r1(cx) + '" y="' + r1(y - 6) + '" text-anchor="middle" pointer-events="none">' + fmt(d.value) + '</text>'
    s += '<text class="ax-cn" x="' + r1(cx) + '" y="' + (H - 9) + '" text-anchor="middle">' + attr(d.label) + '</text>'
  })
  if (opts.ref !== undefined) {
    const ry = mt + ih - (ih * opts.ref) / max
    s += '<line x1="' + ml + '" x2="' + (W - mr) + '" y1="' + r1(ry) + '" y2="' + r1(ry) + '" stroke="' + C.crit + '" stroke-width="1" opacity=".7" pointer-events="none"/>'
    s += '<text class="ax-cn" x="' + (ml - 8) + '" y="' + r1(ry + 4) + '" text-anchor="end" style="fill:' + C.crit + ';font-size:10.5px">' + attr(opts.refLabel || '') + '</text>'
  }
  return s + '</svg>'
}

export interface LineSeries {
  name: string
  color: string
  values: (number | null)[]
  width?: number
  dot?: number
  area?: boolean
  fill?: boolean
}

export interface LineOptions {
  h?: number
  ml?: number
  mr?: number
  mt?: number
  mb?: number
  min?: number
  max?: number
  ticks?: number
  fmt?: (v: number) => string
  tipFmt?: (v: number) => string
  noAxis?: boolean
  noDots?: boolean
  noHover?: boolean
  endLabel?: boolean
}

/** 折线图 */
export function lines(series: LineSeries[], labels: string[], W: number, opts: LineOptions = {}): string {
  const H = opts.h || 240
  const ml = opts.ml || 40
  const mr = opts.mr || 18
  const mt = opts.mt || 16
  const mb = opts.mb || 30
  const iw = W - ml - mr
  const ih = H - mt - mb
  const all: number[] = []
  series.forEach((se) => se.values.forEach((v) => { if (v !== null && v !== undefined) all.push(v) }))
  let lo = opts.min !== undefined ? opts.min : all.length ? Math.min(...all) : 0
  let hi = opts.max !== undefined ? opts.max : all.length ? Math.max(...all) : 1
  if (!all.length) {
    lo = 0
    hi = 1
  }
  if (hi === lo) hi = lo + 1
  const fmt = opts.fmt || ((v: number) => String(Math.round(v)))
  const n = labels.length
  const X = (i: number): number => (n === 1 ? ml + iw / 2 : ml + (iw * i) / (n - 1))
  const Y = (v: number): number => mt + ih - (ih * (v - lo)) / (hi - lo)
  let s = '<svg width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '" role="img">'
  const ticks = opts.ticks || 4
  if (!opts.noAxis) {
    for (let i = 0; i <= ticks; i++) {
      const v = lo + ((hi - lo) * i) / ticks
      const y = Y(v)
      s += '<line class="' + (i === 0 ? 'base' : 'grid') + '" x1="' + ml + '" x2="' + (W - mr) + '" y1="' + r1(y) + '" y2="' + r1(y) + '"/>'
      s += '<text class="ax" x="' + (ml - 8) + '" y="' + r1(y + 3.5) + '" text-anchor="end">' + fmt(v) + '</text>'
    }
    labels.forEach((lb, k) => {
      const tw = estW(lb, 11.5)
      const x = Math.max(tw / 2 + 2, Math.min(W - tw / 2 - 2, X(k)))
      s += '<text class="ax-cn" x="' + r1(x) + '" y="' + (H - 9) + '" text-anchor="middle">' + attr(lb) + '</text>'
    })
  }
  series.forEach((se) => {
    let d = ''
    let pen = false
    se.values.forEach((v, k) => {
      if (v === null || v === undefined) {
        pen = false
        return
      }
      d += (pen ? 'L' : 'M') + r1(X(k)) + ' ' + r1(Y(v))
      pen = true
    })
    if (se.area) {
      const pts: [number, number][] = []
      se.values.forEach((v, k) => {
        if (v !== null && v !== undefined) pts.push([X(k), Y(v)])
      })
      if (pts.length > 1) {
        s +=
          '<path d="M' +
          r1(pts[0][0]) +
          ' ' +
          r1(mt + ih) +
          pts.map((p) => 'L' + r1(p[0]) + ' ' + r1(p[1])).join('') +
          'L' +
          r1(pts[pts.length - 1][0]) +
          ' ' +
          r1(mt + ih) +
          'Z" fill="' +
          se.color +
          '" opacity=".10"/>'
      }
    }
    s += '<path d="' + d + '" fill="none" stroke="' + se.color + '" stroke-width="' + (se.width || 2) + '" stroke-linecap="round" stroke-linejoin="round"/>'
  })
  series.forEach((se) => {
    se.values.forEach((v, k) => {
      if (v === null || v === undefined) return
      const cx = X(k)
      const cy = Y(v)
      if (!opts.noDots) s += '<circle cx="' + r1(cx) + '" cy="' + r1(cy) + '" r="' + (se.dot || 4.2) + '" fill="' + se.color + '" stroke="#fff" stroke-width="2" pointer-events="none"/>'
    })
  })
  // 悬停区（每个 x 一列）
  if (!opts.noHover) {
    labels.forEach((lb, k) => {
      let tip = '<b>' + attr(lb) + '</b>'
      series.forEach((se) => {
        const v = se.values[k]
        if (v !== null && v !== undefined) tip += '<br><span class="tk">' + attr(se.name) + '</span> ' + (opts.tipFmt || fmt)(v)
      })
      const w = n === 1 ? iw : iw / (n - 1)
      s += '<rect x="' + r1(X(k) - w / 2) + '" y="' + mt + '" width="' + r1(w) + '" height="' + ih + '" fill="transparent" data-tip="' + attr(tip) + '"/>'
    })
  }
  // 末端标签（仅主系列）
  if (opts.endLabel !== false && series.length) {
    const se0 = series[0]
    let lastK = -1
    se0.values.forEach((v, k) => {
      if (v !== null && v !== undefined) lastK = k
    })
    if (lastK >= 0) {
      const lv = se0.values[lastK] as number
      const lx = X(lastK)
      const ly = Y(lv)
      s +=
        '<text class="lab" x="' +
        r1(lx) +
        '" y="' +
        r1(ly - 10) +
        '" text-anchor="' +
        (lastK === n - 1 && n > 1 ? 'end' : 'middle') +
        '" pointer-events="none">' +
        (opts.tipFmt || fmt)(lv) +
        '</text>'
    }
  }
  return s + '</svg>'
}

export interface RadarSeries {
  name: string
  color: string
  values: number[]
  fill?: boolean
}

/** 雷达图 */
export function radar(axes: string[], series: RadarSeries[], W: number, opts: { h?: number } = {}): string {
  const H = opts.h || 260
  const cx = W / 2
  const cy = H / 2 + 4
  const R = Math.min(W / 2 - 52, H / 2 - 30)
  const n = axes.length
  const P = (i: number, v: number): [number, number] => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / n
    return [cx + Math.cos(a) * R * v, cy + Math.sin(a) * R * v]
  }
  let s = '<svg width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '" role="img">'
  ;[0.2, 0.4, 0.6, 0.8, 1].forEach((lv) => {
    const pts: [number, number][] = []
    for (let i = 0; i < n; i++) pts.push(P(i, lv))
    s += '<polygon points="' + pts.map((p) => r1(p[0]) + ',' + r1(p[1])).join(' ') + '" fill="none" class="grid"/>'
  })
  for (let i = 0; i < n; i++) {
    const p = P(i, 1)
    const q = P(i, 1.16)
    s += '<line class="grid" x1="' + cx + '" y1="' + cy + '" x2="' + r1(p[0]) + '" y2="' + r1(p[1]) + '"/>'
    s += '<text class="ax-cn" x="' + r1(q[0]) + '" y="' + r1(q[1] + 4) + '" text-anchor="middle">' + attr(axes[i]) + '</text>'
  }
  series.forEach((se) => {
    const pts = se.values.map((v, i) => P(i, Math.max(0, Math.min(1, v || 0))))
    s +=
      '<polygon points="' +
      pts.map((p) => r1(p[0]) + ',' + r1(p[1])).join(' ') +
      '" fill="' +
      se.color +
      '" fill-opacity="' +
      (se.fill === false ? 0 : 0.1) +
      '" stroke="' +
      se.color +
      '" stroke-width="2" stroke-linejoin="round"/>'
  })
  series.forEach((se) => {
    se.values.forEach((v, i) => {
      const p = P(i, Math.max(0, Math.min(1, v || 0)))
      s += '<circle cx="' + r1(p[0]) + '" cy="' + r1(p[1]) + '" r="4" fill="' + se.color + '" stroke="#fff" stroke-width="2" pointer-events="none"/>'
    })
  })
  for (let k = 0; k < n; k++) {
    let tip = '<b>' + attr(axes[k]) + '</b>'
    series.forEach((se) => {
      tip += '<br><span class="tk">' + attr(se.name) + '</span> ' + Math.round((se.values[k] || 0) * 1000) / 10 + '%'
    })
    const pp = P(k, 1)
    s += '<circle cx="' + r1(pp[0]) + '" cy="' + r1(pp[1]) + '" r="' + Math.max(14, R / n) + '" fill="transparent" data-tip="' + attr(tip) + '"/>'
  }
  return s + '</svg>'
}

/** 迷你折线 */
export function spark(values: (number | null)[], W: number, H: number, color?: string): string {
  const v = values.filter((x) => x !== null && x !== undefined) as number[]
  if (v.length < 2) return ''
  let lo = Math.min(...v)
  let hi = Math.max(...v)
  if (hi === lo) {
    hi += 1
    lo -= 1
  }
  const n = values.length
  const pts: [number, number][] = []
  values.forEach((x, i) => {
    if (x !== null && x !== undefined) pts.push([4 + ((W - 8) * i) / (n - 1), 4 + (H - 8) * (1 - (x - lo) / (hi - lo))])
  })
  const d = pts.map((p, i) => (i ? 'L' : 'M') + r1(p[0]) + ' ' + r1(p[1])).join('')
  const last = pts[pts.length - 1]
  return (
    '<svg width="' +
    W +
    '" height="' +
    H +
    '" viewBox="0 0 ' +
    W +
    ' ' +
    H +
    '"><path d="' +
    d +
    '" fill="none" stroke="' +
    (color || C.base) +
    '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<circle cx="' +
    r1(last[0]) +
    '" cy="' +
    r1(last[1]) +
    '" r="3.5" fill="' +
    (color || C.s1) +
    '" stroke="#fff" stroke-width="1.5"/></svg>'
  )
}

export const CH = { C, SEQ, bars, lines, radar, spark, niceMax }
