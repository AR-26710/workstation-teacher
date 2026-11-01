/**
 * 备份导出（设置页与概况栏共用）
 */
import { S, save } from './app'
import { downloadFile, readFileAsText } from './files'
import { migrate } from './state'
import { pad2, todayStr } from './utils'
import type { AppState } from './types'

export function exportBackup(): void {
  S.settings.lastBackup = Date.now()
  save(true)
  const d = new Date()
  const name =
    '班主任工作台备份-' + S.settings.className + '-' + todayStr() + '-' + pad2(d.getHours()) + pad2(d.getMinutes()) + '.json'
  downloadFile(name, JSON.stringify(S, null, 1), 'application/json')
}

export interface BackupInfo {
  students: number
  exams: number
}

/** 解析备份文件（只做校验，是否覆盖交给调用方确认） */
export async function parseBackup(file: File): Promise<AppState | null> {
  const text = await readFileAsText(file)
  try {
    const d = JSON.parse(text) as AppState
    if (!d || !d.settings || !Array.isArray(d.students)) return null
    return migrate(d)
  } catch {
    return null
  }
}

export function storageSizeKB(): number {
  try {
    return ((localStorage.getItem('bzr-workbench-v1') || '') as string).length / 1024
  } catch {
    return 0
  }
}
