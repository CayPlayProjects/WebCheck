"use strict";

function check(key, label, description, status, value, weight=3){
  return {category:"security", key, label, description, status, value, weight};
}

function runSecurityAudit({html="", headers={}, protocol="https:"}={}){
  const source = String(html);
  const csp = String(headers["content-security-policy"] || "");
  const cookies = headers["set-cookie"] || [];
  const cookieLines = Array.isArray(cookies) ? cookies : [cookies];
  const lowerHtml = source.toLowerCase();
  const secure = protocol === "https:";
  const checks = [];
  const recommendations = [];
  const add = (condition, title, text, priority="medium") => {
    if(condition) recommendations.push({title,text,priority});
  };

  const frameAncestors = /(?:^|;)\s*frame-ancestors\s+[^;]+/i.test(csp);
  const xFrame = Boolean(headers["x-frame-options"]);
  checks.push(check(
    "frameProtection","Clickjacking protection",
    "X-Frame-Options or CSP frame-ancestors helps control whether other sites can embed this page.",
    xFrame || frameAncestors ? "pass" : "warn",
    xFrame ? String(headers["x-frame-options"]) : frameAncestors ? "CSP frame-ancestors configured" : "Not configured",4
  ));
  add(!xFrame && !frameAncestors,"Add anti-framing protection",
    "Configure CSP frame-ancestors or X-Frame-Options to reduce clickjacking risk.");

  const permissions = String(headers["permissions-policy"] || "");
  checks.push(check("permissionsPolicy","Permissions-Policy",
    "Controls access to browser features such as camera, microphone and geolocation.",
    permissions ? "pass" : "warn",permissions || "Not configured",3));
  add(!permissions,"Review Permissions-Policy",
    "Set an explicit Permissions-Policy that disables browser features the site does not need.");

  for (const [key, header, label, description] of [
    ["coop","cross-origin-opener-policy","Cross-Origin-Opener-Policy","Helps isolate the browsing context from cross-origin windows."],
    ["coep","cross-origin-embedder-policy","Cross-Origin-Embedder-Policy","Controls which cross-origin resources may be embedded."],
    ["corp","cross-origin-resource-policy","Cross-Origin-Resource-Policy","Controls which origins may load this resource."]
  ]){
    const value = String(headers[header] || "");
    checks.push(check(key,label,description,value ? "pass" : "warn",value || "Not configured",2));
  }

  const cookieCount = cookieLines.filter(Boolean).length;
  let cookiesWithoutSecure = 0;
  let cookiesWithoutHttpOnly = 0;
  let cookiesWithoutSameSite = 0;
  for(const line of cookieLines){
    const parts = String(line).split(";").slice(1).map(part => part.trim().toLowerCase());
    if(secure && !parts.includes("secure")) cookiesWithoutSecure++;
    if(!parts.includes("httponly")) cookiesWithoutHttpOnly++;
    if(!parts.some(part => part.startsWith("samesite="))) cookiesWithoutSameSite++;
  }
  if(cookieCount){
    checks.push(check("cookieSecure","Cookie Secure flag",
      "Session cookies sent over HTTPS should use the Secure attribute.",
      secure && cookiesWithoutSecure === 0 ? "pass" : "warn",
      secure ? `${cookieCount - cookiesWithoutSecure}/${cookieCount} cookies marked Secure` : "Site uses HTTP",4));
    checks.push(check("cookieHttpOnly","Cookie HttpOnly flag",
      "HttpOnly prevents JavaScript from reading cookies that do not need client-side access.",
      cookiesWithoutHttpOnly === 0 ? "pass" : "warn",
      `${cookieCount - cookiesWithoutHttpOnly}/${cookieCount} cookies marked HttpOnly`,3));
    checks.push(check("cookieSameSite","Cookie SameSite attribute",
      "SameSite helps control when browsers attach cookies to cross-site requests.",
      cookiesWithoutSameSite === 0 ? "pass" : "warn",
      `${cookieCount - cookiesWithoutSameSite}/${cookieCount} cookies specify SameSite`,3));
    add(secure && cookiesWithoutSecure > 0,"Review cookie Secure flags",
      `${cookiesWithoutSecure} cookie(s) were missing Secure on an HTTPS site.`);
    add(cookiesWithoutHttpOnly > 0,"Review cookie HttpOnly flags",
      `${cookiesWithoutHttpOnly} cookie(s) were missing HttpOnly. Only add it where client-side access is not required.`);
    add(cookiesWithoutSameSite > 0,"Set explicit SameSite cookie policies",
      `${cookiesWithoutSameSite} cookie(s) did not declare SameSite.`);
  }

  const mixedResources = (source.match(/(?:src|href|poster)\s*=\s*["']http:\/\/[^"']+["']/gi) || []).length;
  checks.push(check("mixedContent","Mixed content",
    "HTTPS pages should avoid loading HTTP resources that browsers may block or downgrade.",
    mixedResources === 0 ? "pass" : "warn",
    mixedResources === 0 ? "No HTTP resource URLs found in markup" : `${mixedResources} HTTP resource URL(s) found`,5));
  add(mixedResources > 0,"Remove mixed content",
    `Found ${mixedResources} HTTP resource URL(s) in the page markup. Serve them over HTTPS.`,"high");

  const insecureForms = [...source.matchAll(/<form\b[^>]*>/gi)].filter(match => {
    const action = (match[0].match(/\baction\s*=\s*["']([^"']*)["']/i) || [,""])[1];
    return /^http:\/\//i.test(action);
  }).length;
  checks.push(check("insecureForms","Insecure form actions",
    "Forms should not submit sensitive data to an unencrypted HTTP endpoint.",
    insecureForms === 0 ? "pass" : "fail",
    insecureForms === 0 ? "No explicit HTTP form actions found" : `${insecureForms} HTTP form action(s) found`,6));
  add(insecureForms > 0,"Fix insecure form destinations",
    `Found ${insecureForms} form(s) submitting to HTTP. Use HTTPS destinations.`,"high");

  const passwordFields = (source.match(/<input\b[^>]*type\s*=\s*["']password["'][^>]*>/gi) || []).length;
  checks.push(check("passwordFormTransport","Password form transport",
    "Password fields on a page served over HTTP expose credentials in transit.",
    passwordFields === 0 || secure ? "pass" : "fail",
    passwordFields === 0 ? "No password fields detected" : secure ? "Password fields detected on HTTPS" : "Password fields detected on HTTP",6));
  add(passwordFields > 0 && !secure,"Protect password forms with HTTPS",
    "A password field was detected on an HTTP page. Serve the page and form over HTTPS.","high");

  const externalScripts = [...source.matchAll(/<script\b[^>]*src\s*=\s*["']https?:\/\/[^"']+["'][^>]*>/gi)];
  const scriptsWithoutIntegrity = externalScripts.filter(match => !/\bintegrity\s*=/.test(match[0])).length;
  checks.push(check("scriptIntegrity","External script integrity",
    "Subresource Integrity can help verify externally hosted scripts have not changed unexpectedly.",
    externalScripts.length === 0 || scriptsWithoutIntegrity === 0 ? "pass" : "warn",
    externalScripts.length === 0 ? "No external scripts detected" : `${scriptsWithoutIntegrity}/${externalScripts.length} external scripts without integrity`,3));
  add(scriptsWithoutIntegrity > 0,"Review external script integrity",
    `${scriptsWithoutIntegrity} external script(s) do not declare an integrity attribute. Consider SRI where supported.`);

  const unsafeCsp = csp && /(?:^|;)\s*script-src[^;]*(?:'unsafe-inline'|'unsafe-eval')/i.test(csp);
  checks.push(check("cspUnsafeDirectives","CSP script directives",
    "Avoid unsafe-inline and unsafe-eval in script-src where the application permits.",
    !unsafeCsp ? "pass" : "warn",
    !csp ? "CSP unavailable; review the CSP header check" : unsafeCsp ? "Potentially permissive script-src directive" : "No unsafe script directive detected",5));
  add(unsafeCsp,"Tighten Content-Security-Policy",
    "The script-src directive includes unsafe-inline or unsafe-eval. Prefer nonces or hashes and remove unsafe directives when possible.","high");

  const serverHeader = String(headers.server || "");
  const poweredBy = String(headers["x-powered-by"] || "");
  checks.push(check("serverDisclosure","Technology disclosure",
    "Unnecessary server and framework version details can make fingerprinting easier.",
    !serverHeader && !poweredBy ? "pass" : "warn",
    [serverHeader && `Server: ${serverHeader}`,poweredBy && `X-Powered-By: ${poweredBy}`].filter(Boolean).join(" | ") || "No identifying headers disclosed",2));
  add(Boolean(serverHeader || poweredBy),"Reduce unnecessary technology disclosure",
    "Review Server and X-Powered-By response headers and avoid exposing detailed version information.");

  return {checks,recommendations};
}

module.exports = {runSecurityAudit};
