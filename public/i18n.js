(() => {
  "use strict";
  const KEY = "webcheck-language";
  const translations = {
    "Сайт в порядке?":"Is your website in shape?",
    "Проверим.":"Let's find out.",
    "Введите адрес — WebCheck соберёт базовые SEO, security, social и technical сигналы":"Enter a URL — WebCheck checks SEO, security, social and technical signals",
    "и превратит их в короткий понятный отчёт.":"and turns them into a clear, actionable report.",
    "Адрес сайта":"Website address",
    "START SCAN":"START SCAN",
    "NO ACCOUNT":"NO ACCOUNT",
    "PUBLIC SITES ONLY":"PUBLIC SITES ONLY",
    "WHAT WE CHECK":"WHAT WE CHECK",
    "Что проверяем":"What we check",
    "Title, description, canonical, H1, language, viewport и индексация.":"Title, description, canonical, H1, language, viewport and indexing.",
    "HTTPS, HSTS, CSP и основные security headers.":"HTTPS, HSTS, CSP and key security headers.",
    "OpenGraph и готовность страницы к нормальному preview ссылок.":"OpenGraph and link preview readiness.",
    "HTTP status, redirects, HTML size, favicon и время ответа.":"HTTP status, redirects, HTML size, favicon and response time.",
    "SCAN IN PROGRESS":"SCAN IN PROGRESS",
    "Подключение к сайту":"Connecting to website",
    "Чтение страницы":"Reading page",
    "Проверка сигналов":"Inspecting signals",
    "Сбор результатов":"Building report",
    "Что найдено":"Findings",
    "Что исправить":"Recommended actions",
    "Показать детали":"Show details",
    "← NEW WEBSITE":"← NEW WEBSITE",
    "COPY REPORT":"COPY REPORT",
    "RESCAN":"RESCAN",
    "Отличное техническое состояние. Основные проверки пройдены.":"Excellent technical health. Core checks passed.",
    "Хорошая база. Остались несколько точечных улучшений.":"Good foundation. A few improvements remain.",
    "Рабочее состояние, но часть важных сигналов отсутствует.":"Operational, but some important signals are missing.",
    "Есть заметные SEO или security пробелы, которые стоит исправить.":"Notable SEO or security gaps need attention.",
    "Нужна базовая техническая доработка сайта.":"The website needs foundational technical improvements.",
    "Основных замечаний нет":"No major issues found",
    "Базовые проверки WebCheck пройдены успешно.":"The WebCheck baseline checks passed.",
    "Отчёт скопирован":"Report copied",
    "Введите адрес сайта":"Enter a website address",
    "Не удалось проверить сайт":"Could not check the website",
    "Ошибка проверки":"Scan failed",
    "Браузер не разрешил копирование":"The browser blocked clipboard access",
    "Не найден":"Not found",
    "Не найдена":"Not found",
    "Не найдено":"Not found",
    "Не указан":"Not specified",
    "Не указана":"Not specified",
    "Не указано":"Not specified",
    "Доступен":"Available",
    "Найдена":"Found",
    "Настроен":"Configured",
    "Не настроен":"Not configured",
    "Не найдено":"Not found",
    "Найдено несколько H1. Убедитесь, что структура заголовков логична.":"Multiple H1 headings found. Check that the heading structure is logical.",
    "На странице не найден основной заголовок H1.":"No primary H1 heading was found on the page.",
    "CSP ограничивает нежелательные источники контента.":"CSP restricts unwanted content sources.",
    "HSTS заставляет браузер использовать HTTPS.":"HSTS tells browsers to use HTTPS.",
    "nosniff запрещает MIME-sniffing.":"nosniff prevents MIME sniffing.",
    "Политика referrer ограничивает передачу адреса источника.":"Referrer policy limits how much source URL information is shared.",
    "Title объясняет содержание страницы пользователю и поисковику.":"The title explains the page to visitors and search engines.",
    "Описание помогает формировать понятный поисковый сниппет.":"The description helps create a useful search snippet.",
    "Viewport нужен для корректной мобильной адаптации.":"Viewport is needed for proper mobile rendering.",
    "Canonical помогает избежать дублей URL.":"Canonical helps prevent duplicate URL issues.",
    "robots.txt задаёт правила для поисковых роботов.":"robots.txt provides rules for search crawlers.",
    "Sitemap помогает поисковым системам находить страницы.":"A sitemap helps search engines discover pages.",
    "Для основной страницы желательно иметь понятный основной H1.":"A clear primary H1 is recommended for the main page.",
    "Язык документа полезен браузерам, поиску и accessibility.":"The document language helps browsers, search and accessibility tools.",
    "Явная кодировка снижает риск проблем с текстом.":"An explicit character encoding reduces text rendering issues.",
    "Заголовок OpenGraph используется в preview ссылок.":"The OpenGraph title is used in link previews.",
    "Описание делает preview ссылки понятнее.":"The description makes link previews clearer.",
    "Картинка делает ссылку заметнее в соцсетях и мессенджерах.":"An image makes links stand out in social apps and messengers.",
    "CSP помогает снизить последствия некоторых XSS-инъекций.":"CSP can reduce the impact of some XSS vulnerabilities.",
    "Первый ответ занимает больше 2.5 секунд. Проверьте backend, хостинг и кэширование.":"The first response takes over 2.5 seconds. Check the backend, hosting and caching.",
    "Переведите сайт на HTTPS":"Move the website to HTTPS",
    "Исправьте HTTP-ответ":"Fix the HTTP response",
    "Добавьте title":"Add a title tag",
    "Добавьте meta description":"Add a meta description",
    "Добавьте meta viewport":"Add a meta viewport",
    "Укажите canonical URL":"Set a canonical URL",
    "Добавьте robots.txt":"Add robots.txt",
    "Добавьте sitemap.xml":"Add sitemap.xml",
    "Добавьте H1":"Add an H1 heading",
    "Проверьте структуру H1":"Review the H1 structure",
    "Заполните OpenGraph":"Complete OpenGraph metadata",
    "Настройте Content-Security-Policy":"Configure Content-Security-Policy",
    "Включите HSTS":"Enable HSTS",
    "Добавьте X-Content-Type-Options":"Add X-Content-Type-Options",
    "Ускорьте серверный ответ":"Improve server response time",
    "OK":"PASS",
    "CHECK":"REVIEW",
    "FAIL":"FAIL",
    "IMPORTANT":"HIGH PRIORITY",
    "IMPROVE":"IMPROVE",
    "Отчёт":"Report",
    "Проверка":"Scan",
    "Не найден":"Not found",
    "Не указана":"Not specified"
  };

  let language = localStorage.getItem(KEY) === "en" ? "en" : "ru";
  const originalText = new WeakMap();

  function translateNode(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      if (!originalText.has(node)) originalText.set(node, node.nodeValue);
      const source = originalText.get(node);
      const trimmed = source.trim();
      if (!trimmed) return;
      const translated = language === "en" ? (translations[trimmed] || trimmed) : trimmed;
      const leading = source.match(/^\s*/)?.[0] || "";
      const trailing = source.match(/\s*$/)?.[0] || "";
      const output = leading + translated + trailing;
      if (node.nodeValue !== output) node.nodeValue = output;
      return;
    }
    if (node.nodeType === Node.ELEMENT_NODE) {
      if (node.matches("script,style")) return;
      for (const child of node.childNodes) translateNode(child);
    }
  }

  function translateAttributes() {
    const input = document.querySelector("#urlInput");
    if (input) input.placeholder = language === "en" ? "example.com" : "cayplay.ru";
    document.documentElement.lang = language;
    document.title = language === "en" ? "WebCheck — Website Diagnostics" : "WebCheck — Диагностика сайтов";
  }

  function applyLanguage() {
    translateNode(document.body);
    translateAttributes();
    const button = document.querySelector("#languageToggle");
    if (button) {
      button.textContent = language === "en" ? "RU" : "EN";
      button.setAttribute("aria-label", language === "en" ? "Switch to Russian" : "Switch to English");
      button.title = button.getAttribute("aria-label");
    }
  }

  function mountToggle() {
    const header = document.querySelector(".header-right");
    if (!header || document.querySelector("#languageToggle")) return;
    const button = document.createElement("button");
    button.id = "languageToggle";
    button.type = "button";
    button.className = "language-toggle";
    button.addEventListener("click", () => {
      language = language === "ru" ? "en" : "ru";
      localStorage.setItem(KEY, language);
      applyLanguage();
    });
    header.append(button);
    applyLanguage();
  }

  const observer = new MutationObserver(records => {
    for (const record of records) {
      if (record.type === "childList") record.addedNodes.forEach(translateNode);
      else if (record.type === "characterData") translateNode(record.target);
    }
  });

  document.addEventListener("DOMContentLoaded", () => {
    mountToggle();
    observer.observe(document.body, {subtree:true, childList:true, characterData:true});
  });
})();