/**
 * 架构边界检查（零依赖，可直接 node 运行）
 *
 * 做两件事：
 *  1. 分层方向：下层不得反向依赖上层
 *  2. 循环依赖：模块图里不允许出现环
 *
 * 用法：npm run check
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src')

/** 目录 → 层级（数字越小越底层） */
const LAYER = {
  lib: 0,
  core: 1,
  ui: 2,
  components: 3,
  views: 4
}

function layerOf(rel) {
  const top = rel.split(path.sep)[0]
  if (top in LAYER) return { name: top, rank: LAYER[top] }
  return { name: 'app', rank: 5 } // main.ts / App.vue / styles
}

/** 允许的下游依赖（白名单之外一律按"不得反向依赖上层"处理） */
const ALLOW = {
  lib: ['lib'], // 纯渲染资产：只允许内部互相引用
  core: ['core', 'lib'], // 领域层：不得碰 ui / components / views
  ui: ['ui', 'core', 'lib', 'components'], // 交互层：可用组件，但不得碰页面
  components: ['components', 'ui', 'core', 'lib'], // 组件：不得碰页面
  views: ['views', 'components', 'ui', 'core', 'lib'], // 页面：最上层
  app: ['app', 'views', 'components', 'ui', 'core', 'lib']
}

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) walk(p, out)
    else if (/\.(ts|vue)$/.test(e.name)) out.push(p)
  }
  return out
}

const files = walk(SRC)
const rel = (f) => path.relative(SRC, f)

/** 路径别名 → src 下真实目录（与 vite.config.ts / tsconfig.app.json 保持一致） */
const ALIAS = {
  '@core': 'core',
  '@components': 'components',
  '@ui': 'ui',
  '@views': 'views',
  '@lib': 'lib',
  '@styles': 'styles',
  '@': ''
}

/** 解析导入到真实文件（支持相对路径、别名路径、目录 index 解析） */
function resolve(fromFile, spec) {
  let base = null
  if (spec.startsWith('.')) {
    base = path.resolve(path.dirname(fromFile), spec)
  } else if (spec.startsWith('@')) {
    const [head, ...rest] = spec.split('/')
    const dir = ALIAS[head]
    if (dir === undefined) return null
    base = path.join(SRC, dir, ...rest)
  } else {
    return null
  }
  const cands = [base, base + '.ts', base + '.vue', path.join(base, 'index.ts')]
  for (const c of cands) {
    if (fs.existsSync(c) && fs.statSync(c).isFile()) return c
  }
  return null
}

const IMPORT_RE = /from\s+'([^']+)'/g

const errors = []
const graph = new Map() // file -> Set<file>

for (const f of files) {
  // 剥离块注释，避免注释里的 from '...' 被误识别为导入
  const src = fs.readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
  const deps = new Set()
  let m
  IMPORT_RE.lastIndex = 0
  while ((m = IMPORT_RE.exec(src))) {
    const spec = m[1]
    const target = resolve(f, spec)
    if (!target) continue // 第三方包（vue 等）跳过
    deps.add(target)
  }
  graph.set(f, deps)

  const from = layerOf(rel(f))
  const allow = ALLOW[from.name] || []
  for (const d of deps) {
    const to = layerOf(rel(d))
    if (!allow.includes(to.name)) {
      errors.push(`分层违规：${rel(f)} [${from.name}] → ${rel(d)} [${to.name}]（${from.name} 不得依赖 ${to.name}）`)
    }
  }
}

/* ---------- 环检测 ---------- */
const WHITE = 0
const GRAY = 1
const BLACK = 2
const color = new Map(files.map((f) => [f, WHITE]))
const stack = []

function dfs(node) {
  color.set(node, GRAY)
  stack.push(node)
  for (const nxt of graph.get(node) || []) {
    const c = color.get(nxt)
    if (c === GRAY) {
      const i = stack.indexOf(nxt)
      const cyc = stack.slice(i).concat(nxt).map(rel)
      errors.push('循环依赖：' + cyc.join(' → '))
    } else if (c === WHITE) {
      dfs(nxt)
    }
  }
  stack.pop()
  color.set(node, BLACK)
}

for (const f of files) if (color.get(f) === WHITE) dfs(f)

/* ---------- 输出 ---------- */
const uniq = [...new Set(errors)]
if (uniq.length) {
  console.error('架构边界检查未通过，共 ' + uniq.length + ' 项：\n')
  uniq.forEach((e) => console.error('  ✗ ' + e))
  process.exit(1)
}

console.log('架构边界检查通过：' + files.length + ' 个模块，无分层违规、无循环依赖。')
