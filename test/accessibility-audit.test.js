"use strict";

const test=require("node:test");
const assert=require("node:assert/strict");
const {runAccessibilityAudit}=require("../accessibility-audit");

test("detects missing alt text, duplicate IDs and unlabeled controls",()=>{
  const html='<main><img src="/a.jpg"><img src="/b.jpg" alt="">'+
    '<input id="email"><input id="email"><button></button>'+
    '<a href="/empty"><img src="/icon.svg"></a></main>';
  const result=runAccessibilityAudit({html});
  assert.equal(result.checks.find(item=>item.key==="imageAlt").status,"warn");
  assert.equal(result.checks.find(item=>item.key==="uniqueIds").status,"fail");
  assert.equal(result.checks.find(item=>item.key==="formLabels").status,"warn");
  assert.equal(result.checks.find(item=>item.key==="buttonNames").status,"warn");
  assert.equal(result.checks.find(item=>item.key==="mainLandmark").status,"pass");
});

test("recognizes controls wrapped in labels and accessible names",()=>{
  const html='<main><label>Email <input type="email"></label>'+
    '<button aria-label="Open menu"></button><a href="/profile" aria-label="Profile"></a></main>';
  const result=runAccessibilityAudit({html});
  assert.equal(result.checks.find(item=>item.key==="formLabels").status,"pass");
  assert.equal(result.checks.find(item=>item.key==="buttonNames").status,"pass");
  assert.equal(result.checks.find(item=>item.key==="linkNames").status,"pass");
});
