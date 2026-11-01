<script setup lang="ts">
/** 设置 - 数据与备份 */
import { computed } from 'vue'
import { S, save, replaceState, isStorageOk } from '@core/app'
import { defaultState } from '@core/state'
import { demoState } from '@core/demo'
import { exportBackup, parseBackup, storageSizeKB } from '@core/backup'
import { deepClone, fmtTime } from '@core/utils'
import { go } from '@ui/shell/router'
import { confirm } from '@ui/shell/modal'
import { toast } from '@ui/shell/toast'
import Icon from '@components/common/Icon.vue'

const settings = computed(() => S.settings)
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

function backupNow(): void {
  exportBackup()
  toast('备份已下载，请妥善保存')
}
</script>

<template>
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
