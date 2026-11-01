<script setup lang="ts">
/** 按表头导入成绩 */
import { computed, ref } from 'vue'
import { S, save } from '@core/app'
import { examById } from '@core/select'
import { findStu, parseScore, parseScoreTable, setScore } from '@core/importers'
import { closeModal } from '@ui/shell/modal'
import { toast } from '@ui/shell/toast'

const props = defineProps<{ id: string }>()
const ex = computed(() => examById(props.id))
const text = ref('')

const info = computed(() => {
  const e = ex.value
  if (!e || !text.value.trim()) return ''
  const p = parseScoreTable(text.value, e)
  if (!p) return ''
  if (p.ni < 0 && p.noi < 0) return '<span class="dn">没找到「姓名」或「学号」列</span>'
  let matched = 0
  p.rows.forEach((r) => {
    if (findStu(r[p.ni], r[p.noi])) matched++
  })
  return '共 ' + p.rows.length + ' 行，匹配到 ' + matched + ' 名学生；识别科目：' + (Object.keys(p.cols).join('、') || '无')
})

function go(): void {
  const e = ex.value
  if (!e) return
  const p = parseScoreTable(text.value, e)
  if (!p || (p.ni < 0 && p.noi < 0)) {
    toast('没有识别到姓名或学号列')
    return
  }
  let n = 0
  const miss: string[] = []
  p.rows.forEach((r) => {
    const st = findStu(r[p.ni], r[p.noi])
    if (!st) {
      miss.push(r[p.ni] || r[p.noi])
      return
    }
    Object.keys(p.cols).forEach((sub) => {
      const v = parseScore(r[p.cols[sub]])
      if (v !== undefined) setScore(e, st.id, sub, v)
    })
    n++
  })
  save()
  closeModal()
  toast('导入 ' + n + ' 名学生的成绩' + (miss.length ? '，' + miss.length + ' 行没对上名字' : ''))
}
</script>

<template>
  <div v-if="ex">
    <p style="margin: 0 0 12px; color: var(--ink2); line-height: 1.7; font-size: 13px">
      从 Excel 复制带表头的成绩表粘贴进来（顺序不限）。需要有「姓名」或「学号」列，科目列名要和考试科目一致：<span
        v-for="s in ex.subjects"
        :key="s.name"
        class="tag gray"
        style="margin: 0 2px"
        >{{ s.name }}</span
      >
    </p>
    <textarea
      v-model="text"
      class="ta"
      style="min-height: 200px; font-family: var(--num); font-size: 12.5px"
      placeholder="姓名	语文	数学	英语&#10;张三	98	105	110"
    ></textarea>
    <div class="muted" style="font-size: 12.5px; margin-top: 8px" v-html="info"></div>

    <div class="modal-foot" style="margin: 12px -22px -8px; padding-bottom: 8px">
      <span class="muted" style="margin-right: auto; font-size: 12.5px; align-self: center"
        >全班 {{ S.students.length }} 人</span
      >
      <button class="btn btn-light" @click="closeModal()">取消</button>
      <button class="btn btn-dark" @click="go">导入</button>
    </div>
  </div>
</template>
