import { URL } from "node:url";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, readdir, rename, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { BlockAssembler, createUserMessage } from "@deepseek-ai/dsh-llm";
import { defineTool } from "@deepseek-ai/dsh-tools";
//#region src/engine/store.ts
/**
* dsh-memory 文件存储层：entries.json / state.json / changes/<date>.jsonl /
* 各层 md 产物。所有写入走「tmp + rename」原子写，防止半写损坏。
* 数据根：${DSH_HOME:-~/.dsh}/memories/dsh-memory/（与 memory-evolve 遗留数据同根目录、不同前缀，互不读写）。
*/
/** 数据根目录。 */
function memoryHome() {
	return join(process.env.DSH_HOME ?? join(homedir(), ".dsh"), "memories", "dsh-memory");
}
/** workspace 路径 → 项目目录 hash（sha1 前 12 位）。 */
function projectHashOf(cwd) {
	return createHash("sha1").update(cwd).digest("hex").slice(0, 12);
}
/** 记忆条目稳定 id：mem_<sha1(content|scope|projectHash)>，同内容合并。 */
function entryIdOf(content, scope, projectHash) {
	const key = `${scope}\u0000${projectHash ?? ""}\u0000${content.trim()}`;
	return `mem_${createHash("sha1").update(key).digest("hex").slice(0, 16)}`;
}
/** 本地日期 YYYY-MM-DD。 */
function localDate(date = /* @__PURE__ */ new Date()) {
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
/** ISO 时间（本地时区偏移保留）。 */
function nowIso() {
	return (/* @__PURE__ */ new Date()).toISOString();
}
/** 原子写文本：tmp + rename（同一目录内）。 */
async function atomicWriteText(file, content) {
	await mkdir(join(file, ".."), { recursive: true });
	const temp = `${file}.tmp`;
	await writeFile(temp, content, "utf8");
	await rename(temp, file);
}
/** 原子写 JSON。 */
async function atomicWriteJson(file, value) {
	await atomicWriteText(file, `${JSON.stringify(value, null, 2)}\n`);
}
/** 读取 JSON，缺失/损坏返回 fallback。 */
async function readJson(file, fallback) {
	try {
		return JSON.parse(await readFile(file, "utf8"));
	} catch {
		return fallback;
	}
}
/** 追加一行 JSONL（追加本身用 appendFile；损坏容忍，读侧幂等）。 */
async function appendJsonl(file, value) {
	await mkdir(join(file, ".."), { recursive: true });
	const { appendFile } = await import("node:fs/promises");
	await appendFile(file, `${JSON.stringify(value)}\n`, "utf8");
}
/** 读取 JSONL（容忍坏行），返回 { entries, seq }。 */
async function readJsonl(file) {
	let raw;
	try {
		raw = await readFile(file, "utf8");
	} catch {
		return [];
	}
	const out = [];
	for (const line of raw.split(/\r?\n/)) {
		const trimmed = line.trim();
		if (trimmed === "") continue;
		try {
			out.push(JSON.parse(trimmed));
		} catch {}
	}
	return out;
}
/**
* MemoryStore：所有记忆数据的读写入口。
* 线程模型：调用方（ticker / turn/end 捕获）通过同一实例串行化写入，
* 内部只保证单文件操作的原子性。
*/
var MemoryStore = class {
	root;
	constructor(root = memoryHome()) {
		this.root = root;
	}
	entriesFile() {
		return join(this.root, "store", "entries.json");
	}
	stateFile() {
		return join(this.root, "store", "state.json");
	}
	changesFile(date) {
		return join(this.root, "changes", `${date}.jsonl`);
	}
	globalDir() {
		return join(this.root, "global");
	}
	projectDir(hash) {
		return join(this.root, "projects", hash);
	}
	dailyFile(date) {
		return join(this.root, "daily", `${date}.md`);
	}
	/** 全量条目索引（缺失/损坏从空开始）。 */
	async readEntries() {
		const file = await readJson(this.entriesFile(), {
			version: 1,
			entries: []
		});
		return Array.isArray(file.entries) ? file.entries : [];
	}
	async writeEntries(entries) {
		await atomicWriteJson(this.entriesFile(), {
			version: 1,
			entries
		});
	}
	/**
	* entries.json 写串行队列：所有「读-改-写」操作必须经此队列执行，
	* 消除提取/注入命中刷新/API 裁决/每日编译之间的并发覆盖（read-modify-write 竞争）。
	*/
	writeQueue = Promise.resolve();
	enqueueWrite(task) {
		const result = this.writeQueue.then(task);
		this.writeQueue = result.then(() => void 0, () => void 0);
		return result;
	}
	/**
	* 原子化「读 entries → 修改 → 写回」。fn 原地修改传入数组（或返回替换数组）。
	* @param fn - 接收当前 entries 快照，修改或返回新数组；返回值透传。
	*/
	async mutateEntries(fn) {
		return this.enqueueWrite(async () => {
			const entries = await this.readEntries();
			const result = await fn(entries);
			await this.writeEntries(entries);
			return result;
		});
	}
	async getEntry(id) {
		return (await this.readEntries()).find((entry) => entry.id === id);
	}
	/**
	* 新增或更新（同 id 合并）。返回 { created, entry }。
	* 同时按去重逻辑：新增时若同内容（同 scope+projectHash）已存在则合并为 update。
	*/
	async upsertEntry(next) {
		return this.mutateEntries((entries) => {
			const id = entryIdOf(next.content, next.scope, next.projectHash);
			const existing = entries.find((entry) => entry.id === id);
			const now = nowIso();
			let entry;
			if (existing !== void 0) {
				entry = {
					...existing,
					content: next.content,
					tags: mergeTags(existing.tags, next.tags),
					pinned: next.pinned ?? existing.pinned,
					importance: Math.max(existing.importance, next.importance ?? existing.importance),
					layer: next.layer ?? existing.layer,
					updatedAt: now
				};
				entries.splice(entries.indexOf(existing), 1, entry);
				return {
					created: false,
					entry
				};
			}
			entry = {
				id,
				content: next.content,
				scope: next.scope,
				projectHash: next.scope === "project" ? next.projectHash : null,
				tags: next.tags ?? [],
				pinned: next.pinned ?? false,
				createdAt: now,
				updatedAt: now,
				importance: next.importance ?? 10,
				lastHitAt: null,
				layer: next.layer ?? "short",
				source: next.source ?? "extract"
			};
			entries.push(entry);
			return {
				created: true,
				entry
			};
		});
	}
	/** 替换单条（用于裁决操作：改标签/移项目/置顶）。返回新条目；不存在返回 undefined。 */
	async patchEntry(id, patch) {
		return this.mutateEntries((entries) => {
			const index = entries.findIndex((entry) => entry.id === id);
			if (index === -1) return void 0;
			const updated = {
				...entries[index],
				...patch,
				id,
				updatedAt: nowIso()
			};
			if (updated.scope === "global") updated.projectHash = null;
			entries[index] = updated;
			return updated;
		});
	}
	/** 删除条目。返回是否删除成功。 */
	async removeEntry(id) {
		return this.mutateEntries((entries) => {
			const index = entries.findIndex((entry) => entry.id === id);
			if (index === -1) return false;
			entries.splice(index, 1);
			return true;
		});
	}
	/** 注入命中刷新（原子）：给命中的条目加分并刷新 lastHitAt，返回刷新条数。 */
	async applyHits(hitIds, bonus) {
		return this.mutateEntries((entries) => {
			let count = 0;
			for (const entry of entries) {
				if (!hitIds.has(entry.id)) continue;
				entry.importance = Math.min(20, Math.round((entry.importance + bonus) * 100) / 100);
				entry.lastHitAt = nowIso();
				count += 1;
			}
			return count;
		});
	}
	/** 原子替换全部条目（ticker 每日编译等批量场景；fn 返回新数组）。 */
	async replaceEntries(fn) {
		return this.enqueueWrite(async () => {
			const next = await fn(await this.readEntries());
			await this.writeEntries(next);
			return next;
		});
	}
	async appendChange(change) {
		const record = {
			...change,
			id: `chg_${Date.now().toString(36)}_${randomUUID().slice(0, 8)}`,
			at: nowIso()
		};
		await appendJsonl(this.changesFile(localDate()), record);
		return record;
	}
	async readChanges(date) {
		if (date !== void 0) return readJsonl(this.changesFile(date));
		const dir = join(this.root, "changes");
		let files;
		try {
			files = await readdir(dir);
		} catch {
			return [];
		}
		const dates = files.filter((file) => /^\d{4}-\d{2}-\d{2}\.jsonl$/.test(file)).sort();
		const all = [];
		for (const file of dates) all.push(...await readJsonl(join(dir, file)));
		return all;
	}
	/** 插件错误日志（追加模式，供崩溃排查；DSH 控制台日志不落盘）。 */
	async appendErrorLog(stage, message) {
		const { appendFile } = await import("node:fs/promises");
		const file = join(this.root, "log", "errors.log");
		await mkdir(join(file, ".."), { recursive: true });
		await appendFile(file, `[${nowIso()}] ${stage}: ${message}\n`, "utf8");
	}
	/** 提取诊断日志（追加模式：开始/结束/耗时/候选数，排查提取卡死）。 */
	async appendExtractLog(message) {
		const { appendFile } = await import("node:fs/promises");
		const file = join(this.root, "log", "extract.log");
		await mkdir(join(file, ".."), { recursive: true });
		await appendFile(file, `[${nowIso()}] ${message}\n`, "utf8");
	}
	async readState() {
		const state = await readJson(this.stateFile(), {
			schemaVersion: 1,
			perSession: {},
			lastDailyDate: null
		});
		if (state.perSession === void 0 || state.perSession === null) state.perSession = {};
		return state;
	}
	async writeState(state) {
		await atomicWriteJson(this.stateFile(), state);
	}
	/** 注入被关闭的会话 id（内存缓存；null = 未加载）。 */
	injectDisabledCache = null;
	async ensureInjectCache() {
		if (this.injectDisabledCache !== null) return this.injectDisabledCache;
		const state = await this.readState();
		this.injectDisabledCache = new Set(Array.isArray(state.injectDisabled) ? state.injectDisabled : []);
		return this.injectDisabledCache;
	}
	/** 该会话是否启用记忆注入（默认开启）。 */
	async isInjectEnabled(sessionId) {
		return !(await this.ensureInjectCache()).has(sessionId);
	}
	/** 设置该会话的记忆注入开关（持久化到 state.json，走写串行队列）。 */
	async setInjectEnabled(sessionId, enabled) {
		const cache = await this.ensureInjectCache();
		const next = new Set(cache);
		if (enabled) next.delete(sessionId);
		else next.add(sessionId);
		this.injectDisabledCache = next;
		await this.enqueueWrite(async () => {
			const state = await this.readState();
			state.injectDisabled = [...next];
			await this.writeState(state);
		});
	}
	async readProjectMeta(hash) {
		return await readJson(join(this.projectDir(hash), "meta.json"), null) ?? void 0;
	}
	async writeProjectMeta(hash, meta) {
		await atomicWriteJson(join(this.projectDir(hash), "meta.json"), meta);
	}
	/** 列出全部项目（含 meta 与统计）。 */
	async listProjects(entries) {
		const dir = join(this.root, "projects");
		let hashes;
		try {
			hashes = (await readdir(dir, { withFileTypes: true })).filter((entry) => entry.isDirectory()).map((entry) => entry.name);
		} catch {
			hashes = [];
		}
		const projects = [];
		for (const hash of hashes) {
			const meta = await this.readProjectMeta(hash);
			if (meta === void 0) continue;
			const owned = entries.filter((entry) => entry.scope === "project" && entry.projectHash === hash);
			projects.push({
				hash,
				path: meta.path,
				alias: meta.alias,
				locked: meta.locked,
				entryCount: owned.length,
				pinnedCount: owned.filter((entry) => entry.pinned).length
			});
		}
		projects.sort((a, b) => a.path.localeCompare(b.path));
		return projects;
	}
	/**
	* 读取 DSH 工作区注册表（${DSH_HOME}/storages/workspace.json），容错返回空。
	* 用于让「尚无记忆的新工作区」也出现在面板项目列表（entryCount 0）。
	*/
	async listDshWorkspaces() {
		const table = (await readJson(join(process.env.DSH_HOME ?? join(homedir(), ".dsh"), "storages", "workspace.json"), {}))?.tables?.workspaces;
		if (typeof table !== "object" || table === null) return [];
		const out = [];
		for (const record of Object.values(table)) if (typeof record === "object" && record !== null && typeof record.path === "string" && record.path !== "") out.push({
			path: record.path,
			title: typeof record.title === "string" && record.title !== "" ? record.title : record.path
		});
		return out;
	}
	/** 写任意 md 产物（原子）。 */
	async writeArtifact(path, content) {
		await atomicWriteText(join(this.root, path), content);
	}
	/** 写项目层产物。 */
	async writeProjectArtifacts(hash, artifacts) {
		const dir = this.projectDir(hash);
		await mkdir(dir, { recursive: true });
		for (const [name, content] of Object.entries(artifacts)) {
			if (content === void 0) continue;
			await atomicWriteText(join(dir, `${name}.md`), content);
		}
	}
	/** 写全局层产物。 */
	async writeGlobalArtifacts(artifacts) {
		const dir = this.globalDir();
		await mkdir(dir, { recursive: true });
		for (const [name, content] of Object.entries(artifacts)) {
			if (content === void 0) continue;
			await atomicWriteText(join(dir, `${name}.md`), content);
		}
	}
};
/** 合并标签（保留旧标签 + 新标签，去重，上限 8）。 */
function mergeTags(existing, next, max = 8) {
	const out = [];
	for (const tag of [...existing, ...next ?? []]) {
		const t = String(tag).trim();
		if (t === "") continue;
		if (!out.includes(t)) out.push(t);
		if (out.length >= max) break;
	}
	return out;
}
/** 摘要（截断 80 字）。 */
function summarize(content, max = 80) {
	const flat = content.replace(/\s+/g, " ").trim();
	return flat.length <= max ? flat : `${flat.slice(0, max - 1)}…`;
}
//#endregion
//#region src/engine/scoring.ts
/** 衰减后的 importance（每天乘 (1 - λ)）。 */
function decayImportance(importance, days, lambda) {
	if (days <= 0) return importance;
	const decayed = importance * Math.pow(1 - lambda, days);
	return Math.round(decayed * 100) / 100;
}
/** 距离某时间的天数（不足 1 天按 0）。 */
function daysSince(iso, from = /* @__PURE__ */ new Date()) {
	if (iso === null) return 0;
	const time = Date.parse(iso);
	if (Number.isNaN(time)) return 0;
	return Math.max(0, Math.floor((from.getTime() - time) / 864e5));
}
/** 是否进入注入产物：pinned 无条件；否则 importance 达到阈值（仅短期层；长期层天然已沉淀）。 */
function isInjectionEligible(entry, threshold) {
	if (entry.pinned) return true;
	if (entry.layer === "long") return true;
	return entry.importance >= threshold;
}
/** 短期 → 长期沉淀判断：高价值或经时间检验。 */
function shouldPromote(entry, threshold) {
	if (entry.layer !== "short") return false;
	if (entry.importance >= threshold * 2) return true;
	if (daysSince(entry.updatedAt) >= 14 && entry.importance >= threshold) return true;
	return false;
}
/** 滚出窗口：超 60 天且 importance 低于阈值一半的短期条目直接删除。 */
function shouldEvict(entry, threshold) {
	if (entry.layer !== "short" || entry.pinned) return false;
	return daysSince(entry.updatedAt) >= 60 && entry.importance < threshold / 2;
}
/** 注入排序分：pinned 最高，其次 importance 降序。 */
function injectionRank(entry) {
	return entry.pinned ? Number.POSITIVE_INFINITY : entry.importance;
}
//#endregion
//#region src/engine/compile.ts
/** 身份/偏好类标签。 */
const IDENTITY_TAGS = [
	"身份",
	"identity",
	"偏好",
	"preference",
	"风格",
	"style",
	"人格",
	"persona",
	"习惯",
	"habit"
];
/** 事实类标签。 */
const FACT_TAGS = [
	"事实",
	"fact",
	"信息",
	"info",
	"要点",
	"key",
	"背景",
	"context"
];
/** 按时间把条目分组。 */
function groupEntries(entries, now = /* @__PURE__ */ new Date()) {
	const groups = {
		today: [],
		week: [],
		earlier: [],
		longterm: []
	};
	const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
	for (const entry of entries) {
		if (entry.layer === "long") {
			groups.longterm.push(entry);
			continue;
		}
		const time = Date.parse(entry.updatedAt);
		if (Number.isNaN(time)) {
			groups.earlier.push(entry);
			continue;
		}
		const days = Math.floor((startOfDay - time) / 864e5);
		if (days <= 0) groups.today.push(entry);
		else if (days < 7) groups.week.push(entry);
		else groups.earlier.push(entry);
	}
	return groups;
}
/** 单条 md 行。 */
function entryLine(entry) {
	const tagText = entry.tags.length > 0 ? ` \`${entry.tags.join("` `")}\`` : "";
	const pin = entry.pinned ? "📌 " : "";
	const score = entry.importance >= 10 ? "" : ` [${entry.importance}]`;
	return `- ${pin}${entry.content.replace(/\n/g, " ")}${score}${tagText}`;
}
/** 渲染 timeline（短期分组 + 长期沉淀）。 */
function renderTimeline(entries) {
	const groups = groupEntries(entries);
	const lines = ["# 记忆时间线"];
	const pushGroup = (title, list) => {
		if (list.length === 0) return;
		lines.push(`\n## ${title}`);
		for (const entry of list) lines.push(entryLine(entry));
	};
	pushGroup("今天", groups.today);
	pushGroup("本周", groups.week);
	pushGroup("更早", groups.earlier);
	pushGroup("长期沉淀", groups.longterm);
	return lines.join("\n");
}
/** 渲染 identity（全局层身份/偏好条目）。 */
function renderIdentity(entries) {
	const lines = ["# 用户身份与偏好"];
	for (const entry of entries) lines.push(entryLine(entry));
	return lines.join("\n");
}
/** 渲染 facts。 */
function renderFacts(entries) {
	if (entries.length === 0) return "";
	const lines = ["# 事实"];
	for (const entry of entries) lines.push(entryLine(entry));
	return lines.join("\n");
}
/** 渲染 pinned。 */
function renderPinned(entries) {
	if (entries.length === 0) return "";
	const lines = ["# 置顶"];
	for (const entry of entries) lines.push(entryLine(entry));
	return lines.join("\n");
}
/** 身份/偏好判定。 */
function isIdentityEntry(entry) {
	return entry.scope === "global" && entry.tags.some((tag) => IDENTITY_TAGS.includes(tag.toLowerCase()));
}
/** 事实判定（非 identity、非 pinned 且带事实标签或高重要性）。 */
function isFactEntry(entry) {
	if (entry.pinned) return false;
	if (entry.tags.some((tag) => FACT_TAGS.includes(tag.toLowerCase()))) return true;
	return entry.importance >= 8;
}
/** 全局层编译产物。 */
function compileGlobalArtifacts(entries) {
	const identity = entries.filter(isIdentityEntry);
	const facts = entries.filter((entry) => entry.scope === "global" && !isIdentityEntry(entry) && isFactEntry(entry));
	const pinned = entries.filter((entry) => entry.scope === "global" && entry.pinned);
	return {
		identity: renderIdentity(identity),
		facts: renderFacts(facts),
		pinned: renderPinned(pinned)
	};
}
/** 项目层编译产物。 */
function compileProjectArtifacts(entries) {
	const facts = entries.filter((entry) => isFactEntry(entry) && !entry.pinned);
	const pinned = entries.filter((entry) => entry.pinned);
	return {
		memory: renderTimeline(entries),
		facts: renderFacts(facts),
		pinned: renderPinned(pinned)
	};
}
/** 每日日志（跨项目全局；openhanako 同款格式）。 */
function renderDaily(date, changes) {
	const lines = [`# ${date} 记忆日志`, ""];
	if (changes.length === 0) lines.push("（无新记忆）");
	else for (const change of changes) {
		const badge = change.action === "add" ? "新增" : change.action === "promote" ? "沉淀" : "更新";
		const scope = change.scope === "global" ? "全局" : "项目";
		lines.push(`- [${badge}][${scope}] ${change.summary}`);
	}
	return lines.join("\n");
}
/**
* 组装注入文本与 sections。
* @param entries - 注入可见条目（已按重要性排序）。
* @param config - 注入预算。
*/
function buildInjectionText(entries, config) {
	const budget = Math.max(1e3, config.injectTokenBudget);
	const sections = {
		identity: "",
		memory: "",
		pinned: "",
		facts: ""
	};
	const pinned = entries.filter((entry) => entry.pinned);
	const rest = entries.filter((entry) => !entry.pinned);
	let used = 0;
	const consume = (section, text) => {
		if (text === "") return;
		const block = `${`[${sectionHeader(section)}]`}\n${text}`;
		if (used + block.length > budget && section !== "pinned") return;
		if (section !== "pinned") used += block.length + 1;
		sections[section] = text;
	};
	if (pinned.length > 0) consume("pinned", renderPinned(pinned));
	for (const entry of rest) if (entry.scope === "global") {
		if (isIdentityEntry(entry)) {
			if (sections.identity === "") consume("identity", `- ${entry.content}`);
		} else if (sections.facts === "") consume("facts", `- ${entry.content}`);
	} else if (sections.memory === "") consume("memory", `- ${entry.content}`);
	return {
		text: [
			sections.identity,
			sections.memory,
			sections.pinned,
			sections.facts
		].filter(Boolean).join("\n\n"),
		sections: [
			sections.identity ? {
				name: "identity",
				text: sections.identity
			} : null,
			sections.memory ? {
				name: "memory",
				text: sections.memory
			} : null,
			sections.pinned ? {
				name: "pinned",
				text: sections.pinned
			} : null,
			sections.facts ? {
				name: "facts",
				text: sections.facts
			} : null
		].filter((section) => section !== null)
	};
}
function sectionHeader(section) {
	switch (section) {
		case "identity": return "记忆·身份偏好";
		case "memory": return "记忆·项目";
		case "pinned": return "记忆·置顶";
		case "facts": return "记忆·事实";
	}
}
/** 全量编译入口：写项目层 + 全局层产物（ticker 调用）。 */
async function compileAll(store, config) {
	const entries = await store.readEntries();
	const byProject = /* @__PURE__ */ new Map();
	for (const entry of entries) {
		if (entry.scope !== "project" || entry.projectHash === null) continue;
		const list = byProject.get(entry.projectHash) ?? [];
		list.push(entry);
		byProject.set(entry.projectHash, list);
	}
	for (const [hash, owned] of byProject) await store.writeProjectArtifacts(hash, compileProjectArtifacts(owned));
	const global = entries.filter((entry) => entry.scope === "global");
	await store.writeGlobalArtifacts(compileGlobalArtifacts(global));
}
/** 从 entries 中选注入可见条目（short 层按阈值过滤 + 排序）。 */
function selectInjectionEntries(entries, threshold) {
	return entries.filter((entry) => isInjectionEligible(entry, threshold)).sort((a, b) => injectionRank(b) - injectionRank(a));
}
/** 当前工作区项目 hash（会话 cwd 判定；取不到返回 null → 调用方回退 global）。 */
function workspaceHashOf(header) {
	const cwd = header?.cwd;
	if (typeof cwd !== "string" || cwd.trim() === "") return null;
	return projectHashOf(cwd);
}
/** 今日变更的 md 日志文本（写 daily）。 */
async function writeDailyLog(store, date = localDate()) {
	const summary = (await store.readChanges(date)).map((change) => ({
		action: change.action,
		summary: change.summary,
		scope: change.scope
	}));
	await store.writeArtifact(`daily/${date}.md`, renderDaily(date, summary));
}
/** 促进短期条目到长期层（每日编译时调用）。 */
function promoteEntries(entries, threshold) {
	const promoted = [];
	const remaining = [];
	for (const entry of entries) if (shouldPromote(entry, threshold)) promoted.push({
		...entry,
		layer: "long"
	});
	else remaining.push(entry);
	return {
		promoted,
		remaining
	};
}
//#endregion
//#region src/api.ts
const ROUTE_PREFIX = "/api/dsh-memory";
function toView$1(entry) {
	return {
		id: entry.id,
		content: entry.content,
		scope: entry.scope,
		projectHash: entry.projectHash,
		tags: entry.tags,
		pinned: entry.pinned,
		importance: entry.importance,
		layer: entry.layer,
		source: entry.source,
		createdAt: entry.createdAt,
		updatedAt: entry.updatedAt
	};
}
/** 挂载全部路由。 */
function mountMemoryRoutes(ctx, store, config) {
	return ctx.webServer.register({
		kind: "prefix",
		path: ROUTE_PREFIX,
		handler: (req, res) => {
			handle(ctx, store, config, req, res);
		}
	});
}
async function handle(ctx, store, config, req, res) {
	if (!loopbackAllowed(req)) {
		json(res, 403, { error: "loopback-only" });
		return;
	}
	let url;
	let rest;
	let method;
	try {
		url = new URL(req.url ?? "/", "http://localhost");
		rest = url.pathname.slice(15);
		method = req.method ?? "GET";
	} catch {
		json(res, 400, { error: "invalid request url" });
		return;
	}
	const apiStarted = Date.now();
	store.appendExtractLog(`api ${method} ${rest} start`).catch(() => void 0);
	try {
		if (method === "GET" && rest === "/list") {
			json(res, 200, await listView(store, url.searchParams));
			return;
		}
		if (method === "GET" && rest === "/projects") {
			const entries = await store.readEntries();
			json(res, 200, { projects: await mergeWorkspaces(store, await store.listProjects(entries)) });
			return;
		}
		if (method === "GET" && rest === "/tags") {
			const entries = await store.readEntries();
			const counts = /* @__PURE__ */ new Map();
			for (const entry of entries) for (const tag of entry.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
			json(res, 200, { tags: [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([tag, count]) => ({
				tag,
				count
			})) });
			return;
		}
		if (method === "GET" && rest === "/changes") {
			const date = url.searchParams.get("date") ?? localDate();
			json(res, 200, {
				date,
				changes: await store.readChanges(date)
			});
			return;
		}
		if (method === "GET" && rest === "/summary") {
			const entries = await store.readEntries();
			const today = localDate();
			json(res, 200, {
				today,
				entryCount: entries.length,
				projectCount: (await store.listProjects(entries)).length,
				todayChanges: (await store.readChanges(today)).length
			});
			return;
		}
		if (method === "GET" && rest === "/inject-state") {
			const sessionId = url.searchParams.get("sessionId") ?? "";
			json(res, 200, { enabled: await store.isInjectEnabled(sessionId) });
			return;
		}
		if (method === "POST" && rest === "/inject-state") {
			const body = await readBody(req);
			const sessionId = requireString(body.sessionId, "sessionId");
			const enabled = body.enabled !== false;
			await store.setInjectEnabled(sessionId, enabled);
			json(res, 200, {
				ok: true,
				enabled
			});
			return;
		}
		if (method === "POST" && rest === "/pin") {
			const body = await readBody(req);
			const entryId = requireString(body.entryId, "entryId");
			const pinned = body.pinned !== false;
			const entry = await store.patchEntry(entryId, { pinned });
			if (entry === void 0) throw new Error(`记忆不存在：${entryId}`);
			json(res, 200, {
				ok: true,
				entry: toView$1(entry)
			});
			return;
		}
		if (method === "POST" && rest === "/update") {
			const body = await readBody(req);
			const entryId = requireString(body.entryId, "entryId");
			const patch = {};
			if (typeof body.content === "string" && body.content.trim() !== "") patch.content = body.content.trim();
			if (Array.isArray(body.tags)) patch.tags = body.tags.filter((tag) => typeof tag === "string" && tag.trim() !== "").map((tag) => tag.trim()).slice(0, 8);
			const before = await store.getEntry(entryId);
			const entry = await store.patchEntry(entryId, patch);
			if (entry === void 0) throw new Error(`记忆不存在：${entryId}`);
			await store.appendChange({
				action: "update",
				entryId: entry.id,
				scope: entry.scope,
				projectHash: entry.projectHash,
				summary: summarize(entry.content),
				before: before?.content,
				after: entry.content
			});
			json(res, 200, {
				ok: true,
				entry: toView$1(entry)
			});
			return;
		}
		if (method === "POST" && rest === "/move") {
			const body = await readBody(req);
			const entryId = requireString(body.entryId, "entryId");
			const existing = await store.getEntry(entryId);
			if (existing === void 0) throw new Error(`记忆不存在：${entryId}`);
			let scope = existing.scope;
			let projectHash = existing.projectHash;
			if (body.scope === "global") {
				scope = "global";
				projectHash = null;
			} else if (body.scope === "project") {
				scope = "project";
				projectHash = typeof body.projectHash === "string" && body.projectHash !== "" ? body.projectHash : existing.projectHash;
				if (projectHash === null) throw new Error("移入项目需要 projectHash");
				if (await store.readProjectMeta(projectHash) === void 0) await store.writeProjectMeta(projectHash, {
					path: typeof body.path === "string" && body.path !== "" ? body.path : "手动归属",
					alias: null,
					locked: true
				});
			}
			const entry = await store.patchEntry(entryId, {
				scope,
				projectHash
			});
			if (entry === void 0) throw new Error(`记忆不存在：${entryId}`);
			await store.appendChange({
				action: "update",
				entryId: entry.id,
				scope: entry.scope,
				projectHash: entry.projectHash,
				summary: `移项目：${summarize(entry.content)}`,
				before: existing.content,
				after: entry.content
			});
			await compileAll(store, config);
			json(res, 200, {
				ok: true,
				entry: toView$1(entry)
			});
			return;
		}
		if (method === "POST" && rest === "/delete") {
			const entryId = requireString((await readBody(req)).entryId, "entryId");
			const existing = await store.getEntry(entryId);
			if (existing === void 0) {
				json(res, 200, {
					ok: true,
					alreadyGone: true
				});
				return;
			}
			if (!await store.removeEntry(entryId)) {
				json(res, 200, {
					ok: true,
					alreadyGone: true
				});
				return;
			}
			await store.appendChange({
				action: "delete",
				entryId,
				scope: existing.scope,
				projectHash: existing.projectHash,
				summary: `删除：${summarize(existing.content)}`
			});
			await compileAll(store, config);
			json(res, 200, { ok: true });
			return;
		}
		if (method === "POST" && rest === "/meta") {
			const body = await readBody(req);
			const hash = requireString(body.projectHash, "projectHash");
			const meta = await store.readProjectMeta(hash);
			const next = {
				path: meta?.path ?? (typeof body.path === "string" && body.path !== "" ? body.path : "手动归属"),
				alias: typeof body.alias === "string" && body.alias !== "" ? body.alias.slice(0, 64) : meta?.alias ?? null,
				locked: typeof body.locked === "boolean" ? body.locked : meta?.locked ?? true
			};
			await store.writeProjectMeta(hash, next);
			json(res, 200, {
				ok: true,
				meta: {
					...next,
					hash
				}
			});
			return;
		}
		if (method === "POST" && rest === "/remember") {
			const body = await readBody(req);
			const content = typeof body.content === "string" ? body.content.trim() : "";
			if (content === "") throw new Error("content 不能为空");
			const scope = body.scope === "global" ? "global" : "project";
			const projectHash = scope === "project" ? typeof body.projectHash === "string" && body.projectHash !== "" ? body.projectHash : null : null;
			if (scope === "project" && projectHash === null) throw new Error("项目层记忆需要 projectHash（当前无工作区，请用全局或指定项目）");
			const tags = Array.isArray(body.tags) ? body.tags.filter((tag) => typeof tag === "string" && tag.trim() !== "").map((tag) => tag.trim()).slice(0, 8) : [];
			const importance = typeof body.importance === "number" && Number.isFinite(body.importance) ? Math.max(1, Math.min(10, Math.round(body.importance))) : 8;
			const pinned = body.pinned === true;
			if (scope === "project" && projectHash !== null) {
				if (await store.readProjectMeta(projectHash) === void 0) await store.writeProjectMeta(projectHash, {
					path: typeof body.path === "string" && body.path !== "" ? body.path : "手动归属",
					alias: null,
					locked: false
				});
			}
			const beforeEntry = await store.getEntry(entryIdOf(content, scope, scope === "project" ? projectHash : null));
			const { created, entry } = await store.upsertEntry({
				content,
				scope,
				projectHash: scope === "project" ? projectHash : null,
				tags,
				importance,
				pinned,
				source: "manual"
			});
			await store.appendChange({
				action: created ? "add" : "update",
				entryId: entry.id,
				scope: entry.scope,
				projectHash: entry.projectHash,
				summary: summarize(entry.content),
				before: beforeEntry?.content,
				after: entry.content
			});
			await compileAll(store, config);
			json(res, 200, {
				ok: true,
				created,
				entry: toView$1(entry)
			});
			return;
		}
		json(res, 404, { error: `no route for ${method} ${rest}` });
	} catch (error) {
		json(res, 400, { error: error instanceof Error ? error.message : String(error) });
	} finally {
		store.appendExtractLog(`api ${method} ${rest} done ${Date.now() - apiStarted}ms`).catch(() => void 0);
	}
}
/** 面板列表视图（scope/项目/搜索/标签过滤）。 */
async function listView(store, params) {
	const entries = await store.readEntries();
	const scope = params.get("scope");
	const project = params.get("project");
	const q = params.get("q")?.trim().toLowerCase() ?? "";
	const tag = params.get("tag");
	return {
		entries: entries.filter((entry) => {
			if (scope === "global" && entry.scope !== "global") return false;
			if (scope === "project" && entry.scope !== "project") return false;
			if (project !== null && project !== "" && entry.projectHash !== project) return false;
			if (q !== "") {
				const haystack = `${entry.content} ${entry.tags.join(" ")}`.toLowerCase();
				if (!q.split(/\s+/).every((term) => haystack.includes(term))) return false;
			}
			if (tag !== null && tag !== "" && !entry.tags.includes(tag)) return false;
			return true;
		}).sort((a, b) => {
			if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
			return b.updatedAt.localeCompare(a.updatedAt);
		}).map(toView$1),
		projects: await mergeWorkspaces(store, await store.listProjects(entries))
	};
}
/**
* 合并 DSH 工作区注册表：尚无记忆的新工作区也出现在项目列表（entryCount 0），
* 让「刚建的工作区」在记忆面板立即可见（无需等第一条记忆写入）。
*/
async function mergeWorkspaces(store, projects) {
	const known = new Set(projects.map((project) => project.hash));
	for (const workspace of await store.listDshWorkspaces()) {
		const hash = projectHashOf(workspace.path);
		if (!known.has(hash)) {
			projects.push({
				hash,
				path: workspace.path,
				alias: workspace.title,
				locked: false,
				entryCount: 0,
				pinnedCount: 0
			});
			known.add(hash);
		}
	}
	projects.sort((a, b) => a.path.localeCompare(b.path));
	return projects;
}
function isLoopbackAddress(address) {
	if (typeof address !== "string") return false;
	const a = address.toLowerCase();
	if (a === "::1") return true;
	const octets = (a.startsWith("::ffff:") ? a.slice(7) : a).split(".");
	return octets.length === 4 && octets[0] === "127" && octets.every((part) => /^\d{1,3}$/.test(part) && Number(part) <= 255);
}
function hostNameOf(value) {
	if (typeof value !== "string") return null;
	const host = value.trim().toLowerCase();
	if (host.startsWith("[")) {
		const close = host.indexOf("]");
		if (close <= 1) return null;
		const suffix = host.slice(close + 1);
		if (suffix !== "" && !/^:\d+$/.test(suffix)) return null;
		return host.slice(1, close);
	}
	const firstColon = host.indexOf(":");
	if (firstColon !== host.lastIndexOf(":")) return null;
	return firstColon === -1 ? host : host.slice(0, firstColon);
}
function loopbackAllowed(req) {
	if (!isLoopbackAddress(req.socket.remoteAddress)) return false;
	const host = hostNameOf(req.headers.host);
	if (host === null) return false;
	return host === "localhost" || host === "127.0.0.1" || host === "::1";
}
function json(res, status, value) {
	const body = JSON.stringify(value);
	res.writeHead(status, {
		"content-type": "application/json; charset=utf-8",
		"cache-control": "no-cache"
	});
	res.end(body);
}
function readBody(req) {
	return new Promise((resolvePromise, reject) => {
		const chunks = [];
		let size = 0;
		req.on("data", (chunk) => {
			size += chunk.length;
			if (size > 4 * 1024 * 1024) {
				reject(/* @__PURE__ */ new Error("request body too large"));
				req.destroy();
				return;
			}
			chunks.push(chunk);
		});
		req.on("end", () => {
			if (chunks.length === 0) {
				resolvePromise({});
				return;
			}
			try {
				resolvePromise(JSON.parse(Buffer.concat(chunks).toString("utf8")));
			} catch (error) {
				reject(error instanceof Error ? error : /* @__PURE__ */ new Error("invalid JSON body"));
			}
		});
		req.on("error", reject);
	});
}
function requireString(value, name) {
	if (typeof value !== "string" || value.trim() === "") throw new Error(`${name} 不能为空`);
	return value.trim();
}
//#endregion
//#region src/engine/extract.ts
/**
* dsh-memory 提取引擎：turn/end 捕获的本轮对话增量窗口 → LLM 结构化提取候选。
* 输入是「增量窗口」（本 turn 的 user/assistant 文本），不重读整会话。
* LLM 失败/超时一律跳过本轮，绝不阻塞对话。
*/
/** 提取超时（毫秒）。 */
const EXTRACT_TIMEOUT_MS = 3e4;
/**
* 解析 LLM 输出为候选列表（容错：剥 fence / 去 BOM / 找最外层对象；失败返回 []）。
*/
function parseExtractOutput(raw) {
	let text = raw.trim();
	const fence = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(text);
	if (fence !== null) text = fence[1].trim();
	text = text.replace(/^\uFEFF/, "").trim();
	const start = text.indexOf("{");
	const end = text.lastIndexOf("}");
	if (start === -1 || end <= start) return [];
	let parsed;
	try {
		parsed = JSON.parse(text.slice(start, end + 1));
	} catch {
		return [];
	}
	if (typeof parsed !== "object" || parsed === null) return [];
	const memories = parsed.memories;
	if (!Array.isArray(memories)) return [];
	const out = [];
	for (const item of memories) {
		if (typeof item !== "object" || item === null) continue;
		const record = item;
		const content = typeof record.content === "string" ? record.content.trim() : "";
		if (content === "") continue;
		const scope = record.scope === "global" ? "global" : "project";
		const tags = Array.isArray(record.tags) ? record.tags.filter((tag) => typeof tag === "string" && tag.trim() !== "").map((tag) => tag.trim()).slice(0, 8) : [];
		const importance = typeof record.importance === "number" && Number.isFinite(record.importance) ? Math.max(1, Math.min(10, Math.round(record.importance))) : 5;
		out.push({
			content,
			scope,
			tags,
			importance
		});
	}
	return out;
}
/** 提取 prompt：把「闲聊」与「值得记忆」分开，输出结构化 JSON。 */
function extractSystemPrompt() {
	return [
		"You are a memory extractor for an AI assistant. Read the conversation transcript and extract information worth remembering across sessions.",
		"Return ONLY a JSON object in this exact shape (no markdown, no commentary):",
		"{\"memories\":[{\"content\":\"...\",\"scope\":\"global\"|\"project\",\"tags\":[\"...\"],\"importance\":1}]}",
		"Rules:",
		"- Extract only durable facts, decisions, preferences, gotchas, project context, architecture notes, API details, and user identity that would help future sessions.",
		"- Skip small talk, greetings, chit-chat, and content with no lasting value.",
		"- scope: \"global\" for user identity/preferences/working style; \"project\" for workspace/project-specific content.",
		"- tags: 1-4 short category tags in the same language as the content (e.g. 技术, 踩坑, 架构, 偏好).",
		"- importance: integer 1-10; higher = more valuable to remember. Use 6+ for real facts, 8+ for critical decisions.",
		"- content: write in the original language of the conversation, one complete concise sentence or bullet.",
		"- If nothing is worth remembering, return {\"memories\":[]}."
	].join("\n");
}
/** 组装提取请求的 user 消息（JSON 包裹转录文本，防结构性破坏）。 */
function extractUserPrompt(transcript) {
	return `Extract memories from this conversation transcript (JSON string):\n${JSON.stringify(transcript)}`;
}
/**
* 通过 DSH 现有模型通道提取候选。
* @returns 候选列表；任何失败返回 []（尽力而为的副产物）。
*/
async function extractCandidates(ctx, agent, transcript, config) {
	if (transcript.trim() === "") return [];
	const llm = ctx.get("llm");
	if (llm === void 0) return [];
	const route = await resolveRoute(ctx, agent);
	if (route === void 0) return [];
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), EXTRACT_TIMEOUT_MS);
	try {
		const options = {
			provider: route.provider,
			model: route.model,
			messages: [createUserMessage({
				content: [{
					type: "text",
					text: extractUserPrompt(transcript.slice(0, config.extractMaxChars))
				}],
				source: {
					kind: "plugin",
					plugin: "dsh-memory"
				}
			})],
			system: extractSystemPrompt(),
			maxTokens: 1200,
			signal: controller.signal,
			purpose: "compaction"
		};
		const assembler = new BlockAssembler();
		for await (const chunk of llm.stream(options)) assembler.push(chunk);
		if (assembler.finish.kind !== "stop") return [];
		return parseExtractOutput(assembler.blocks().filter((block) => block.type === "text").map((block) => block.text).join(" ")).filter((candidate) => candidate.importance >= config.minImportance && !isSensitiveContent(candidate.content));
	} catch (error) {
		ctx.logger?.debug?.(`[dsh-memory] extract failed: ${error instanceof Error ? error.message : String(error)}`);
		return [];
	} finally {
		clearTimeout(timer);
	}
}
/** 敏感凭据模式（自动提取时命中即丢弃，防止密钥/token 入库）。 */
const SENSITIVE_PATTERNS = [
	/gh[pousr]_[A-Za-z0-9]{20,}/,
	/sk-[A-Za-z0-9_-]{20,}/i,
	/AKIA[0-9A-Z]{16}/,
	/xox[baprs]-[A-Za-z0-9-]{20,}/i,
	/-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----/i,
	/(?:password|passwd|secret|api[_-]?key|access[_-]?token|private[_-]?key)\s*[=:]\s*[^\s,，。；;]{8,}/i
];
/** 检测内容是否包含敏感凭据。 */
function isSensitiveContent(text) {
	return SENSITIVE_PATTERNS.some((pattern) => pattern.test(text));
}
/** 解析 LLM 路由：agent 显式配置优先，回退默认模型选择。 */
async function resolveRoute(ctx, agent) {
	if (agent.options.provider !== void 0 && agent.options.model !== void 0 && agent.options.provider !== "" && agent.options.model !== "") return {
		provider: agent.options.provider,
		model: agent.options.model
	};
	const defaultModel = ctx.get("agentDefaultModel");
	if (defaultModel !== void 0) try {
		const selection = defaultModel.currentSelection();
		if (selection.provider !== void 0 && selection.model !== void 0) return {
			provider: selection.provider,
			model: selection.model
		};
	} catch {}
}
/** 从事件流维护的 turn 缓冲里取文本（extract 输入）。 */
function transcriptFromEvents(events) {
	const lines = [];
	for (const event of events) if (event.type === "user/message") {
		const message = event.data;
		if (message.source?.kind === "plugin") continue;
		lines.push(`User: ${textOfContent(message.content)}`);
	} else if (event.type === "assistant/message") {
		const data = event.data;
		lines.push(`Assistant: ${textOfContent(data.message?.content)}`);
	}
	return lines.join("\n");
}
/** 把 ContentBlock[] 或字符串平铺为文本。 */
function textOfContent(content) {
	if (typeof content === "string") return content;
	if (!Array.isArray(content)) return "";
	const parts = [];
	for (const block of content) {
		if (typeof block !== "object" || block === null) continue;
		const record = block;
		if (record.type === "text" && typeof record.text === "string") parts.push(record.text);
	}
	return parts.join("\n").trim();
}
//#endregion
//#region src/engine/inject.ts
/**
* dsh-memory 注入引擎：agent/pre-step 把「全局 identity + 当前项目 memory +
* pinned + facts」组装为一条带来源的 user message 注入（source: { kind: 'plugin' }）。
* 绝不写 system prompt（DSH persona complete:true 会静默丢弃）；
* 只注入当前工作区项目 + 全局层；token 超预算按重要性截断，最低保留置顶。
* 命中刷新：被注入的条目距上次命中 ≥1 天时刷新 lastHitAt 并加分。
*/
/** 每次注入最多刷新的命中条目数。 */
const MAX_HITS_PER_INJECTION = 5;
/**
* 内置安全规范（每次注入都携带）：敏感凭据严禁提交/更新到 GitHub。
* 与提取敏感过滤、面板风险提示共同构成凭据防线。
*/
const SAFETY_RULE = [
	"【安全规范】所有 GitHub/OpenAI/AWS/Slack token、私钥、password 等敏感凭据",
	"严禁提交或更新到 GitHub 仓库；代码中一律用环境变量引用，",
	"并确保 .gitignore 排除含凭据的文件。"
].join("");
/** 创建注入器。 */
function createMemoryInjector(store, config, logger) {
	/** 每会话 step 计数（仅内存）。 */
	const stepCounters = /* @__PURE__ */ new Map();
	async function buildMemoryBlock(agent) {
		const entries = await store.readEntries();
		const hash = workspaceHashOf(agent.session.header);
		const visible = entries.filter((entry) => entry.scope === "global" || entry.scope === "project" && entry.projectHash === hash);
		if (visible.length === 0) return null;
		const selected = selectInjectionEntries(visible, config.compileThreshold);
		if (selected.length === 0) return null;
		const hitCandidates = selected.filter((entry) => entry.lastHitAt === null || daysSince(entry.lastHitAt) >= 1).slice(0, MAX_HITS_PER_INJECTION);
		if (hitCandidates.length > 0) {
			const hitIds = new Set(hitCandidates.map((entry) => entry.id));
			const refreshed = await store.applyHits(hitIds, config.hitBonus);
			logger?.debug?.(`[dsh-memory] hit refresh: ${refreshed} entries`);
		}
		return buildInjectionText(selected, config);
	}
	const preStepListener = async (payload, next) => {
		let decision;
		try {
			decision = await next();
		} catch (error) {
			logger?.warn?.(`[dsh-memory] pre-step next() failed: ${error instanceof Error ? error.message : String(error)}`);
			return { kind: "reject" };
		}
		if (decision.kind !== "enter" || payload.signal.aborted) return decision;
		const sessionId = payload.agent.session.id;
		if (!await store.isInjectEnabled(sessionId)) return decision;
		const counter = (stepCounters.get(sessionId) ?? 0) + 1;
		stepCounters.set(sessionId, counter);
		if (counter > 1 && (counter - 1) % config.injectRefreshSteps !== 0) return decision;
		try {
			const block = await buildMemoryBlock(payload.agent);
			if (block === null || block.text === "") return decision;
			const memoryMessage = createUserMessage({
				content: [{
					type: "text",
					text: `${SAFETY_RULE}\n\n【长期记忆 · 用户要求按需执行或参考】\n${block.text}`
				}],
				source: {
					kind: "plugin",
					plugin: "dsh-memory",
					form: "snapshot",
					sections: [{
						name: "安全规范",
						text: SAFETY_RULE
					}, ...block.sections]
				}
			});
			return {
				kind: "enter",
				messages: [...decision.messages, memoryMessage]
			};
		} catch (error) {
			logger?.warn?.(`[dsh-memory] injection failed: ${error instanceof Error ? error.message : String(error)}`);
			return decision;
		}
	};
	return {
		preStepListener,
		disposeSession: (sessionId) => {
			stepCounters.delete(sessionId);
		}
	};
}
//#endregion
//#region src/engine/ticker.ts
/** 会话结束判定静默期（毫秒）。 */
const SESSION_END_DEBOUNCE_MS = 15e3;
/** 每日检查定时器间隔（毫秒，仅兜底；正常由 turn/end 驱动）。 */
const DAILY_CHECK_INTERVAL_MS = 3600 * 1e3;
/**
* 创建 ticker。返回 { onTurnEnd, enqueue, dispose }。
* onTurnEnd 由 session/event 的 turn/end 分支调用；enqueue 供提取等写操作
* 共用同一条串行队列（内存锁：避免 ticker 与捕获并发读写同一 store）。
*/
function createTicker(ctx, store, config) {
	let queue = Promise.resolve();
	const enqueue = (task) => {
		const result = queue.then(task);
		queue = result.then(() => void 0, () => void 0);
		return result;
	};
	const enqueueSafe = (task) => {
		enqueue(task).catch((error) => {
			ctx.logger?.warn?.(`[dsh-memory] ticker task failed: ${error instanceof Error ? error.message : String(error)}`);
		});
	};
	/** 每会话的 final 编译 debounce 计时器。 */
	const sessionEndTimers = /* @__PURE__ */ new Map();
	/** 每日编译（幂等：lastDailyDate 前置判断，避免同日重复）。 */
	async function runDailyCompile() {
		const today = localDate();
		const state = await store.readState();
		const last = state.lastDailyDate;
		state.lastDailyDate = today;
		await store.writeState(state);
		if (last === today) return;
		const days = last === null ? 1 : Math.max(1, Math.floor((Date.parse(today) - Date.parse(last)) / 864e5));
		let promoted = [];
		let evicted = [];
		await store.replaceEntries((entries) => {
			const result = promoteEntries(entries.map((entry) => ({
				...entry,
				importance: decayImportance(entry.importance, days, config.decayLambda)
			})), config.compileThreshold);
			promoted = result.promoted;
			const kept = [];
			evicted = [];
			for (const entry of result.remaining) if (shouldEvict(entry, config.compileThreshold)) evicted.push(entry);
			else kept.push(entry);
			return [...promoted, ...kept];
		});
		for (const entry of promoted) await store.appendChange({
			action: "promote",
			entryId: entry.id,
			scope: entry.scope,
			projectHash: entry.projectHash,
			summary: summarize(entry.content)
		});
		for (const entry of evicted) await store.appendChange({
			action: "delete",
			entryId: entry.id,
			scope: entry.scope,
			projectHash: entry.projectHash,
			summary: `低分条目滚出：${summarize(entry.content)}`
		});
		await compileAll(store, config);
		await writeDailyLog(store);
		ctx.logger?.debug?.(`[dsh-memory] daily compile done (promoted=${promoted.length}, evicted=${evicted.length})`);
	}
	/** 每 N 轮增量编译（timeline 重写）。 */
	async function runTurnCompile(sessionId, turnCount) {
		if (turnCount % config.compileEveryTurns !== 0) return;
		await compileAll(store, config);
		ctx.logger?.debug?.(`[dsh-memory] incremental compile (session=${sessionId}, turns=${turnCount})`);
	}
	/** 会话结束 final 编译（debounce）。 */
	function scheduleSessionEnd(sessionId) {
		const existing = sessionEndTimers.get(sessionId);
		if (existing !== void 0) clearTimeout(existing);
		const timer = setTimeout(() => {
			sessionEndTimers.delete(sessionId);
			enqueueSafe(async () => {
				await compileAll(store, config);
				await writeDailyLog(store);
				ctx.logger?.debug?.(`[dsh-memory] final compile (session=${sessionId})`);
			});
		}, SESSION_END_DEBOUNCE_MS);
		sessionEndTimers.set(sessionId, timer);
	}
	/** turn/end 统一入口（返回排队任务的 promise，供调用方串行衔接）。 */
	function onTurnEnd(sessionId, _agent) {
		const result = enqueue(async () => {
			const state = await store.readState();
			const per = state.perSession[sessionId] ?? {
				turnCount: 0,
				lastInjectedStep: 0
			};
			per.turnCount += 1;
			state.perSession[sessionId] = per;
			const today = localDate();
			if (state.lastDailyDate !== today) {
				await store.writeState(state);
				if (config.dailyCompileEnabled) await runDailyCompile();
			} else await store.writeState(state);
			await runTurnCompile(sessionId, per.turnCount);
		});
		scheduleSessionEnd(sessionId);
		return result;
	}
	const checkInterval = ctx.get("timer")?.interval(() => {
		enqueueSafe(async () => {
			const state = await store.readState();
			const today = localDate();
			if (state.lastDailyDate !== today && config.dailyCompileEnabled) await runDailyCompile();
		});
	}, DAILY_CHECK_INTERVAL_MS);
	function dispose() {
		if (typeof checkInterval === "function") checkInterval();
		for (const timer of sessionEndTimers.values()) clearTimeout(timer);
		sessionEndTimers.clear();
	}
	return {
		onTurnEnd,
		enqueue,
		dispose
	};
}
//#endregion
//#region src/tools.ts
/**
* dsh-memory 模型工具：AI 在对话中可主动调用的记忆操作。
* memory_search / memory_remember / memory_pin / memory_tag / memory_forget。
* 全部经 @deepseek-ai/dsh-tools 的 defineTool 注册，输出为模型可见文本。
*/
function toView(entry) {
	return {
		id: entry.id,
		content: entry.content,
		scope: entry.scope,
		projectHash: entry.projectHash,
		tags: entry.tags,
		pinned: entry.pinned,
		importance: entry.importance,
		layer: entry.layer,
		updatedAt: entry.updatedAt
	};
}
/** 文本匹配：query 的每个非空词都命中 content 或 tags。 */
function matchesQuery(entry, query) {
	const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
	if (terms.length === 0) return true;
	const haystack = `${entry.content} ${entry.tags.join(" ")}`.toLowerCase();
	return terms.every((term) => haystack.includes(term));
}
/** 排序：pinned 优先，importance 降序，updatedAt 降序。 */
function rank(a, b) {
	if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
	if (a.importance !== b.importance) return b.importance - a.importance;
	return b.updatedAt.localeCompare(a.updatedAt);
}
/** 注册全部记忆工具，返回合并 disposer。 */
function registerMemoryTools(ctx, store, _config) {
	const disposers = [];
	disposers.push(ctx.tools.register(textTool({
		name: "memory_search",
		description: "搜索本地长期记忆（按内容/标签/项目）。用之前记住的决定、偏好、踩坑、项目上下文，或回答\"我记得/之前说过\"类问题时。",
		parameters: {
			query: {
				type: "string",
				description: "搜索关键词（空格分隔多个词，全部命中才返回）。留空列出全部。"
			},
			scope: {
				type: "string",
				enum: ["global", "project"],
				description: "global=全局层（身份/偏好）；project=项目层。默认全部。"
			},
			project: {
				type: "string",
				description: "项目标识（workspace 路径或 hash）。默认当前工作区项目。"
			},
			tag: {
				type: "string",
				description: "按标签筛选。"
			},
			limit: {
				type: "integer",
				description: "返回条数上限（默认 10，最大 30）。"
			}
		},
		async execute(args, exec) {
			const entries = await store.readEntries();
			const agent = exec.agent;
			const currentHash = agent !== void 0 ? workspaceHashOf(agent.session.header) : null;
			const projectFilter = typeof args.project === "string" && args.project !== "" ? resolveProjectFilter(args.project) : currentHash;
			const views = entries.map(toView).filter((view) => {
				if (view.scope === "project" && projectFilter !== null && view.projectHash !== projectFilter) return false;
				if (typeof args.scope === "string" && view.scope !== args.scope) return false;
				if (typeof args.tag === "string" && args.tag !== "" && !view.tags.includes(args.tag)) return false;
				if (typeof args.query === "string" && !matchesQuery(view, args.query)) return false;
				return true;
			}).sort(rank);
			const limit = Math.max(1, Math.min(30, typeof args.limit === "number" ? args.limit : 10));
			const picked = views.slice(0, limit);
			if (picked.length === 0) return "没有找到匹配的记忆。";
			return picked.map((view) => {
				const head = view.pinned ? "📌" : "";
				const scope = view.scope === "global" ? "全局" : "项目";
				const tags = view.tags.length > 0 ? ` [${view.tags.join(", ")}]` : "";
				const layer = view.layer === "long" ? "（长期）" : "";
				return `${head}[${view.importance}] ${scope}${layer}: ${view.content}${tags}`;
			}).join("\n");
		}
	})));
	disposers.push(ctx.tools.register(textTool({
		name: "memory_remember",
		description: "手动写入一条长期记忆（用户明确要求记住，或你判断值得跨会话保留的重要事实/决定）。",
		parameters: {
			content: {
				type: "string",
				required: true,
				description: "要记住的内容。"
			},
			scope: {
				type: "string",
				enum: ["global", "project"],
				description: "global=全局层（身份/偏好）；project=当前项目层。默认 project。"
			},
			tags: {
				type: "array",
				items: { type: "string" },
				description: "分类标签（如 技术、踩坑、架构、偏好）。"
			},
			importance: {
				type: "integer",
				description: "重要性 1-10（默认 8）。"
			}
		},
		async execute(args, exec) {
			const content = String(args.content ?? "").trim();
			if (content === "") throw new Error("content 不能为空");
			const agent = exec.agent;
			const hash = agent !== void 0 ? workspaceHashOf(agent.session.header) : null;
			const scope = args.scope === "global" ? "global" : "project";
			if (scope === "project" && hash === null) throw new Error("无法判定当前工作区项目（无 cwd），请用 scope: \"global\" 或稍后重试");
			const importance = typeof args.importance === "number" ? Math.max(1, Math.min(10, args.importance)) : 8;
			const tags = Array.isArray(args.tags) ? args.tags.filter((tag) => typeof tag === "string" && tag.trim() !== "").map((tag) => tag.trim()).slice(0, 8) : [];
			const { created, entry } = await store.upsertEntry({
				content,
				scope,
				projectHash: scope === "project" ? hash : null,
				tags,
				importance,
				source: "manual"
			});
			if (scope === "project" && hash !== null) {
				if (await store.readProjectMeta(hash) === void 0) await store.writeProjectMeta(hash, {
					path: agent?.session.header?.cwd ?? "手动记忆",
					alias: null,
					locked: false
				});
			}
			await store.appendChange({
				action: created ? "add" : "update",
				entryId: entry.id,
				scope: entry.scope,
				projectHash: entry.projectHash,
				summary: summarize(entry.content)
			});
			return created ? `已记住：${entry.content}（${scope === "global" ? "全局" : "项目"}${tags.length > 0 ? `，标签：${tags.join(", ")}` : ""}）` : `已更新记忆：${entry.content}`;
		}
	})));
	disposers.push(ctx.tools.register(textTool({
		name: "memory_pin",
		description: "置顶/取消置顶一条记忆（置顶的记忆始终进入上下文注入并显示在置顶区）。",
		parameters: {
			entryId: {
				type: "string",
				required: true,
				description: "记忆条目 id（用 memory_search 获取）。"
			},
			pinned: {
				type: "boolean",
				description: "true=置顶，false=取消。默认 true。"
			}
		},
		async execute(args) {
			const id = String(args.entryId ?? "");
			if (id === "") throw new Error("entryId 不能为空");
			const entry = await store.patchEntry(id, { pinned: args.pinned !== false });
			if (entry === void 0) throw new Error(`记忆不存在：${id}`);
			return entry.pinned ? `已置顶：${summarize(entry.content)}` : `已取消置顶：${summarize(entry.content)}`;
		}
	})));
	disposers.push(ctx.tools.register(textTool({
		name: "memory_tag",
		description: "修改一条记忆的标签（覆盖式更新标签列表）。",
		parameters: {
			entryId: {
				type: "string",
				required: true,
				description: "记忆条目 id。"
			},
			tags: {
				type: "array",
				items: { type: "string" },
				required: true,
				description: "新的标签列表（覆盖旧的）。"
			}
		},
		async execute(args) {
			const id = String(args.entryId ?? "");
			const tags = Array.isArray(args.tags) ? args.tags.filter((tag) => typeof tag === "string" && tag.trim() !== "").map((tag) => tag.trim()).slice(0, 8) : [];
			const entry = await store.patchEntry(id, { tags });
			if (entry === void 0) throw new Error(`记忆不存在：${id}`);
			await store.appendChange({
				action: "update",
				entryId: entry.id,
				scope: entry.scope,
				projectHash: entry.projectHash,
				summary: `改标签：${summarize(entry.content)}`
			});
			return `标签已更新：${entry.tags.length > 0 ? entry.tags.join(", ") : "（无）"}`;
		}
	})));
	disposers.push(ctx.tools.register(textTool({
		name: "memory_forget",
		description: "删除一条记忆（仅当用户明确要求删除/遗忘某条记忆时使用）。",
		parameters: { entryId: {
			type: "string",
			required: true,
			description: "记忆条目 id（用 memory_search 获取）。"
		} },
		async execute(args) {
			const id = String(args.entryId ?? "");
			if (id === "") throw new Error("entryId 不能为空");
			const entry = await store.getEntry(id);
			if (entry === void 0) throw new Error(`记忆不存在：${id}`);
			if (!await store.removeEntry(id)) throw new Error(`记忆不存在：${id}`);
			await store.appendChange({
				action: "delete",
				entryId: id,
				scope: entry.scope,
				projectHash: entry.projectHash,
				summary: `删除：${summarize(entry.content)}`
			});
			return `已删除记忆：${summarize(entry.content)}`;
		}
	})));
	return () => {
		for (const dispose of disposers) dispose();
	};
}
/** 按路径或 hash 解析项目筛选；解析失败返回 null（不筛）。 */
function resolveProjectFilter(project) {
	const trimmed = project.trim();
	if (trimmed === "") return null;
	if (/^[0-9a-f]{12}$/.test(trimmed)) return trimmed;
	return projectHashOf(trimmed);
}
/** 工具展示身份。 */
const TOOL_PRESENTATION = {
	memory_search: {
		kind: "read",
		title: (args) => `记忆搜索：${String(args.query ?? "")}`
	},
	memory_remember: {
		kind: "other",
		title: () => "记录记忆"
	},
	memory_pin: {
		kind: "other",
		title: (args) => `置顶：${String(args.entryId ?? "")}`
	},
	memory_tag: {
		kind: "other",
		title: (args) => `改标签：${String(args.entryId ?? "")}`
	},
	memory_forget: {
		kind: "other",
		title: (args) => `删除：${String(args.entryId ?? "")}`
	}
};
/** 文本工具包装（openviking 同款模式，泛型保留参数推断）。 */
function textTool(definition) {
	const presentation = TOOL_PRESENTATION[definition.name];
	return defineTool({
		...definition,
		output: {
			schema: { type: "string" },
			render: (_args, value) => [{
				type: "text",
				text: value
			}]
		},
		presentCall: (args) => ({
			card: "generic",
			kind: presentation.kind,
			title: presentation.title(args),
			rawInput: args
		})
	});
}
//#endregion
//#region src/types.ts
/** 默认配置。 */
const DEFAULT_CONFIG = {
	extractEveryTurns: 1,
	compileEveryTurns: 10,
	compileThreshold: 4.5,
	decayLambda: .02,
	hitBonus: 2,
	injectTokenBudget: 6e3,
	injectRefreshSteps: 8,
	dailyCompileEnabled: true,
	extractMaxChars: 6e3,
	minImportance: 6
};
//#endregion
//#region src/index.ts
/** Stable Cordis plugin name。 */
const name = "dsh-memory";
/** 硬依赖服务。 */
const inject = ["webServer", "tools"];
/** 解析插件配置（cordis.patch.yml config 覆盖默认）。 */
function resolveConfig(input) {
	const config = { ...DEFAULT_CONFIG };
	if (input === void 0 || typeof input !== "object") return config;
	const candidate = input;
	for (const key of [
		"extractEveryTurns",
		"compileEveryTurns",
		"compileThreshold",
		"decayLambda",
		"hitBonus",
		"injectTokenBudget",
		"injectRefreshSteps",
		"extractMaxChars",
		"minImportance"
	]) {
		const value = candidate[key];
		if (typeof value === "number" && Number.isFinite(value) && value > 0) config[key] = value;
	}
	if (typeof candidate.dailyCompileEnabled === "boolean") config.dailyCompileEnabled = candidate.dailyCompileEnabled;
	return config;
}
/** 应用入口。 */
function apply(ctx, input) {
	const config = resolveConfig(input);
	const store = new MemoryStore();
	const logError = (stage, error) => {
		const message = error instanceof Error ? error.stack ?? error.message : String(error);
		ctx.logger?.warn?.(`[dsh-memory] ${stage}: ${message}`);
		store.appendErrorLog(stage, message).catch(() => void 0);
	};
	function uncaughtListener(error) {
		logError("uncaughtException", error);
	}
	function unhandledListener(reason) {
		logError("unhandledRejection", reason);
	}
	process.on("uncaughtException", uncaughtListener);
	process.on("unhandledRejection", unhandledListener);
	ctx.effect(() => () => {
		process.removeListener("uncaughtException", uncaughtListener);
		process.removeListener("unhandledRejection", unhandledListener);
	}, "dsh-memory: process error hooks");
	const ticker = createTicker(ctx, store, config);
	ctx.effect(() => ticker.dispose, "dsh-memory: ticker");
	const injector = createMemoryInjector(store, config, ctx.logger);
	ctx.on("agent/pre-step", ((payload, next) => injector.preStepListener(payload, next)), { prepend: true });
	ctx.on("agent/disposed", ({ agent }) => {
		injector.disposeSession(agent.session.id);
	});
	const toolsDispose = registerMemoryTools(ctx, store, config);
	ctx.effect(() => toolsDispose, "dsh-memory: tools");
	const routesDispose = mountMemoryRoutes(ctx, store, config);
	ctx.effect(() => routesDispose, "dsh-memory: routes");
	const turnBuffers = /* @__PURE__ */ new Map();
	ctx.on("session/event", (session, event) => {
		if (event.type === "turn/start") {
			turnBuffers.set(session.id, []);
			return;
		}
		if (event.type === "turn/end") {
			const buffer = turnBuffers.get(session.id) ?? [];
			turnBuffers.delete(session.id);
			const turnNumber = event.data.turn ?? 0;
			ticker.onTurnEnd(session.id, { id: session.id }).catch((error) => logError("ticker.onTurnEnd", error));
			const agent = ctx.get("agents")?.get(session.id);
			if (agent === void 0) return;
			ticker.enqueue(async () => {
				await extractTurn(ctx, store, config, agent, buffer, turnNumber);
			}).catch((error) => logError("extractTurn", error));
			return;
		}
		if (event.type === "user/message" || event.type === "assistant/message") {
			const buffer = turnBuffers.get(session.id);
			if (buffer === void 0) return;
			buffer.push({
				type: event.type,
				data: event.data
			});
		}
	});
	ctx.logger?.info?.("[dsh-memory] memory engine mounted");
}
/** 一轮的提取与入库（提取频率由 extractEveryTurns 控制）。 */
async function extractTurn(ctx, store, config, agent, buffer, turnNumber) {
	const transcript = transcriptFromEvents(buffer);
	if (transcript.trim() === "") return;
	if (config.extractEveryTurns > 1 && turnNumber % config.extractEveryTurns !== 1) return;
	if (((await store.readState()).perSession[agent.id]?.extractFailStreak ?? 0) >= 3 && turnNumber % 10 !== 1) return;
	const startedAt = Date.now();
	store.appendExtractLog(`turn=${turnNumber} chars=${transcript.length} route=${agent.options.provider ?? "default"} start`);
	const candidates = await extractCandidates(ctx, agent, transcript, config);
	store.appendExtractLog(`turn=${turnNumber} done ${Date.now() - startedAt}ms candidates=${candidates.length}`);
	ctx.logger?.debug?.(`[dsh-memory] extract turn=${turnNumber} chars=${transcript.length} candidates=${candidates.length} route=${agent.options.provider ?? "default"}`);
	if (candidates.length === 0) {
		const latest = await store.readState();
		const per = latest.perSession[agent.id] ?? {
			turnCount: 0,
			lastInjectedStep: 0
		};
		per.extractFailStreak = (per.extractFailStreak ?? 0) + 1;
		latest.perSession[agent.id] = per;
		await store.writeState(latest);
		return;
	}
	let added = 0;
	let updated = 0;
	for (const candidate of candidates) {
		let scope = candidate.scope;
		let hash = null;
		if (scope === "project") {
			hash = workspaceHashOf(agent.session.header);
			if (hash === null) scope = "global";
		}
		const beforeEntry = await store.getEntry(entryIdOf(candidate.content, scope, hash));
		const { created, entry } = await store.upsertEntry({
			content: candidate.content,
			scope,
			projectHash: hash,
			tags: candidate.tags,
			importance: candidate.importance,
			source: "extract"
		});
		if (scope === "project" && hash !== null) {
			if (await store.readProjectMeta(hash) === void 0) await store.writeProjectMeta(hash, {
				path: agent.session.header?.cwd ?? "未知工作区",
				alias: null,
				locked: false
			});
		}
		if (created) added += 1;
		else updated += 1;
		await store.appendChange({
			action: created ? "add" : "update",
			entryId: entry.id,
			scope: entry.scope,
			projectHash: entry.projectHash,
			summary: summarize(entry.content),
			before: beforeEntry?.content,
			after: entry.content
		});
	}
	const successState = await store.readState();
	const successPer = successState.perSession[agent.id] ?? {
		turnCount: 0,
		lastInjectedStep: 0
	};
	successPer.extractFailStreak = 0;
	successState.perSession[agent.id] = successPer;
	await store.writeState(successState);
	if (added + updated > 0) {
		await compileAll(store, config);
		ctx.logger?.debug?.(`[dsh-memory] extracted ${added} new, ${updated} updated`);
	}
}
//#endregion
export { apply, inject, name };

//# sourceMappingURL=index.js.map