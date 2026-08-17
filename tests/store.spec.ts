/**
 * store 层单测：读写、原子写、changes 幂等重读、去重合并。
 */

import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { MemoryStore, entryIdOf, summarize } from '../src/engine/store.ts'

let dir: string
let store: MemoryStore

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'dsh-memory-test-'))
  store = new MemoryStore(dir)
})

afterEach(() => {
  const { rmSync } = require('node:fs') as typeof import('node:fs')
  rmSync(dir, { recursive: true, force: true })
})

describe('MemoryStore', () => {
  it('entries 读写与缺失回退', async () => {
    expect(await store.readEntries()).toEqual([])
    await store.upsertEntry({ content: '用户喜欢 TypeScript', scope: 'global', projectHash: null, tags: ['偏好'], importance: 8, source: 'extract' })
    const entries = await store.readEntries()
    expect(entries).toHaveLength(1)
    expect(entries[0]!.scope).toBe('global')
    expect(entries[0]!.content).toBe('用户喜欢 TypeScript')
  })

  it('同内容（同 scope+hash）合并为 update 而非新增', async () => {
    const first = await store.upsertEntry({ content: 'D 盘是数据盘', scope: 'project', projectHash: 'abc', tags: ['环境'], importance: 6, source: 'extract' })
    expect(first.created).toBe(true)
    const second = await store.upsertEntry({ content: 'D 盘是数据盘', scope: 'project', projectHash: 'abc', tags: ['环境', '配置'], importance: 9, source: 'extract' })
    expect(second.created).toBe(false)
    expect(second.entry.importance).toBe(9)
    expect(second.entry.tags).toContain('配置')
    expect(await store.readEntries()).toHaveLength(1)
  })

  it('原子写产生完整 JSON 文件', async () => {
    await store.upsertEntry({ content: 'x', scope: 'global', projectHash: null, importance: 5, source: 'manual' })
    const raw = await import('node:fs/promises').then(fs => fs.readFile(store.entriesFile(), 'utf8'))
    const parsed = JSON.parse(raw) as { version: number; entries: unknown[] }
    expect(parsed.version).toBe(1)
    expect(parsed.entries).toHaveLength(1)
    // 无残留 tmp 文件。
    const files = await import('node:fs/promises').then(fs => fs.readdir(join(dir, 'store')))
    expect(files.some(file => file.endsWith('.tmp'))).toBe(false)
  })

  it('changes 追加与幂等重读', async () => {
    await store.appendChange({ action: 'add', entryId: 'mem_a', scope: 'global', projectHash: null, summary: 's1' })
    await store.appendChange({ action: 'add', entryId: 'mem_b', scope: 'project', projectHash: 'abc', summary: 's2' })
    const changes = await store.readChanges()
    expect(changes).toHaveLength(2)
    // 重读幂等：不重复。
    expect(await store.readChanges()).toHaveLength(2)
    // 坏行容忍：追加坏行后仍能读。
    const { appendFile } = await import('node:fs/promises')
    await appendFile(store.changesFile('2026-08-18'), 'not-json\n', 'utf8')
    expect(await store.readChanges()).toHaveLength(2)
  })

  it('patchEntry 支持改标签/置顶/移项目', async () => {
    const { entry } = await store.upsertEntry({ content: 'c', scope: 'project', projectHash: 'abc', tags: ['a'], importance: 5, source: 'manual' })
    const patched = await store.patchEntry(entry.id, { tags: ['b', 'c'], pinned: true })
    expect(patched?.tags).toEqual(['b', 'c'])
    expect(patched?.pinned).toBe(true)
    const moved = await store.patchEntry(entry.id, { scope: 'global', projectHash: null })
    expect(moved?.scope).toBe('global')
    expect(moved?.projectHash).toBeNull()
  })

  it('removeEntry 删除', async () => {
    const { entry } = await store.upsertEntry({ content: 'del', scope: 'global', projectHash: null, importance: 5, source: 'manual' })
    expect(await store.removeEntry(entry.id)).toBe(true)
    expect(await store.removeEntry(entry.id)).toBe(false)
    expect(await store.readEntries()).toHaveLength(0)
  })

  it('project meta 读写与列表', async () => {
    await store.writeProjectMeta('abc123', { path: 'D:\\repo', alias: null, locked: false })
    const meta = await store.readProjectMeta('abc123')
    expect(meta?.path).toBe('D:\\repo')
    await store.upsertEntry({ content: 'p', scope: 'project', projectHash: 'abc123', importance: 5, source: 'manual' })
    const projects = await store.listProjects(await store.readEntries())
    expect(projects).toHaveLength(1)
    expect(projects[0]!.entryCount).toBe(1)
  })
})

describe('工具函数', () => {
  it('entryIdOf 稳定且区分 scope', () => {
    const a = entryIdOf('同内容', 'global', null)
    const b = entryIdOf('同内容', 'global', null)
    const c = entryIdOf('同内容', 'project', 'hash')
    expect(a).toBe(b)
    expect(a).not.toBe(c)
  })

  it('summarize 截断 80 字', () => {
    const long = '字'.repeat(100)
    const s = summarize(long)
    expect(s.length).toBe(80)
    expect(s.endsWith('…')).toBe(true)
  })
})
