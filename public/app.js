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
let historyStore = null;

try{
  if(window.WebCheckHistory&&window.localStorage){
    historyStore=window.WebCheckHistory.createHistoryStore(window.localStorage);
  }
}catch{
  historyStore=null;
}

function showToast(message, isError=false){
  toast.textContent = message;
  toast.classList.toggle("error", isError);
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2400);
}

function renderHistoryList(){
  const list=$("#historyList");
  const empty=$("#historyEmpty");
  if(!list||!empty) return;
  const entries=historyStore?historyStore.list():[];
  $("#historyCount").textContent=`${entries.length} / 8`;
  empty.hidden=entries.length>0;
  list.innerHTML=entries.map(entry=>{
    const report=entry.report;
    const date=new Date(report.checkedAt||entry.savedAt);
    const dateText=Number.isNaN(date.getTime())?entry.savedAt:date.toLocaleString();
    return `
      <article class="history-row">
        <div class="history-host">
          <strong>${escapeHtml(report.host)}</strong>
          <span>${escapeHtml(dateText)}</span>
        </div>
        <div class="history-score score-${Number(report.score)>=75?"good":Number(report.score)>=50?"medium":"low"}">
          <strong>${Number(report.score)||0}</strong><small>/100</small>
        </div>
        <div class="history-actions">
          <button type="button" data-history-action="open" data-entry-id="${escapeHtml(entry.id)}">OPEN</button>
          <button type="button" data-history-action="delete" data-entry-id="${escapeHtml(entry.id)}" aria-label="Delete ${escapeHtml(report.host)} history entry">×</button>
        </div>
      </article>`;
  }).join("");
}

function previousReportFor(data,historyEntryId){
  if(!historyStore) return null;
  const entries=historyStore.list();
  let candidates=entries;
  if(historyEntryId){
    const index=entries.findIndex(item=>item.id===historyEntryId);
    candidates=index>=0?entries.slice(index+1):[];
  }
  const host=String(data.host||"").toLowerCase();
  return candidates.find(item=>String(item.report.host||"").toLowerCase()===host)?.report||null;
}

function renderComparison(current,previous){
  const section=$("#comparisonSection");
  if(!section) return;
  if(!previous||!window.WebCheckHistory){
    section.hidden=true;
    return;
  }
  const comparison=window.WebCheckHistory.compareReports(current,previous);
  const delta=comparison.scoreDelta;
  const deltaClass=delta>0?"improved":delta<0?"worsened":"unchanged";
  const deltaLabel=(delta>0?"+":"")+delta;
  $("#comparisonSummary").innerHTML=`
    <div class="comparison-score">
      <span>OVERALL SCORE</span>
      <strong>${comparison.currentScore}</strong>
      <small>was ${comparison.previousScore}</small>
    </div>
    <div class="comparison-delta ${deltaClass}">
      <strong>${escapeHtml(deltaLabel)}</strong>
      <span>${delta>0?"points improved":delta<0?"points lower":"no score change"}</span>
    </div>
    <div class="comparison-broken">
      <span>BROKEN PAGES</span>
      <strong>${comparison.brokenPagesDelta>0?"+":""}${comparison.brokenPagesDelta}</strong>
      <small>change since last scan</small>
    </div>`;
  $("#comparisonCategories").innerHTML=Object.entries(comparison.categories).map(([name,item])=>`
    <div class="comparison-category">
      <span>${escapeHtml(name.toUpperCase())}</span>
      <strong>${item.current===null?"—":item.current}</strong>
      <small class="${item.delta>0?"improved":item.delta<0?"worsened":"unchanged"}">${item.delta===null?"—":(item.delta>0?"+":"")+item.delta}</small>
    </div>`).join("");
  const labels={improved:"IMPROVED",worsened:"REGRESSED",new:"NEW",resolved:"REMOVED",changed:"CHANGED"};
  $("#comparisonChanges").innerHTML=comparison.changes.length
    ? comparison.changes.map(item=>`
      <div class="comparison-change ${escapeHtml(item.state)}">
        <span>${escapeHtml(labels[item.state]||item.state.toUpperCase())}</span>
        <strong>${escapeHtml(item.label)}</strong>
        <small>${escapeHtml(item.previous||"—")} → ${escapeHtml(item.current||"—")}</small>
      </div>`).join("")
    : '<p class="comparison-empty">No checklist status changes since the previous saved scan.</p>';
  section.hidden=false;
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

function renderReport(data,{historyEntryId=null,saveToHistory=false}={}){
  lastReport = data;
  const previousReport=previousReportFor(data,historyEntryId);
  if(saveToHistory&&historyStore){
    const saved=historyStore.save(data);
    if(!saved.saved) showToast("History could not be saved in this browser",true);
    renderHistoryList();
  }
  renderComparison(data,previousReport);
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

  const siteCrawl = data.siteCrawl || null;
  const crawlPages = siteCrawl?.pages || [];
  const crawlStats = siteCrawl ? [
    ["PAGES SCANNED", siteCrawl.visited],
    ["DISCOVERED", siteCrawl.discovered],
    ["BROKEN", siteCrawl.broken],
    ["REDIRECTS", siteCrawl.redirects],
    ["ROBOTS SKIPPED", siteCrawl.skippedByRobots],
    ["SEO WARNINGS", siteCrawl.pagesWithSeoWarnings]
  ] : [];
  $("#crawlerStats").innerHTML = crawlStats.map(([label,value]) => `
    <div class="crawler-stat"><span>${escapeHtml(label)}</span><strong>${Number(value)||0}</strong></div>
  `).join("");

  const crawlStatusLabels = {
    root:"ROOT", ok:"OK", broken:"BROKEN", blocked:"BLOCKED", redirect:"REDIRECT",
    "external-redirect":"EXTERNAL REDIRECT", unverified:"UNVERIFIED",
    "robots-blocked":"ROBOTS BLOCKED"
  };
  $("#linkAuditGrid").innerHTML = crawlPages.length
    ? crawlPages.map(item => `
      <article class="link-audit-row ${escapeHtml(item.status)}">
        <span class="link-audit-status">${escapeHtml(crawlStatusLabels[item.status] || item.status.toUpperCase())} · D${Number(item.depth)||0}</span>
        <div class="crawl-page-copy">
          <a href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.url)}</a>
          <small>${escapeHtml(item.title || item.error || "")}</small>
        </div>
        <span class="link-audit-code">${item.statusCode || "—"} ${escapeHtml(item.statusText || "")}</span>
      </article>
    `).join("")
    : '<p class="link-audit-empty">No pages were crawled.</p>';

  const lighthouseSection = $("#lighthouseSection");
  const lighthouseContent = $("#lighthouseContent");
  const lighthouse = data.lighthouse;
  lighthouseSection.hidden = !lighthouse;
  if(lighthouse?.status === "error"){
    lighthouseContent.innerHTML = `
      <div class="lighthouse-error">
        <strong>Lighthouse could not complete</strong>
        <p>${escapeHtml(lighthouse.error || "The PageSpeed service did not return a report.")}</p>
        <small>The regular WebCheck report is still available. You can try Lighthouse again separately.</small>
      </div>`;
  }else if(lighthouse?.status === "completed"){
    const lighthouseNames = {
      performance:"Performance",
      accessibility:"Accessibility",
      bestPractices:"Best Practices",
      seo:"SEO"
    };
    const scoreCards = Object.entries(lighthouse.scores || {}).map(([key,value]) => `
      <article class="lighthouse-score-card">
        <span>${escapeHtml(lighthouseNames[key] || key)}</span>
        <strong>${value===null ? "—" : value}</strong>
        <i><b style="width:${value===null?0:value}%"></b></i>
      </article>
    `).join("");
    const metricCards = Object.entries(lighthouse.metrics || {}).map(([key,item]) => `
      <article class="lighthouse-metric">
        <span>${escapeHtml(item.label)}</span>
        <strong>${escapeHtml(item.value)}</strong>
      </article>
    `).join("");
    const opportunities = (lighthouse.opportunities || []).map(item => `
      <article class="lighthouse-opportunity">
        <div>
          <strong>${escapeHtml(item.title)}</strong>
          <p>${escapeHtml(item.description)}</p>
        </div>
        <span>${item.savingsMs ? Math.round(item.savingsMs/100)/10 + " s" : escapeHtml(item.displayValue || "Review")}</span>
      </article>
    `).join("");
    const warnings = (lighthouse.warnings || []).length
      ? `<div class="lighthouse-warnings"><strong>Run warnings</strong><ul>${lighthouse.warnings.map(item=>`<li>${escapeHtml(item)}</li>`).join("")}</ul></div>`
      : "";
    lighthouseContent.innerHTML = `
      <div class="lighthouse-meta">${escapeHtml(lighthouse.provider || "Google PageSpeed Insights")} · ${escapeHtml(lighthouse.strategy || "")} · Lighthouse ${escapeHtml(lighthouse.lighthouseVersion || "—")}</div>
      <div class="lighthouse-score-grid">${scoreCards}</div>
      <div class="lighthouse-metric-grid">${metricCards}</div>
      <div class="lighthouse-opportunities">
        <h4>Largest improvement opportunities</h4>
        ${opportunities || '<p class="link-audit-empty">No high-impact opportunities were returned.</p>'}
      </div>
      ${warnings}
      <p class="lighthouse-disclaimer">Lab measurements are simulated in Google's analysis environment. They can vary between runs and are not field data from your visitors.</p>`;
  }

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
    ["Title length", String(data.meta.title || "").length + " characters"],
    ["Robots directive", data.meta.robots || "—"],
    ["Canonical", data.meta.canonical || "—"],
    ["TLS protocol", data.headers.tls?.protocol || "—"],
    ["TLS certificate expiry", data.headers.tls?.validTo || "—"],
    ["Internal links checked", String(data.linkAudit?.checked ?? 0)],
    ["Broken internal links", String(data.linkAudit?.broken ?? 0)],
    ["Pages crawled", String(data.siteCrawl?.visited ?? 0)],
    ["Crawler depth", String(data.siteCrawl?.maxDepth ?? "—")],
    ["Robots skipped", String(data.siteCrawl?.skippedByRobots ?? 0)],
    ["Lighthouse mode", data.lighthouse?.strategy || "Not run"],
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
  $("#historyPanel").hidden = true;
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
      body:JSON.stringify({
        url,
        crawl:{
          depth:Number($("#crawlDepth").value)||2,
          maxPages:Number($("#crawlPages").value)||10
        },
        lighthouse:{
          enabled:$("#lighthouseEnabled").checked,
          strategy:$("#lighthouseStrategy").value
        },
        locale:document.documentElement.lang==="en" ? "en" : "ru"
      })
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

    renderReport(data,{saveToHistory:true});
  }catch(error){
    stopLoadingAnimation();
    loadingPanel.hidden = true;
    manifest.hidden = false;
    $("#historyPanel").hidden = false;
    showToast(error.message || "Ошибка проверки", true);
  }finally{
    checkButton.disabled = false;
    $("span", checkButton).textContent = "START SCAN";
  }
}

$("#lighthouseEnabled").addEventListener("change", () => {
  $("#lighthouseStrategyWrap").hidden = !$("#lighthouseEnabled").checked;
});

form.addEventListener("submit", event => {
  event.preventDefault();
  runCheck(input.value);
});

$("#newCheckButton").addEventListener("click", () => {
  results.hidden = true;
  manifest.hidden = false;
  $("#historyPanel").hidden = false;
  renderHistoryList();
  input.value = "";
  window.scrollTo({top:0, behavior:"smooth"});
  setTimeout(() => input.focus(), 300);
});

$("#historyList").addEventListener("click", event=>{
  const button=event.target.closest("button[data-history-action]");
  if(!button||!historyStore) return;
  const entry=historyStore.list().find(item=>item.id===button.dataset.entryId);
  if(!entry) return;

  if(button.dataset.historyAction==="open"){
    input.value=entry.report.requestedUrl||entry.report.finalUrl||"";
    renderReport(entry.report,{historyEntryId:entry.id});
    return;
  }
  if(button.dataset.historyAction==="delete"){
    historyStore.remove(entry.id);
    renderHistoryList();
    showToast("History entry deleted");
  }
});

$("#clearHistoryButton").addEventListener("click",()=>{
  if(!historyStore) return;
  if(!window.confirm("Clear all saved WebCheck reports from this browser?")) return;
  historyStore.clear();
  renderHistoryList();
  showToast("History cleared");
});

renderHistoryList();

$("#repeatCheckButton").addEventListener("click", () => {
  if(lastReport) runCheck(lastReport.requestedUrl);
});

$("#downloadJsonButton").addEventListener("click", () => {
  if(!lastReport) return;
  const blob = new Blob([JSON.stringify(lastReport, null, 2)], {type:"application/json"});
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const safeHost = String(lastReport.host || "website").replace(/[^a-z0-9.-]/gi, "-");
  link.href = objectUrl;
  link.download = "webcheck-" + safeHost + "-" + new Date().toISOString().slice(0,10) + ".json";
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  showToast("JSON report downloaded");
});

$("#printReportButton").addEventListener("click", () => {
  if(!lastReport) return;
  const details = $(".raw-details");
  if(details) details.open = true;
  window.print();
});

window.addEventListener("afterprint", () => {
  const details = $(".raw-details");
  if(details) details.open = false;
});

$("#copyReportButton").addEventListener("click", async () => {
  if(!lastReport) return;

  const report = [
    `WEB/CHECK — ${lastReport.host}`,
    `Score: ${lastReport.score}/100`,
    ...Object.entries(lastReport.categoryScores || {}).map(([name, value]) => name.toUpperCase() + ": " + value + "/100"),
    `URL: ${lastReport.finalUrl}`,
    "",
    ...lastReport.checks.map(c => `${humanStatus(c.status)} | ${c.category.toUpperCase()} | ${c.label}: ${c.value ?? "—"}`),
    "",
    "Internal links:",
    ...(lastReport.siteCrawl?.pages || []).map(page => page.status.toUpperCase() + " | depth " + page.depth + " | " + page.statusCode + " | " + page.url),
    "",
    "Lighthouse:",
    ...(lastReport.lighthouse?.status === "completed" ? Object.entries(lastReport.lighthouse.scores || {}).map(([name,value]) => name + ": " + value) : [lastReport.lighthouse?.error || "Not run"]),
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
