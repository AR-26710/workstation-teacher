<script setup lang="ts">
/** 批量导入学生 */
import { computed, ref } from 'vue'
import { S, save } from '../../core/app'
import { parseStudentTable, importStudents } from '../../core/importers'
import { downloadFile, toCSV } from '../../core/files'
import { closeModal } from '../../ui/shell/modal'
import { toast } from '../../ui/shell/toast'
import Icon from '../common/Icon.vue'

const text = ref('')
const autoSeat = ref(true)

const info = computed(() => {
  if (!text.value.trim()) return ''
  const p = parseStudentTable(text.value)
  if (!p.rows.length) return ''
  if (p.map.name === undefined) return '<span class="dn">没找到「姓名」列，请确认第一行是表头</span>'
  return '识别到 ' + p.rows.length + ' 名学生，' + Object.keys(p.map).length + ' 列信息'
})

function onFile(e: Event): void {
  const input = e.target as HTMLInputElement
  const f = input.files && input.files[0]
  if (!f) return
  const rd = new FileReader()
  rd.onload = () => {
    text.value = String(rd.result || '')
  }
  rd.readAsText(f, 'utf-8')
  input.value = ''
}

function template(): void {
  downloadFile(
    '学生名单模板.csv',
    toCSV([
      ['姓名', '性别', '学号', '生日', '职务', '家长姓名', '关系', '家长电话', '家庭结构', '备注'],
      ['张三', '男', '01', '2012-05-06', '', '张建国', '父亲', '13800000000', '双亲家庭', '']
    ]),
    'text/csv;charset=utf-8'
  )
}

function go(): void {
  const r = importStudents(text.value, autoSeat.value)
  if (r.added < 0) {
    toast('没有识别到「姓名」列')
    return
  }
  save()
  closeModal()
  toast('导入 ' + r.added + ' 人' + (r.skipped ? '，跳过重复 ' + r.skipped + ' 人' : ''))
}
</script>

<template>
  <div>
    <p style="margin: 0 0 12px; color: var(--ink2); line-height: 1.7; font-size: 13px">
      在 Excel 里选中名单（第一行是表头），复制后粘贴到下面；也可以选择 CSV 文件。能识别的表头：姓名、性别、学号、生日、职务、家长姓名、关系、家长电话、家庭结构、备注等，只有「姓名」是必需的。
    </p>
    <textarea
      v-model="text"
      class="ta"
      style="min-height: 180px; font-family: var(--num); font-size: 12.5px"
      placeholder="姓名	性别	学号	生日	家长姓名	家长电话&#10;张三	男	01	2012-05-06	张建国	13800000000"
    ></textarea>
    <div style="display: flex; align-items: center; gap: 10px; margin-top: 10px">
      <label class="btn btn-light btn-sm" style="cursor: pointer">
        <Icon name="up" />选择 CSV 文件<input type="file" accept=".csv,.txt" hidden @change="onFile" />
      </label>
      <button class="btn btn-ghost btn-sm" @click="template">下载模板</button>
      <span class="muted" style="font-size: 12.5px; margin-left: auto" v-html="info"></span>
    </div>
    <label class="chk" style="margin-top: 12px">
      <input v-model="autoSeat" type="checkbox" /> 自动安排到空座位
    </label>

    <div class="modal-foot" style="margin: 12px -22px -8px; padding-bottom: 8px">
      <span class="muted" style="margin-right: auto; font-size: 12.5px; align-self: center"
        >当前 {{ S.students.length }} 名学生</span
      >
      <button class="btn btn-light" @click="closeModal()">取消</button>
      <button class="btn btn-dark" @click="go">导入</button>
    </div>
  </div>
</template>
