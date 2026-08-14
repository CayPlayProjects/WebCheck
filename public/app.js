const $ = (selector, root=document) => root.querySelector(selector);
const $$ = (selector, root=document) => [...root.querySelectorAll(selector)];

const form = $("#checkForm");
const input = $("#urlInput");
const checkButton = $("#checkButton");
const loadingPanel = $("#loadingPanel");
const results = $("#results");
const manifest = $(".manifest");
const loadingUrl = $("#loadingUrl");
const toast = $("#toast");

let lastReport = null;
let toastTimer = null;
let loadingTimer = null;

function showToast(message, isError=false){
  toast.textContent = message;
  toast.classList.toggle("error", isError);
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2400);
}

function normalizeInput(value){
  const raw = String(value || "").trim();
  if(!raw) return "";
  return /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(raw) ? raw : `https://${raw}`;
}

function fmtBytes(bytes){
  if(!Number.isFinite(bytes)) return "—";
  if(bytes < 1024) return `${bytes} B`;
  if(bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function escapeHtml(value){
  return String(value ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function humanStatus(status){
  return status === "pass" ? "OK" : status === "warn" ? "CHECK" : "FAIL";
}

function startLoadingAnimation(){
  const steps = $$(".loading-step");
  let index = 0;
  steps.forEach((step, i) => step.classList.toggle("active", i === 0));
  clearInterval(loadingTimer);
  loadingTimer = setInterval(() => {
    index = Math.min(index + 1, steps.length - 1);
    steps.forEach((step, i) => step.classList.toggle("active", i <= index));
  }, 650);
}

function stopLoadingAnimation(){
  clearInterval(loadingTimer);
  loadingTimer = null;
}

function overallText(score){
  if(score >= 90) return ["A","Отличное техническое состояние. Основные проверки пройдены."];
  if(score >= 75) return ["B","Хорошая база. Остались несколько точечных улучшений."];
  if(score >= 60) return ["C","Рабочее состояние, но часть важных сигналов отсутствует."];
  if(score >= 40) return ["D","Есть заметные SEO или security пробелы, которые стоит исправить."];
  return ["E","Нужна базовая техническая доработка сайта."];
}

function renderReport(data){
  lastReport = data;
  const [grade, description] = overallText(data.score);

  $("#siteHost").textContent = data.host || "Website";
  $("#siteUrl").textContent = data.finalUrl;
  $("#siteUrl").href = data.finalUrl;

  $("#scoreValue").textContent = data.score;
  $("#gradePill").textContent = `GRADE ${grade}`;
  $("#scoreBar").style.width = `${data.score}%`;
  $("#scoreDescription").textContent = description;

  for(const [category, score] of Object.entries(data.categoryScores || {})){
    const card = $(`[data-category="${category}"]`);
    if(!card) continue;
    $("strong", card).textContent = score;
    $("i b", card).style.width = `${score}%`;
  }

  $("#metricStatus").textContent = data.statusCode ?? "—";
  $("#metricStatusHint").textContent = data.statusText || "HTTP response";
  $("#metricTime").textContent = `${data.responseTimeMs} ms`;
  $("#metricSize").textContent = fmtBytes(data.htmlBytes);
  $("#metricRedirects").textContent = data.redirects;

  $("#checksGrid").innerHTML = data.checks.map(check => `
    <article class="check-row ${check.status}">
      <span class="check-status">${check.status === "pass" ? "✓" : check.status === "warn" ? "!" : "×"}</span>
      <span class="check-category">${escapeHtml(check.category)}</span>
      <div class="check-main">
        <strong>${escapeHtml(check.label)}</strong>
        <p>${escapeHtml(check.description)}</p>
      </div>
      <span class="check-value">${escapeHtml(check.value ?? "—")}</span>
    </article>
  `).join("");

  $("#recommendationCount").textContent = data.recommendations.length;
  $("#recommendations").innerHTML = data.recommendations.length
    ? data.recommendations.map((rec, index) => `
      <article class="recommendation">
        <span class="rec-no">${String(index + 1).padStart(2,"0")}</span>
        <div class="rec-copy">
          <strong>${escapeHtml(rec.title)}</strong>
          <p>${escapeHtml(rec.text)}</p>
        </div>
        <span class="rec-priority ${rec.priority}">${rec.priority === "high" ? "IMPORTANT" : "IMPROVE"}</span>
      </article>
    `).join("")
    : `
      <article class="recommendation">
        <span class="rec-no">✓</span>
        <div class="rec-copy">
          <strong>Основных замечаний нет</strong>
          <p>Базовые проверки WebCheck пройдены успешно.</p>
        </div>
        <span class="rec-priority medium">GOOD</span>
      </article>`;

  const details = [
    ["Requested URL", data.requestedUrl],
    ["Final URL", data.finalUrl],
    ["Title", data.meta.title || "—"],
    ["Description", data.meta.description || "—"],
    ["Canonical", data.meta.canonical || "—"],
    ["Language", data.meta.lang || "—"],
    ["H1 count", String(data.meta.h1Count ?? 0)],
    ["Content-Type", data.headers.contentType || "—"],
    ["Server", data.headers.server || "Not disclosed"],
    ["Cache-Control", data.headers.cacheControl || "—"]
  ];

  $("#detailsGrid").innerHTML = details.map(([label,value]) => `
    <div class="detail-row">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
    </div>
  `).join("");

  $("#checkedAt").textContent = `CHECKED ${new Date(data.checkedAt).toLocaleString()}`;

  stopLoadingAnimation();
  loadingPanel.hidden = true;
  manifest.hidden = true;
  results.hidden = false;
  results.scrollIntoView({behavior:"smooth", block:"start"});
}

async function runCheck(rawValue){
  const url = normalizeInput(rawValue);
  if(!url){
    showToast("Введите адрес сайта", true);
    input.focus();
    return;
  }

  checkButton.disabled = true;
  $("span", checkButton).textContent = "SCANNING…";
  results.hidden = true;
  manifest.hidden = true;
  loadingPanel.hidden = false;
  loadingUrl.textContent = url;
  startLoadingAnimation();

  try{
    const response = await fetch("/api/check", {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({url})
    });

    let data;
    try{
      data = await response.json();
    }catch{
      throw new Error("Backend вернул некорректный ответ");
    }

    if(!response.ok){
      throw new Error(data.error || "Не удалось проверить сайт");
    }

    renderReport(data);
  }catch(error){
    stopLoadingAnimation();
    loadingPanel.hidden = true;
    manifest.hidden = false;
    showToast(error.message || "Ошибка проверки", true);
  }finally{
    checkButton.disabled = false;
    $("span", checkButton).textContent = "START SCAN";
  }
}

form.addEventListener("submit", event => {
  event.preventDefault();
  runCheck(input.value);
});

$("#newCheckButton").addEventListener("click", () => {
  results.hidden = true;
  manifest.hidden = false;
  input.value = "";
  window.scrollTo({top:0, behavior:"smooth"});
  setTimeout(() => input.focus(), 300);
});

$("#repeatCheckButton").addEventListener("click", () => {
  if(lastReport) runCheck(lastReport.requestedUrl);
});

$("#copyReportButton").addEventListener("click", async () => {
  if(!lastReport) return;

  const report = [
    `WEB/CHECK — ${lastReport.host}`,
    `Score: ${lastReport.score}/100`,
    `SEO: ${lastReport.categoryScores.seo}/100`,
    `Security: ${lastReport.categoryScores.security}/100`,
    `Social: ${lastReport.categoryScores.social}/100`,
    `Technical: ${lastReport.categoryScores.technical}/100`,
    `URL: ${lastReport.finalUrl}`,
    "",
    ...lastReport.checks.map(c => `${humanStatus(c.status)} | ${c.label}: ${c.value ?? "—"}`),
    "",
    "Recommendations:",
    ...(lastReport.recommendations.length
      ? lastReport.recommendations.map((r,i) => `${i+1}. ${r.title} — ${r.text}`)
      : ["No major recommendations."])
  ].join("\n");

  try{
    await navigator.clipboard.writeText(report);
    showToast("Отчёт скопирован");
  }catch{
    showToast("Браузер не разрешил копирование", true);
  }
});
