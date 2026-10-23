---
name: feedback-chat
description: Подключить мини-чат обратной связи (отзыв, вопрос, CV, контакты → Telegram) к сайту пользователя. Use when the user asks to add feedback/contact chat, "обратную связь", "чат с сайта в Телеграм" to a website or new project.
---

# Подключить feedback-chat к сайту

Репо компонента: `feedback-chat` в папке проектов (GitHub EyeAnton/feedback-chat). Полная инструкция и все настройки — его `README.md`; прочитай раздел «Настройки», если нужно что-то кроме базового подключения.

## Шаги
1. **Собрать данные сайта** (не спрашивать, если есть в проекте): имя владельца, язык(и) сайта, ссылки на CV (PDF в репо сайта), контакты (Telegram, почта и т.п.). Если CV или контактов нет — просто не передавать: пункт скроется.
2. **Вставить перед `</body>`** каждой страницы (или в общий шаблон):
   ```html
   <link rel="stylesheet" href="https://eyeanton.github.io/feedback-chat/chat.css">
   <script src="https://eyeanton.github.io/feedback-chat/chat.js" defer
     data-endpoint="https://portfolio-bot.leritosha.workers.dev"
     data-name="…" data-cv='…' data-channels='[…]'></script>
   ```
   JSON в атрибутах — в одинарных кавычках. Сайт со своим переключателем языка: меняет `<html lang>` → чат подхватит сам.
3. **Подогнать вид под сайт**: цвета — `--fc-accent`, `--fc-me`, `--fc-font` и др. на `.fc` в CSS сайта; светлый сайт — `data-theme="light"`. Если правый нижний угол занят (кнопка «Наверх», плеер) — `data-side="left"` или `--fc-lift`.
4. **Разрешить сайт в Worker** — только если он НЕ на `https://eyeanton.github.io` (эти уже разрешены): в `feedback-chat/worker/wrangler.toml` дописать адрес в `ALLOWED_ORIGINS`, затем в `worker/` → `npx wrangler deploy` (Node на macOS: `~/.local/node/bin`; нет входа в Cloudflare — попросить пользователя выполнить `npx wrangler login` в своём Терминале). Закоммитить и запушить feedback-chat.
5. **Проверить** одним запросом с origin сайта:
   ```
   curl -s -X POST https://portfolio-bot.leritosha.workers.dev/msg -H "origin: <адрес сайта>" -H "content-type: application/json" -d '{"kind":"question","text":"Тест подключения","contact":"Claude","page":"/","ms":9000}'
   ```
   `{"ok":true}` → сообщение пришло в Telegram; попросить пользователя глянуть. `403 origin` → шаг 4.
6. В README сайта или его CLAUDE.md — одна строка: «Чат обратной связи — feedback-chat (подключён в …)». В README feedback-chat → «Где уже стоит» дописать сайт.

## Нельзя
- Токен бота и chat id не вписывать в файлы и не просить присылать в чат: только `npx wrangler secret put` в Терминале пользователя.
- Не копировать chat.js в сайт — подключать по ссылке, чтобы правки компонента доходили до всех.
