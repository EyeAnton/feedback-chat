# feedback-chat

Мини-чат для любого сайта: «Оставить отзыв», «Задать вопрос», «Скачать CV», «Связаться».
Отзывы и вопросы приходят в Telegram через бота [@myfeedbackerbot](https://t.me/myfeedbackerbot).
Демо: https://eyeanton.github.io/feedback-chat/

```
сайт (chat.js) → Cloudflare Worker portfolio-bot (worker/) → Telegram-бот → личка владельца
```

- **chat.js / chat.css** — сам чат, без зависимостей. Раздаётся с GitHub Pages этого репо, сайты подключают его по ссылке: правка здесь сразу доходит до всех сайтов.
- **worker/** — один Worker на все сайты. Принимает сообщения только с сайтов из `ALLOWED_ORIGINS`.
- **skill/** — скилл Claude Code `feedback-chat`: «подключи чат обратной связи к сайту X».

## Подключить к новому сайту (2 шага)

### 1. Вставить перед `</body>`
```html
<link rel="stylesheet" href="https://eyeanton.github.io/feedback-chat/chat.css">
<script src="https://eyeanton.github.io/feedback-chat/chat.js" defer
  data-endpoint="https://portfolio-bot.leritosha.workers.dev"
  data-name="Anton Egorov"
  data-cv='{"ru":"/cv-ru.pdf","en":"/cv-en.pdf"}'
  data-channels='[{"name":"Telegram","href":"https://t.me/EyeAnton"},{"name":"Email","href":"mailto:leritosha@gmail.com"}]'></script>
```

### 2. Разрешить сайт в Worker (если он не на eyeanton.github.io)
`worker/wrangler.toml` → дописать адрес в `ALLOWED_ORIGINS` (через запятую, без `/` в конце) → в `worker/`:
```
npx wrangler deploy
```
Сайты на `https://eyeanton.github.io/...` (портфолио, `/stasik-page/` и любые новые Pages этого аккаунта) уже разрешены — для них шаг 2 не нужен.

Проверка: открыть сайт → чат → «Задать вопрос» → сообщение приходит в Telegram с адресом страницы.

## Настройки
Атрибуты `data-*` у `<script>` (JSON-значения — в одинарных кавычках) или объект до скрипта — он важнее атрибутов:
```html
<script>window.FEEDBACK_CHAT = { name: "Anton Egorov", side: "left" };</script>
```

| Настройка | Что | По умолчанию |
|---|---|---|
| `endpoint` | адрес Worker. Пусто — сообщение открывается письмом на `email` | — |
| `name` | имя в шапке чата (строка или `{"ru":…,"en":…}`) | текст кнопки |
| `initials` | буквы в кружке | из `name` |
| `button` | текст кнопки | «Написать» / «Message me» |
| `sub` | подпись под именем | «ответ — обычно в течение дня» |
| `hello` | первая фраза бота | «Привет! Это мини-чат. Чем помочь?» |
| `cv` | ссылка на PDF или `{"ru":…,"en":…}`; нет — пункт «Скачать CV» скрыт | — |
| `channels` | `[{"name","href"}]` для «Связаться»; пусто — пункт скрыт | — |
| `email` | почта для письма без Worker | первый `mailto:` из `channels` |
| `items` | какие пункты и в каком порядке: `["feedback","question","cv","contact"]` | все |
| `lang` | `ru` / `en` / `auto` (по `<html lang>`, переключение сайта подхватывается) | `auto` |
| `side` | `right` / `left` | `right` |
| `theme` | `light` — светлая; иначе тёмная | тёмная |
| `texts` | замена любых фраз: `{"ru":{"askQuestion":"…","menu":{"cv":"Резюме"}}}` (ключи — `TEXT` в chat.js) | — |

**Цвета и шрифт** — CSS-переменные на `.fc` в стилях сайта:
```css
.fc { --fc-accent: #ec2f1f; --fc-me: #1a4bb8; --fc-font: "Montserrat", sans-serif; --fc-lift: 0px; }
```
Все переменные — в начале `chat.css`. `--fc-lift` поднимает кнопку, если в углу уже что-то есть.

Из JS: `feedbackChat.open()` / `feedbackChat.close()` — например, для своей кнопки «Написать мне».

## Worker и бот (уже настроено, это — если надо заново)
1. @BotFather → `/newbot` → токен. Написать боту `/start`.
2. Chat id: `https://api.telegram.org/bot<ТОКЕН>/getUpdates` → `"chat":{"id":…}`.
3. В `worker/` (в обычном Терминале, не в чат):
   ```
   npx wrangler login
   npx wrangler secret put TG_TOKEN
   npx wrangler secret put TG_CHAT_ID
   npx wrangler deploy
   ```
Сменить токен: @BotFather → `/revoke` → `npx wrangler secret put TG_TOKEN` (или Cloudflare → Workers → `portfolio-bot` → Settings → Variables and Secrets). Ни токен, ни chat id в репо не хранятся.

Защита от спама: только сайты из `ALLOWED_ORIGINS`, скрытое поле-ловушка, отказ при ответе быстрее 3 с, лимит длины. Лимит по IP — KV `RL` (см. `wrangler.toml`), `PER_IP_HOUR` сообщений в час.

## Где уже стоит
- Портфолио eyeanton.github.io — компонент по ссылке; настройки задаёт `startChat` в его `app.js` (CV, контакты, адрес Worker — из `site.json`, тексты про Антона), цвета — `body .fc` в конце `style.css`.
