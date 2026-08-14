const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");
const dns = require("dns");
const net = require("net");

const PORT = Number(process.env.PORT || 3000);
const PUBLIC_DIR = path.join(__dirname, "public");
const MAX_HTML_BYTES = 2 * 1024 * 1024;
const REQUEST_TIMEOUT = 10000;
const MAX_REDIRECTS = 5;

const MIME = {
  ".html":"text/html; charset=utf-8",
  ".css":"text/css; charset=utf-8",
  ".js":"application/javascript; charset=utf-8",
  ".svg":"image/svg+xml; charset=utf-8",
  ".json":"application/json; charset=utf-8"
};

function sendJson(res, status, payload){
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    "Content-Type":"application/json; charset=utf-8",
    "Content-Length":Buffer.byteLength(body),
    "Cache-Control":"no-store"
  });
  res.end(body);
}

function normalizeFamily(family, address){
  if(family === 4 || family === "IPv4") return 4;
  if(family === 6 || family === "IPv6") return 6;
  return net.isIP(address);
}

function isPrivateIp(address){
  const family = net.isIP(address);
  if(!family) return true;

  if(family === 4){
    const p = address.split(".").map(Number);
    return (
      p[0] === 0 ||
      p[0] === 10 ||
      p[0] === 127 ||
      (p[0] === 169 && p[1] === 254) ||
      (p[0] === 172 && p[1] >= 16 && p[1] <= 31) ||
      (p[0] === 192 && p[1] === 168) ||
      (p[0] === 100 && p[1] >= 64 && p[1] <= 127) ||
      p[0] >= 224
    );
  }

  let ip = address.toLowerCase();

  // IPv4-mapped IPv6, e.g. ::ffff:127.0.0.1
  const mapped = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if(mapped) return isPrivateIp(mapped[1]);

  return (
    ip === "::" ||
    ip === "::1" ||
    ip.startsWith("fc") ||
    ip.startsWith("fd") ||
    /^fe[89ab]/.test(ip) ||
    ip.startsWith("2001:db8:")
  );
}

async function resolvePublicAddress(hostname){
  const lower = hostname.toLowerCase();

  if(lower === "localhost" || lower.endsWith(".localhost")){
    throw new Error("Локальные адреса нельзя проверять");
  }

  if(net.isIP(hostname)){
    if(isPrivateIp(hostname)) throw new Error("Приватные IP-адреса нельзя проверять");
    return {address:hostname, family:net.isIP(hostname)};
  }

  let addresses;
  try{
    addresses = await dns.promises.lookup(hostname, {all:true, verbatim:true});
  }catch(error){
    if(error && error.code === "ENOTFOUND") throw new Error("Домен не найден");
    if(error && error.code === "EAI_AGAIN") throw new Error("Не удалось получить DNS-адрес сайта. Попробуйте ещё раз.");
    throw error;
  }

  const normalized = addresses
    .map(item => ({
      address:item.address,
      family:normalizeFamily(item.family, item.address)
    }))
    .filter(item => item.family && !isPrivateIp(item.address));

  if(!normalized.length){
    throw new Error("Адрес сайта ведёт в приватную или локальную сеть");
  }

  return normalized[0];
}

function normalizeUrl(raw){
  let value = String(raw || "").trim();
  if(!value) throw new Error("Введите адрес сайта");

  if(!/^[a-zA-Z][a-zA-Z\d+.-]*:/.test(value)){
    value = `https://${value}`;
  }

  let url;
  try{
    url = new URL(value);
  }catch{
    throw new Error("Некорректный адрес сайта");
  }

  if(!["http:","https:"].includes(url.protocol)){
    throw new Error("Поддерживаются только HTTP и HTTPS");
  }

  if(url.username || url.password){
    throw new Error("URL с логином или паролем не поддерживается");
  }

  return url;
}

function createPinnedLookup(resolved){
  return (hostname, options, callback) => {
    const result = {
      address:resolved.address,
      family:resolved.family
    };

    // Node.js 20/22+ may call custom lookup with { all: true }
    // when autoSelectFamily is enabled. In that mode the callback
    // must receive an array instead of address/family separately.
    if(options && options.all){
      callback(null, [result]);
      return;
    }

    callback(null, result.address, result.family);
  };
}

async function requestUrl(urlString, {method="GET", redirects=0} = {}){
  if(redirects > MAX_REDIRECTS){
    throw new Error("Слишком много редиректов");
  }

  const url = normalizeUrl(urlString);
  const resolved = await resolvePublicAddress(url.hostname);
  const client = url.protocol === "https:" ? https : http;

  return new Promise((resolve, reject) => {
    const started = Date.now();

    const request = client.request({
      protocol:url.protocol,
      hostname:url.hostname,
      port:url.port || undefined,
      path:url.pathname + url.search,
      method,
      servername:url.hostname,
      lookup:createPinnedLookup(resolved),
      family:resolved.family,
      headers:{
        "User-Agent":"WebCheck/0.2 Website Diagnostics",
        "Accept":method === "HEAD"
          ? "*/*"
          : "text/html,application/xhtml+xml;q=0.9,*/*;q=0.6",
        "Accept-Encoding":"identity",
        "Connection":"close"
      },
      timeout:REQUEST_TIMEOUT
    }, response => {
      const responseTimeMs = Date.now() - started;
      const statusCode = response.statusCode || 0;

      if([301,302,303,307,308].includes(statusCode) && response.headers.location){
        response.resume();

        let nextUrl;
        try{
          nextUrl = new URL(response.headers.location, url).toString();
        }catch{
          reject(new Error("Сайт вернул некорректный redirect URL"));
          return;
        }

        requestUrl(nextUrl, {method, redirects:redirects + 1})
          .then(result => resolve({...result, redirects:result.redirects + 1}))
          .catch(reject);
        return;
      }

      if(method === "HEAD"){
        response.resume();
        resolve({
          statusCode,
          statusText:response.statusMessage || "",
          headers:response.headers,
          body:"",
          bytes:0,
          responseTimeMs,
          finalUrl:url.toString(),
          redirects:0
        });
        return;
      }

      const chunks = [];
      let bytes = 0;
      let exceeded = false;

      response.on("data", chunk => {
        bytes += chunk.length;

        if(bytes > MAX_HTML_BYTES){
          exceeded = true;
          request.destroy(new Error("HTML страницы больше 2 МБ — быстрая проверка остановлена"));
          return;
        }

        chunks.push(chunk);
      });

      response.on("end", () => {
        if(exceeded) return;

        resolve({
          statusCode,
          statusText:response.statusMessage || "",
          headers:response.headers,
          body:Buffer.concat(chunks).toString("utf8"),
          bytes,
          responseTimeMs,
          finalUrl:url.toString(),
          redirects:0
        });
      });
    });

    request.on("timeout", () => {
      request.destroy(new Error("Сайт отвечает дольше 10 секунд"));
    });

    request.on("error", error => {
      const friendly = friendlyNetworkError(error);
      reject(new Error(friendly));
    });

    request.end();
  });
}

function friendlyNetworkError(error){
  if(!error) return "Не удалось подключиться к сайту";

  const code = error.code || "";

  if(code === "ECONNREFUSED") return "Сайт отклонил подключение";
  if(code === "ECONNRESET") return "Соединение с сайтом было сброшено";
  if(code === "ETIMEDOUT") return "Истекло время ожидания ответа";
  if(code === "CERT_HAS_EXPIRED") return "У сайта истёк SSL-сертификат";
  if(code.startsWith("ERR_TLS") || code.includes("CERT")) return `Ошибка SSL/TLS: ${error.message}`;

  // Preserve our own readable errors.
  if(
    /HTML страницы|Слишком много|Некорректный|Приватн|Локальн|DNS|Домен|дольше/.test(error.message || "")
  ){
    return error.message;
  }

  return error.message || "Не удалось подключиться к сайту";
}

function decodeEntities(value){
  return String(value || "")
    .replace(/&amp;/gi,"&")
    .replace(/&quot;/gi,'"')
    .replace(/&#39;|&apos;/gi,"'")
    .replace(/&lt;/gi,"<")
    .replace(/&gt;/gi,">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

function firstMatch(html, regex){
  const match = html.match(regex);
  return match ? decodeEntities((match[1] || "").trim()) : "";
}

function metaContent(html, attribute, value){
  const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(`<meta\\b[^>]*${attribute}\\s*=\\s*["']${escaped}["'][^>]*content\\s*=\\s*["']([^"']*)["'][^>]*>`, "i"),
    new RegExp(`<meta\\b[^>]*content\\s*=\\s*["']([^"']*)["'][^>]*${attribute}\\s*=\\s*["']${escaped}["'][^>]*>`, "i")
  ];

  for(const regex of patterns){
    const match = html.match(regex);
    if(match) return decodeEntities(match[1].trim());
  }

  return "";
}

function linkHref(html, relation){
  const tags = html.match(/<link\b[^>]*>/gi) || [];

  for(const tag of tags){
    const rel = firstMatch(tag, /\brel\s*=\s*["']([^"']+)["']/i).toLowerCase();
    if(!rel) continue;

    const relTokens = rel.split(/\s+/);
    const wanted = relation.split("|");

    if(!wanted.some(item => relTokens.includes(item))) continue;

    const href = firstMatch(tag, /\bhref\s*=\s*["']([^"']+)["']/i);
    if(href) return href;
  }

  return "";
}

function absoluteMaybe(value, base){
  if(!value) return "";
  try{
    return new URL(value, base).toString();
  }catch{
    return value;
  }
}

async function quickExists(url){
  try{
    const head = await requestUrl(url, {method:"HEAD"});
    if(head.statusCode >= 200 && head.statusCode < 400) return true;

    // Some servers reject HEAD even though GET works.
    if(head.statusCode !== 405 && head.statusCode !== 403) return false;
  }catch{
    // Fall back to GET below.
  }

  try{
    const get = await requestUrl(url, {method:"GET"});
    return get.statusCode >= 200 && get.statusCode < 400;
  }catch{
    return false;
  }
}

function makeCheck(category, key, label, description, status, value, weight){
  return {category, key, label, description, status, value, weight};
}

function calculateCategoryScore(checks, category){
  const items = checks.filter(item => item.category === category);
  const total = items.reduce((sum, item) => sum + item.weight, 0);
  if(!total) return 0;

  const earned = items.reduce((sum, item) => {
    const factor = item.status === "pass" ? 1 : item.status === "warn" ? 0.45 : 0;
    return sum + item.weight * factor;
  }, 0);

  return Math.round((earned / total) * 100);
}

async function analyze(rawUrl){
  const requested = normalizeUrl(rawUrl);
  const page = await requestUrl(requested.toString());

  const final = new URL(page.finalUrl);
  const html = page.body || "";
  const headers = page.headers;

  const title = firstMatch(html, /<title\b[^>]*>([\s\S]*?)<\/title>/i);
  const description = metaContent(html, "name", "description");
  const viewport = metaContent(html, "name", "viewport");
  const canonicalRaw = linkHref(html, "canonical");
  const canonical = absoluteMaybe(canonicalRaw, page.finalUrl);
  const faviconRaw = linkHref(html, "icon|shortcut");
  const faviconUrl = faviconRaw
    ? absoluteMaybe(faviconRaw, page.finalUrl)
    : new URL("/favicon.ico", page.finalUrl).toString();

  const ogTitle = metaContent(html, "property", "og:title");
  const ogDescription = metaContent(html, "property", "og:description");
  const ogImage = metaContent(html, "property", "og:image");

  const lang = firstMatch(html, /<html\b[^>]*\blang\s*=\s*["']([^"']+)["']/i);
  const charset = firstMatch(html, /<meta\b[^>]*charset\s*=\s*["']?([^"'\s>]+)/i);
  const h1Count = (html.match(/<h1\b/gi) || []).length;

  const origin = `${final.protocol}//${final.host}`;

  const [robots, sitemap, favicon] = await Promise.all([
    quickExists(new URL("/robots.txt", origin).toString()),
    quickExists(new URL("/sitemap.xml", origin).toString()),
    quickExists(faviconUrl)
  ]);

  const csp = Boolean(headers["content-security-policy"]);
  const hsts = Boolean(headers["strict-transport-security"]);
  const nosniff = String(headers["x-content-type-options"] || "").toLowerCase().includes("nosniff");
  const referrer = Boolean(headers["referrer-policy"]);

  const checks = [
    makeCheck("technical","https","HTTPS","Сайт открывается по защищённому протоколу.",final.protocol === "https:" ? "pass" : "fail",final.protocol.replace(":","").toUpperCase(),12),
    makeCheck("technical","status","HTTP status","Страница должна отвечать успешным HTTP-кодом.",page.statusCode >= 200 && page.statusCode < 400 ? "pass" : "fail",`${page.statusCode} ${page.statusText}`.trim(),8),
    makeCheck("technical","favicon","Favicon","Иконка помогает идентифицировать сайт во вкладках и закладках.",favicon ? "pass" : "warn",favicon ? "Найдена" : "Не найдена",3),
    makeCheck("technical","response","Response time","Быстрый первый ответ улучшает ощущение скорости.",page.responseTimeMs <= 1200 ? "pass" : page.responseTimeMs <= 2500 ? "warn" : "fail",`${page.responseTimeMs} ms`,6),

    makeCheck("seo","title","Title","Title объясняет содержание страницы пользователю и поисковику.",title ? "pass" : "fail",title || "Не найден",10),
    makeCheck("seo","description","Meta description","Описание помогает формировать понятный поисковый сниппет.",description ? "pass" : "warn",description || "Не найдена",7),
    makeCheck("seo","viewport","Viewport","Viewport нужен для корректной мобильной адаптации.",viewport ? "pass" : "fail",viewport || "Не найден",7),
    makeCheck("seo","canonical","Canonical","Canonical помогает избежать дублей URL.",canonical ? "pass" : "warn",canonical || "Не указан",5),
    makeCheck("seo","robots","robots.txt","robots.txt задаёт правила для поисковых роботов.",robots ? "pass" : "warn",robots ? "Доступен" : "Не найден",4),
    makeCheck("seo","sitemap","sitemap.xml","Sitemap помогает поисковым системам находить страницы.",sitemap ? "pass" : "warn",sitemap ? "Доступен" : "Не найден",4),
    makeCheck("seo","h1","H1","Для основной страницы желательно иметь понятный основной H1.",h1Count === 1 ? "pass" : h1Count > 1 ? "warn" : "fail",`${h1Count} шт.`,6),
    makeCheck("seo","lang","HTML lang","Язык документа полезен браузерам, поиску и accessibility.",lang ? "pass" : "warn",lang || "Не указан",3),
    makeCheck("seo","charset","Charset","Явная кодировка снижает риск проблем с текстом.",charset ? "pass" : "warn",charset || "Не указан",3),

    makeCheck("social","ogTitle","OpenGraph title","Заголовок OpenGraph используется в preview ссылок.",ogTitle ? "pass" : "warn",ogTitle || "Не найден",5),
    makeCheck("social","ogDescription","OpenGraph description","Описание делает preview ссылки понятнее.",ogDescription ? "pass" : "warn",ogDescription || "Не найдено",4),
    makeCheck("social","ogImage","OpenGraph image","Картинка делает ссылку заметнее в соцсетях и мессенджерах.",ogImage ? "pass" : "warn",ogImage ? absoluteMaybe(ogImage, page.finalUrl) : "Не найдена",5),

    makeCheck("security","csp","Content-Security-Policy","CSP ограничивает нежелательные источники контента.",csp ? "pass" : "warn",csp ? "Настроен" : "Не найден",7),
    makeCheck("security","hsts","HSTS","HSTS заставляет браузер использовать HTTPS.",hsts ? "pass" : final.protocol === "https:" ? "warn" : "fail",hsts ? "Настроен" : "Не найден",7),
    makeCheck("security","nosniff","X-Content-Type-Options","nosniff запрещает MIME-sniffing.",nosniff ? "pass" : "warn",nosniff ? "nosniff" : "Не найден",5),
    makeCheck("security","referrer","Referrer-Policy","Политика referrer ограничивает передачу адреса источника.",referrer ? "pass" : "warn",headers["referrer-policy"] || "Не найден",5)
  ];

  const categoryScores = {
    seo:calculateCategoryScore(checks,"seo"),
    security:calculateCategoryScore(checks,"security"),
    social:calculateCategoryScore(checks,"social"),
    technical:calculateCategoryScore(checks,"technical")
  };

  const totalWeight = checks.reduce((sum,item) => sum + item.weight,0);
  const earned = checks.reduce((sum,item) => {
    const factor = item.status === "pass" ? 1 : item.status === "warn" ? .45 : 0;
    return sum + item.weight * factor;
  },0);

  let score = Math.round((earned / totalWeight) * 100);
  if(page.statusCode >= 400) score = Math.min(score, 30);

  const recommendations = [];
  const add = (condition,title,text,priority="medium") => {
    if(condition) recommendations.push({title,text,priority});
  };

  add(final.protocol !== "https:","Переведите сайт на HTTPS","HTTPS — базовая защита трафика и стандарт для современного публичного сайта.","high");
  add(!(page.statusCode >= 200 && page.statusCode < 400),"Исправьте HTTP-ответ",`Страница отвечает кодом ${page.statusCode}. Проверьте доступность и редиректы.`,"high");
  add(!title,"Добавьте title","Укажите короткий уникальный заголовок страницы в теге <title>.","high");
  add(!description,"Добавьте meta description","Кратко опишите содержание страницы для поискового сниппета.","medium");
  add(!viewport,"Добавьте meta viewport","Без viewport мобильная версия может масштабироваться некорректно.","high");
  add(!canonical,"Укажите canonical URL","rel=canonical помогает определить основную версию страницы.","medium");
  add(!robots,"Добавьте robots.txt","Создайте robots.txt и явно задайте правила индексации.","medium");
  add(!sitemap,"Добавьте sitemap.xml","Карта сайта помогает поисковым роботам находить важные страницы.","medium");
  add(h1Count === 0,"Добавьте H1","На странице не найден основной заголовок H1.","high");
  add(h1Count > 1,"Проверьте структуру H1","Найдено несколько H1. Убедитесь, что структура заголовков логична.","medium");
  add(!ogTitle || !ogDescription || !ogImage,"Заполните OpenGraph","Добавьте og:title, og:description и og:image для аккуратных preview ссылок.","medium");
  add(!csp,"Настройте Content-Security-Policy","CSP помогает снизить последствия некоторых XSS-инъекций.","medium");
  add(final.protocol === "https:" && !hsts,"Включите HSTS","После стабильной настройки HTTPS добавьте Strict-Transport-Security.","medium");
  add(!nosniff,"Добавьте X-Content-Type-Options","Значение nosniff — простая полезная защита от MIME-sniffing.","medium");
  add(page.responseTimeMs > 2500,"Ускорьте серверный ответ","Первый ответ занимает больше 2.5 секунд. Проверьте backend, хостинг и кэширование.","high");

  return {
    requestedUrl:requested.toString(),
    finalUrl:page.finalUrl,
    host:final.hostname,
    statusCode:page.statusCode,
    statusText:page.statusText,
    responseTimeMs:page.responseTimeMs,
    htmlBytes:page.bytes,
    redirects:page.redirects,
    score,
    categoryScores,
    checkedAt:new Date().toISOString(),
    checks,
    recommendations:recommendations.slice(0,10),
    meta:{
      title,
      description,
      viewport,
      canonical,
      lang,
      charset,
      h1Count,
      ogTitle,
      ogDescription,
      ogImage
    },
    headers:{
      contentType:headers["content-type"] || "",
      server:headers["server"] || "",
      cacheControl:headers["cache-control"] || "",
      csp:headers["content-security-policy"] || "",
      hsts:headers["strict-transport-security"] || "",
      referrerPolicy:headers["referrer-policy"] || ""
    }
  };
}

function serveStatic(req, res){
  let pathname;

  try{
    pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
  }catch{
    res.writeHead(400, {"Content-Type":"text/plain; charset=utf-8"});
    res.end("Bad Request");
    return;
  }

  if(pathname === "/"){
    pathname = "/index.html";
  }

  // Convert URL paths (/styles.css) to a path relative to /public.
  // This avoids platform-specific path.resolve behaviour on Windows.
  const relativePath = pathname.replace(/^\/+/, "");
  const publicRoot = path.resolve(PUBLIC_DIR);
  const filePath = path.resolve(publicRoot, relativePath);

  // Prevent ../ path traversal.
  if(filePath !== publicRoot && !filePath.startsWith(publicRoot + path.sep)){
    res.writeHead(403, {"Content-Type":"text/plain; charset=utf-8"});
    res.end("Forbidden");
    return;
  }

  fs.stat(filePath, (error, stat) => {
    if(error || !stat.isFile()){
      res.writeHead(404, {"Content-Type":"text/plain; charset=utf-8"});
      res.end("Not Found");
      return;
    }

    const extension = path.extname(filePath).toLowerCase();

    res.writeHead(200, {
      "Content-Type":MIME[extension] || "application/octet-stream",
      "Cache-Control":extension === ".html"
        ? "no-store"
        : "no-cache"
    });

    if(req.method === "HEAD"){
      res.end();
      return;
    }

    fs.createReadStream(filePath).pipe(res);
  });
}

const server = http.createServer((req, res) => {
  if(req.method === "POST" && req.url === "/api/check"){
    let body = "";
    let rejected = false;

    req.on("data", chunk => {
      if(rejected) return;
      body += chunk;

      if(Buffer.byteLength(body) > 16 * 1024){
        rejected = true;
        sendJson(res, 413, {error:"Запрос слишком большой"});
        req.destroy();
      }
    });

    req.on("end", async () => {
      if(rejected || res.headersSent) return;

      try{
        const payload = JSON.parse(body || "{}");
        const result = await analyze(payload.url);
        sendJson(res, 200, result);
      }catch(error){
        sendJson(res, 400, {
          error:error && error.message ? error.message : "Ошибка проверки сайта"
        });
      }
    });

    req.on("error", () => {
      if(!res.headersSent){
        sendJson(res, 400, {error:"Некорректный запрос"});
      }
    });

    return;
  }

  if(req.method === "GET" || req.method === "HEAD"){
    serveStatic(req, res);
    return;
  }

  res.writeHead(405, {"Allow":"GET, HEAD, POST"}).end("Method Not Allowed");
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`WebCheck v0.2.1 running on http://localhost:${PORT}`);
});
