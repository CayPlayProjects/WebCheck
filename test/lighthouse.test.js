"use strict";

const test=require("node:test");
const assert=require("node:assert/strict");
const {parseLighthouseResponse}=require("../lighthouse");

test("parses Lighthouse category scores, lab metrics and opportunities",()=>{
  const result=parseLighthouseResponse({
    id:"https://example.test/",
    lighthouseResult:{
      finalUrl:"https://example.test/",
      lighthouseVersion:"12.0.0",
      fetchTime:"2026-11-01T12:00:00Z",
      configSettings:{emulatedFormFactor:"mobile"},
      categories:{
        performance:{score:0.83,auditRefs:[{id:"unused-css-rules",weight:1}]},
        accessibility:{score:0.96,auditRefs:[]},
        "best-practices":{score:1,auditRefs:[]},
        seo:{score:0.91,auditRefs:[]}
      },
      audits:{
        "first-contentful-paint":{displayValue:"1.2 s",numericValue:1200},
        "largest-contentful-paint":{displayValue:"2.3 s",numericValue:2300},
        "cumulative-layout-shift":{displayValue:"0.04",numericValue:0.04},
        "unused-css-rules":{
          title:"Reduce unused CSS",
          description:"Remove CSS that is not needed for the current page.",
          score:0.4,
          displayValue:"Potential savings of 120 KiB",
          details:{type:"opportunity",overallSavingsMs:500,overallSavingsBytes:120000}
        }
      },
      runWarnings:["Sample warning"]
    }
  });
  assert.equal(result.scores.performance,83);
  assert.equal(result.scores.accessibility,96);
  assert.equal(result.scores.bestPractices,100);
  assert.equal(result.metrics.lcp.value,"2.3 s");
  assert.equal(result.opportunities[0].savingsMs,500);
  assert.deepEqual(result.warnings,["Sample warning"]);
});

test("rejects payloads without a Lighthouse result",()=>{
  assert.throws(()=>parseLighthouseResponse({}),/did not return a Lighthouse report/);
});
