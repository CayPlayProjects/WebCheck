"use strict";

const test=require("node:test");
const assert=require("node:assert/strict");
const {
  crawlSite,extractPageLinks,extractSitemapUrls,parseRobotsRules,isAllowedByRobots
}=require("../site-crawler");

test("extracts unique same-origin HTML links and ignores assets, nofollow and external URLs",()=>{
  const html=[
    '<a href="/about">About</a>',
    '<a href="/about#top">About top</a>',
    '<a href="/app.js">Script</a>',
    '<a href="https://other.example/">External</a>',
    '<a href="/private" rel="nofollow">No follow</a>',
    '<a href="mailto:test@example.test">Mail</a>'
  ].join("");
  assert.deepEqual(
    extractPageLinks(html,"https://example.test/",20),
    ["https://example.test/about"]
  );
});

test("parses robots rules and lets a more specific allow rule win",()=>{
  const rules=parseRobotsRules([
    "User-agent: *",
    "Disallow: /private",
    "Allow: /private/public",
    "Disallow: /draft*"
  ].join("\n"));
  assert.equal(isAllowedByRobots("https://example.test/private/page",rules),false);
  assert.equal(isAllowedByRobots("https://example.test/private/public/page",rules),true);
  assert.equal(isAllowedByRobots("https://example.test/draft-one",rules),false);
  assert.equal(isAllowedByRobots("https://example.test/about",rules),true);
});

test("extracts only same-origin URLs from sitemap XML",()=>{
  const xml="<urlset>"+
    "<url><loc>https://example.test/a</loc></url>"+
    "<url><loc>https://other.test/b</loc></url>"+
    "<url><loc>https://example.test/image.jpg</loc></url>"+
    "</urlset>";
  assert.deepEqual(extractSitemapUrls(xml,"https://example.test",10),["https://example.test/a"]);
});

test("crawls pages to a configured depth, observes robots and reports broken pages",async()=>{
  const rootHtml='<a href="/about">About</a><a href="/private/secret">Private</a><a href="/contact">Contact</a>';
  const sitemap="<urlset><url><loc>https://example.test/docs</loc></url></urlset>";
  const fetched=[];
  const result=await crawlSite({
    startUrl:"https://example.test/",
    rootPage:{statusCode:200,html:rootHtml,headers:{"content-type":"text/html"}},
    robotsTxt:"User-agent: *\nDisallow: /private",
    sitemapXml:sitemap,
    maxDepth:2,
    maxPages:5,
    concurrency:2,
    fetchPage:async url=>{
      fetched.push(url);
      if(url.endsWith("/contact")) return {statusCode:404,headers:{"content-type":"text/html"},body:"missing"};
      if(url.endsWith("/about")) return {statusCode:200,finalUrl:url,headers:{"content-type":"text/html"},body:'<title>About</title><a href="/team">Team</a>'};
      return {statusCode:200,finalUrl:url,headers:{"content-type":"text/html"},body:"<title>Page</title>"};
    }
  });
  assert.equal(result.visited,5);
  assert.equal(result.broken,1);
  assert.equal(result.skippedByRobots,1);
  assert.ok(result.pages.some(page=>page.status==="robots-blocked"));
  assert.ok(result.pages.some(page=>page.url==="https://example.test/team"));
  assert.ok(fetched.every(url=>new URL(url).origin==="https://example.test"));
});

test("enforces the page limit and never fetches a cross-origin redirect destination",async()=>{
  const result=await crawlSite({
    startUrl:"https://example.test/",
    rootPage:{statusCode:200,html:'<a href="/a">A</a><a href="/b">B</a><a href="/c">C</a>',headers:{"content-type":"text/html"}},
    maxDepth:3,
    maxPages:2,
    fetchPage:async url=>({statusCode:302,redirectTo:"https://outside.test/landing",headers:{"content-type":"text/html"},body:""})
  });
  assert.ok(result.visited<=2);
  assert.ok(result.pages.some(page=>page.status==="external-redirect"));
});
