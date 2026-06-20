# ГиряGLM

> **⚠️ ЭКСПЕРИМЕНТАЛЬНЫЙ ФОРК — ТОЛЬКО ДЛЯ ЛИЧНОГО ИСПОЛЬЗОВАНИЯ**
>
> Этот репозиторий является **экспериментальным форком** оригинального проекта [HernoBeliEzh/giryaGLM](https://github.com/HernoBeliEzh/giryaGLM).
>
> Создан исключительно в целях **эксперимента и личного изучения**. Не предназначен для продакшн-использования, распространения или коммерческого применения.
>
> Все права на оригинальный код принадлежат автору оригинального репозитория.

---

Лёгкая программа для смены аккаунтов в ZCode desktop с показом лимитов GLM-5.2 / GLM-5-Turbo. Собрана на Electron.

## Установка

```bash
git clone https://github.com/emaxe/girya-glm-fork.git
cd girya-glm-fork
npm install
```

## Запуск

### Через start.sh (рекомендуется)

Скрипт `start.sh` — интерактивное меню для запуска и обслуживания:

```bash
chmod +x start.sh
./start.sh
```

Меню:

| Пункт | Команда | Описание |
|-------|---------|----------|
| **1** | `npx electron .` | Обычный запуск приложения |
| **2** | `ZS_DEBUG=1 npx electron .` | Запуск с DevTools — видно ошибки в консоли |
| **3** | Сброс кеша + запуск | Удаляет `accounts.json` и `renderer-errors.log`, затем запускает |
| **4** | `npm install` | Переустановка зависимостей (если что-то сломалось) |
| **5** | `npx electron-builder --mac dmg` | Сборка `.dmg` для macOS в папку `release/` |
| **0** | — | Выход |

После каждого запуска (пункты 1–3, 5) скрипт ждёт нажатия Enter, чтобы вернуться в меню.

### Напрямую

```bash
npm start
```

Или:

```bash
npx electron .
```

## Сборка .dmg

```bash
npm run dist:dmg
```

Готовый установщик появится в `release/ГиряGLM-1.2.1.dmg`.

## Иконки

```bash
npm run icon
```

Генерирует `build/icon.ico` (многоразмерный) и `build/icon-512.png` (для macOS DMG).

## Структура проекта

```
├── main.js              # Главный процесс Electron
├── preload.js           # Bridge (contextBridge)
├── renderer/
│   ├── index.html       # UI
│   ├── styles.css       # Стили
│   └── app.js           # Логика рендерера
├── lib/
│   ├── config.js        # Работа с config.json ZCode
│   ├── credentials.js   # Работа с credentials.json ZCode
│   ├── limits.js        # Запрос лимитов GLM API
│   ├── store.js         # Хранилище аккаунтов
│   └── zcode.js         # Управление процессом ZCode
├── build/
│   ├── icon-gen.js      # Генератор иконок
│   ├── icon.png         # 256px PNG
│   └── icon-512.png     # 512px PNG (для DMG)
├── start.sh             # Интерактивный лаунчер
└── package.json
```
