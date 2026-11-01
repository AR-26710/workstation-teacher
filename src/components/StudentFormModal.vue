<script setup lang="ts">
/** 添加 / 编辑学生表单（弹窗内容） */
import { computed, onMounted, ref } from 'vue'
import { S, save } from '../core/app'
import { FAMILY_TYPES, ROLES, TAG_POOL } from '../core/state'
import { allSeats, autoGroups, firstEmptySeat, seatMap, seatText, stuById } from '../core/select'
import { nextNo } from '../core/state'
import { deepClone, uid } from '../core/utils'
import { closeModal, confirm } from '../ui/modal'
import { toast } from '../ui/toast'
import { deleteStudent } from '../ui/actions'
import type { Gender, Student } from '../core/types'

const props = defineProps<{ sid?: string | null; presetSeat?: string | null }>()

function blank(): Student {
  return {
    id: uid('stu'),
    name: '',
    gender: 'M',
    no: nextNo(S.students),
    seat: props.presetSeat || firstEmptySeat(),
    group: 0,
    birthday: '',
    role: '',
    tags: [],
    boarding: false,
    parents: [
      { name: '', rel: '母亲', phone: '', job: '' },
      { name: '', rel: '父亲', phone: '', job: '' }
    ],
    family: '双亲家庭',
    familyNote: '',
    study: '',
    strengths: '',
    personality: '',
    health: '',
    note: '',
    comments: []
  }
}

const isNew = computed(() => !props.sid)
const d = ref<Student>(props.sid ? deepClone(stuById(props.sid) as Student) : blank())
const more = ref(false)
const tagNew = ref('')

onMounted(() => {
  while (d.value.parents.length < 2) {
    d.value.parents.push({ name: '', rel: d.value.parents.length ? '父亲' : '母亲', phone: '', job: '' })
  }
})

const seatOpts = computed(() => {
  const occ = seatMap()
  return allSeats().map((k) => {
    const o = occ[k]
    const taken = o && o.id !== d.value.id
    return {
      key: k,
      label: seatText(k) + (taken ? '（' + o.name + (isNew.value ? '，将挪到空位）' : '，将互换）') : '')
    }
  })
})

const tagPool = computed(() => {
  const extra = d.value.tags.filter((t) => TAG_POOL.indexOf(t) < 0)
  return TAG_POOL.concat(extra)
})

function toggleTag(t: string): void {
  const a = d.value.tags
  const i = a.indexOf(t)
  if (i >= 0) a.splice(i, 1)
  else a.push(t)
}

function addTag(): void {
  const t = tagNew.value.trim()
  if (!t) return
  if (d.value.tags.indexOf(t) < 0) d.value.tags.push(t)
  if (TAG_POOL.indexOf(t) < 0) TAG_POOL.push(t)
  tagNew.value = ''
}

function setGender(g: Gender): void {
  d.value.gender = g
}

function saveForm(): void {
  d.value.name = d.value.name.trim()
  if (!d.value.name) {
    toast('请填写姓名')
    return
  }
  if (d.value.boarding && d.value.tags.indexOf('住校') < 0) d.value.tags.push('住校')
  if (!d.value.boarding) d.value.tags = d.value.tags.filter((t) => t !== '住校')
  d.value.parents = d.value.parents.filter((p) => p.name || p.phone)
  // 座位被占用则互换
  const seat = d.value.seat || null
  const occ = seat ? seatMap()[seat] : null
  const old = isNew.value ? null : stuById(d.value.id)
  if (seat && occ && occ.id !== d.value.id) {
    occ.seat = old ? old.seat : null
    if (!occ.seat) {
      const m2 = seatMap()
      const free = allSeats().filter((k) => k !== seat && !m2[k])
      occ.seat = free[0] || null
    }
  }
  d.value.seat = seat
  if (isNew.value) S.students.push(d.value)
  else {
    const i = S.students.findIndex((s) => s.id === d.value.id)
    if (i >= 0) S.students[i] = d.value
  }
  autoGroups()
  save()
  const keepMore = isNew.value && more.value
  if (!keepMore) closeModal()
  toast(isNew.value ? '已添加 ' + d.value.name : '已保存')
  // 连续添加：原地换一份空白表单，弹窗不关闭
  if (keepMore) {
    d.value = {
      ...blank(),
      no: nextNo(S.students),
      seat: firstEmptySeat()
    }
  }
}

function onDelete(): void {
  const st = stuById(d.value.id)
  if (!st) return
  confirm('删除学生', '确定删除「' + st.name + '」吗？TA 的成绩、考勤、点评和成长记录也会一起删除，无法恢复。', '删除', () => {
    closeModal()
    deleteStudent(st)
    toast('已删除 ' + st.name)
  }, true)
}
</script>

<template>
  <div>
    <div class="row3">
      <div class="field">
        <label>姓名<span class="req">*</span></label>
        <input v-model="d.name" class="inp" maxlength="20" placeholder="姓名" />
      </div>
      <div class="field">
        <label>性别</label>
        <div class="seg light">
          <button type="button" :class="{ on: d.gender !== 'F' }" @click="setGender('M')">男生</button>
          <button type="button" :class="{ on: d.gender === 'F' }" @click="setGender('F')">女生</button>
        </div>
      </div>
      <div class="field">
        <label>学号</label>
        <input v-model="d.no" class="inp num" />
      </div>
    </div>

    <div class="row3">
      <div class="field">
        <label>生日</label>
        <input v-model="d.birthday" class="inp" type="date" />
      </div>
      <div class="field">
        <label>职务</label>
        <input v-model="d.role" class="inp" list="roleList" placeholder="如：班长、数学课代表" />
      </div>
      <div class="field">
        <label>座位</label>
        <select v-model="d.seat" class="sel">
          <option value="">未排座</option>
          <option v-for="o in seatOpts" :key="o.key" :value="o.key">{{ o.label }}</option>
        </select>
      </div>
    </div>

    <div class="field">
      <label>标签</label>
      <div class="chips">
        <button
          v-for="t in tagPool"
          :key="t"
          type="button"
          :class="{ on: d.tags.indexOf(t) >= 0 }"
          @click="toggleTag(t)"
        >
          {{ t }}
        </button>
        <input
          v-model="tagNew"
          class="inp"
          placeholder="+ 自定义"
          style="width: 96px; height: 28px; font-size: 12.5px; border-radius: 999px"
          @keydown.enter.prevent="addTag"
        />
      </div>
    </div>

    <div class="hr"></div>
    <div class="flabel" style="margin-bottom: 10px">家庭情况</div>
    <div class="row2">
      <div class="field">
        <label>家庭结构</label>
        <select v-model="d.family" class="sel">
          <option v-for="t in FAMILY_TYPES" :key="t">{{ t }}</option>
        </select>
      </div>
      <div class="field">
        <label>住宿</label>
        <div class="seg light">
          <button type="button" :class="{ on: !d.boarding }" @click="d.boarding = false">走读</button>
          <button type="button" :class="{ on: d.boarding }" @click="d.boarding = true">住校</button>
        </div>
      </div>
    </div>

    <div
      v-for="(p, i) in d.parents.slice(0, 2)"
      :key="i"
      class="row3"
      style="grid-template-columns: 1.1fr 0.8fr 1.2fr 1fr"
    >
      <div class="field">
        <label>{{ i === 0 ? '主要联系人' : '其他联系人' }}</label>
        <input v-model="p.name" class="inp" placeholder="姓名" />
      </div>
      <div class="field">
        <label>关系</label>
        <input v-model="p.rel" class="inp" list="relList" />
      </div>
      <div class="field">
        <label>电话</label>
        <input v-model="p.phone" class="inp num" inputmode="tel" />
      </div>
      <div class="field">
        <label>职业</label>
        <input v-model="p.job" class="inp" />
      </div>
    </div>

    <div class="field">
      <label>家庭备注</label>
      <textarea
        v-model="d.familyNote"
        class="ta"
        maxlength="500"
        placeholder="家庭氛围、监护人、沟通习惯等"
      ></textarea>
    </div>

    <div class="hr"></div>
    <div class="flabel" style="margin-bottom: 10px">学习与成长</div>
    <div class="field">
      <label>学习情况</label>
      <textarea
        v-model="d.study"
        class="ta"
        maxlength="500"
        placeholder="学习习惯、优势和薄弱学科、课堂表现"
      ></textarea>
    </div>
    <div class="row2">
      <div class="field">
        <label>性格与特长</label>
        <textarea v-model="d.personality" class="ta" maxlength="300"></textarea>
      </div>
      <div class="field">
        <label>健康情况</label>
        <textarea
          v-model="d.health"
          class="ta"
          maxlength="300"
          placeholder="过敏、视力、病史、体育课注意事项"
        ></textarea>
      </div>
    </div>
    <div class="field">
      <label>其他备注</label>
      <textarea v-model="d.note" class="ta" maxlength="500" style="min-height: 60px"></textarea>
    </div>

    <datalist id="roleList">
      <option v-for="r in ROLES" :key="r" :value="r" />
    </datalist>
    <datalist id="relList">
      <option value="母亲" />
      <option value="父亲" />
      <option value="祖母" />
      <option value="祖父" />
      <option value="外祖母" />
      <option value="外祖父" />
      <option value="其他监护人" />
    </datalist>

    <div class="modal-foot" style="margin: 12px -22px -8px; padding-bottom: 8px">
      <label v-if="isNew" class="chk" style="margin-right: auto">
        <input v-model="more" type="checkbox" /> 保存后继续添加
      </label>
      <button v-else class="btn btn-ghost" style="margin-right: auto; color: var(--red)" @click="onDelete">
        删除学生
      </button>
      <button class="btn btn-light" @click="closeModal()">取消</button>
      <button class="btn btn-dark" @click="saveForm">保存</button>
    </div>
  </div>
</template>
