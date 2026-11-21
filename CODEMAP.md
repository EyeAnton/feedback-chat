# CODEMAP — feedback-chat

Карта репо. Читать первой.

## Модули

| Файл | Что | Где работает |
|---|---|---|
| `chat.js` | Сам чат: IIFE без зависимостей. Читает настройки из `data-*` своего `<script>` и `window.FEEDBACK_CHAT`, рисует кнопку и диалог, шлёт `POST {endpoint}/msg`. Без `endpoint` — открывает письмо (`mailto:`). Наружу: `window.feedbackChat.open()/close()` | Браузер, раздаётся с GitHub Pages (`https://eyeanton.github.io/feedback-chat/chat.js`) |
| `chat.css` | Стили, всё под `.fc`, цвета и шрифт — переменные `--fc-*` | Браузер, GitHub Pages |
| `index.html` | Демо-страница (кнопки открыть / язык / тема) | GitHub Pages |
| `worker/src/index.js` | Cloudflare Worker `portfolio-bot`: `POST /msg` → Telegram `sendMessage` в `TG_CHAT_ID` | Cloudflare (`npx wrangler deploy` из `worker/`) |
| `worker/wrangler.toml` | Имя, `ALLOWED_ORIGINS`, `PER_IP_HOUR`, (опционально) KV `RL`. Секреты — только `wrangler secret put` | — |
| `skill/SKILL.md` | Скилл Claude Code «подключи чат к сайту»; симлинк `~/.claude/skills/feedback-chat` | Claude Code |
| `tests/worker.test.js` | Контракт `/msg` офлайн: мок `fetch`, KV в памяти | `npm test` |

## Поток данных

```
посетитель ─► chat.js (диалог: вид → текст → контакт)
                │ POST /msg {kind, text, contact, lang, page, hp, ms}
                ▼
         Worker portfolio-bot
           1. Origin ∈ ALLOWED_ORIGINS, иначе 403 (это CORS, не авторизация)
           2. JSON-объект, kind ∈ {feedback, question}, text не пуст, иначе 400
           3. hp заполнено или ms < 3000 → «ok» без отправки (ловушка для ботов)
           4. KV RL (если привязан): PER_IP_HOUR сообщений в час с IP → 429
           5. Telegram sendMessage (HTML, экранирование &<>) → 200 / 502
                ▼
         Telegram-бот @myfeedbackerbot → личка владельца
```

## Ответы Worker на /msg

| Код | Тело | Когда |
|---|---|---|
| 204 | — | `OPTIONS` (preflight) |
| 200 | `{"ok":true}` | отправлено или отброшено ловушкой |
| 400 | `bad json` / `empty` | не JSON / не объект / нет текста / неизвестный `kind` |
| 403 | `origin` | Origin не в списке |
| 404 | `not found` | другой путь или метод |
| 429 | `limit` | лимит по IP |
| 502 | `telegram` | Telegram ответил ошибкой |

## Кто ещё пользуется Worker (вне этого репо)

- portfolio — `startChat` в `app.js`, адрес из `site.json`.
- week-report `tools/send.py` — `/photo` (с ключом) и запасной `/msg` с `Origin: http://localhost:8000`.
- inner-seasons `release.sh` — `/msg` с `Origin: http://localhost:8000` (уведомление о релизе).
- claude-office `resources.py` — публичный GET ради индикатора.

`/photo`, `/pick`, `/week/*`, `/tg` (их ждут week-report и страница выбора концерта) не в `main`, хотя могут быть уже задеплоены: они в незакоммиченных правках основного чекаута и в ветке `worktree-worker-webhook` (не запушена).
