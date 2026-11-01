<script setup lang="ts">
/** AI 模板参数表单（弹窗内容） */
import { computed, onBeforeUnmount, onMounted, reactive } from 'vue'
import { S } from '@core/app'
import { examsSorted, prevExam, stuById, studentsByNo, examById } from '@core/select'
import { fieldDefault, tplById, type TplField, type TplValues } from '@core/aicontext'
import { tplReader } from '@ui/ai/tplReader'
import { toast } from '@ui/shell/toast'
import Icon from '@components/common/Icon.vue'

const props = defineProps<{ tplId: string; pre?: { sid?: string | null; exam?: string | null; cmp?: string | null } }>()

const tpl = computed(() => tplById(props.tplId))

/** 每个字段一个控件：text/textarea/check → 值；select → 选中的下标；students → id 数组 */
const vals = reactive<Record<string, string>>({})
const checks = reactive<Record<string, boolean>>({})
const selIdx = reactive<Record<string, number>>({})
const picked = reactive<Record<string, string[]>>({})
const selPick = reactive<Record<string, string>>({})

const students = computed(() => studentsByNo())
const exs = computed(() => examsSorted().reverse())

function optionsOf(f: TplField): string[] {
  return (fieldDefault(f) as string[]) || []
}

onMounted(() => {
  const t = tpl.value
  if (!t) return
  t.fields.forEach((f) => {
    const key = f[0]
    const type = f[1]
    const def = fieldDefault(f)
    if (type === 'select') selIdx[key] = 0
    else if (type === 'check') checks[key] = !!def
    else if (type === 'students') picked[key] = students.value.map((s) => s.id)
    else if (type === 'student') {
      selPick[key] = (props.pre && props.pre.sid) || (students.value[0] ? students.value[0].id : '')
    } else if (type === 'exam') {
      selPick[key] = (props.pre && props.pre.exam) || (exs.value[0] ? exs.value[0].id : '')
    } else if (type === 'exam0') {
      const pre = props.pre
      let v = ''
      if (pre && pre.cmp !== null && pre.cmp !== undefined) v = pre.cmp
      else {
        const e = (pre && pre.exam ? examById(pre.exam) : null) || exs.value[0]
        const p = e ? prevExam(e) : null
        v = p ? p.id : ''
      }
      selPick[key] = v
    } else vals[key] = String(def || '')
  })
  tplReader.fn = readValues
})

onBeforeUnmount(() => {
  tplReader.fn = null
})

function pickAll(key: string, on: boolean): void {
  picked[key] = on ? students.value.map((s) => s.id) : []
}

function readValues(): TplValues | null {
  const t = tpl.value
  if (!t) return null
  const v: TplValues = {}
  let miss: string | null = null
  t.fields.forEach((f) => {
    const key = f[0]
    const type = f[1]
    if (type === 'select') v[key] = optionsOf(f)[selIdx[key] ?? 0] || ''
    else if (type === 'check') v[key] = !!checks[key]
    else if (type === 'students') v[key] = picked[key] || []
    else v[key] = (vals[key] ?? selPick[key] ?? '') as string
    if (f[5] && !v[key] && !miss) miss = f[2]
  })
  if (miss) {
    toast('请填写「' + miss + '」')
    return null
  }
  const needEx = t.fields.some((f) => f[1] === 'exam') && !v.exam
  if (needEx) {
    toast('还没有考试数据，先去「成绩录入」新建一场考试')
    return null
  }
  const badStu = t.fields.some((f) => f[1] === 'student' && !stuById(String(v[f[0]])))
  if (badStu) {
    toast('班里还没有学生，先添加学生')
    return null
  }
  return v
}

const pickCount = computed(() => {
  const t = tpl.value
  if (!t) return 0
  const f = t.fields.filter((x) => x[1] === 'students')[0]
  return f ? (picked[f[0]] || []).length : 0
})

const studentField = computed(() => {
  const t = tpl.value
  if (!t) return null
  return t.fields.filter((x) => x[1] === 'students')[0] || null
})

function isPicked(key: string, id: string): boolean {
  return (picked[key] || []).indexOf(id) >= 0
}

function togglePick(key: string, id: string): void {
  const a = picked[key] || (picked[key] = [])
  const i = a.indexOf(id)
  if (i >= 0) a.splice(i, 1)
  else a.push(id)
}
</script>

<template>
  <div v-if="tpl">
    <template v-for="f in tpl.fields" :key="f[0]">
      <!-- 文本 -->
      <div v-if="f[1] === 'text'" class="field">
        <label>{{ f[2] }}<span v-if="f[5]" class="req">*</span></label>
        <input v-model="vals[f[0]]" class="inp" :placeholder="f[4] || ''" />
      </div>

      <!-- 多行 -->
      <div v-else-if="f[1] === 'textarea'" class="field">
        <label>{{ f[2] }}<span v-if="f[5]" class="req">*</span></label>
        <textarea v-model="vals[f[0]]" class="ta" style="min-height: 70px" :placeholder="f[4] || ''"></textarea>
      </div>

      <!-- 单项选择 -->
      <div v-else-if="f[1] === 'select'" class="field">
        <label>{{ f[2] }}<span v-if="f[5]" class="req">*</span></label>
        <div class="chips">
          <button
            v-for="(o, i) in optionsOf(f)"
            :key="o"
            type="button"
            :class="{ on: (selIdx[f[0]] || 0) === i }"
            @click="selIdx[f[0]] = i"
          >
            {{ o }}
          </button>
        </div>
      </div>

      <!-- 勾选 -->
      <div v-else-if="f[1] === 'check'" class="field">
        <label class="chk"><input v-model="checks[f[0]]" type="checkbox" />{{ f[2] }}</label>
      </div>

      <!-- 单个学生 -->
      <div v-else-if="f[1] === 'student'" class="field">
        <label>{{ f[2] }}<span v-if="f[5]" class="req">*</span></label>
        <select v-model="selPick[f[0]]" class="sel">
          <option v-for="s in students" :key="s.id" :value="s.id">{{ s.no }} {{ s.name }}</option>
        </select>
      </div>

      <!-- 考试 -->
      <div v-else-if="f[1] === 'exam' || f[1] === 'exam0'" class="field">
        <label>{{ f[2] }}<span v-if="f[5]" class="req">*</span></label>
        <template v-if="!exs.length">
          <div class="muted" style="font-size: 13px">还没有考试数据</div>
        </template>
        <select v-else v-model="selPick[f[0]]" class="sel">
          <option v-if="f[1] === 'exam0'" value="">不对比</option>
          <option v-for="e in exs" :key="e.id" :value="e.id">{{ e.name }}</option>
        </select>
      </div>

      <!-- 多个学生 -->
      <div v-else-if="f[1] === 'students'" class="field">
        <label>{{ f[2] }}<span v-if="f[5]" class="req">*</span></label>
        <div style="display: flex; gap: 6px; margin-bottom: 6px">
          <button type="button" class="btn btn-xs btn-light" @click="pickAll(f[0], true)">全选</button>
          <button type="button" class="btn btn-xs btn-light" @click="pickAll(f[0], false)">全不选</button>
          <span class="muted" style="font-size: 12px; margin-left: auto; align-self: center"
            >已选 {{ pickCount }} 人</span
          >
        </div>
        <div class="pick-grid">
          <label v-for="s in students" :key="s.id">
            <input
              type="checkbox"
              :checked="isPicked(f[0], s.id)"
              @change="togglePick(f[0], s.id)"
            />{{ s.name }}
          </label>
        </div>
      </div>
    </template>

    <div v-if="S.settings.ai.mask && studentField" class="muted" style="font-size: 12px">
      <Icon name="lock" /> 学生姓名会先替换成编号再发送，结果回来后自动换回
    </div>
  </div>
</template>
