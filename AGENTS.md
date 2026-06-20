# AGENTS.md

Инструкции для AI-агентов (и людей), работающих с этим репозиторием.
Прочитай этот файл **целиком перед любым изменением кода**.

---

## 1. Что это за проект

**ГиряGLM** — лёгкое desktop-приложение на Electron для macOS, которое:

1. Хранит список GLM/Z.ai-аккаунтов (JWT + опционально access token / user info).
2. Показывает остаток лимитов по планам GLM-5.2 / GLM-5-Turbo.
3. Переключает активный аккаунт в локальном клиенте **ZCode desktop** и перезапускает его.

> **⚠️ ЭКСПЕРИМЕНТАЛЬНЫЙ ФОРК — ТОЛЬКО ДЛЯ ЛИЧНОГО ИСПОЛЬЗОВАНИЯ.**
> Это форк [HernoBeliEzh/giryaGLM](https://github.com/HernoBeliEzh/giryaGLM).
> Не для продакшена, не для распространения. Все права на оригинал — у автора оригинального репозитория.

**Стек:** Electron 42, чистый JavaScript (CommonJS), `electron-builder` для сборки `.dmg`.
Никаких фреймворков, бандлеров, TypeScript, ESLint — намеренно минимальный набор.
Внешний runtime-пакет один — `electron` (+ `electron-builder` как devDep).

---

## 2. Язык и тон

- Весь UI, строки, ошибки, логи, сообщения пользователю — **на русском**.
- Комментарии в коде — **на русском** (так принято в этом репо).
- Имена идентификаторов, функций, файлов — **английские**.
- Не переводи существующие русские строки/комментарии на английский без явной просьбы.

---

## 3. Структура проекта

```
├── main.js              # Главный процесс Electron: окно + IPC-хендлеры
├── preload.js           # contextBridge — безопасный мост renderer → main
├── renderer/
│   ├── index.html       # Разметка UI
│   ├── styles.css       # Стили
│   └── app.js           # Логика рендерера (IIFE, никаких модулей)
├── lib/
│   ├── config.js        # Чтение/запись config.json ZCode (apiKey провайдера)
│   ├── credentials.js   # Шифрованный credentials.json ZCode (JWT/oauth)
│   ├── limits.js        # Запрос лимитов GLM API + утилиты для JWT
│   ├── store.js         # Локальное хранилище аккаунтов (accounts.json)
│   └── zcode.js         # Управление процессом ZCode (kill/isRunning/launch)
├── build/
│   ├── icon-gen.js      # Генератор иконок (npm run icon)
│   ├── icon.png         # 256px (генерируется, не в git)
│   └── icon-512.png     # 512px для DMG (генерируется, не в git)
├── start.sh             # Интерактивный шелл-лаунчер (меню 1–5/0)
├── package.json         # Манифест + конфиг electron-builder
├── README.md            # Пользовательская инструкция (запуск/сборка)
└── DESIGN.md            # ✦ Источник правды для UI/стилей — см. п. 6
```

> `DESIGN.md` — **дизайн-документация (Aime Design System), на китайском**.
> Несмотря на язык и происхождение, она **прямая спецификация** текущего `renderer/styles.css`:
> все CSS-переменные `:root` (--brand, --gray-*, --border-*, --bg-*, --shadow-*, --motion-*)
> и компоненты (.btn-primary, .tag, .card, .header, input) — **дословная реализация** токенов и правил из DESIGN.md.
> Перед любой работой над UI — **прочитай DESIGN.md целиком**. Подробности в п. 6.

### Процессы Electron

| Слой | Файл | Доступ | Что делает |
|------|------|--------|------------|
| **Main** | `main.js` | Node API, файловая система, сеть | Окно, IPC-хендлеры, вся работа с диском/сетью |
| **Preload** | `preload.js` | `contextBridge` | Тонкий мост: выставляет `window.api` |
| **Renderer** | `renderer/app.js` | только `window.api` | UI, DOM, обработка событий |

**Контекст изолирован** (`contextIsolation: true`, `nodeIntegration: false`). Renderer **не должен** обращаться к Node — только через `window.api`. Если нужен новый метод на фронте — добавляй его в `preload.js` и соответствующий `ipcMain.handle` в `main.js`.

---

## 4. IPC-контракт (`preload.js` ↔ `main.js`)

Это единственный способ общения renderer ↔ main. Любое новое действие = пара «канал в preload + хендлер в main».

| `window.api.*` | Канал в main | Назначение |
|----------------|--------------|------------|
| `accounts.list()` | `accounts:list` | Список аккаунтов + активный + статус ZCode |
| `accounts.importCurrent()` | `accounts:importCurrent` | Импорт текущего залогиненного аккаунта из ZCode |
| `accounts.addManual(jwt, label)` | `accounts:addManual` | Добавление вручную по JWT |
| `accounts.delete(id)` | `accounts:delete` | Удаление (с подтверждением через dialog) |
| `accounts.rename(id, label)` | `accounts:rename` | Переименование |
| `limits.fetch(id, force)` | `limits:fetch` | Лимиты (с кешем 60с, `force` обходит кеш) |
| `switchAndLaunch(id)` | `account:switchAndLaunch` | Переключить аккаунт и перезапустить ZCode |

Ответы IPC — всегда объекты вида `{ ok: boolean, ...payload }` или `{ ok: false, error: 'текст' }`. Renderer проверяет `res.ok` — **не ломай этот контракт**.

---

## 5. Модули `lib/` — что и где менять

| Хочешь… | Иди в… | Примечание |
|---------|--------|------------|
| Поменять формат/место хранения аккаунтов | `lib/store.js` | Файл `accounts.json` в `app.getPath('userData')`. `id` = первые 12 символов sha1 от apiKey. |
| Поменять работу с `config.json` ZCode | `lib/config.js` | Жёстко зашит провайдер `builtin:zai-start-plan`. |
| Поменять де/шифрование credentials | `lib/credentials.js` | AES-256-GCM, секрет из `ZCODE_CREDENTIAL_SECRET` или fallback по пользователю/ОС. |
| Поменять запрос лимитов / ретраи / парсинг | `lib/limits.js` | Очередь `CONCURRENCY=1`, экспоненциальный backoff, honour `Retry-After`. |
| Поменять запуск/убийство ZCode | `lib/zcode.js` | Пути только macOS (и ветки Windows про запас). |

### Ключевые пути ZCode (вне репозитория)

Эти файлы **не в проекте** — это данные установленного ZCode в домашней директории:

- `~/.zcode/v2/config.json` — конфиг с `provider[...].options.apiKey`
- `~/.zcode/v2/credentials.json` — шифрованные JWT/oauth-поля

При записи оба модуля (`config.js`, `credentials.js`) сначала делают `.bak` — **сохраняй это поведение**, оно спасает при отладке.

### Поля в `credentials.json`

```
zcodejwttoken              — сам JWT (главный)
oauth:zai:access_token     — OAuth access token
oauth:zai:user_info        — JSON-строка с инфо о пользователе
oauth:active_provider      — обычно "zai"
```

Значения хранятся в формате `enc:v1:<iv>.<tag>.<ct>` (base64url). Не пиши туда голые строки — только через `credentials.setActiveAccount()` / `writeCredentials()`.

---

## 6. Конвенции кода

1. **`'use strict';`** — первой строкой в каждом `.js` (кроме `renderer/app.js`, где используется IIFE).
2. **CommonJS** (`require` / `module.exports`) — **никаких** ESM-`import`.
3. **Renderer (`renderer/app.js`)** — единый IIFE. Внутри `window.api` уже проброшен; **не объявляй** `const api` на верхнем уровне модуля (исторически ломало `SyntaxError`, см. комментарий в шапке файла).
4. **Никаких новых зависимостей** без веской причины. Сеть — через встроенный `https` (как в `lib/limits.js`), не через `axios`/`node-fetch`.
5. **Ошибки возвращаем, не бросаем** из IPC-хендлеров: `{ ok: false, error: '…' }`. Бросать можно изнутри `lib/` — в `main.js` оборачивай в `try/catch`.
6. **Числа в UI** — через `fmtNum` (русская локаль), проценты — через `fmtPct`.
7. **HTML из данных аккаунта** — всегда через `escapeHtml` (защита от инъекций в `innerHTML`).
8. **Размеры в стилях — строго по дизайн-токенам из DESIGN.md** (см. п. 6 ниже). Не выдумывай hex-цвета и размеры «на глаз».

---

## 6. UI / стили — опирайся на `DESIGN.md`

`DESIGN.md` (Aime Design System, документ на китайском) — **это главный источник правды для всего внешнего вида приложения**. Он не «чужой» и не справочный: `renderer/styles.css` — его **дословная реализация**. Каждое изменение UI должно согласовываться с DESIGN.md.

### 6.1. Почему DESIGN.md нужно учитывать

- Все CSS-переменные в `:root` (`renderer/styles.css`) **поименованы и заняты значениями** из DESIGN.md: `--brand` = `#3dbf3d`, `--gray-5` = `#747b8a`, `--bg-overlay-1` = `rgba(91,100,117,0.06)`, `--border-default` = `rgba(77,101,148,0.20)`, `--shadow-card`, `--motion-default` и т.д.
- Компоненты в CSS — прямое воплощение секции **Components** из DESIGN.md: `.btn-primary` (тёмный `--gray-10` + белый текст, **не** синий), `.tag`, `.card`, `.header` (56px, padding `0 24px 0 12px`), input (32px высота, 6px radius), `.icon-btn` (28×28), `.toast`.
- Документ задаёт **жёсткие правила**, нарушение которых ломает визуальный язык приложения. Их надо соблюдать при любой правке стилей, HTML или добавлении новых компонентов.

### 6.2. Обязательные правила из DESIGN.md (сводка)

**Цвета — только из токенов, никаких «голых» hex:**

| Что | Источник | Запрет |
|-----|----------|--------|
| Бренд / акцент | `--brand` `#3dbf3d` (только 5 мест: primary-действие, switch-on, logo, текстовая ссылка, success) | ❌ не заливать #3dbf3d большими пятнами; ❌ **никакого фиолетового/синего** (#8b5cf6, #6366f1, GitHub-dark #0D1117) |
| Нейтральные серые | `--gray-1…--gray-10` (холодная с синевой шкала) | ❌ не писать «чистые» серые (#666 / #999 / #ccc) — брать из `--gray-*` |
| Overlay (тёплый) | `--bg-overlay-1/2/3` `rgba(91,100,117,0.06/0.10/0.14)` — для hover/active/pressed | ❌ не смешивать базу overlay (91,100,117) и border (77,101,148) |
| Текст | `--text-highlight/default/subtle/muted/disabled/inverse` | ❌ **не более 3 уровней текста** в одной панели (обычно highlight + default + muted) |
| Линии/border (холодный) | `--border-subtle/default/bold` `rgba(77,101,148,0.10/0.20/0.32)` | — |
| Статусы | `--success-*`, `--danger-*`, `--info-*`, `--warning-fg` | — |

**Типографика:**

- Шрифты берём из DESIGN.md: `--font-cjk` (PingFang SC — основной), `--font-en` (SF Pro), `--font-mono` (JetBrains Mono — код/цифры/id/имена файлов). ❌ не вводить Inter / Roboto / Arial.
- **Размеры строго 5 шагов:** 12 / 13 / 14 / 16 / 20px. ❌ не выдумывать 15px и пр.
- Веса: только **400 regular** и **500 medium**. Medium — для заголовков, кнопок, selected-состояний.
- `letter-spacing: 0.3px` для китайского/текста — не убирать; для моноширинных блоков (`.tag.id`, `.nums`, `.limit-hint`) — `0`.

**Отступы / сетка:**

- Базовая единица **4px**. Голые px допустимы, но кратно 4 (исключение — `1px` border).
- Брать из шкалы DESIGN.md: inline-xs/sm/md (4/8/12), block-sm/md/lg/xl/xxl (8/16/24/32/40).

**Скругления — строгая иерархия (внешнее ≥ внутреннее):**

`--radius-outer` 20 ≥ `--radius-lg` 12 ≥ `--radius-md` 8 ≥ `--radius` 6 ≥ `--radius-sm` 4 ≥ `--radius-xs` 2.
❌ Нарушение (например, карточка 6px с кнопкой 12px внутри) = визуальный баг, переделать.

**Тени — только чёрный rgba(0,0,0,\*), без цветных:**

- `--shadow-card` / `--shadow-card-hover` / `--shadow-input-focus` — уже заданы.
- ❌ никаких цветных glow (фиолетовый/зелёный/синий свет). ❌ `outline: 1px dashed` как focus-ring — фокус идёт через `border-color` + `--shadow-input-focus`.

**Движение:** `--motion-fast` 0.1s / `--motion-default` 0.15s / `--motion-panel` 0.2s / `--motion-empty` 0.3s. Все анимации **≤ 0.3s, ease, без bounce/spring**.

### 6.3. Состояния интерактивных элементов

Из DESIGN.md (Do/Don't): **любой** кликабельный элемент обязан иметь 4 состояния — default / hover / active / disabled (для элементов списка ещё + selected). Не оставляй кнопку без `:hover`/`:active`. Логика overlay:
- hover → `--bg-overlay-1`
- active → `--bg-overlay-2`
- pressed/контейнер → `--bg-overlay-3`
- бренд-кнопки исключение → `--brand-hover` / `--brand-active`.

### 6.4. Практический чек-лист при правке UI

1. **Прочитай DESIGN.md** целиком перед первой правкой стилей.
2. Цвет/радиус/тень/отступ/шрифт → **сначала ищи готовый токен** в `:root` (`renderer/styles.css`) или в DESIGN.md. Нет подходящего — обсуди, прежде чем вводить новый.
3. Если вводишь новую CSS-переменную — назови по правилам DESIGN.md (см. как `--brand`, `--gray-5`, `--bg-overlay-1`) и добавь в `:root`, а не инлайн-значение.
4. Новый компонент → реализуй все состояния (default/hover/active/disabled) и держи скругления по иерархии.
5. Не заливай бренд-зелёный `#3dbf3d` крупными блоками (> ~80×80px — уже перебор). Зелёный — точечный сигнал действия/успеха.
6. ❌ Не правь сам `DESIGN.md` без отдельного согласования с автором — это спецификация-источник, а не рабочий код.

---

## 7. Запуск и отладка

```bash
npm install                 # один раз

npm start                   # обычный запуск
npx electron .              # то же самое
ZS_DEBUG=1 npx electron .   # с DevTools (логи рендерера)

./start.sh                  # интерактивное меню (chmod +x start.sh)
```

### Логи рендерера

Ошибки уровня `console.error+` пишутся в
`~/Library/Application Support/girya-glm/renderer-errors.log`.
Сюда же попадают `render-process-gone` и `preload-error`. При разборе багов UI — смотреть туда первым делом.

### Сброс состояния

`start.sh` пункт 3 удаляет `accounts.json` и `renderer-errors.log`, затем запускает приложение. Вручную:

```bash
rm -f "$HOME/Library/Application Support/girya-glm/accounts.json"
rm -f "$HOME/Library/Application Support/girya-glm/renderer-errors.log"
```

---

## 8. Сборка `.dmg`

```bash
npm run dist:dmg            # electron-builder --mac dmg
# → release/ГиряGLM-<version>.dmg
```

Архитектуры: `x64` + `arm64`. Иконка — `build/icon-512.png`. Название артефакта и productId брать из `package.json` → `build.dmg.artifactName`.

Перегенерация иконок: `npm run icon` (`build/icon-gen.js`).

> В `.gitignore` уже исключены `release/`, `*.dmg`, `*.app`, `build/icon.*`, `accounts.json`, `*.bak` — **не коммить** эти артефакты.

---

## 9. Безопасность и чувствительные данные

- В репозитории **нет** реальных JWT/токенов. `accounts.json`, `config.json.bak`, `*.bak` игнорируются git — так и должно остаться.
- **Никогда** не выводи `apiKey`/JWT в `console.log`, toast или лог-файлы целиком. Если нужен отладочный вывод — показывай только первые/последние символы или хеш `makeId(...)`.
- Renderer изолирован: не подключай туда `nodeIntegration`. Любой доступ к FS/сети — только через IPC.
- `dialog.showMessageBox` для подтверждений деструктивных действий (удаление аккаунта) — **обязателен**, не заменяй на `window.confirm`.

---

## 10. ⚠️ Подводные камни

1. **`DESIGN.md` описывает чат-продукт Aime целиком, а не ГиряGLM.** Документ — источник правды для **токенов и компонентов** (цвета, типографика, радиусы, тени, движение, состояния кнопок) — именно их мы и реализуем в `renderer/styles.css` (см. п. 6). Но в нём есть части, которые к нам **не относятся**: трёхколоночная раскладка (BotList 76px + Chat list 260px + Main flex), чат-пузыри, avatars, drawer, `useDevice()`-адаптивность. Эту раскладку/компоненты не копируй вслепую — ГиряGLM использует только дизайн-язык (tokens + базовые компоненты), а layout у него собственный (`header` + `toolbar` + сетка карточек). Текст DESIGN.md — **на китайском**; если язык мешает, ориентируйся по таблицам токенов и CSS-значениям, они однозначны.

2. **`os.homedir()` vs `process.env.HOME`.** В `config.js` путь считается через `HOME`/`USERPROFILE`, а в `credentials.js` — через `os.homedir()`. На нормальной macOS они совпадают, но имей в виду разницу, если правишь пути.

3. **Провайдер захардкожен:** `builtin:zai-start-plan` (`lib/config.js`). Если у пользователя другой провайдер — `setCurrentApiKey` бросит ошибку. Менять идентификатор можно, только если точно знаешь, что делаешь.

4. **`CONCURRENCY = 1`** в `lib/limits.js` — запросы лимитов идут строго по очереди через общую очередь. Это намеренно (чтобы не словить 429). Не повышай без причины.

5. **Кеш лимитов — 60с** (`LIMITS_TTL_MS` в `main.js`). Кнопка «Обновить» шлёт `force=true` и обходит кеш.

6. **`zcode.killZcode()` через `pkill -f "ZCode"`** — убивает по имени процесса. Если у пользователя запущено несколько приложений с совпадающим именем, это может задеть лишнее. На данный момент это принятое упрощение.

7. **`accounts.json` привязан к машине.** Секрет шифрования `rawCredentials` (в `lib/credentials.js`) выводится из `os.platform() + os.homedir() + username`. Перенос `accounts.json` на другую машину/пользователя/ОС сделает токены нерасшифровываемыми — переключение аккаунта сломается. При переносе нужно импортировать аккаунты заново на новой машине.

---

## 11. Чек-лист перед коммитом

- [ ] Код запускается (`npm start` открывает окно без ошибок в DevTools при `ZS_DEBUG=1`).
- [ ] Нет `console.log` с секретами / JWT.
- [ ] Новые IPC-методы добавлены **и** в `preload.js`, **и** в `main.js`.
- [ ] Ответы IPC соответствуют контракту `{ ok, ... }`.
- [ ] Не добавлены новые runtime-зависимости (или добавлены с обоснованием).
- [ ] Содержимое `DESIGN.md` не изменено (это спецификация-источник). При правке UI — цвета/радиусы/шрифты/отступы взяты из токенов DESIGN.md, новых «голых» hex нет.
- [ ] Русские строки/комментарии сохранены, новые — тоже на русском.
- [ ] `accounts.json`, `*.bak`, `release/`, `*.dmg` не попали в индекс.

---

## 12. Типовые задачи — с чего начать

| Задача | С чего начать |
|--------|---------------|
| Любая правка UI/стилей | сначала **DESIGN.md** (п. 6) + токены в `:root` `renderer/styles.css` → потом `renderer/index.html` / `styles.css` |
| Добавить новое поле аккаунту | `lib/store.js` (`addAccount` + схема объекта) → отразить в UI в `renderer/app.js` (`buildCard`) |
| Новый источник лимитов | `lib/limits.js` (`fetchLimits` — парсинг ответа) |
| Новая кнопка в UI | `renderer/index.html` + `renderer/app.js` (обработчик) + (если нужен бэкенд) `preload.js` + `main.js` |
| Поддержать Windows/Linux пути ZCode | `lib/zcode.js` (`ZCODE_PATHS`, ветки `process.platform`) |
| Сменить иконку | положить исходник в `build/`, запустить `npm run icon` |
| Поменять версию/название релиза | `package.json` (`version`, `productName`, `build.*`) |
