window.__ModuleLoader__.load({
	id: "@dsh-external/dsh-memory",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region src/client/styles.ts
		/**
		* dsh-memory — 样式（运行时注入 <style>，卸载时由 loader 清理）。
		* 类名前缀 dsh-memory-；颜色走 DSH 主题令牌（--dsw-alias-*）。
		*/
		const css = {
			entry: "dsh-memory-entry",
			entryBadge: "dsh-memory-entry-badge",
			label: "dsh-memory-label",
			modal: "dsh-memory-modal",
			modalBody: "dsh-memory-modal-body",
			panel: "dsh-memory-panel",
			tabs: "dsh-memory-tabs",
			tab: "dsh-memory-tab",
			tabActive: "dsh-memory-tab-active",
			topRow: "dsh-memory-top-row",
			projectChips: "dsh-memory-project-chips",
			projectChip: "dsh-memory-project-chip",
			projectChipActive: "dsh-memory-project-chip-active",
			searchRow: "dsh-memory-search-row",
			searchInput: "dsh-memory-search-input",
			tagSelect: "dsh-memory-tag-select",
			sectionTitle: "dsh-memory-section-title",
			cardList: "dsh-memory-card-list",
			card: "dsh-memory-card",
			cardPinned: "dsh-memory-card-pinned",
			cardMain: "dsh-memory-card-main",
			cardContent: "dsh-memory-card-content",
			cardMeta: "dsh-memory-card-meta",
			chips: "dsh-memory-chips",
			chip: "dsh-memory-chip",
			chipActive: "dsh-memory-chip-active",
			cardActions: "dsh-memory-card-actions",
			iconAction: "dsh-memory-icon-action",
			pinMark: "dsh-memory-pin-mark",
			empty: "dsh-memory-empty",
			changeRow: "dsh-memory-change-row",
			changeBadge: "dsh-memory-change-badge",
			changeBadgeDelete: "dsh-memory-change-badge-delete",
			changeSummary: "dsh-memory-change-summary",
			changeActions: "dsh-memory-change-actions",
			changeOld: "dsh-memory-change-old",
			changeNew: "dsh-memory-change-new",
			changeDiff: "dsh-memory-change-diff",
			changeDiffCol: "dsh-memory-change-diff-col",
			changeDiffDivider: "dsh-memory-change-diff-divider",
			inlineForm: "dsh-memory-inline-form",
			inlineInput: "dsh-memory-inline-input",
			inlineTextarea: "dsh-memory-inline-textarea",
			editButtons: "dsh-memory-edit-buttons",
			addRow: "dsh-memory-add-row",
			addButton: "dsh-memory-add-button",
			addForm: "dsh-memory-add-form",
			addMeta: "dsh-memory-add-meta",
			check: "dsh-memory-check",
			toggle: "dsh-memory-toggle",
			toggleOn: "dsh-memory-toggle-on",
			toggleOff: "dsh-memory-toggle-off",
			error: "dsh-memory-error",
			visuallyHidden: "dsh-memory-visually-hidden"
		};
		const STYLE_ID = "dsh-memory-styles";
		const SHEET = `
/* usage-skill 的合并按钮（用量+技能，order 10）默认 flex:none;width:100% 占满整行，
   会把同行的记忆按钮挤成图标；实测固定 150px（用量/技能各 75px 完整显示），
   记忆按钮占剩余空间（约 102px），三者均无文字挤压。rail 收起态恢复 usage 原宽。 */
.usg_layer{flex:none !important;width:150px !important;min-width:0}
.usg_layer.usg_rail{width:36px !important}
.usg_layer .usg_footerButtons{flex-wrap:nowrap}
.usg_layer .usg_footerButtons > *{min-width:0}
.dsh-memory-entry{flex:1 1 auto !important;min-width:0;position:relative;display:inline-flex;align-items:center;gap:8px;height:32px;box-sizing:border-box;border:none;border-radius:10px;padding:0 8px;background:transparent;cursor:pointer;color:var(--dsw-alias-label-primary,#eee);font-family:inherit;font-size:14px;line-height:20px;overflow:hidden}
.dsh-memory-entry:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(255,255,255,.06))}
.dsh-memory-entry[aria-expanded='true']{background:var(--dsw-alias-interactive-bg-hover,rgba(255,255,255,.06));color:var(--dsw-alias-label-primary,#eee)}
.dsh-memory-label{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dsh-memory-entry-badge{position:absolute;top:2px;right:2px;min-width:16px;height:16px;box-sizing:border-box;padding:0 4px;display:flex;align-items:center;justify-content:center;border-radius:8px;background:var(--dsw-alias-state-warning-primary,#e8a33d);color:#0e1116;font-size:10px;font-weight:700;line-height:16px}
.dsh-memory-modal{width:min(1120px,calc(100vw - 48px))}
.dsh-memory-modal-body{overflow:hidden;display:flex;flex-direction:column}
.dsh-memory-change-old{color:var(--dsw-alias-label-tertiary,#888);text-decoration:line-through;opacity:.8}
.dsh-memory-change-new{color:var(--dsw-alias-label-primary,#eee)}
.dsh-memory-panel{display:flex;flex-direction:column;gap:8px;max-height:min(720px,calc(100vh - 160px));overflow-y:auto;padding:2px 2px 6px;box-sizing:border-box}
.dsh-memory-tabs{flex:none;display:flex;align-items:center;gap:2px;padding:2px;box-sizing:border-box;border:1px solid var(--dsw-alias-border-l1,rgba(255,255,255,.08));border-radius:10px;background:var(--dsw-alias-bg-layer-1,#1c1f26)}
.dsh-memory-tab{flex:1;appearance:none;border:none;background:transparent;border-radius:8px;padding:5px 10px;font-size:13px;line-height:18px;color:var(--dsw-alias-label-secondary,#999);cursor:pointer}
.dsh-memory-tab:hover{color:var(--dsw-alias-label-primary,#eee)}
.dsh-memory-tab-active{background:var(--dsw-alias-interactive-bg-hover,rgba(255,255,255,.08));color:var(--dsw-alias-label-primary,#eee);font-weight:600}
.dsh-memory-top-row{flex:none;display:flex;flex-wrap:wrap;align-items:center;gap:6px}
.dsh-memory-project-chips{display:flex;flex-wrap:wrap;gap:4px;min-width:0}
.dsh-memory-project-chip{flex:none;display:inline-flex;align-items:center;gap:4px;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;appearance:none;border:1px solid var(--dsw-alias-border-l1,rgba(255,255,255,.08));border-radius:999px;padding:3px 10px;font-size:12px;line-height:18px;color:var(--dsw-alias-label-secondary,#999);background:transparent;cursor:pointer}
.dsh-memory-project-chip:hover{border-color:var(--dsw-alias-border-l2,rgba(255,255,255,.16));color:var(--dsw-alias-label-primary,#eee)}
.dsh-memory-project-chip-active{border-color:var(--dsw-alias-brand-primary,#4a9eff);color:var(--dsw-alias-label-primary,#eee);background:var(--dsw-alias-interactive-bg-hover,rgba(255,255,255,.06))}
.dsh-memory-search-row{flex:none;display:flex;align-items:center;gap:6px}
.dsh-memory-search-input{flex:1;min-width:0;height:32px;box-sizing:border-box;border:1px solid var(--dsw-alias-border-l1,rgba(255,255,255,.08));border-radius:8px;padding:0 10px;font-size:13px;color:var(--dsw-alias-label-primary,#eee);background:var(--dsw-alias-bg-base,#0e1116)}
.dsh-memory-search-input::placeholder{color:var(--dsw-alias-label-tertiary,#888)}
.dsh-memory-tag-select{height:32px;box-sizing:border-box;border:1px solid var(--dsw-alias-border-l1,rgba(255,255,255,.08));border-radius:8px;padding:0 8px;font-size:13px;color:var(--dsw-alias-label-primary,#eee);background:var(--dsw-alias-bg-base,#0e1116);max-width:140px}
.dsh-memory-section-title{margin:6px 2px 0;font-size:12px;font-weight:600;line-height:18px;color:var(--dsw-alias-label-secondary,#bbb)}
.dsh-memory-card-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:4px}
.dsh-memory-card{display:flex;align-items:flex-start;gap:8px;border:1px solid var(--dsw-alias-border-l1,rgba(255,255,255,.08));border-radius:10px;padding:8px 10px;background:var(--dsw-alias-bg-layer-1,#1c1f26)}
.dsh-memory-card:hover{border-color:var(--dsw-alias-border-l2,rgba(255,255,255,.16));background:var(--dsw-alias-bg-layer-1,#1c1f26)}
.dsh-memory-card-pinned{border-color:var(--dsw-alias-border-l2,rgba(255,255,255,.16))}
.dsh-memory-card-main{flex:1;min-width:0;display:flex;flex-direction:column;gap:4px}
.dsh-memory-card-content{font-size:13px;line-height:20px;color:var(--dsw-alias-label-primary,#eee);white-space:pre-wrap;word-break:break-word}
.dsh-memory-card-meta{display:flex;align-items:center;gap:6px;font-size:11px;line-height:16px;color:var(--dsw-alias-label-tertiary,#888)}
.dsh-memory-chips{display:flex;flex-wrap:wrap;gap:4px}
.dsh-memory-chip{flex:none;display:inline-flex;align-items:center;border-radius:999px;padding:1px 8px;font-size:11px;line-height:16px;color:var(--dsw-alias-label-secondary,#bbb);background:var(--dsw-alias-border-l2,rgba(255,255,255,.12));cursor:pointer;border:none}
.dsh-memory-chip:hover{color:var(--dsw-alias-label-primary,#eee)}
.dsh-memory-chip-active{color:var(--dsw-alias-brand-primary,#4a9eff)}
.dsh-memory-card-actions{flex:none;display:flex;align-items:center;gap:2px;opacity:0;transition:opacity 120ms}
.dsh-memory-card:hover .dsh-memory-card-actions,.dsh-memory-card:focus-within .dsh-memory-card-actions{opacity:1}
.dsh-memory-icon-action{flex:none;display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border:none;border-radius:50%;padding:0;background:transparent;cursor:pointer;color:var(--dsw-alias-label-tertiary,#888)}
.dsh-memory-icon-action:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(255,255,255,.06));color:var(--dsw-alias-label-primary,#eee)}
.dsh-memory-pin-mark{flex:none;color:var(--dsw-alias-state-warning-primary,#e8a33d)}
.dsh-memory-empty{margin:4px 2px;padding:12px 4px;font-size:12px;line-height:18px;color:var(--dsw-alias-label-tertiary,#888);text-align:center}
.dsh-memory-change-row{display:flex;align-items:flex-start;gap:8px;border:1px solid var(--dsw-alias-border-l1,rgba(255,255,255,.08));border-radius:10px;padding:8px 10px;background:var(--dsw-alias-bg-layer-1,#1c1f26)}
.dsh-memory-change-badge{flex:none;margin-top:2px;font-size:10px;line-height:14px;padding:1px 6px;border-radius:999px;color:#0e1116;background:var(--dsw-alias-state-warning-primary,#e8a33d);font-weight:700}
.dsh-memory-change-badge-delete{color:#fff;background:var(--dsw-alias-state-error-primary,#e0434b)}
.dsh-memory-change-diff{flex:1;min-width:0;display:flex;align-items:stretch;gap:10px}
.dsh-memory-change-diff-col{flex:1;min-width:0;display:flex;flex-direction:column;gap:3px}
.dsh-memory-change-diff-divider{flex:none;width:1px;background:var(--dsw-alias-border-l1,rgba(255,255,255,.08))}
.dsh-memory-add-row{flex:none;display:flex;align-items:center;justify-content:flex-end}
.dsh-memory-add-button{flex:none;display:inline-flex;align-items:center;gap:4px;appearance:none;border:none;border-radius:12px;padding:4px 10px;font-size:12px;line-height:18px;color:var(--dsw-alias-label-secondary,#999);background:transparent;cursor:pointer}
.dsh-memory-add-button:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(255,255,255,.06));color:var(--dsw-alias-label-primary,#eee)}
.dsh-memory-add-form{flex:none;display:flex;flex-direction:column;gap:8px;padding:10px;box-sizing:border-box;border:1px solid var(--dsw-alias-border-l1,rgba(255,255,255,.08));border-radius:12px;background:var(--dsw-alias-bg-layer-1,#1c1f26)}
.dsh-memory-add-meta{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.dsh-memory-check{display:inline-flex;align-items:center;gap:6px;font-size:12px;line-height:18px;color:var(--dsw-alias-label-secondary,#bbb);cursor:pointer}
.dsh-memory-change-summary{flex:1;min-width:0;font-size:13px;line-height:20px;color:var(--dsw-alias-label-primary,#eee);word-break:break-word}
.dsh-memory-change-actions{flex:none;display:flex;align-items:center;gap:4px}
.dsh-memory-inline-form{flex:none;display:flex;flex-direction:column;gap:6px;padding:8px 10px;box-sizing:border-box;border:1px solid var(--dsw-alias-border-l1,rgba(255,255,255,.08));border-radius:10px;background:var(--dsw-alias-bg-layer-1,#1c1f26)}
.dsh-memory-inline-input{height:32px;box-sizing:border-box;border:1px solid var(--dsw-alias-border-l1,rgba(255,255,255,.08));border-radius:8px;padding:0 10px;font-size:13px;color:var(--dsw-alias-label-primary,#eee);background:var(--dsw-alias-bg-base,#0e1116)}
.dsh-memory-inline-textarea{min-height:64px;box-sizing:border-box;border:1px solid var(--dsw-alias-border-l1,rgba(255,255,255,.08));border-radius:8px;padding:8px 10px;font-size:13px;line-height:20px;color:var(--dsw-alias-label-primary,#eee);background:var(--dsw-alias-bg-base,#0e1116);resize:vertical;font-family:inherit}
.dsh-memory-edit-buttons{display:flex;align-items:center;gap:6px}
.dsh-memory-toggle{flex:none;display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;border:none;border-radius:8px;padding:0;background:transparent;cursor:pointer;color:var(--dsw-alias-label-tertiary,#888)}
.dsh-memory-toggle:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(255,255,255,.06))}
.dsh-memory-toggle-on{color:var(--dsw-alias-brand-primary,#4a9eff)}
.dsh-memory-toggle-on:hover{color:var(--dsw-alias-brand-primary,#4a9eff)}
.dsh-memory-toggle-off{color:var(--dsw-alias-label-tertiary,#888);opacity:.55}
.dsh-memory-error{margin:0;font-size:12px;line-height:18px;color:var(--dsw-alias-state-error-primary,#e0434b)}
.dsh-memory-visually-hidden{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
`;
		/** 注入样式表（幂等；loader 卸载插件时会移除其 style 标签）。 */
		function ensureStyles() {
			if (typeof document === "undefined") return;
			if (document.getElementById(STYLE_ID) !== null) return;
			const tag = document.createElement("style");
			tag.id = STYLE_ID;
			tag.textContent = SHEET;
			document.head.appendChild(tag);
		}
		//#endregion
		//#region src/client/Notify.tsx
		/**
		* dsh-memory 变更通知：入口 badge + 会话后变更列表。
		* 未读状态存 localStorage（已读 change id 集合），badge 显示当日未读数；
		* 打开面板时若存在未读则默认定位到「变更」Tab。
		*/
		/** localStorage 前缀。 */
		const READ_KEY = "dsh-memory:read";
		/** 读取已读 id 集合。 */
		function readIds() {
			try {
				const raw = localStorage.getItem(READ_KEY);
				if (raw === null) return /* @__PURE__ */ new Set();
				const parsed = JSON.parse(raw);
				if (!Array.isArray(parsed)) return /* @__PURE__ */ new Set();
				return new Set(parsed.filter((value) => typeof value === "string"));
			} catch {
				return /* @__PURE__ */ new Set();
			}
		}
		function writeIds(ids) {
			try {
				localStorage.setItem(READ_KEY, JSON.stringify([...ids]));
			} catch {}
		}
		/**
		* 轮询当日变更并计算未读数。
		* @param api - 面板 API。
		* @param pollMs - 轮询间隔（默认 60s）。
		*/
		function useUnreadChanges(api, pollMs = 6e4) {
			const [changes, setChanges] = (0, react.useState)([]);
			const [today, setToday] = (0, react.useState)("");
			const [count, setCount] = (0, react.useState)(0);
			const idsRef = (0, react.useRef)(readIds());
			const apiRef = (0, react.useRef)(api);
			apiRef.current = api;
			const refresh = (0, react.useCallback)(async () => {
				try {
					const response = await apiRef.current.changes();
					setChanges(response.changes);
					setToday(response.date);
					const unread = response.changes.filter((change) => !idsRef.current.has(change.id)).length;
					setCount(unread);
				} catch {}
			}, []);
			(0, react.useEffect)(() => {
				refresh();
				const timer = window.setInterval(() => {
					refresh();
				}, pollMs);
				return () => window.clearInterval(timer);
			}, [refresh, pollMs]);
			return {
				count,
				changes,
				today,
				refresh,
				markRead: (0, react.useCallback)(() => {
					const ids = new Set(idsRef.current);
					for (const change of changes) ids.add(change.id);
					idsRef.current = ids;
					writeIds(ids);
					setCount(0);
				}, [changes])
			};
		}
		/** 变更动作徽标文案（zh）。 */
		function changeActionLabel(action) {
			switch (action) {
				case "add": return "新增";
				case "update": return "更新";
				case "promote": return "沉淀";
				case "delete": return "删除";
			}
		}
		//#endregion
		//#region src/client/Panel.tsx
		/**
		* dsh-memory 主面板（Modal，与技能面板同款框架）：
		* Tab（全部 / 变更 / 置顶）、项目切换 chips、搜索 + 标签筛选、
		* 置顶区 + 时间线分组（今天/本周/更早/长期）、条目卡片操作（置顶/编辑/删除/移项目）、
		* 变更裁决（保留/删除/改标签/移项目）。
		*/
		/** 分割标签输入（逗号/空格/中文逗号）。 */
		function splitTags(raw) {
			return raw.split(/[,，\s]+/).map((tag) => tag.trim()).filter(Boolean).slice(0, 8);
		}
		/** 相对时间（今天 HH:mm / 昨天 / N 天前）。 */
		function relativeTime(iso, now = /* @__PURE__ */ new Date()) {
			const time = Date.parse(iso);
			if (Number.isNaN(time)) return "";
			const diff = now.getTime() - time;
			const minutes = Math.floor(diff / 6e4);
			if (minutes < 1) return "刚刚";
			if (minutes < 60) return `${minutes} 分钟前`;
			const hours = Math.floor(minutes / 60);
			if (hours < 24) return `${hours} 小时前`;
			const days = Math.floor(hours / 24);
			if (days === 1) return "昨天";
			if (days < 30) return `${days} 天前`;
			return new Date(time).toLocaleDateString();
		}
		/** 按 updatedAt 分组（与 host groupEntries 一致）。 */
		function groupEntries(entries) {
			const groups = {
				today: [],
				week: [],
				earlier: [],
				longterm: []
			};
			const now = /* @__PURE__ */ new Date();
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
		/** 项目显示名（从 projects 列表按 hash 查；未知 hash 用前缀）。 */
		function projectName(hash, projects) {
			if (hash === null) return "";
			const project = projects.find((candidate) => candidate.hash === hash);
			if (project === void 0) return hash.slice(0, 6);
			return project.alias ?? project.path.split(/[\\/]/).filter(Boolean).at(-1) ?? hash.slice(0, 6);
		}
		/** 敏感凭据检测（与 host 过滤规则同源；用于手动添加时的风险提示，不阻断）。 */
		const SENSITIVE_PATTERNS = [
			/gh[pousr]_[A-Za-z0-9]{20,}/,
			/sk-[A-Za-z0-9_-]{20,}/i,
			/AKIA[0-9A-Z]{16}/,
			/xox[baprs]-[A-Za-z0-9-]{20,}/i,
			/-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----/i,
			/(?:password|passwd|secret|api[_-]?key|access[_-]?token|private[_-]?key)\s*[=:]\s*[^\s,，。；;]{8,}/i
		];
		function containsSensitive(text) {
			return SENSITIVE_PATTERNS.some((pattern) => pattern.test(text));
		}
		/**
		* 大脑/记忆图标（Lucide `brain`，MIT 开源，24 viewBox + stroke-width 2，
		* 标准矢量设计——小尺寸下依然清晰，替代自绘细描边版）。
		* 来源：https://lucide.dev/icons/brain
		*/
		function BrainIcon({ size = 16 }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
				viewBox: "0 0 24 24",
				width: size,
				height: size,
				fill: "none",
				stroke: "currentColor",
				strokeWidth: "2",
				strokeLinecap: "round",
				strokeLinejoin: "round",
				"aria-hidden": "true",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M17.599 6.5a3 3 0 0 0 .399-1.375" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M6.003 5.125A3 3 0 0 0 6.401 6.5" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M3.477 10.896a4 4 0 0 1 .585-.396" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M19.938 10.5a4 4 0 0 1 .585.396" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M6 18a4 4 0 0 1-1.967-.516" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M19.967 17.484A4 4 0 0 1 18 18" })
				]
			});
		}
		/** 置顶图标（线性 SVG）。 */
		function PinIcon({ size = 16, filled = false }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
				viewBox: "0 0 16 16",
				width: size,
				height: size,
				fill: filled ? "currentColor" : "none",
				stroke: "currentColor",
				strokeWidth: "1.3",
				strokeLinecap: "round",
				strokeLinejoin: "round",
				"aria-hidden": "true",
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M9.8 2.2 13.8 6.2l-2.3.7-2.4 2.4-.7 2.3-1.6-1.6-2.7 2.7-1-1 2.7-2.7-1.6-1.6 2.3-.7 2.4-2.4.7-2.3Z" })
			});
		}
		/** 主面板。 */
		function MemoryPanel({ open, onClose, initialTab, t, ...api }) {
			ensureStyles();
			const apiRef = (0, react.useRef)(api);
			apiRef.current = api;
			const [tab, setTab] = (0, react.useState)(initialTab ?? "all");
			const [scope, setScope] = (0, react.useState)("all");
			const [q, setQ] = (0, react.useState)("");
			const [tag, setTag] = (0, react.useState)("");
			const [state, setState] = (0, react.useState)({ status: "loading" });
			const [allTags, setAllTags] = (0, react.useState)([]);
			const [changes, setChanges] = (0, react.useState)([]);
			const [editing, setEditing] = (0, react.useState)(null);
			const [moving, setMoving] = (0, react.useState)(null);
			const [busy, setBusy] = (0, react.useState)(false);
			const [error, setError] = (0, react.useState)("");
			const [adding, setAdding] = (0, react.useState)(false);
			const [addContent, setAddContent] = (0, react.useState)("");
			const [addTags, setAddTags] = (0, react.useState)("");
			const [addPinned, setAddPinned] = (0, react.useState)(false);
			const [addScope, setAddScope] = (0, react.useState)("global");
			const [addProject, setAddProject] = (0, react.useState)("");
			const load = (0, react.useCallback)(async () => {
				const current = apiRef.current;
				setState({ status: "loading" });
				setError("");
				try {
					const scopeParam = scope === "all" ? void 0 : scope === "global" ? "global" : "project";
					const projectParam = scope.startsWith("project:") ? scope.slice(8) : void 0;
					const [list, tagsRes, changesRes] = await Promise.all([
						current.list({
							scope: scopeParam,
							project: projectParam,
							q: q !== "" ? q : void 0,
							tag: tag !== "" ? tag : void 0
						}),
						current.tags(),
						current.changes()
					]);
					setState({
						status: "ready",
						snapshot: list
					});
					setAllTags(tagsRes.tags);
					setChanges(changesRes.changes);
				} catch (loadError) {
					setState({ status: "error" });
					setError(loadError instanceof Error ? loadError.message : String(loadError));
				}
			}, [
				scope,
				q,
				tag
			]);
			(0, react.useEffect)(() => {
				if (open) load();
			}, [open, load]);
			(0, react.useEffect)(() => {
				if (open && initialTab !== void 0) setTab(initialTab);
			}, [open, initialTab]);
			const run = async (operation) => {
				setBusy(true);
				setError("");
				try {
					await operation();
				} catch (operationError) {
					setError(operationError instanceof Error ? operationError.message : String(operationError));
				} finally {
					setBusy(false);
					await load();
				}
			};
			const handlePin = (entry) => {
				run(() => api.pin(entry.id, !entry.pinned));
			};
			const handleDelete = (entry) => {
				if (!window.confirm(t("deleteConfirm"))) return;
				run(() => api.deleteEntry(entry.id));
			};
			/** 提交手动添加记忆。 */
			const saveAdd = () => {
				const content = addContent.trim();
				if (content === "") return;
				if (addScope === "project" && addProject === "") {
					setError(t("selectProject"));
					return;
				}
				if (containsSensitive(content)) {
					if (!window.confirm(t("sensitiveConfirm"))) return;
				}
				run(async () => {
					await api.remember({
						content,
						scope: addScope,
						projectHash: addScope === "project" ? addProject : void 0,
						tags: splitTags(addTags),
						pinned: addPinned,
						importance: 8
					});
					setAdding(false);
					setAddContent("");
					setAddTags("");
					setAddPinned(false);
					setAddProject("");
				});
			};
			const startEdit = (entry) => {
				setEditing({
					entryId: entry.id,
					content: entry.content,
					tags: entry.tags.join(", "),
					scope: entry.scope,
					projectHash: entry.projectHash
				});
			};
			const saveEdit = () => {
				if (editing === null) return;
				run(async () => {
					await api.update(editing.entryId, {
						content: editing.content.trim() !== "" ? editing.content : void 0,
						tags: splitTags(editing.tags)
					});
					const original = state.status === "ready" ? state.snapshot.entries.find((entry) => entry.id === editing.entryId) : void 0;
					if (original !== void 0 && (editing.scope !== original.scope || editing.scope === "project" && editing.projectHash !== original.projectHash)) await api.move(editing.entryId, {
						scope: editing.scope,
						projectHash: editing.scope === "project" && editing.projectHash !== null ? editing.projectHash : void 0
					});
					setEditing(null);
				});
			};
			const startMove = (entry) => {
				setMoving({
					entryId: entry.id,
					target: entry.scope === "global" ? "project" : "global",
					project: entry.projectHash ?? ""
				});
			};
			const saveMove = () => {
				if (moving === null) return;
				run(async () => {
					if (moving.target === "project" && moving.project.trim() === "") throw new Error(t("projectPlaceholder"));
					await api.move(moving.entryId, {
						scope: moving.target,
						projectHash: moving.target === "project" ? moving.project.trim() : void 0,
						path: moving.target === "project" ? moving.project.trim() : void 0
					});
					setMoving(null);
				});
			};
			const snapshot = state.status === "ready" ? state.snapshot : null;
			const projects = snapshot?.projects ?? [];
			const filtered = (0, react.useMemo)(() => {
				if (snapshot === null) return [];
				return snapshot.entries;
			}, [snapshot]);
			const pinned = (0, react.useMemo)(() => filtered.filter((entry) => entry.pinned), [filtered]);
			const grouped = (0, react.useMemo)(() => groupEntries(filtered.filter((entry) => !entry.pinned)), [filtered]);
			const visibleChanges = (0, react.useMemo)(() => changes.filter((change) => {
				if (scope === "global") return change.scope === "global";
				if (scope.startsWith("project:")) return change.scope === "project" && change.projectHash === scope.slice(8);
				return true;
			}), [changes, scope]);
			const groupTitles = {
				today: t("groupToday"),
				week: t("groupWeek"),
				earlier: t("groupEarlier"),
				longterm: t("groupLongterm")
			};
			const renderCard = (entry) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
				className: entry.pinned ? `${css.card} ${css.cardPinned}` : css.card,
				children: [
					entry.pinned && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: css.pinMark,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PinIcon, {
							size: 14,
							filled: true
						})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: css.cardMain,
						children: editing?.entryId === entry.id ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: css.inlineForm,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
									className: css.inlineTextarea,
									value: editing.content,
									"aria-label": t("edit"),
									onChange: (event) => {
										setEditing({
											...editing,
											content: event.currentTarget.value
										});
									}
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									className: css.inlineInput,
									value: editing.tags,
									placeholder: t("tagEditPlaceholder"),
									"aria-label": t("tagEditPlaceholder"),
									onChange: (event) => {
										setEditing({
											...editing,
											tags: event.currentTarget.value
										});
									}
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: css.addMeta,
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
											className: css.check,
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
												type: "radio",
												name: `dsh-memory-edit-scope-${entry.id}`,
												checked: editing.scope === "global",
												onChange: () => {
													setEditing({
														...editing,
														scope: "global",
														projectHash: null
													});
												}
											}), t("moveToGlobal")]
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
											className: css.check,
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
												type: "radio",
												name: `dsh-memory-edit-scope-${entry.id}`,
												checked: editing.scope === "project",
												onChange: () => {
													setEditing({
														...editing,
														scope: "project",
														projectHash: editing.projectHash ?? projects.find((p) => p.entryCount > 0)?.hash ?? projects[0]?.hash ?? null
													});
												}
											}), t("moveToProject")]
										}),
										editing.scope === "project" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("select", {
											className: css.tagSelect,
											value: editing.projectHash ?? "",
											"aria-label": t("projectPlaceholder"),
											onChange: (event) => {
												setEditing({
													...editing,
													projectHash: event.currentTarget.value || null
												});
											},
											children: projects.map((project) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
												value: project.hash,
												children: project.alias ?? project.path.split(/[\\/]/).filter(Boolean).at(-1) ?? project.hash
											}, project.hash))
										})
									]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: css.editButtons,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
										variant: "primary",
										size: "sm",
										disabled: busy,
										onClick: saveEdit,
										children: t("save")
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
										variant: "outline",
										size: "sm",
										disabled: busy,
										onClick: () => {
											setEditing(null);
										},
										children: t("cancel")
									})]
								})
							]
						}) : moving?.entryId === entry.id ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: css.inlineForm,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: css.editButtons,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
										variant: moving.target === "global" ? "primary" : "outline",
										size: "sm",
										disabled: busy,
										onClick: () => {
											setMoving({
												...moving,
												target: "global"
											});
										},
										children: t("moveToGlobal")
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
										variant: moving.target === "project" ? "primary" : "outline",
										size: "sm",
										disabled: busy,
										onClick: () => {
											setMoving({
												...moving,
												target: "project"
											});
										},
										children: t("moveToProject")
									})]
								}),
								moving.target === "project" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									className: css.inlineInput,
									value: moving.project,
									placeholder: t("projectPlaceholder"),
									"aria-label": t("projectPlaceholder"),
									onChange: (event) => {
										setMoving({
											...moving,
											project: event.currentTarget.value
										});
									}
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: css.editButtons,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
										variant: "primary",
										size: "sm",
										disabled: busy,
										onClick: saveMove,
										children: t("save")
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
										variant: "outline",
										size: "sm",
										disabled: busy,
										onClick: () => {
											setMoving(null);
										},
										children: t("cancel")
									})]
								})
							]
						}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: css.cardContent,
								children: entry.content
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: css.cardMeta,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: entry.scope === "global" ? t("scopeGlobal") : projectName(entry.projectHash, projects) }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [
										"[",
										entry.importance,
										"]"
									] }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: entry.source === "manual" ? t("sourceManual") : t("sourceExtract") }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: relativeTime(entry.updatedAt) }),
									entry.layer === "long" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("groupLongterm") })
								]
							}),
							entry.tags.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: css.chips,
								children: entry.tags.map((tagName) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: tag === tagName ? `${css.chip} ${css.chipActive}` : css.chip,
									onClick: () => {
										setTag(tag === tagName ? "" : tagName);
									},
									children: tagName
								}, tagName))
							})
						] })
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: css.cardActions,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tooltip, {
								label: entry.pinned ? t("unpin") : t("pin"),
								side: "top",
								delayMs: 500,
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: css.iconAction,
									"aria-label": entry.pinned ? t("unpin") : t("pin"),
									disabled: busy,
									onClick: () => {
										handlePin(entry);
									},
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PinIcon, {
										size: 14,
										filled: entry.pinned
									})
								})
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tooltip, {
								label: t("edit"),
								side: "top",
								delayMs: 500,
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: css.iconAction,
									"aria-label": t("edit"),
									disabled: busy,
									onClick: () => {
										startEdit(entry);
									},
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconEditOutline16, { size: 14 })
								})
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tooltip, {
								label: t("move"),
								side: "top",
								delayMs: 500,
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: css.iconAction,
									"aria-label": t("move"),
									disabled: busy,
									onClick: () => {
										startMove(entry);
									},
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconFolderOpenOutline16, { size: 14 })
								})
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tooltip, {
								label: t("delete"),
								side: "top",
								delayMs: 500,
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: css.iconAction,
									"aria-label": t("delete"),
									disabled: busy,
									onClick: () => {
										handleDelete(entry);
									},
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconTrashOutline16, { size: 14 })
								})
							})
						]
					})
				]
			}, entry.id);
			/** 渲染一条变更（含前后内容对比，无删除按钮）。 */
			const renderChange = (change) => {
				const hasDiff = change.before !== void 0 && change.after !== void 0 && change.before !== change.after;
				return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
					className: css.changeRow,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: change.action === "delete" ? `${css.changeBadge} ${css.changeBadgeDelete}` : css.changeBadge,
						children: changeActionLabel(change.action)
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: css.cardMain,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: css.cardMeta,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: change.scope === "global" ? t("scopeGlobal") : change.projectHash ?? "" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: relativeTime(change.at) })]
						}), change.action === "delete" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: css.cardContent,
							children: change.summary
						}) : hasDiff ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: css.changeDiff,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: css.changeDiffCol,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										className: css.cardMeta,
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("diffOld") })
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										className: `${css.cardContent} ${css.changeOld}`,
										children: change.before
									})]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { className: css.changeDiffDivider }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: css.changeDiffCol,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										className: css.cardMeta,
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("diffNew") })
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										className: `${css.cardContent} ${css.changeNew}`,
										children: change.after
									})]
								})
							]
						}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: css.cardContent,
							children: change.after ?? change.summary
						})]
					})]
				}, change.id);
			};
			const renderEmpty = (text) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: css.empty,
				children: text
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Modal, {
				open,
				onClose,
				closeLabel: t("close"),
				title: t("panelTitle"),
				className: css.modal ?? "",
				contentClassName: css.modalBody ?? "",
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: css.panel,
					"aria-busy": state.status === "loading",
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: css.tabs,
							role: "tablist",
							children: [
								"all",
								"changes",
								"pinned"
							].map((key) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								role: "tab",
								"aria-selected": tab === key,
								className: tab === key ? `${css.tab} ${css.tabActive}` : css.tab,
								onClick: () => {
									setTab(key);
								},
								children: key === "all" ? t("tabAll") : key === "changes" ? `${t("tabChanges")}${changes.length > 0 ? ` (${changes.length})` : ""}` : t("tabPinned")
							}, key))
						}),
						state.status === "ready" && tab !== "pinned" && pinned.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: css.sectionTitle,
							children: t("tabPinned")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
							className: css.cardList,
							children: pinned.map(renderCard)
						})] }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: css.addRow,
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								variant: "ghost",
								size: "sm",
								"aria-expanded": adding,
								onClick: () => {
									setAdding((value) => !value);
								},
								children: t("add")
							})
						}),
						adding && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: css.addForm,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
									className: css.inlineTextarea,
									value: addContent,
									placeholder: t("addContentPlaceholder"),
									"aria-label": t("addContentPlaceholder"),
									autoFocus: true,
									onChange: (event) => {
										setAddContent(event.currentTarget.value);
									}
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: css.addMeta,
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
											className: css.inlineInput,
											style: {
												flex: 1,
												minWidth: 120
											},
											value: addTags,
											placeholder: t("addTagsPlaceholder"),
											"aria-label": t("addTagsPlaceholder"),
											onChange: (event) => {
												setAddTags(event.currentTarget.value);
											}
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
											className: css.check,
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
												type: "checkbox",
												checked: addPinned,
												onChange: (event) => {
													setAddPinned(event.currentTarget.checked);
												}
											}), t("addPinned")]
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
											className: css.check,
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
												type: "radio",
												name: "dsh-memory-add-scope",
												checked: addScope === "global",
												onChange: () => {
													setAddScope("global");
												}
											}), t("addScopeGlobal")]
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
											className: css.check,
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
												type: "radio",
												name: "dsh-memory-add-scope",
												checked: addScope === "project",
												onChange: () => {
													setAddScope("project");
													if (addProject === "") {
														const first = projects.find((project) => project.entryCount > 0) ?? projects[0];
														if (first !== void 0) setAddProject(first.hash);
													}
												}
											}), t("addScopeProject")]
										}),
										addScope === "project" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
											className: css.tagSelect,
											value: addProject,
											"aria-label": t("projectPlaceholder"),
											onChange: (event) => {
												setAddProject(event.currentTarget.value);
											},
											children: [projects.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
												value: "",
												children: t("noProjects")
											}), projects.map((project) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
												value: project.hash,
												children: project.alias ?? project.path.split(/[\\/]/).filter(Boolean).at(-1) ?? project.hash
											}, project.hash))]
										})
									]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: css.editButtons,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
										variant: "primary",
										size: "sm",
										disabled: busy || addContent.trim() === "",
										onClick: saveAdd,
										children: t("save")
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
										variant: "outline",
										size: "sm",
										disabled: busy,
										onClick: () => {
											setAdding(false);
										},
										children: t("cancel")
									})]
								})
							]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: css.topRow,
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: css.projectChips,
								role: "group",
								"aria-label": t("scopeGlobal"),
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: scope === "all" ? `${css.projectChip} ${css.projectChipActive}` : css.projectChip,
										onClick: () => {
											setScope("all");
										},
										children: t("tabAll")
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: scope === "global" ? `${css.projectChip} ${css.projectChipActive}` : css.projectChip,
										onClick: () => {
											setScope("global");
										},
										children: t("scopeGlobal")
									}),
									projects.map((project) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										title: project.path,
										className: scope === `project:${project.hash}` ? `${css.projectChip} ${css.projectChipActive}` : css.projectChip,
										onClick: () => {
											setScope(scope === `project:${project.hash}` ? "all" : `project:${project.hash}`);
										},
										children: project.alias ?? project.path.split(/[\\/]/).filter(Boolean).at(-1) ?? project.hash
									}, project.hash))
								]
							})
						}),
						tab === "all" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: css.searchRow,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									className: css.searchInput,
									value: q,
									placeholder: t("searchPlaceholder"),
									"aria-label": t("searchPlaceholder"),
									onChange: (event) => {
										setQ(event.currentTarget.value);
									}
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
									className: css.tagSelect,
									value: tag,
									"aria-label": t("tagFilterPlaceholder"),
									onChange: (event) => {
										setTag(event.currentTarget.value);
									},
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
										value: "",
										children: t("tagFilterPlaceholder")
									}), allTags.map((item) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("option", {
										value: item.tag,
										children: [
											item.tag,
											" (",
											item.count,
											")"
										]
									}, item.tag))]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tooltip, {
									label: t("retry"),
									side: "top",
									delayMs: 500,
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: css.iconAction,
										"aria-label": t("retry"),
										onClick: () => {
											load();
										},
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconRefreshOutline14, {})
									})
								})
							]
						}),
						error !== "" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: css.error,
							children: error
						}),
						state.status === "loading" && renderEmpty(t("loading")),
						state.status === "error" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: css.empty,
							children: [t("error"), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: css.chip,
								onClick: () => {
									load();
								},
								children: t("retry")
							})]
						}),
						state.status === "ready" && tab === "all" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [Object.keys(grouped).map((groupKey) => grouped[groupKey].length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: css.sectionTitle,
							children: groupTitles[groupKey]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
							className: css.cardList,
							children: grouped[groupKey].map(renderCard)
						})] }, groupKey)), filtered.length === 0 && renderEmpty(t("empty"))] }),
						state.status === "ready" && tab === "changes" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: css.sectionTitle,
							children: t("todayChanges")
						}), visibleChanges.length === 0 ? renderEmpty(t("changesEmpty")) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
							className: css.cardList,
							children: visibleChanges.map(renderChange)
						})] }),
						state.status === "ready" && tab === "pinned" && (pinned.length === 0 ? renderEmpty(t("pinnedEmpty")) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
							className: css.cardList,
							children: pinned.map(renderCard)
						}))
					]
				})
			});
		}
		//#endregion
		//#region src/client/Entry.tsx
		/**
		* dsh-memory 侧边栏入口：sidebar.footer.action 插槽（order 6，紧邻技能右侧）。
		* 图标用「大脑/记忆」线性 SVG（无 emoji），wide 时显示文字；右上角 badge 显示当日未读变更数。
		*/
		/** 渲染记忆入口与面板。 */
		function MemoryEntry({ wide, t, ...panel }) {
			ensureStyles();
			const [open, setOpen] = (0, react.useState)(false);
			const [initialTab, setInitialTab] = (0, react.useState)("all");
			const buttonRef = (0, react.useRef)(null);
			const unread = useUnreadChanges(panel);
			(0, react.useEffect)(() => {
				const wrapper = buttonRef.current?.parentElement;
				if (wrapper === void 0 || wrapper === null) return;
				const previousDisplay = wrapper.style.display;
				const previousDirection = wrapper.style.flexDirection;
				const previousWidth = wrapper.style.width;
				wrapper.style.display = "flex";
				wrapper.style.flexDirection = "row";
				wrapper.style.alignItems = "center";
				wrapper.style.gap = "4px";
				wrapper.style.flex = "1 1 50%";
				wrapper.style.minWidth = "0";
				return () => {
					wrapper.style.display = previousDisplay;
					wrapper.style.flexDirection = previousDirection;
					wrapper.style.width = previousWidth;
					wrapper.style.flex = "";
					wrapper.style.minWidth = "";
					wrapper.style.alignItems = "";
					wrapper.style.gap = "";
				};
			}, []);
			const openPanel = (tab) => {
				setInitialTab(tab);
				setOpen(true);
				if (tab === "changes") unread.markRead();
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tooltip, {
				label: t("entry"),
				side: "right",
				delayMs: 500,
				disabled: wide,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
					ref: buttonRef,
					type: "button",
					className: css.entry,
					"aria-label": t("entry"),
					"aria-expanded": open,
					onClick: () => {
						openPanel(unread.count > 0 ? "changes" : "all");
					},
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(BrainIcon, { size: 16 }),
						wide && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: css.label,
							children: t("entry")
						}),
						unread.count > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: css.entryBadge,
							title: t("unreadChanges", { n: unread.count }),
							children: unread.count > 99 ? "99+" : unread.count
						})
					]
				})
			}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(MemoryPanel, {
				open,
				onClose: () => {
					setOpen(false);
				},
				initialTab,
				t,
				list: panel.list,
				projects: panel.projects,
				tags: panel.tags,
				changes: panel.changes,
				summary: panel.summary,
				pin: panel.pin,
				update: panel.update,
				move: panel.move,
				deleteEntry: panel.deleteEntry,
				meta: panel.meta,
				remember: panel.remember,
				getInjectState: panel.getInjectState,
				setInjectState: panel.setInjectState
			})] });
		}
		//#endregion
		//#region src/client/Toggle.tsx
		/**
		* dsh-memory 注入开关（composer 输入框工具行左端）：
		* 按会话控制是否把记忆注入上下文。开启 = 记忆随 pre-step 注入；关闭 = 本会话不注入。
		* 状态持久化在 host（state.json），重启保留。
		*/
		/** 渲染注入开关按钮。 */
		function MemoryToggle({ sessionId, t, ...api }) {
			ensureStyles();
			const [enabled, setEnabled] = (0, react.useState)(null);
			(0, react.useEffect)(() => {
				let alive = true;
				api.getInjectState(sessionId).then((state) => {
					if (alive) setEnabled(state.enabled);
				}).catch(() => {
					if (alive) setEnabled(true);
				});
				return () => {
					alive = false;
				};
			}, [sessionId, api]);
			const toggle = () => {
				const next = !(enabled ?? true);
				setEnabled(next);
				api.setInjectState(sessionId, next).then((state) => setEnabled(state.enabled)).catch(() => setEnabled(!next));
			};
			const isOn = enabled ?? true;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tooltip, {
				label: isOn ? t("injectOn") : t("injectOff"),
				side: "top",
				delayMs: 500,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
					type: "button",
					className: isOn ? `${css.toggle} ${css.toggleOn}` : `${css.toggle} ${css.toggleOff}`,
					"aria-label": isOn ? t("injectOn") : t("injectOff"),
					"aria-pressed": isOn,
					onClick: toggle,
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(BrainIcon, { size: 14 })
				})
			});
		}
		//#endregion
		//#region src/client/api.ts
		/**
		* dsh-memory client API：镜像 host 的 /api/dsh-memory/* 路由。
		* 纯 fetch（无 typert、无 DSH 源码改动），与 skill-manager 同款模式。
		*/
		const API_BASE = "/api/dsh-memory";
		/** GET helper with JSON parsing and error surfacing. */
		async function getJson(path) {
			const response = await fetch(`${API_BASE}${path}`, { headers: { accept: "application/json" } });
			const body = await response.json();
			if (!response.ok) throw new Error(body.error ?? `request failed (${String(response.status)})`);
			return body;
		}
		/** POST helper with JSON body. */
		async function sendJson(path, payload) {
			const response = await fetch(`${API_BASE}${path}`, {
				method: "POST",
				headers: {
					accept: "application/json",
					"content-type": "application/json"
				},
				body: JSON.stringify(payload)
			});
			const body = await response.json();
			if (!response.ok) throw new Error(body.error ?? `request failed (${String(response.status)})`);
			return body;
		}
		/** 构造面板 API 面。 */
		function createMemoryApi() {
			return {
				list: (params = {}) => {
					const query = new URLSearchParams();
					if (params.scope !== void 0 && params.scope !== "") query.set("scope", params.scope);
					if (params.project !== void 0 && params.project !== "") query.set("project", params.project);
					if (params.q !== void 0 && params.q !== "") query.set("q", params.q);
					if (params.tag !== void 0 && params.tag !== "") query.set("tag", params.tag);
					return getJson(`/list${query.toString() === "" ? "" : `?${query.toString()}`}`);
				},
				projects: () => getJson("/projects"),
				tags: () => getJson("/tags"),
				changes: (date) => getJson(`/changes${date !== void 0 ? `?date=${encodeURIComponent(date)}` : ""}`),
				summary: () => getJson("/summary"),
				pin: (entryId, pinned) => sendJson("/pin", {
					entryId,
					pinned
				}),
				update: (entryId, patch) => sendJson("/update", {
					entryId,
					...patch
				}),
				move: (entryId, target) => sendJson("/move", {
					entryId,
					...target
				}),
				deleteEntry: (entryId) => sendJson("/delete", { entryId }),
				meta: (projectHash, patch) => sendJson("/meta", {
					projectHash,
					...patch
				}),
				remember: (input) => sendJson("/remember", input),
				getInjectState: (sessionId) => getJson(`/inject-state?sessionId=${encodeURIComponent(sessionId)}`),
				setInjectState: (sessionId, enabled) => sendJson("/inject-state", {
					sessionId,
					enabled
				})
			};
		}
		//#endregion
		//#region src/client/locales.ts
		/** dsh-memory 面板文案（zh/en 双语，zh 为 key 源）。 */
		/** Simplified Chinese dictionary and key source of truth. */
		const zh = {
			entry: "记忆",
			panelTitle: "记忆",
			tabAll: "全部",
			tabChanges: "变更",
			tabPinned: "置顶",
			searchPlaceholder: "搜索记忆…",
			tagFilterPlaceholder: "全部标签",
			scopeGlobal: "全局",
			projectLabel: "{name}",
			groupToday: "今天",
			groupWeek: "本周",
			groupEarlier: "更早",
			groupLongterm: "长期沉淀",
			empty: "会话中的要点会自动沉淀到这里",
			changesEmpty: "今天还没有新的记忆变更",
			pinnedEmpty: "还没有置顶记忆",
			pin: "置顶",
			unpin: "取消置顶",
			edit: "编辑",
			delete: "删除",
			move: "移项目",
			deleteConfirm: "删除这条记忆？",
			tagEditPlaceholder: "逗号分隔标签",
			save: "保存",
			cancel: "取消",
			keep: "保留",
			moveToGlobal: "移到全局",
			moveToProject: "移到项目",
			projectPlaceholder: "项目路径或 hash",
			loading: "读取中…",
			error: "读取失败",
			retry: "重试",
			noProjects: "还没有项目记忆",
			importanceLabel: "{n}",
			updatedAgo: "{time}",
			changesBadge: "{n} 条新记忆",
			unreadChanges: "{n} 条新变更",
			close: "关闭",
			todayChanges: "今日变更",
			sourceExtract: "自动",
			sourceManual: "手动",
			add: "添加",
			addMemory: "添加记忆",
			addContentPlaceholder: "要记住的内容…",
			addTagsPlaceholder: "逗号分隔标签",
			addPinned: "置顶",
			addScopeGlobal: "全局",
			addScopeProject: "项目",
			selectProject: "请选择项目",
			sensitiveConfirm: "内容包含疑似敏感信息（token/密钥等）。仍要保存吗？保存后注入上下文可能被模型读取，风险自担。",
			injectOn: "记忆注入：开",
			injectOff: "记忆注入：关",
			diffOld: "旧",
			diffNew: "新",
			addSaved: "已添加记忆"
		};
		/** Locale namespace owned by this plugin. */
		const NS = "dshMemory";
		/** English dictionary checked against the Chinese key set. */
		const en = {
			entry: "Memory",
			panelTitle: "Memory",
			tabAll: "All",
			tabChanges: "Changes",
			tabPinned: "Pinned",
			searchPlaceholder: "Search memories…",
			tagFilterPlaceholder: "All tags",
			scopeGlobal: "Global",
			projectLabel: "{name}",
			groupToday: "Today",
			groupWeek: "This week",
			groupEarlier: "Earlier",
			groupLongterm: "Long-term",
			empty: "Key points from conversations will settle here automatically",
			changesEmpty: "No memory changes today yet",
			pinnedEmpty: "No pinned memories yet",
			pin: "Pin",
			unpin: "Unpin",
			edit: "Edit",
			delete: "Delete",
			move: "Move",
			deleteConfirm: "Delete this memory?",
			tagEditPlaceholder: "Comma-separated tags",
			save: "Save",
			cancel: "Cancel",
			keep: "Keep",
			moveToGlobal: "Move to global",
			moveToProject: "Move to project",
			projectPlaceholder: "Project path or hash",
			loading: "Loading…",
			error: "Failed to load",
			retry: "Retry",
			noProjects: "No project memories yet",
			importanceLabel: "{n}",
			updatedAgo: "{time}",
			changesBadge: "{n} new memories",
			unreadChanges: "{n} new changes",
			close: "Close",
			todayChanges: "Today's changes",
			sourceExtract: "Auto",
			sourceManual: "Manual",
			add: "Add",
			addMemory: "Add memory",
			addContentPlaceholder: "What to remember…",
			addTagsPlaceholder: "Comma-separated tags",
			addPinned: "Pin",
			addScopeGlobal: "Global",
			addScopeProject: "Project",
			selectProject: "Select a project",
			sensitiveConfirm: "This content looks like sensitive credentials (token/key). Save anyway? Injected memories may be read by the model — you take the risk.",
			injectOn: "Memory injection: on",
			injectOff: "Memory injection: off",
			diffOld: "Old",
			diffNew: "New",
			addSaved: "Memory added"
		};
		//#endregion
		//#region src/client/index.ts
		/** Services required by the footer registration. */
		const inject = ["slots", "locale"];
		/** Contribute the footer entry wired to the dsh-memory HTTP API. */
		function apply(ctx) {
			ctx.effect(() => ctx.locale.register(NS, {
				zh,
				en
			}), "dsh-memory: dictionaries");
			const panelInjected = () => createMemoryApi();
			ctx.slots.inject("sidebar.footer.action", () => ctx.slots.register({
				name: "sidebar.footer.action",
				id: "dsh-memory",
				order: 11,
				locale: NS,
				inject: panelInjected
			}, MemoryEntry));
			ctx.slots.inject("conversation.input.left", () => ctx.slots.register({
				name: "conversation.input.left",
				id: "dsh-memory-inject-toggle",
				order: 100,
				locale: NS,
				inject: panelInjected
			}, MemoryToggle));
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map