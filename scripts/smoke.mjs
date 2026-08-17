/**
 * dsh-memory 最小 cordis 冒烟测试：mock webServer/tools/agents 服务，
 * 加载 lib/index.js 的 apply，验证插件在真实 cordis 上下文下挂载不抛错，
 * 并手动驱动 session/event（turn 捕获）与 agent/pre-step（注入）不产生异常。
 * 数据写入临时 DSH_HOME，不污染真实记忆目录。
 *
 * 运行：node scripts/smoke.mjs（在插件目录下）
 */

import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Context } from '@deepseek-ai/cordis'

// 隔离数据目录。
process.env.DSH_HOME = mkdtempSync(join(tmpdir(), 'dsh-memory-smoke-'))

// 1) 创建最小上下文并 mock 服务。
const ctx = new Context()

let routeRegistered = 0
ctx.provide('webServer', {
  register(route) {
    routeRegistered += 1
    if (route.path !== '/api/dsh-memory') throw new Error(`unexpected route path: ${route.path}`)
    return () => { routeRegistered -= 1 }
  },
})

const toolNames = []
ctx.provide('tools', {
  register(definition) {
    toolNames.push(definition.name)
    return () => { /* noop */ }
  },
})

ctx.provide('agents', {
  get() {
    return undefined
  },
})

// 2) 加载插件并 apply。
const plugin = await import('../lib/index.js')
if (plugin.name !== 'dsh-memory') throw new Error(`unexpected plugin name: ${plugin.name}`)
plugin.apply(ctx, {})

console.log('route registered:', routeRegistered === 1)
console.log('tools registered:', toolNames.sort().join(', '))
for (const expected of ['memory_search', 'memory_remember', 'memory_pin', 'memory_tag', 'memory_forget']) {
  if (!toolNames.includes(expected)) throw new Error(`missing tool: ${expected}`)
}

// 3) 驱动 session/event：一整个 turn 的数据流（llm 未提供 → 提取静默跳过；ticker 写盘）。
const session = {
  id: 'smoke-session',
  header: { cwd: 'D:\\smoke' },
}

ctx.emit('session/event', session, { type: 'turn/start', data: { turn: 1 }, seq: 0, time: Date.now() })
ctx.emit('session/event', session, {
  type: 'user/message',
  data: { content: [{ type: 'text', text: '帮我重构一下这个模块' }], source: { kind: 'user' } },
  seq: 1,
  time: Date.now(),
})
ctx.emit('session/event', session, {
  type: 'assistant/message',
  data: { message: { content: [{ type: 'text', text: '好的，我来看看' }] } },
  seq: 2,
  time: Date.now(),
})
ctx.emit('session/event', session, { type: 'turn/end', data: { turn: 1, reason: { kind: 'completed' } }, seq: 3, time: Date.now() })

await new Promise(resolve => setTimeout(resolve, 300))

// 4) 驱动 agent/pre-step：无记忆时不注入、不抛错。
const payload = {
  agent: { id: 'smoke-session', session },
  messages: [{ id: 'm1' }],
  turn: 2,
  step: 1,
  signal: new AbortController().signal,
}
const decision = await ctx.waterfall('agent/pre-step', payload, async () => ({ kind: 'enter', messages: [] }))
console.log('pre-step decision:', decision.kind)

// 5) ticker 应已写 state.json（turn 计数）。
const { readFileSync, existsSync } = await import('node:fs')
const stateFile = join(process.env.DSH_HOME, 'memories', 'dsh-memory', 'store', 'state.json')
console.log('state.json written:', existsSync(stateFile))
if (existsSync(stateFile)) {
  const state = JSON.parse(readFileSync(stateFile, 'utf8'))
  console.log('turn count:', state.perSession['smoke-session']?.turnCount)
}

console.log('smoke OK')
