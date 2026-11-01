"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {runSecurityAudit} = require("../security-audit");

test("detects mixed content and insecure form actions", () => {
  const result = runSecurityAudit({
    protocol:"https:",
    html:'<img src="http://assets.example.test/image.png"><form action="http://example.test/login"></form>'
  });
  assert.equal(result.checks.find(item => item.key === "mixedContent").status, "warn");
  assert.equal(result.checks.find(item => item.key === "insecureForms").status, "fail");
  assert.ok(result.recommendations.some(item => item.title === "Remove mixed content"));
});

test("detects password fields on an HTTP page", () => {
  const result = runSecurityAudit({
    protocol:"http:",
    html:'<form><input type="password" name="password"></form>'
  });
  assert.equal(result.checks.find(item => item.key === "passwordFormTransport").status, "fail");
});

test("recognizes secure cookie attributes and framing protection", () => {
  const result = runSecurityAudit({
    protocol:"https:",
    headers:{
      "set-cookie":[
        "session=abc; Secure; HttpOnly; SameSite=Lax"
      ],
      "content-security-policy":"default-src 'self'; frame-ancestors 'none'"
    },
    html:"<html><body>Safe sample</body></html>"
  });
  assert.equal(result.checks.find(item => item.key === "cookieSecure").status, "pass");
  assert.equal(result.checks.find(item => item.key === "cookieHttpOnly").status, "pass");
  assert.equal(result.checks.find(item => item.key === "cookieSameSite").status, "pass");
  assert.equal(result.checks.find(item => item.key === "frameProtection").status, "pass");
});

test("flags unsafe CSP script directives", () => {
  const result = runSecurityAudit({
    protocol:"https:",
    headers:{"content-security-policy":"default-src 'self'; script-src 'self' 'unsafe-inline'"},
    html:"<html></html>"
  });
  assert.equal(result.checks.find(item => item.key === "cspUnsafeDirectives").status, "warn");
});

test("does not flag a page without cookies or external scripts as insecure", () => {
  const result = runSecurityAudit({
    protocol:"https:",
    headers:{"content-security-policy":"default-src 'self'"},
    html:"<html><body>Static content</body></html>"
  });
  assert.equal(result.checks.some(item => item.key === "cookieSecure"), false);
  assert.equal(result.checks.find(item => item.key === "scriptIntegrity").status, "pass");
});
