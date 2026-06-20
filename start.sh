#!/bin/sh

APP_NAME="ГиряGLM"
NPM_CMD="npm"
ELECTRON_CMD="./node_modules/.bin/electron"

if [ ! -f "$ELECTRON_CMD" ]; then
  printf "\033[31m✗\033[0m Electron не найден. Выполни \033[33mnpm install\033[0m\n"
  exit 1
fi

while true; do
  printf '\033[36m════════════════════════════════════════\033[0m\n'
  printf "  \033[1m%s\033[0m  —  запуск\n" "$APP_NAME"
  printf '\033[36m════════════════════════════════════════\033[0m\n'
  printf "\n"
  printf "  \033[1m1\033[0m  Обычный запуск\n"
  printf "  \033[1m2\033[0m  Запуск с DevTools (логи)\n"
  printf "  \033[1m3\033[0m  Сброс кеша + запуск\n"
  printf "  \033[1m4\033[0m  Пересборка (npm install)\n"
  printf "  \033[1m5\033[0m  Сборка .dmg\n"
  printf "  \033[1m0\033[0m  Выход\n"
  printf "\n"
  printf '\033[36m────────────────────────────────────────\033[0m\n'
  printf "Выбор: "
  read -r mode </dev/tty

  case "$mode" in
    1)
      printf "\n\033[2mЗапуск...\033[0m\n"
      npx electron .
      printf "\n\033[2mЗавершено.\033[0m\n"
      ;;
    2)
      printf "\n\033[2mЗапуск с DevTools...\033[0m\n"
      ZS_DEBUG=1 npx electron .
      printf "\n\033[2mЗавершено.\033[0m\n"
      ;;
    3)
      rm -f "$HOME/Library/Application Support/girya-glm/accounts.json" 2>/dev/null
      printf "\n\033[33m◇\033[0m Кеш аккаунтов сброшен\n"
      rm -f "$HOME/Library/Application Support/girya-glm/renderer-errors.log" 2>/dev/null
      printf "\n\033[2mЗапуск...\033[0m\n"
      npx electron .
      printf "\n\033[2mЗавершено.\033[0m\n"
      ;;
     4)
      printf "\n\033[2mПересборка (npm install)...\033[0m\n"
      npm install
      printf "\n\033[32m✓\033[0m Готово\n"
      ;;
     5)
      printf "\n\033[2mСборка .dmg...\033[0m\n"
      npx electron-builder --mac dmg
      printf "\n\033[2mГотово: \033[0m%s/release/\n" "$(pwd)"
      ;;
    0)
      printf "\n"
      exit 0
      ;;
    *)
      printf "\n\033[31m✗\033[0m Неверный выбор\n"
      ;;
  esac

  printf "\nНажми Enter чтобы продолжить...\n"
  read -r _ </dev/tty
  printf "\n"
done
