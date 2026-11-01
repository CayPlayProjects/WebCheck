"use strict";

const test=require("node:test");
const assert=require("node:assert/strict");
const {runPerformanceAudit}=require("../performance-audit");

test("detects parser-blocking scripts and images without dimensions",()=>{
  const result=runPerformanceAudit({
    html:'<script src="/app.js"></script><img src="/hero.jpg"><img src="/other.jpg" loading="lazy" width="600" height="400">',
    htmlBytes:150000,
    responseTimeMs:2200,
    headers:{}
  });
  assert.equal(result.checks.find(item=>item.key==="blockingScripts").status,"warn");
  assert.equal(result.checks.find(item=>item.key==="imageDimensions").value,"1/2 image(s) missing width or height");
  assert.equal(result.checks.find(item=>item.key==="timeToFirstByte").status,"fail");
});

test("passes compact document with deferred scripts and cache metadata",()=>{
  const result=runPerformanceAudit({
    html:'<script defer src="/app.js"></script><img src="/hero.jpg" alt="Hero" width="800" height="600">',
    htmlBytes:1000,
    responseTimeMs:300,
    headers:{"cache-control":"public, max-age=300"}
  });
  assert.equal(result.checks.find(item=>item.key==="htmlWeight").status,"pass");
  assert.equal(result.checks.find(item=>item.key==="blockingScripts").status,"pass");
  assert.equal(result.checks.find(item=>item.key==="cachePolicy").status,"pass");
});
