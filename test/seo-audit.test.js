"use strict";

const test=require("node:test");
const assert=require("node:assert/strict");
const {runSeoAudit,parseAttributes}=require("../seo-audit");

test("parses HTML attributes regardless of attribute order",()=>{
  const attrs=parseAttributes('<meta content="sample" name="description" data-test=yes>');
  assert.equal(attrs.content,"sample");
  assert.equal(attrs.name,"description");
  assert.equal(attrs["data-test"],"yes");
});

test("recognizes valid SEO metadata and structured data",()=>{
  const html='<title>A descriptive page title with a useful phrase</title>'+
    '<meta name="description" content="A useful page description that explains what visitors can expect from this page and gives a clear summary.">'+
    '<meta name="robots" content="index, follow">'+
    '<link rel="canonical" href="https://example.test/page">'+
    '<link rel="alternate" hreflang="en" href="https://example.test/en/page">'+
    '<h1>Page</h1><h2>Section</h2>'+
    '<script type="application/ld+json">{"@context":"https://schema.org","@type":"WebPage"}</script>'+
    '<meta name="twitter:card" content="summary_large_image">';
  const result=runSeoAudit({html,finalUrl:"https://example.test/page"});
  assert.equal(result.checks.find(item=>item.key==="canonicalConsistency").status,"pass");
  assert.equal(result.checks.find(item=>item.key==="structuredData").status,"pass");
  assert.equal(result.checks.find(item=>item.key==="twitterCard").status,"pass");
  assert.equal(result.checks.find(item=>item.key==="hreflang").status,"pass");
});

test("warns about noindex, invalid JSON-LD and canonical mismatch",()=>{
  const html='<meta name="robots" content="noindex, nofollow">'+
    '<link rel="canonical" href="https://other.test/">'+
    '<script type="application/ld+json">{invalid}</script>';
  const result=runSeoAudit({html,finalUrl:"https://example.test/"});
  assert.equal(result.checks.find(item=>item.key==="robotsMeta").status,"warn");
  assert.equal(result.checks.find(item=>item.key==="canonicalConsistency").status,"warn");
  assert.equal(result.checks.find(item=>item.key==="structuredData").status,"warn");
  assert.ok(result.recommendations.some(item=>item.priority==="high"));
});

test("detects skipped heading levels",()=>{
  const result=runSeoAudit({html:"<h1>Title</h1><h3>Subsection</h3>",finalUrl:"https://example.test/"});
  assert.equal(result.checks.find(item=>item.key==="headingHierarchy").status,"warn");
});
