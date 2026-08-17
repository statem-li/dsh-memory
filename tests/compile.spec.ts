/**
 * compile 层单测：产物格式（四个 section 不缺失）、时间分组、注入文本组装与截断。
 */

import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  buildInjectionText,
  compileAll,
  compileGlobalArtifacts,
  compileProjectArtifacts,
  groupEntries,
  renderDaily,
  renderTimeline,
} from '../src/engine/compile.ts'
import { MemoryStore } from '../src/engine/store.ts'
import { DEFAULT_CONFIG } from '../src/types.ts'

let dir: string
let store: MemoryStore

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'dsh-memory-compile-'))
  store = new MemoryStore(dir)
})

afterEach(() => {
  const { rmSync } = require('node:fs') as typeof import('node:fs')
  rmSync(dir, { recursive: true, force: true })
})

describe('renderTimeline', () => {
  it('包含 今天/本周/更早/长期沉淀 四个分组标题（有数据时）', () => {
    const now = new Date()
    const today = new Date(now.getTime()).toISOString()
    const weekAgo = new Date(now.getTime() - 3 * 86_400_000).toISOString()
    const monthAgo = new Date(now.getTime() - 40 * 86_400_000).toISOString()
    const md = renderTimeline([
      { id: 'a', content: '今天的事', scope: 'project', projectHash: 'h', tags: [], pinned: false, createdAt: today, updatedAt: today, importance: 9, lastHitAt: null, layer: 'short', source: 'extract' },
      { id: 'b', content: '本周的事', scope: 'project', projectHash: 'h', tags: [], pinned: false, createdAt: weekAgo, updatedAt: weekAgo, importance: 8, lastHitAt: null, layer: 'short', source: 'extract' },
      { id: 'c', content: '更早的事', scope: 'project', projectHash: 'h', tags: [], pinned: false, createdAt: monthAgo, updatedAt: monthAgo, importance: 7, lastHitAt: null, layer: 'short', source: 'extract' },
      { id: 'd', content: '长期的事', scope: 'project', projectHash: 'h', tags: [], pinned: false, createdAt: today, updatedAt: today, importance: 5, lastHitAt: null, layer: 'long', source: 'extract' },
    ])
    expect(md).toContain('## 今天')
    expect(md).toContain('## 本周')
    expect(md).toContain('## 更早')
    expect(md).toContain('## 长期沉淀')
    expect(md).toContain('今天的事')
    expect(md).toContain('长期的事')
  })
})

describe('groupEntries', () => {
  it('按时间分组', () => {
    const now = new Date()
    const groups = groupEntries([
      { id: 'a', content: '', scope: 'global', projectHash: null, tags: [], pinned: false, createdAt: '', updatedAt: now.toISOString(), importance: 1, lastHitAt: null, layer: 'short', source: 'extract' },
      { id: 'b', content: '', scope: 'global', projectHash: null, tags: [], pinned: false, createdAt: '', updatedAt: new Date(now.getTime() - 3 * 86_400_000).toISOString(), importance: 1, lastHitAt: null, layer: 'short', source: 'extract' },
      { id: 'c', content: '', scope: 'global', projectHash: null, tags: [], pinned: false, createdAt: '', updatedAt: new Date(now.getTime() - 40 * 86_400_000).toISOString(), importance: 1, lastHitAt: null, layer: 'short', source: 'extract' },
      { id: 'd', content: '', scope: 'global', projectHash: null, tags: [], pinned: false, createdAt: '', updatedAt: now.toISOString(), importance: 1, lastHitAt: null, layer: 'long', source: 'extract' },
    ])
    expect(groups.today).toHaveLength(1)
    expect(groups.week).toHaveLength(1)
    expect(groups.earlier).toHaveLength(1)
    expect(groups.longterm).toHaveLength(1)
  })
})

describe('compile 产物', () => {
  it('全局层产物包含 identity/facts/pinned', () => {
    const artifacts = compileGlobalArtifacts([
      { id: 'a', content: '我喜欢简洁的代码', scope: 'global', projectHash: null, tags: ['偏好'], pinned: false, createdAt: '', updatedAt: '', importance: 9, lastHitAt: null, layer: 'short', source: 'extract' },
      { id: 'b', content: '公司规定每周五发周报', scope: 'global', projectHash: null, tags: ['事实'], pinned: false, createdAt: '', updatedAt: '', importance: 7, lastHitAt: null, layer: 'short', source: 'extract' },
      { id: 'c', content: '置顶的全局事实', scope: 'global', projectHash: null, tags: [], pinned: true, createdAt: '', updatedAt: '', importance: 6, lastHitAt: null, layer: 'short', source: 'extract' },
    ])
    expect(artifacts.identity).toContain('我喜欢简洁的代码')
    expect(artifacts.facts).toContain('公司规定每周五发周报')
    expect(artifacts.pinned).toContain('置顶的全局事实')
  })

  it('compileAll 写出全局与项目产物文件', async () => {
    await store.upsertEntry({ content: '项目决策 A', scope: 'project', projectHash: 'abc123', tags: ['决策'], importance: 9, source: 'manual' })
    await store.upsertEntry({ content: '我的名字叫小明', scope: 'global', projectHash: null, tags: ['身份'], importance: 10, source: 'manual' })
    await compileAll(store, DEFAULT_CONFIG)
    const { readFile } = await import('node:fs/promises')
    const memory = await readFile(join(dir, 'projects', 'abc123', 'memory.md'), 'utf8')
    expect(memory).toContain('项目决策 A')
    const identity = await readFile(join(dir, 'global', 'identity.md'), 'utf8')
    expect(identity).toContain('我的名字叫小明')
  })
})

describe('renderDaily', () => {
  it('openhanako 同款格式', () => {
    const md = renderDaily('2026-08-18', [
      { action: 'add', summary: '新记忆', scope: 'global' },
      { action: 'promote', summary: '沉淀记忆', scope: 'project' },
    ])
    expect(md).toContain('# 2026-08-18 记忆日志')
    expect(md).toContain('[新增]')
    expect(md).toContain('[沉淀]')
  })
})

describe('buildInjectionText', () => {
  const entry = (partial: Partial<Parameters<typeof renderTimeline>[0][number]> = {}) => ({
    id: 'mem_x',
    content: '内容',
    scope: 'global' as const,
    projectHash: null,
    tags: [] as string[],
    pinned: false,
    createdAt: '',
    updatedAt: '',
    importance: 9,
    lastHitAt: null,
    layer: 'short' as const,
    source: 'extract' as const,
    ...partial,
  })

  it('identity/memory/pinned/facts 四 section 组装', () => {
    const { text, sections } = buildInjectionText([
      entry({ content: '身份信息', tags: ['身份'], scope: 'global', importance: 10 }),
      entry({ content: '项目信息', scope: 'project', importance: 8 }),
      entry({ content: '置顶信息', pinned: true, importance: 1 }),
      entry({ content: '事实信息', tags: ['事实'], scope: 'global', importance: 8 }),
    ], DEFAULT_CONFIG)
    expect(sections.map(section => section.name).sort()).toEqual(['facts', 'identity', 'memory', 'pinned'])
    expect(text).toContain('身份信息')
    expect(text).toContain('项目信息')
    expect(text).toContain('置顶信息')
    expect(text).toContain('事实信息')
  })

  it('token 预算截断：pinned 最低保留', () => {
    const many = Array.from({ length: 200 }, (_, index) =>
      entry({ id: `mem_${index}`, content: `普通记忆${'很长的内容'.repeat(50)}${index}`, importance: 7 }))
    const pinned = entry({ id: 'mem_pin', content: '必须保留的置顶', pinned: true, importance: 1 })
    const { text, sections } = buildInjectionText([...many, pinned], DEFAULT_CONFIG)
    // pinned 必在。
    expect(text).toContain('必须保留的置顶')
    const pinnedSection = sections.find(section => section.name === 'pinned')
    expect(pinnedSection?.text).toContain('必须保留的置顶')
  })
})
