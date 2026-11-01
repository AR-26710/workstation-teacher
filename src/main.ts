/**
 * 应用入口：载入数据 → 挂载 → 启动自动保存
 */
import { createApp } from 'vue'
import './styles/index.scss'
import App from './App.vue'
import { S, load, replaceState, startPersistence, isStorageOk } from './core/app'
import { isPage, go } from './ui/router'
import { toast } from './ui/toast'

const saved = load()
if (saved) replaceState(saved)

createApp(App).mount('#app')

startPersistence()

// 同步地址栏里的页面
const h = (location.hash || '').replace('#/', '')
if (S.settings.onboarded && isPage(h)) go(h as Parameters<typeof go>[0])

if (!isStorageOk()) {
  window.setTimeout(() => {
    toast('浏览器禁止了本地存储，关闭页面前请到设置里导出备份')
  }, 800)
}
