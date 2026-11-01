/**
 * 够用版 Markdown 渲染（标题、列表、表格、引用、行内强调）+ 导出 Word
 */
import { esc } from './utils'
import { downloadFile } from './files'

function mdInline(s: string): string {
  return s
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
    .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<i>$2</i>')
}

export function mdToHtml(md: string | null | undefined): string {
  const lines = esc(md || '').split('\n')
  const out: string[] = []
  let list: { t: string; items: string[] } | null = null
  let para: string[] = []
  let tbl: string[] | null = null

  const flushP = (): void => {
    if (para.length) {
      out.push('<p>' + mdInline(para.join('<br>')) + '</p>')
      para = []
    }
  }
  const flushL = (): void => {
    if (list) {
      out.push('<' + list.t + '>' + list.items.map((x) => '<li>' + mdInline(x) + '</li>').join('') + '</' + list.t + '>')
      list = null
    }
  }
  const flushT = (): void => {
    if (!tbl) return
    const rows = tbl.filter((r) => !/^\s*\|?\s*:?-{2,}/.test(r))
    out.push(
      '<table>' +
        rows
          .map((r, i) => {
            const cells = r.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|')
            return '<tr>' + cells.map((c) => (i === 0 ? '<th>' : '<td>') + mdInline(c.trim()) + (i === 0 ? '</th>' : '</td>')).join('') + '</tr>'
          })
          .join('') +
        '</table>'
    )
    tbl = null
  }

  lines.forEach((ln) => {
    let m: RegExpMatchArray | null
    if (/^\s*\|.*\|\s*$/.test(ln)) {
      flushP()
      flushL()
      ;(tbl = tbl || []).push(ln)
      return
    } else flushT()
    if ((m = ln.match(/^(#{1,4})\s+(.*)$/))) {
      flushP()
      flushL()
      const lv = Math.min(3, m[1].length)
      out.push('<h' + lv + '>' + mdInline(m[2]) + '</h' + lv + '>')
      return
    }
    if (/^\s*(-{3,}|\*{3,})\s*$/.test(ln)) {
      flushP()
      flushL()
      out.push('<hr>')
      return
    }
    if ((m = ln.match(/^\s*[-*•]\s+(.*)$/))) {
      flushP()
      if (!list || list.t !== 'ul') {
        flushL()
        list = { t: 'ul', items: [] }
      }
      list.items.push(m[1])
      return
    }
    if ((m = ln.match(/^\s*\d+[.、)]\s+(.*)$/))) {
      flushP()
      if (!list || list.t !== 'ol') {
        flushL()
        list = { t: 'ol', items: [] }
      }
      list.items.push(m[1])
      return
    }
    if ((m = ln.match(/^\s*&gt;\s?(.*)$/))) {
      flushP()
      flushL()
      out.push('<blockquote>' + mdInline(m[1]) + '</blockquote>')
      return
    }
    if (!ln.trim()) {
      flushP()
      flushL()
      return
    }
    flushL()
    para.push(ln)
  })
  flushP()
  flushL()
  flushT()
  return out.join('')
}

export function exportWord(title: string, md: string): void {
  const html =
    '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><title>' +
    esc(title) +
    '</title>' +
    '<style>body{font-family:"宋体",SimSun,"Songti SC",serif;font-size:12pt;line-height:1.8}h1{font-size:18pt;text-align:center}h2{font-size:15pt}h3{font-size:13pt}table{border-collapse:collapse;margin:6pt 0}td,th{border:1px solid #999;padding:4pt 8pt}blockquote{color:#555;border-left:3px solid #ccc;padding-left:8pt}</style></head><body><h1>' +
    esc(title) +
    '</h1>' +
    mdToHtml(md) +
    '</body></html>'
  downloadFile(String(title).replace(/[\\/: *?"<>|]/g, '_') + '.doc', '﻿' + html, 'application/msword')
}
