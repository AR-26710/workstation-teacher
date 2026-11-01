<script setup lang="ts">
/** 成绩录入：考试列表 + 表格录入（支持 Excel 整块粘贴） */
import { computed, ref, watch } from 'vue'
import { S } from '@core/app'
import { examById, examsSorted } from '@core/select'
import { examFull, rankMap } from '@core/stats'
import { downloadFile, toCSV } from '@core/files'
import { go } from '@ui/shell/router'
import { openExamForm, openScoreImport } from '@ui/forms'
import TeacherAvatar from '@components/common/TeacherAvatar.vue'
import Icon from '@components/common/Icon.vue'
import ExamList from '@components/exam/ExamList.vue'
import ScoreTable from '@components/exam/ScoreTable.vue'
import type { Exam } from '@core/types'

const exs = computed(() => examsSorted().reverse())
const examId = ref<string | null>(null)

watch(
  exs,
  (list) => {
    if (!examId.value || !examById(examId.value)) examId.value = list.length ? list[0].id : null
  },
  { immediate: true }
)

const ex = computed<Exam | null>(() => examById(examId.value))
const importHook = computed(() => S.exams.length)

function pickExam(id: string): void {
  examId.value = id
}

function exportCsv(): void {
  const e = ex.value
  if (!e) return
  const rm = rankMap(e)
  const rows = [['学号', '姓名'].concat(e.subjects.map((s) => s.name)).concat(['总分', '排名'])]
  S.students.slice().sort((a, b) => String(a.no).localeCompare(String(b.no), 'zh', { numeric: true })).forEach((st) => {
    const row = e.scores[st.id] || {}
    const r = rm[st.id]
    rows.push(
      [st.no, st.name]
        .concat(e.subjects.map((s) => {
          const v = row[s.name]
          return v === null ? '缺考' : v === undefined ? '' : String(v)
        }))
        .concat([r ? String(r.total) : '', r ? String(r.rank) : ''])
    )
  })
  downloadFile(S.settings.className + '-' + e.name + '-成绩.csv', toCSV(rows), 'text/csv;charset=utf-8')
}
</script>

<template>
  <div class="page scroll">
    <div class="page-head">
      <div>
        <h1 class="page-title">成绩录入</h1>
        <div class="page-desc">选中一场考试，直接在表格里输入分数，或从 Excel 复制整块粘贴</div>
      </div>
      <div class="grow"></div>
      <button class="btn btn-dark" @click="openExamForm(null)"><Icon name="plus" />新建考试</button>
    </div>

    <template v-if="!exs.length">
      <div class="panel">
        <div class="empty">
          <TeacherAvatar :gender="S.settings.teacher.gender" :size="72" :bg="false" />
          还没有考试。新建一场考试，选好科目和满分，就能开始录入。
          <div style="margin-top: 14px">
            <button class="btn btn-dark" @click="openExamForm(null)"><Icon name="plus" />新建考试</button>
          </div>
        </div>
      </div>
    </template>

    <template v-else>
      <div class="score-layout">
        <ExamList :exs="exs" :exam-id="examId" @pick="pickExam" />

        <div v-if="ex" :key="ex.id + '-' + importHook">
          <div class="page-head" style="margin-bottom: 12px">
            <div>
              <div style="font-size: 17px; font-weight: 700">{{ ex.name }}</div>
              <div class="page-desc">{{ ex.date }} · {{ ex.type || '' }} · 满分 {{ examFull(ex) }}</div>
            </div>
            <div class="grow"></div>
            <button class="btn btn-light btn-sm" @click="openExamForm(ex.id)"><Icon name="edit" />编辑考试</button>
            <button class="btn btn-light btn-sm" @click="openScoreImport(ex.id, ex.name)">
              <Icon name="up" />按表头导入
            </button>
            <button class="btn btn-light btn-sm" @click="exportCsv"><Icon name="down" />导出</button>
            <button class="btn btn-dark btn-sm" @click="go('analysis')"><Icon name="chart" />看分析</button>
          </div>

          <div class="paste-hint">
            <Icon name="copy" />
            <span
              >在 Excel 里按学号顺序选中分数区域复制，点一下表格里的起始格子，<span class="kbd">Ctrl</span> +
              <span class="kbd">V</span> 即可整块填入。缺考填「缺」，回车跳到下一位同学。</span
            >
          </div>

          <ScoreTable :ex="ex" />
        </div>
      </div>
    </template>
  </div>
</template>
