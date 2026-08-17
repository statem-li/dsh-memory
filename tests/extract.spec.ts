/**
 * extract 层单测：LLM 输出解析容错、提取 prompt 组装、事件转录文本。
 */

import { describe, expect, it } from 'vitest'
import {
  extractSystemPrompt,
  parseExtractOutput,
  textOfContent,
  transcriptFromEvents,
} from '../src/engine/extract.ts'

describe('parseExtractOutput', () => {
  it('解析标准 JSON', () => {
    const raw = '{"memories":[{"content":"用户喜欢 Vim","scope":"global","tags":["偏好"],"importance":9}]}'
    const out = parseExtractOutput(raw)
    expect(out).toHaveLength(1)
    expect(out[0]!.content).toBe('用户喜欢 Vim')
    expect(out[0]!.scope).toBe('global')
    expect(out[0]!.tags).toEqual(['偏好'])
    expect(out[0]!.importance).toBe(9)
  })

  it('剥 markdown code fence', () => {
    const raw = '```json\n{"memories":[{"content":"x","importance":7} ]}\n```'
    const out = parseExtractOutput(raw)
    expect(out).toHaveLength(1)
    expect(out[0]!.scope).toBe('project')
  })

  it('容忍前置解释文字与 BOM', () => {
    const raw = '\uFEFFHere are the memories:\n{"memories":[{"content":"a","importance":6},{"content":"b","importance":5}]}'
    const out = parseExtractOutput(raw)
    expect(out).toHaveLength(2)
  })

  it('非法 JSON 返回空', () => {
    expect(parseExtractOutput('not json at all')).toEqual([])
    expect(parseExtractOutput('')).toEqual([])
    expect(parseExtractOutput('{"memories": "nope"}')).toEqual([])
  })

  it('空 content 丢弃、importance 钳制 1-10', () => {
    const raw = '{"memories":[{"content":"","importance":10},{"content":"ok","importance":99},{"content":"ok2","importance":-5}]}'
    const out = parseExtractOutput(raw)
    expect(out).toHaveLength(2)
    expect(out[0]!.importance).toBe(10)
    expect(out[1]!.importance).toBe(1)
  })

  it('importance 下限过滤（extractCandidates 应用点由调用方控制，此处验证 parse 原样返回）', () => {
    const raw = '{"memories":[{"content":"low","importance":3},{"content":"high","importance":8}]}'
    const out = parseExtractOutput(raw)
    expect(out.map(item => item.importance)).toEqual([3, 8])
  })
})

describe('extractSystemPrompt', () => {
  it('包含 JSON 结构与 scope 规则', () => {
    const prompt = extractSystemPrompt()
    expect(prompt).toContain('"memories"')
    expect(prompt).toContain('global')
    expect(prompt).toContain('project')
    expect(prompt).toContain('importance')
  })
})

describe('textOfContent / transcriptFromEvents', () => {
  it('提取文本块', () => {
    expect(textOfContent('plain')).toBe('plain')
    expect(textOfContent([{ type: 'text', text: 'a' }, { type: 'tool-call' }, { type: 'text', text: 'b' }])).toBe('a\nb')
  })

  it('从事件流组装转录文本并跳过插件注入', () => {
    const events = [
      { type: 'user/message', data: { content: [{ type: 'text', text: '你好' }], source: { kind: 'user' } } },
      { type: 'assistant/message', data: { message: { content: [{ type: 'text', text: '你好！' }] } } },
      { type: 'user/message', data: { content: [{ type: 'text', text: '记忆注入内容' }], source: { kind: 'plugin', plugin: 'dsh-memory' } } },
    ]
    const text = transcriptFromEvents(events)
    expect(text).toContain('User: 你好')
    expect(text).toContain('Assistant: 你好！')
    expect(text).not.toContain('记忆注入内容')
  })
})
