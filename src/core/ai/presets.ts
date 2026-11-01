/**
 * AI 服务商预设：各家的 Base URL / 默认模型 / 控制台地址
 *
 * 职责：纯配置表 + 取值辅助，不含任何请求逻辑。
 */



export interface AiPreset {
  id: string
  name: string
  base: string
  model: string
  site?: string
  hint?: string
}

export const AI_PRESETS: AiPreset[] = [
  {
    id: 'deepseek',
    name: 'DeepSeek',
    base: 'https://api.deepseek.com',
    model: 'deepseek-flash',
    site: 'platform.deepseek.com',
    hint: '需要更强的推理可以把模型改成 deepseek-v4-pro'
  },
  {
    id: 'qwen',
    name: '通义千问（阿里云百炼）',
    base: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    model: 'qwen-plus',
    site: 'bailian.console.aliyun.com'
  },
  { id: 'kimi', name: 'Kimi（月之暗面）', base: 'https://api.moonshot.cn/v1', model: 'kimi-k3', site: 'platform.moonshot.cn' },
  {
    id: 'glm',
    name: '智谱 GLM',
    base: 'https://open.bigmodel.cn/api/paas/v4',
    model: 'glm-4-flash',
    site: 'open.bigmodel.cn',
    hint: 'glm-4-flash 是免费模型，也可以换成控制台里的其他模型'
  },
  {
    id: 'doubao',
    name: '豆包（火山方舟）',
    base: 'https://ark.cn-beijing.volces.com/api/v3',
    model: '',
    site: 'console.volcengine.com/ark',
    hint: '模型名填方舟控制台里的模型 ID 或推理接入点 ID'
  },
  {
    id: 'silicon',
    name: '硅基流动',
    base: 'https://api.siliconflow.cn/v1',
    model: 'deepseek-ai/DeepSeek-V3',
    site: 'cloud.siliconflow.cn'
  },
  { id: 'openai', name: 'OpenAI', base: 'https://api.openai.com/v1', model: 'gpt-4o-mini', site: 'platform.openai.com' },
  {
    id: 'claude',
    name: 'Claude（Anthropic）',
    base: 'https://api.anthropic.com/v1',
    model: 'claude-sonnet-5-5',
    site: 'console.anthropic.com'
  },
  {
    id: 'ollama',
    name: 'Ollama 本地模型',
    base: 'http://localhost:11434/v1',
    model: 'qwen2.5:7b',
    site: 'ollama.com',
    hint: '本地运行无需 Key；需设置环境变量 OLLAMA_ORIGINS=* 允许网页访问'
  },
  {
    id: 'custom',
    name: '自定义（OpenAI 兼容接口）',
    base: '',
    model: '',
    site: '',
    hint: '任何兼容 /chat/completions 的服务都可以，比如 one-api、new-api 中转'
  }
]

export function presetOf(id: string): AiPreset {
  for (let i = 0; i < AI_PRESETS.length; i++) if (AI_PRESETS[i].id === id) return AI_PRESETS[i]
  return AI_PRESETS[AI_PRESETS.length - 1]
}

export function tempOf(a: { temp: number }): number {
  const t = parseFloat(String(a.temp))
  return isNaN(t) ? 0.7 : Math.max(0, Math.min(1.5, t))
}
