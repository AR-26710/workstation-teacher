/**
 * 存储（localStorage 不可用时自动降级为内存）
 */
const memory: Record<string, string> = {}

let ok = true
try {
  localStorage.setItem('__bzr_t', '1')
  localStorage.removeItem('__bzr_t')
} catch {
  ok = false
}

export const Store = {
  ok: () => ok,
  get: (k: string): string | null => {
    try {
      return ok ? localStorage.getItem(k) : memory[k] || null
    } catch {
      return memory[k] || null
    }
  },
  set: (k: string, v: string): boolean => {
    try {
      if (ok) localStorage.setItem(k, v)
      else memory[k] = v
      return true
    } catch {
      memory[k] = v
      return false
    }
  },
  del: (k: string): void => {
    try {
      if (ok) localStorage.removeItem(k)
    } catch {
      /* ignore */
    }
    delete memory[k]
  }
}
