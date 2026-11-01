"use strict";

const test=require("node:test");
const assert=require("node:assert/strict");
const {extractInternalLinks,crawlInternalLinks}=require("../link-audit");

test("extracts unique same-origin links only",()=>{
  const html='<a href="/about">About</a><a href="/about#top">About top</a>'+
    '<a href="https://elsewhere.test/">External</a><a href="mailto:a@example.test">Mail</a>'+
    '<a href="/contact">Contact</a>';
  const urls=extractInternalLinks(html,"https://example.test/",8);
  assert.deepEqual(urls,["https://example.test/about","https://example.test/contact"]);
});

test("checks a bounded sample and counts broken links",async()=>{
  let calls=0;
  const result=await crawlInternalLinks(
    '<a href="/ok">OK</a><a href="/missing">Missing</a><a href="https://other.test/">Other</a>',
    "https://example.test/",
    async url=>{
      calls++;
      return {statusCode:url.endsWith("/missing")?404:200,statusText:"test"};
    },
    {limit:2,concurrency:2}
  );
  assert.equal(calls,2);
  assert.equal(result.checked,2);
  assert.equal(result.broken,1);
});
