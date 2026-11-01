/**
 * 文件下载、剪贴板、CSV / Excel 粘贴解析
 */
import { toast } from '../ui/toast'

export function downloadFile(name: string, content: string | Blob, type?: string): void {
  const blob = content instanceof Blob ? content : new Blob([content], { type: type || 'text/plain;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = name
  document.body.appendChild(a)
  a.click()
  window.setTimeout(() => {
    URL.revokeObjectURL(a.href)
    a.remove()
  }, 500)
}

export function copyText(t: string): void {
  const fallback = (): void => {
    const ta = document.createElement('textarea')
    ta.value = t
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    try {
      document.execCommand('copy')
      toast('已复制')
    } catch {
      toast('复制失败，请手动选择复制')
    }
    ta.remove()
  }
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(t).then(() => toast('已复制'), fallback)
  } else fallback()
}

function csvCell(v: unknown): string {
  const x = v == null ? '' : String(v)
  return /[",\n]/.test(x) ? '"' + x.replace(/"/g, '""') + '"' : x
}

/** 生成 UTF-8 BOM 开头的 CSV，Excel 直接打开不乱码 */
export function toCSV(rows: unknown[][]): string {
  return '﻿' + rows.map((r) => r.map(csvCell).join(',')).join('\r\n')
}

/**
 * 解析 Excel 复制（Tab 分隔）或 CSV，正确处理带引号、带换行的单元格
 * @param keepEmpty 粘贴成绩时保留空行（空单元格），否则后面的分数会错位
 */
export function parseTable(text: string | null | undefined, keepEmpty = false): string[][] {
  let src = String(text || '')
    .replace(/^﻿/, '')
    .replace(/\r\n?/g, '\n')
  const delim = src.indexOf('\t') >= 0 ? '\t' : ','
  const rows: string[][] = []
  let row: string[] = []
  let cur = ''
  let q = false
  for (let i = 0; i < src.length; i++) {
    const ch = src[i]
    if (q) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          cur += '"'
          i++
        } else q = false
      } else cur += ch
      continue
    }
    if (ch === '"' && cur.trim() === '') {
      q = true
      cur = ''
      continue
    }
    if (ch === delim) {
      row.push(cur.trim())
      cur = ''
      continue
    }
    if (ch === '\n') {
      row.push(cur.trim())
      rows.push(row)
      row = []
      cur = ''
      continue
    }
    cur += ch
  }
  if (cur !== '' || row.length) {
    row.push(cur.trim())
    rows.push(row)
  }
  const blank = (r: string[]): boolean => r.every((c) => c === '')
  while (rows.length && blank(rows[rows.length - 1])) rows.pop()
  src = ''
  return keepEmpty ? rows : rows.filter((r) => !blank(r))
}

/** 读取文本文件（用于备份恢复、CSV 导入） */
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const rd = new FileReader()
    rd.onload = () => resolve(String(rd.result || ''))
    rd.onerror = () => reject(new Error('read error'))
    rd.readAsText(file, 'utf-8')
  })
}
