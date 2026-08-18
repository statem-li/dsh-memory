/**
 * inject 层单测：pre-step 注入组装（全局+项目+置顶+facts）、source 格式、
 * 注入频率、命中刷新、失败不阻塞。
 */

import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createMemoryInjector, type PreStepAgent } from '../src/engine/inject.ts'
import { MemoryStore, projectHashOf } from '../src/engine/store.ts'
import { DEFAULT_CONFIG } from '../src/types.ts'

let dir: string
let store: MemoryStore
const PROJECT_HASH = projectHashOf('D:\\repo')

const agent: PreStepAgent = {
  id: 'session-1',
  session: { id: 'session-1', header: { cwd: 'D:\\repo' } },
}

function config(overrides: Partial<typeof DEFAULT_CONFIG> = {}) {
  return { ...DEFAULT_CONFIG, injectRefreshSteps: 8, injectTokenBudget: 6000, ...overrides }
}

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'dsh-memory-inject-'))
  store = new MemoryStore(dir)
})

afterEach(() => {
  const { rmSync } = require('node:fs') as typeof import('node:fs')
  rmSync(dir, { recursive: true, force: true })
})

async function seedEntries(): Promise<void> {
  await store.upsertEntry({ content: '用户偏好 TypeScript', scope: 'global', projectHash: null, tags: ['偏好'], importance: 10, source: 'manual' })
  await store.upsertEntry({ content: '本项目用 pnpm workspace', scope: 'project', projectHash: PROJECT_HASH, tags: ['技术'], importance: 9, source: 'manual' })
  await store.upsertEntry({ content: '重要置顶', scope: 'global', projectHash: null, tags: [], importance: 3, pinned: true, source: 'manual' })
}

describe('createMemoryInjector', () => {
  it('首步注入：enter + 追加带来源的记忆消息', async () => {
    await seedEntries()
    const injector = createMemoryInjector(store, config(), undefined)
    const next = async () => ({ kind: 'enter' as const, messages: [{ id: 'user-1' }] })
    const decision = await injector.preStepListener({ agent, messages: [], signal: new AbortController().signal }, next)
    expect(decision.kind).toBe('enter')
    const messages = (decision as { messages: unknown[] }).messages
    expect(messages).toHaveLength(2)
    const memoryMessage = messages[1] as { source: { kind: string; plugin: string; form: string; sections?: unknown[] }; content: Array<{ type: string; text: string }> }
    expect(memoryMessage.source.kind).toBe('plugin')
    expect(memoryMessage.source.plugin).toBe('dsh-memory')
    expect(memoryMessage.source.form).toBe('snapshot')
    expect(Array.isArray(memoryMessage.source.sections)).toBe(true)
    const text = memoryMessage.content.map(block => block.text).join('')
    expect(text).toContain('用户偏好 TypeScript')
    expect(text).toContain('本项目用 pnpm workspace')
    expect(text).toContain('重要置顶')
  })

  it('每个会话只在首步注入一次，后续轮次不再注入', async () => {
    await seedEntries()
    const injector = createMemoryInjector(store, config(), undefined)
    const signal = new AbortController().signal
    const next = async () => ({ kind: 'enter' as const, messages: [] })

    const first = await injector.preStepListener({ agent, messages: [], signal }, next)
    expect((first as { messages: unknown[] }).messages).toHaveLength(1)

    for (let step = 2; step <= 30; step += 1) {
      const decision = await injector.preStepListener({ agent, messages: [], signal }, next)
      expect((decision as { messages: unknown[] }).messages).toHaveLength(0)
    }
  })

  it('命中刷新：lastHitAt 更新且 importance 加分', async () => {
    await seedEntries()
    const injector = createMemoryInjector(store, config(), undefined)
    const signal = new AbortController().signal
    await injector.preStepListener({ agent, messages: [], signal }, async () => ({ kind: 'enter' as const, messages: [] }))
    const entries = await store.readEntries()
    const hit = entries.find(entry => entry.content === '用户偏好 TypeScript')
    expect(hit?.lastHitAt).not.toBeNull()
    expect(hit?.importance).toBeGreaterThan(10)
  })

  it('无记忆时不注入', async () => {
    const injector = createMemoryInjector(store, config(), undefined)
    const signal = new AbortController().signal
    const decision = await injector.preStepListener({ agent, messages: [], signal }, async () => ({ kind: 'enter' as const, messages: [{ id: 'u' }] }))
    expect((decision as { messages: unknown[] }).messages).toHaveLength(1)
  })

  it('reject 决策原样透传', async () => {
    const injector = createMemoryInjector(store, config(), undefined)
    const signal = new AbortController().signal
    const decision = await injector.preStepListener({ agent, messages: [], signal }, async () => ({ kind: 'reject' as const }))
    expect(decision).toEqual({ kind: 'reject' })
  })

  it('注入异常不阻塞（返回原决策）', async () => {
    // 制造存储错误：entries 文件路径指向非法位置。
    const badStore = new MemoryStore(join(dir, 'missing-root'))
    const injector = createMemoryInjector(badStore, config(), undefined)
    const signal = new AbortController().signal
    const decision = await injector.preStepListener({ agent, messages: [], signal }, async () => ({ kind: 'enter' as const, messages: [{ id: 'u' }] }))
    expect((decision as { messages: unknown[] }).messages).toHaveLength(1)
  })
})
