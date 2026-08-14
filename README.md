<div align="center">

# WEB/CHECK

### WEBSITE DIAGNOSTICS / OPERATOR MANUAL

**Проверка SEO, security, social metadata и технического состояния сайта — в одном понятном отчёте.**

![Version](https://img.shields.io/badge/version-0.2.1-265CFF?style=flat-square)
![Node](https://img.shields.io/badge/Node.js-18%2B-111318?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-FF5B2E?style=flat-square)
![Status](https://img.shields.io/badge/status-active-168A58?style=flat-square)

</div>

---

```text
TARGET       public website
ENGINE       Node.js
OUTPUT       readable diagnostic report
CHECKS       SEO / SECURITY / SOCIAL / TECHNICAL
DATABASE     not required
```

## 00 / Что такое WebCheck

**WebCheck** — небольшой инструмент для быстрой диагностики публичных сайтов.

Вместо огромного отчёта из десятков непонятных метрик он показывает:

- общий балл сайта от `0` до `100`;
- отдельные оценки по четырём направлениям;
- что уже настроено правильно;
- что отсутствует;
- что стоит исправить в первую очередь;
- основные технические данные страницы.

Пример:

```text
WEB/CHECK REPORT

OVERALL      84 / 100
SEO          91 / 100
SECURITY     68 / 100
SOCIAL       82 / 100
TECHNICAL    95 / 100
```

WebCheck не требует базы данных, регистрации пользователей или сложной настройки.

---

# 01 / Что проверяется

## SEO

| Проверка | Что означает |
|---|---|
| `Title` | Есть ли заголовок страницы |
| `Meta description` | Есть ли описание для поисковой выдачи |
| `Viewport` | Подготовлен ли сайт для мобильных устройств |
| `Canonical` | Указана ли основная версия URL |
| `robots.txt` | Есть ли правила для поисковых роботов |
| `sitemap.xml` | Есть ли карта сайта |
| `H1` | Найден ли основной заголовок страницы |
| `HTML lang` | Указан ли язык документа |
| `Charset` | Указана ли кодировка |

## Security

WebCheck проверяет базовые security-сигналы:

```text
HTTPS
Content-Security-Policy
Strict-Transport-Security
X-Content-Type-Options
Referrer-Policy
```

> WebCheck не является полноценным сканером уязвимостей и не пытается взламывать или атаковать сайт. Это диагностический инструмент для проверки публично доступных HTTP-данных.

## Social

Проверяется готовность страницы к нормальному отображению ссылок в мессенджерах и социальных сетях:

- `og:title`
- `og:description`
- `og:image`

## Technical

WebCheck также показывает:

- HTTP status;
- время первого ответа;
- количество редиректов;
- размер загруженного HTML;
- наличие favicon;
- финальный URL после редиректов.

---

# 02 / Быстрый запуск

## Что понадобится

Нужен только:

**Node.js 18 или новее**

Проверить установленную версию можно командой:

```bash
node -v
```

Например:

```text
v22.18.0
```

Если команда `node` не найдена — сначала установите Node.js.

---

## Windows — пошагово

### Шаг 1

Скачайте проект и распакуйте папку `WebCheck`.

Внутри должно быть примерно так:

```text
WebCheck/
├── public/
├── server.js
├── package.json
├── README.md
├── LICENSE
└── .gitignore
```

### Шаг 2

Откройте папку проекта.

Нажмите правой кнопкой мыши по пустому месту и выберите:

```text
Открыть в терминале
```

Либо вручную перейдите в папку через CMD:

```bat
cd C:\путь\до\WebCheck
```

### Шаг 3

Запустите сервер:

```bash
npm start
```

Должно появиться:

```text
WebCheck v0.2.1 running on http://localhost:3000
```

### Шаг 4

Не закрывая терминал, откройте браузер и перейдите:

```text
http://localhost:3000
```

Готово.

Теперь можно ввести, например:

```text
example.com
```

или:

```text
https://example.com
```

и запустить проверку.

### Как выключить WebCheck

Вернитесь в терминал и нажмите:

```text
Ctrl + C
```

---

# 03 / Нужно ли запускать npm install?

Нет.

На данный момент WebCheck **не использует внешние npm-зависимости**.

Поэтому после скачивания проекта достаточно:

```bash
npm start
```

Это сделано специально, чтобы проект оставался простым и легко запускался на новом компьютере.

---

# 04 / Как работает проверка

Схема работы:

```text
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │
       │ POST /api/check
       ▼
┌─────────────┐
│   WebCheck  │
│   Node.js   │
└──────┬──────┘
       │
       │ HTTP / HTTPS
       ▼
┌─────────────┐
│ Target site │
└──────┬──────┘
       │
       │ HTML + headers
       ▼
┌─────────────┐
│  Analyzer   │
└──────┬──────┘
       │
       ▼
 SCORE + CHECKLIST + RECOMMENDATIONS
```

Почему нужен backend?

Обычная HTML-страница в браузере не может надёжно загружать и анализировать произвольные сторонние сайты из-за ограничений **CORS**.

Поэтому WebCheck использует небольшой Node.js сервер.

---

# 05 / Защита backend

Поскольку пользователь может вводить собственный URL, WebCheck не должен бездумно открывать любой сетевой адрес.

В проект уже встроена базовая защита от SSRF.

WebCheck:

- принимает только `HTTP` и `HTTPS`;
- запрещает `localhost`;
- запрещает приватные IPv4 диапазоны;
- блокирует приватные и link-local IPv6;
- проверяет IPv4-mapped IPv6;
- сначала проверяет DNS;
- подключается именно к проверенному IP;
- заново проверяет каждый redirect;
- ограничивает количество редиректов;
- использует timeout;
- ограничивает размер HTML.

```text
PUBLIC INTERNET   ✓
LOCALHOST         ✕
192.168.x.x       ✕
10.x.x.x          ✕
PRIVATE NETWORK   ✕
```

> Для большого публичного сервиса всё равно рекомендуется добавить rate limiting, reverse proxy и ограничения на уровне хостинга.

---

# 06 / Структура проекта

```text
WebCheck/
│
├── public/
│   ├── index.html
│   ├── styles.css
│   ├── app.js
│   └── favicon.svg
│
├── server.js
├── package.json
├── README.md
├── LICENSE
└── .gitignore
```

### `public/index.html`

Основная разметка интерфейса.

### `public/styles.css`

Полностью отвечает за визуальный стиль WebCheck:

- diagnostic-lab интерфейс;
- сетку;
- radar;
- отчёт;
- мобильную адаптацию.

### `public/app.js`

Frontend-логика:

- отправка URL на backend;
- loading screen;
- отображение результатов;
- category score;
- рекомендации;
- копирование отчёта.

### `server.js`

Главный backend проекта.

Он:

1. принимает URL;
2. проверяет адрес;
3. получает страницу;
4. анализирует HTML и headers;
5. проверяет дополнительные URL;
6. рассчитывает score;
7. возвращает JSON frontend-части.

---

# 07 / Как загрузить проект на GitHub

## Вариант A — через сайт GitHub

Создайте новый репозиторий.

Рекомендуемое название:

```text
WebCheck
```

Описание:

```text
A clean website diagnostics tool for SEO, security, social metadata and technical health.
```

### При создании репозитория

Если вы загружаете готовую папку WebCheck, **не создавайте дополнительно**:

- README;
- `.gitignore`;
- LICENSE.

Они уже есть в проекте.

После создания репозитория:

1. нажмите **Add file**;
2. выберите **Upload files**;
3. перетащите содержимое папки `WebCheck`;
4. дождитесь загрузки;
5. нажмите **Commit changes**.

Важно: загружайте **содержимое папки WebCheck**, а не ZIP-архив как единственный файл.

После загрузки структура на GitHub должна выглядеть примерно так:

```text
public/
server.js
package.json
README.md
LICENSE
.gitignore
```

---

## Вариант B — через Git

Откройте терминал внутри папки WebCheck:

```bash
git init
git add .
git commit -m "Initial WebCheck release"
git branch -M main
git remote add origin YOUR_REPOSITORY_URL
git push -u origin main
```

Где:

```text
YOUR_REPOSITORY_URL
```

нужно заменить на URL созданного репозитория.

---

# 08 / GitHub Pages

## Важно

Полная версия WebCheck **не будет работать только на GitHub Pages**.

Причина:

```text
GitHub Pages = static hosting
WebCheck      = frontend + Node.js backend
```

На GitHub Pages можно разместить только внешний интерфейс, но функция:

```text
POST /api/check
```

работать не будет.

Для полноценной онлайн-версии понадобится сервер или хостинг с поддержкой Node.js.

При этом сам исходный код проекта можно и нужно хранить на GitHub.

---

# 09 / Локальный режим разработки

Для обычного запуска:

```bash
npm start
```

Для автоматического перезапуска сервера после изменений:

```bash
npm run dev
```

`npm run dev` использует встроенный режим `node --watch`.

---

# 10 / Частые проблемы

<details>
<summary><strong>Страница не открывается</strong></summary>

Проверьте, что терминал всё ещё запущен и в нём есть:

```text
WebCheck v0.2.1 running on http://localhost:3000
```

Затем откройте именно:

```text
http://localhost:3000
```

</details>

<details>
<summary><strong>Команда npm не найдена</strong></summary>

Скорее всего Node.js не установлен или терминал был открыт до установки Node.js.

Проверьте:

```bash
node -v
npm -v
```

При необходимости перезапустите терминал.

</details>

<details>
<summary><strong>Старый дизайн после обновления</strong></summary>

В браузере нажмите:

```text
Ctrl + F5
```

Это принудительно обновит CSS и JavaScript без старого кэша.

</details>

<details>
<summary><strong>Сайт не проверяется</strong></summary>

WebCheck работает только с публично доступными сайтами.

Локальные адреса и приватные сети блокируются специально:

```text
localhost
127.0.0.1
192.168.x.x
10.x.x.x
```

Также целевой сервер может блокировать автоматические HTTP-запросы.

</details>

<details>
<summary><strong>Порт 3000 уже занят</strong></summary>

Можно запустить WebCheck на другом порту.

### Windows CMD

```bat
set PORT=8080 && npm start
```

После этого откройте:

```text
http://localhost:8080
```

### PowerShell

```powershell
$env:PORT=8080
npm start
```

</details>

---

# 11 / API

WebCheck использует один основной endpoint:

```http
POST /api/check
```

Пример тела:

```json
{
  "url": "https://example.com"
}
```

Пример упрощённого ответа:

```json
{
  "host": "example.com",
  "score": 84,
  "categoryScores": {
    "seo": 91,
    "security": 68,
    "social": 82,
    "technical": 95
  }
}
```

---

# 12 / Ограничения текущей версии

WebCheck v0.2.1 — это быстрый диагностический инструмент.

Он пока не выполняет:

- JavaScript rendering страницы;
- Lighthouse audit;
- Core Web Vitals из реальных пользователей;
- глубокое сканирование всего сайта;
- проверку всех внутренних ссылок;
- поиск уязвимостей;
- анализ JavaScript bundle;
- полноценный accessibility audit.

Большая часть текущих проверок выполняется по HTML и HTTP headers главной страницы.

---

# 13 / Roadmap

```text
[ ] OpenGraph visual preview
[ ] Twitter / X card diagnostics
[ ] Broken links scanner
[ ] Lighthouse integration
[ ] Core Web Vitals
[ ] Better HTML parser
[ ] JSON report export
[ ] PDF report export
[ ] Scan history
[ ] Shareable report
[ ] Rate limiting
[ ] Docker image
```

---

# 14 / Philosophy

WebCheck строится вокруг трёх принципов:

### CLEAR

Результат должен быть понятен без чтения документации по SEO.

### FAST

Проверка не должна превращаться в тяжёлый аудит на несколько минут.

### USEFUL

Если WebCheck показывает проблему — пользователь должен понимать, что с ней делать.

---

# 15 / License

Проект распространяется по лицензии **MIT**.

Полный текст находится в:

```text
LICENSE
```

---

<div align="center">

```text
WEB/CHECK
SCAN → UNDERSTAND → IMPROVE
```

**Built as an independent CayPlayProjects experiment.**

</div>
