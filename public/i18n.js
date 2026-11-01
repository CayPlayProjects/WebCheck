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
    "X-Frame-Options or CSP frame-ancestors helps control whether other sites can embed this page.":"X-Frame-Options or CSP frame-ancestors helps control whether other sites can embed this page.",
    "Controls access to browser features such as camera, microphone and geolocation.":"Controls access to browser features such as camera, microphone and geolocation.",
    "Helps isolate the browsing context from cross-origin windows.":"Helps isolate the browsing context from cross-origin windows.",
    "Controls which cross-origin resources may be embedded.":"Controls which cross-origin resources may be embedded.",
    "Controls which origins may load this resource.":"Controls which origins may load this resource.",
    "Session cookies sent over HTTPS should use the Secure attribute.":"Session cookies sent over HTTPS should use the Secure attribute.",
    "HttpOnly prevents JavaScript from reading cookies that do not need client-side access.":"HttpOnly prevents JavaScript from reading cookies that do not need client-side access.",
    "SameSite helps control when browsers attach cookies to cross-site requests.":"SameSite helps control when browsers attach cookies to cross-site requests.",
    "HTTPS pages should avoid loading HTTP resources that browsers may block or downgrade.":"HTTPS pages should avoid loading HTTP resources that browsers may block or downgrade.",
    "Forms should not submit sensitive data to an unencrypted HTTP endpoint.":"Forms should not submit sensitive data to an unencrypted HTTP endpoint.",
    "Password fields on a page served over HTTP expose credentials in transit.":"Password fields on a page served over HTTP expose credentials in transit.",
    "Subresource Integrity can help verify externally hosted scripts have not changed unexpectedly.":"Subresource Integrity can help verify externally hosted scripts have not changed unexpectedly.",
    "Avoid unsafe-inline and unsafe-eval in script-src where the application permits.":"Avoid unsafe-inline and unsafe-eval in script-src where the application permits.",
    "Unnecessary server and framework version details can make fingerprinting easier.":"Unnecessary server and framework version details can make fingerprinting easier.",
    "Add anti-framing protection":"Add anti-framing protection",
    "Configure CSP frame-ancestors or X-Frame-Options to reduce clickjacking risk.":"Configure CSP frame-ancestors or X-Frame-Options to reduce clickjacking risk.",
    "Review Permissions-Policy":"Review Permissions-Policy",
    "Set an explicit Permissions-Policy that disables browser features the site does not need.":"Set an explicit Permissions-Policy that disables browser features the site does not need.",
    "Review cookie Secure flags":"Review cookie Secure flags",
    "Review cookie HttpOnly flags":"Review cookie HttpOnly flags",
    "Set explicit SameSite cookie policies":"Set explicit SameSite cookie policies",
    "Remove mixed content":"Remove mixed content",
    "Fix insecure form destinations":"Fix insecure form destinations",
    "Protect password forms with HTTPS":"Protect password forms with HTTPS",
    "Review external script integrity":"Review external script integrity",
    "Tighten Content-Security-Policy":"Tighten Content-Security-Policy",
    "Reduce unnecessary technology disclosure":"Reduce unnecessary technology disclosure",
    "Не настроен":"Not configured",
    "Настроен":"Configured",
    "Не найдено":"Not found",
    "Найдено":"Found",
    "Найдено":"Found",
    "No HTTP resource URLs found in markup":"No HTTP resource URLs found in markup",
    "No explicit HTTP form actions found":"No explicit HTTP form actions found",
    "No password fields detected":"No password fields detected",
    "No external scripts detected":"No external scripts detected",
    "Not configured":"Not configured",
    "Не найдено":"Not found",
    "Не обнаружено":"Not detected",
    "Не найден":"Not found",
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

  Object.assign(translations, {
    "PERFORMANCE":"ПРОИЗВОДИТЕЛЬНОСТЬ",
    "ACCESSIBILITY":"ДОСТУПНОСТЬ",
    "BROKEN":"НЕ РАБОТАЕТ",
    "REDIRECT":"РЕДИРЕКТ",
    "BLOCKED":"ЗАБЛОКИРОВАНО",
    "UNVERIFIED":"НЕ ПРОВЕРЕНО",
    "INTERNAL LINK CHECK":"ПРОВЕРКА ВНУТРЕННИХ ССЫЛОК",
    "SEO, безопасность, производительность, доступность, ссылки и техническое состояние":"SEO, security, performance, accessibility, links and technical health",
    "подробный отчёт с приоритетами и рекомендациями.":"a detailed report with priorities and recommendations.",
    "SAME-ORIGIN LINK CHECK":"SAME-ORIGIN LINK CHECK",
    "SEO":"SEO",
    "SECURITY":"БЕЗОПАСНОСТЬ",
    "SOCIAL":"СОЦСЕТИ",
    "TECH":"ТЕХНИКА",
    "PERFORMANCE":"ПРОИЗВОДИТЕЛЬНОСТЬ",
    "ACCESSIBILITY":"ДОСТУПНОСТЬ",
    "Title length":"Длина Title",
    "Description length":"Длина Description",
    "Robots meta directive":"Директива Robots",
    "Nofollow directive":"Директива Nofollow",
    "Canonical consistency":"Корректность Canonical",
    "Heading hierarchy":"Иерархия заголовков",
    "Structured data (JSON-LD)":"Структурированные данные (JSON-LD)",
    "Twitter/X card metadata":"Метаданные Twitter/X Card",
    "International language alternates":"Альтернативные языковые версии",
    "A concise title is usually easier to understand in search results.":"Краткий заголовок проще воспринимать в поисковой выдаче.",
    "A useful description should summarize the page without excessive truncation.":"Описание должно кратко передавать содержание страницы.",
    "Checks whether the page explicitly asks search engines not to index or follow it.":"Проверяет, запрещает ли страница поисковым системам индексацию или переходы по ссылкам.",
    "The page asks crawlers not to follow its links.":"Страница просит поисковых роботов не переходить по ссылкам.",
    "Checks whether the canonical URL is valid and points to the same page host and path.":"Проверяет, ведёт ли Canonical на корректный адрес этой страницы.",
    "Heading levels should form a logical outline without skipping levels.":"Уровни заголовков должны формировать логичную структуру без пропусков.",
    "Checks whether JSON-LD structured data is present and parses as JSON.":"Проверяет наличие и корректность JSON-LD.",
    "A card declaration helps control link previews on supported social platforms.":"Метаданные карточки помогают управлять предпросмотром ссылок.",
    "hreflang annotations help search engines understand localized page versions.":"Атрибуты hreflang помогают поисковикам распознавать языковые версии.",
    "Improve title length":"Уточните длину Title",
    "Review meta description":"Проверьте Meta Description",
    "Review noindex directive":"Проверьте директиву noindex",
    "Review canonical URL":"Проверьте Canonical URL",
    "Fix heading hierarchy":"Исправьте иерархию заголовков",
    "Fix invalid structured data":"Исправьте структурированные данные",
    "Consider structured data":"Рассмотрите добавление Schema.org",
    "Add Twitter/X card metadata":"Добавьте метаданные Twitter/X Card",
    "Title length":"Длина Title",
    "PERFORMANCE":"ПРОИЗВОДИТЕЛЬНОСТЬ",
    "HTML document size":"Размер HTML-документа",
    "Time to first byte":"Время до первого байта",
    "Initial resource count":"Количество ресурсов",
    "Parser-blocking scripts":"Блокирующие скрипты",
    "Lazy-loaded images":"Отложенная загрузка изображений",
    "Image dimensions":"Размеры изображений",
    "Cache policy header":"Заголовок политики кэширования",
    "Large HTML documents take longer to transfer and parse.":"Большие HTML-документы дольше передаются и обрабатываются.",
    "Measures time until the first HTTP response headers arrive.":"Измеряет время до получения первых HTTP-заголовков.",
    "Counts images, scripts and stylesheet references in the HTML.":"Считает изображения, скрипты и таблицы стилей в HTML.",
    "Scripts without async/defer can delay HTML parsing.":"Скрипты без async/defer могут задерживать обработку HTML.",
    "Below-the-fold images can use loading=lazy to avoid competing with visible content.":"Для изображений ниже первого экрана можно использовать loading=lazy.",
    "Explicit image dimensions help browsers reserve layout space and reduce layout shifts.":"Явные размеры изображений помогают избежать скачков макета.",
    "Cache headers help browsers and CDNs reuse suitable responses.":"Заголовки кэширования помогают браузерам и CDN повторно использовать ответы.",
    "Reduce HTML document size":"Уменьшите размер HTML",
    "Review HTML document size":"Проверьте размер HTML",
    "Improve server response time":"Ускорьте ответ сервера",
    "Reduce initial resource count":"Сократите количество ресурсов",
    "Defer non-critical JavaScript":"Отложите некритичный JavaScript",
    "Lazy-load offscreen images":"Включите lazy loading для изображений ниже первого экрана",
    "Set image dimensions":"Укажите размеры изображений",
    "Review cache policy":"Проверьте политику кэширования",
    "ACCESSIBILITY":"ДОСТУПНОСТЬ",
    "Image alternative text":"Alt-тексты изображений",
    "Unique element IDs":"Уникальность ID элементов",
    "Form control labels":"Подписи полей формы",
    "Button accessible names":"Доступные названия кнопок",
    "Link accessible names":"Доступные названия ссылок",
    "Main landmark":"Основная область страницы",
    "Keyboard tab order":"Порядок клавиатурной навигации",
    "Data table headers":"Заголовки таблиц",
    "Informative images need useful alt text; decorative images should use alt=\"\".":"Для информативных изображений нужен alt-текст; декоративным подходит alt=\"\".",
    "Duplicate IDs can break labels, scripts and assistive-technology references.":"Повторяющиеся ID могут нарушать работу подписей и вспомогательных технологий.",
    "Inputs, selects and textareas need programmatic labels or accessible names.":"Полям ввода, спискам и текстовым областям нужны подписи или доступные имена.",
    "Buttons should expose a readable name to assistive technologies.":"У кнопок должно быть понятное имя для вспомогательных технологий.",
    "Links should describe their destination or action.":"Ссылка должна описывать своё назначение или действие.",
    "A page should expose one main landmark for its primary content.":"На странице должна быть одна основная область содержимого.",
    "Positive tabindex values can create a confusing focus order.":"Положительные tabindex могут нарушать логичный порядок фокуса.",
    "Data tables should identify column or row headers with th elements.":"В таблицах данных заголовки столбцов и строк следует отмечать элементами th.",
    "Add image alternative text":"Добавьте alt-тексты изображениям",
    "Make element IDs unique":"Сделайте ID элементов уникальными",
    "Label form controls":"Добавьте подписи полям формы",
    "Add accessible button names":"Добавьте доступные имена кнопкам",
    "Give links descriptive names":"Сделайте названия ссылок понятными",
    "Review the main landmark":"Проверьте основную область страницы",
    "Avoid positive tabindex values":"Избегайте положительных значений tabindex",
    "Add table headers":"Добавьте заголовки таблиц",
    "Internal link audit":"Проверка внутренних ссылок",
    "A small sample of same-origin links is checked with HEAD requests.":"Небольшая выборка внутренних ссылок проверяется HEAD-запросами.",
    "No crawlable same-origin links were found in the sample.":"В проверенной выборке не найдено доступных внутренних ссылок.",
    "New-window link isolation":"Защита ссылок, открывающих новую вкладку",
    "Links opened in a new tab should use rel=noopener for clear opener isolation.":"Ссылки с target=_blank должны использовать rel=noopener.",
    "Add rel=noopener to new-window links":"Добавьте rel=noopener для новых вкладок",
    "TLS protocol":"Версия TLS",
    "TLS certificate":"TLS-сертификат",
    "The negotiated TLS version should be TLS 1.2 or newer.":"Используемая версия TLS должна быть не ниже TLS 1.2.",
    "Checks the peer certificate validity and expiry date.":"Проверяет валидность и срок действия сертификата.",
    "Renew the TLS certificate":"Обновите TLS-сертификат",
    "No title to measure":"Нет заголовка для измерения",
    "Not provided":"Не указано",
    "None declared":"Не указано",
    "No JSON-LD found":"JSON-LD не найден",
    "Invalid canonical URL":"Некорректный Canonical URL",
    "No headings found":"Заголовки не найдены",
    "Not specified":"Не указано",
    "No cache policy header":"Заголовок кэширования отсутствует",
    "image(s) missing alt":"изображений без alt",
    "control(s) without a detected label":"полей без найденной подписи",
    "button(s) without a detected name":"кнопок без доступного имени",
    "link(s) without a detected name":"ссылок без доступного имени",
    "main landmark(s)":"основных областей",
    "positive tabindex value(s)":"положительных значений tabindex",
    "table(s) without th":"таблиц без th",
    "days until expiry":"дней до истечения срока",
    "TLS details unavailable":"Данные TLS недоступны",
    "Certificate details unavailable":"Данные сертификата недоступны"
  });

  Object.assign(translations, {
    "DOWNLOAD JSON":"СКАЧАТЬ JSON",
    "PRINT / PDF":"ПЕЧАТЬ / PDF",
    "JSON report downloaded":"JSON-отчёт скачан",
    "СКАЧАТЬ JSON":"DOWNLOAD JSON",
    "ПЕЧАТЬ / PDF":"PRINT / PDF",
    "JSON-отчёт скачан":"JSON report downloaded"
  });

  const hasCyrillic = value => /[А-Яа-яЁё]/.test(value);
  const russianToEnglish = {};
  const englishToRussian = {};
  for (const [source, destination] of Object.entries(translations)) {
    if (hasCyrillic(source) && !hasCyrillic(destination)) russianToEnglish[source] = destination;
    else if (!hasCyrillic(source) && hasCyrillic(destination)) englishToRussian[source] = destination;
  }

  let language = localStorage.getItem(KEY) === "en" ? "en" : "ru";
  const originalText = new WeakMap();

  function translateNode(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      if (!originalText.has(node)) originalText.set(node, node.nodeValue);
      const source = originalText.get(node);
      const trimmed = source.trim();
      if (!trimmed) return;
      const translated = language === "en" ? (russianToEnglish[trimmed] || trimmed) : (englishToRussian[trimmed] || trimmed);
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