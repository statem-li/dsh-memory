# dsh-memory — DSH 本地文件记忆引擎

在 DSH 插件体系内自建本地文件记忆引擎（参考 openhanako 的分层/评分/编译设计）。
零 DSH 源码改动、零外部依赖、离线可用、完全可控。数据落 `~/.dsh/memories/dsh-memory/`。

设计规格：[docs/superpowers/specs/2026-08-18-dsh-memory-design.md](../../docs/superpowers/specs/2026-08-18-dsh-memory-design.md)

## 能力

- **自动捕获**：`turn/end` 增量窗口 → LLM 提取候选（`{content, scope, tags, importance}`）→ 直接入库 + 变更流。LLM 失败跳过本轮，绝不阻塞对话。
- **分层**：短期时间线（timeline）→ 长期沉淀（longterm），沿用评分衰减思路（importance 每天乘 `1-λ`、注入命中加分刷新 `lastHitAt`）。
- **三层调度**（ticker）：每 N 轮增量编译 / 会话结束 final 编译 / 每日编译（全量衰减 → 折叠 → 低分滚出 → daily 日志落盘 → identity 重编译）。
- **注入**：`agent/pre-step` 把「全局 identity + 当前项目 memory + pinned + facts」组装为带来源的 user message（`source: {kind:'plugin'}`），绝不写 system prompt；token 超预算按重要性截断，最低保留置顶。
- **按项目记忆**：自动跟随会话 workspace（cwd → sha1 hash），面板可手动改归属并锁定。
- **全局层**：身份/偏好类记忆自动判 `scope: global`。
- **工具**：`memory_search` / `memory_remember` / `memory_pin` / `memory_tag` / `memory_forget`（模型可直接调用）。
- **UI**：侧边栏底部「记忆」入口（`sidebar.footer.action`，order 6 紧邻技能右侧）+ badge 未读变更角标 + 深色主题 Modal 面板（Tab：全部/变更/置顶；项目切换、搜索、标签筛选、置顶区、时间线分组；裁决操作：保留/删除/改标签/移项目）。

## 数据目录（`~/.dsh/memories/dsh-memory/`）

```
├── global/                 # 全局层产物（identity.md / facts.md / pinned.md）
├── projects/<hash>/        # 项目层产物（meta.json / memory.md / facts.md / pinned.md）
├── daily/<date>.md         # 每日日志（跨项目，openhanako 同款格式）
├── store/entries.json      # 记忆条目全量索引（schema v1）
├── store/state.json        # ticker 水位线 / 评分状态
└── changes/<date>.jsonl    # 变更流（驱动通知与裁决）
```

与 dsh-memory-evolve 遗留数据同根目录、不同前缀（`dsh-memory/`），**互不读写**。

## 安装

```powershell
# 1) 构建（依赖 DSH checkout）
$env:DSH_CHECKOUT = "D:\AI\deepseek-harness"
& "C:\Program Files\Git\bin\bash.exe" scripts/build.sh

# 2) 安装：junction 到 web profile
cmd /c "mklink /J `"$env:USERPROFILE\.dsh\profiles\web\node_modules\@dsh-external\dsh-memory`" `"D:\AI\Dsh\dsh-memory`""

# 3) cordis.patch.yml 已注册（insert: id dsh-memory / name @dsh-external/dsh-memory）
# 4) 重启 DSH
```

## 配置（cordis.patch.yml 可覆盖）

| 键 | 默认 | 说明 |
| --- | --- | --- |
| `extractEveryTurns` | 1 | 每 N 轮提取一次 |
| `compileEveryTurns` | 10 | 每 N 轮增量编译 |
| `compileThreshold` | 4.5 | 低于该 importance 的短期条目不进入注入 |
| `decayLambda` | 0.02 | 每天衰减系数 |
| `hitBonus` | 2 | 注入命中加分 |
| `injectTokenBudget` | 6000 | 注入预算（字符近似） |
| `injectRefreshSteps` | 8 | 每 N 步刷新注入 |
| `dailyCompileEnabled` | true | 每日编译开关（可关，保留轮数增量） |
| `extractMaxChars` | 6000 | 提取窗口上限 |
| `minImportance` | 6 | 低于该 importance 的候选丢弃 |

## HTTP API（loopback-only，`/api/dsh-memory/*`）

`GET /list` `GET /projects` `GET /tags` `GET /changes` `GET /summary`
`POST /pin` `POST /update` `POST /move` `POST /delete` `POST /meta`

## 测试

```powershell
& "D:\AI\deepseek-harness\node_modules\.bin\vitest.cmd" run   # 43 单测
node scripts/smoke.mjs                                        # cordis 冒烟
```
