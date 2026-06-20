# Чек-лист бэклога

> Источник приоритетов: `docs/report/2026-06-20-analysis.md`.
> Каждая задача — отдельный `*.md` файл в этой папке (`docs/backlog/`).

## Правила работы с чек-листом

1. **Берём задачу по приоритету:** сначала все `P0-`, потом `P1-`.
2. **Описание и чек-лист выполнения** — в файле задачи (`<ID>-<slug>.md`).
3. **Когда задача готова:**
   - отметить пункт ниже как `[x]`;
   - дописать дату и (опционально) коммит/PR;
   - **удалить файл задачи** из `docs/backlog/` — папка должна содержать только невыполненные задачи.
4. **Внутри P0/P1** порядок свободный, но `P0-02` (sandbox) лучше после `P0-01` (обновление Electron).

---

## 🔴 P0 — Сделать в первую очередь

- [x] **P0-01** Обновить Electron 33 → 36+ — `P0-01-update-electron.md`
- [x] **P0-02** Включить `sandbox: true` — `P0-02-enable-sandbox.md`
- [x] **P0-03** Убрать внешние шрифты из CSP — `P0-03-csp-system-fonts.md`
- [x] **P0-04** Починить баг `remainingUnits` — `P0-04-fix-remaining-units.md`
- [x] **P0-05** Сменить палитру иконки на `--brand` зелёный — `P0-05-icon-brand-palette.md`

## 🟡 P1 — В ближайший спринт

- [x] **P1-06** Инвалидировать `limitsCache` при переключении/удалении — `P1-06-invalidate-limits-cache.md`
- [x] **P1-07** Привести шрифты 11px к 12px — `P1-07-fonts-12px-minimum.md`
- [x] **P1-08** Задокументировать привязку аккаунтов к машине — `P1-08-document-machine-binding.md`
- [x] **P1-09** `*.ico` в `.gitignore` (или осознанно оставить) — `P1-09-gitignore-ico.md`
- [x] **P1-10** `isValidJwt` — требовать ровно 3 части — `P1-10-isvalidjwt-3-parts.md`

---

## Журнал выполненных задач

> Формат строки: `✅ <ID> — <краткое описание> — <дата> — <commit/PR>`
> Добавлять сюда в момент, когда задача отмечается готовой (а её файл удаляется).

<!-- Пример:
✅ P0-04 — Починен баг remainingUnits (snake_case) — 2026-06-21 — commit abc1234
-->

✅ P0-01 — Обновлён Electron 33 → ^42 (Chromium 148 / Node 24) — 2026-06-20 — ветка docs/add-agents-md
✅ P0-02 — Включён sandbox: true в BrowserWindow (main.js) — 2026-06-20 — ветка docs/add-agents-md
✅ P0-03 — Убраны Google Fonts из CSP, оставлен только 'self' — 2026-06-20 — ветка docs/add-agents-md
✅ P0-04 — Починен баг remainingUnits (условие/значение приведены к snake_case remaining_units) — 2026-06-20 — ветка docs/add-agents-md
✅ P0-05 — Палитра иконки сменена с индиго на --brand зелёный, иконки перегенерированы — 2026-06-20 — ветка docs/add-agents-md
✅ P1-06 — limitsCache инвалидируется при switchAndLaunch (clear) и delete — 2026-06-20 — ветка docs/add-agents-md
✅ P1-07 — Все font-size 11px приведены к 12px (DESIGN.md) — 2026-06-20 — ветка docs/add-agents-md
✅ P1-08 — В AGENTS.md п.10.7 и README.md описана привязка accounts.json к машине — 2026-06-20 — ветка docs/add-agents-md
✅ P1-09 — build/icon.* добавлены в .gitignore, удалены из индекса, README уточнён — 2026-06-20 — ветка docs/add-agents-md
✅ P1-10 — isValidJwt требует ровно 3 части (limits.js) — 2026-06-20 — ветка docs/add-agents-md
