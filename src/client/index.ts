/**
 * dsh-memory browser half：注册侧边栏 footer 动作（sidebar.footer.action，
 * order 6 紧邻技能入口右侧）并打开记忆面板。全部数据走 host 的
 * /api/dsh-memory/* HTTP 路由（纯 fetch——无 typert、无 DSH 源码改动）。
 */

import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import { MemoryEntry } from './Entry.tsx'
import { createMemoryApi, type MemoryApi } from './api.ts'
import { en, NS, zh, type MemoryLocaleKey } from './locales.ts'

export type { MemoryEntryProps } from './Entry.tsx'
export type { MemoryPanelProps, MemoryTab } from './Panel.tsx'
export type { MemoryLocaleKey } from './locales.ts'
export type { MemoryApi, MemoryEntryView, ProjectView, ChangeView } from './api.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** The dsh-memory sidebar entry and panel copy. */
    dshMemory: MemoryLocaleKey
  }
}

/** Services required by the footer registration. */
export const inject = ['slots', 'locale']

/** Contribute the footer entry wired to the dsh-memory HTTP API. */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'dsh-memory: dictionaries')

  const panelInjected = (): MemoryApi => createMemoryApi()

  ctx.slots.inject('sidebar.footer.action', () => ctx.slots.register({
    name: 'sidebar.footer.action',
    id: 'dsh-memory',
    // usage-skill 合并了「用量+技能」（order 10，占满整行）；记忆放其后（11）
    // 并在 styles.ts 中让 usg_layer 收缩到 50%，使「技能」右侧紧邻完整显示的记忆按钮。
    order: 11,
    locale: NS,
    inject: panelInjected,
  }, MemoryEntry))
}
