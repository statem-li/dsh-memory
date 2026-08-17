/**
 * scoring 层单测：衰减数学、命中刷新、注入资格、沉淀/滚出判断。
 */

import { describe, expect, it } from 'vitest'
import { applyHit, daysSince, decayImportance, isInjectionEligible, shouldEvict, shouldPromote } from '../src/engine/scoring.ts'
import type { MemoryEntry } from '../src/types.ts'

function entry(partial: Partial<MemoryEntry>): MemoryEntry {
  return {
    id: 'mem_x',
    content: 'c',
    scope: 'global',
    projectHash: null,
    tags: [],
    pinned: false,
    createdAt: '2026-08-18T00:00:00+08:00',
    updatedAt: '2026-08-18T00:00:00+08:00',
    importance: 10,
    lastHitAt: null,
    layer: 'short',
    source: 'extract',
    ...partial,
  }
}

describe('decayImportance', () => {
  it('每天乘 (1 - λ)', () => {
    // 10 * 0.98^1 = 9.8
    expect(decayImportance(10, 1, 0.02)).toBe(9.8)
    // 10 * 0.98^30 ≈ 5.45
    expect(decayImportance(10, 30, 0.02)).toBeCloseTo(5.45, 1)
  })

  it('0 天不衰减', () => {
    expect(decayImportance(10, 0, 0.02)).toBe(10)
  })

  it('负数天数按 0 处理', () => {
    expect(decayImportance(10, -3, 0.02)).toBe(10)
  })
})

describe('applyHit', () => {
  it('加分并刷新 lastHitAt', () => {
    const hit = applyHit(entry({ importance: 8, lastHitAt: null }), 2)
    expect(hit.importance).toBe(10)
    expect(hit.lastHitAt).not.toBeNull()
  })

  it('importance 上限 20', () => {
    expect(applyHit(entry({ importance: 19 }), 2).importance).toBe(20)
  })
})

describe('daysSince', () => {
  it('计算天数', () => {
    const now = new Date('2026-08-18T12:00:00+08:00')
    expect(daysSince('2026-08-17T12:00:00+08:00', now)).toBe(1)
    expect(daysSince(null, now)).toBe(0)
    expect(daysSince('2026-08-18T13:00:00+08:00', now)).toBe(0)
  })
})

describe('isInjectionEligible', () => {
  it('pinned 无条件进入', () => {
    expect(isInjectionEligible(entry({ pinned: true, importance: 1 }), 4.5)).toBe(true)
  })

  it('长期层始终进入', () => {
    expect(isInjectionEligible(entry({ layer: 'long', importance: 1 }), 4.5)).toBe(true)
  })

  it('短期低于阈值不进入', () => {
    expect(isInjectionEligible(entry({ importance: 3 }), 4.5)).toBe(false)
    expect(isInjectionEligible(entry({ importance: 6 }), 4.5)).toBe(true)
  })
})

describe('shouldPromote / shouldEvict', () => {
  it('高价值（≥2×阈值）立即沉淀', () => {
    expect(shouldPromote(entry({ importance: 10 }), 4.5)).toBe(true)
    expect(shouldPromote(entry({ importance: 8 }), 4.5)).toBe(false)
  })

  it('经时间检验（≥14 天且 ≥阈值）沉淀', () => {
    const old = '2026-07-01T00:00:00+08:00'
    expect(shouldPromote(entry({ updatedAt: old, importance: 6 }), 4.5)).toBe(true)
  })

  it('超 60 天且低分（<阈值一半）滚出', () => {
    const old = '2026-05-01T00:00:00+08:00'
    expect(shouldEvict(entry({ updatedAt: old, importance: 2 }), 4.5)).toBe(true)
    expect(shouldEvict(entry({ updatedAt: old, importance: 3 }), 4.5)).toBe(false)
    expect(shouldEvict(entry({ updatedAt: old, importance: 2, pinned: true }), 4.5)).toBe(false)
  })
})
