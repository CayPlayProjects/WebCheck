"use strict";

const {parseAttributes}=require("./seo-audit");

function runPerformanceAudit({html="",htmlBytes=0,responseTimeMs=0,headers={}}={}){
  const source=String(html);
  const checks=[];
  const recommendations=[];
  const addCheck=(key,label,description,status,value,weight=3)=>{
    checks.push({category:"performance",key,label,description,status,value,weight});
  };
  const add=(condition,title,text,priority="medium")=>{
    if(condition) recommendations.push({title,text,priority});
  };

  const images=[...source.matchAll(/<img\b[^>]*>/gi)];
  const scripts=[...source.matchAll(/<script\b[^>]*>/gi)];
  const blockingScripts=scripts.filter(match=>!/\b(?:async|defer)\b/i.test(match[0])&&!/\btype\s*=\s*["']module["']/i.test(match[0]));
  const stylesheets=[...source.matchAll(/<link\b[^>]*>/gi)]
    .filter(match=>/\brel\s*=\s*["'][^"']*\bstylesheet\b/i.test(match[0])&&!/\bmedia\s*=\s*["']print["']/i.test(match[0]));
  const imageResources=images.filter(match=>Boolean(parseAttributes(match[0]).src)).length;
  const scriptResources=scripts.filter(match=>Boolean(parseAttributes(match[0]).src)).length;
  const stylesheetResources=stylesheets.filter(match=>Boolean(parseAttributes(match[0]).href)).length;
  const resourceCount=imageResources+scriptResources+stylesheetResources;
  const lazyImages=images.filter(match=>/\bloading\s*=\s*["']lazy["']/i.test(match[0])).length;
  const dimensionlessImages=images.filter(match=>!/\bwidth\s*=/.test(match[0])||!/\bheight\s*=/.test(match[0])).length;

  addCheck("htmlWeight","HTML document size","Large HTML documents take longer to transfer and parse.",
    htmlBytes<=100*1024?"pass":htmlBytes<=500*1024?"warn":"fail",(htmlBytes/1024).toFixed(1)+" KB",5);
  add(htmlBytes>500*1024,"Reduce HTML document size",
    "The HTML document is larger than 500 KB. Consider reducing inline markup and deferring non-critical content.","high");
  add(htmlBytes>100*1024&&htmlBytes<=500*1024,"Review HTML document size",
    "The HTML document is larger than 100 KB. Check whether large inline data or duplicated markup can be reduced.");

  addCheck("timeToFirstByte","Time to first byte (TTFB)","Measures time until the first HTTP response headers arrive.",
    responseTimeMs<=800?"pass":responseTimeMs<=1800?"warn":"fail",Math.round(responseTimeMs)+" ms",6);
  add(responseTimeMs>1800,"Improve server response time",
    "The initial server response is slow. Review hosting latency, backend work, caching and database queries.","high");

  addCheck("resourceCount","Initial resource count","Counts images, scripts and stylesheet references in the HTML.",
    resourceCount<=40?"pass":resourceCount<=80?"warn":"fail",resourceCount+" resource reference(s)",3);
  add(resourceCount>80,"Reduce initial resource count",
    "The page references "+resourceCount+" images, scripts and stylesheets. Reduce unnecessary requests or defer non-critical resources.");

  addCheck("blockingScripts","Parser-blocking scripts","Scripts without async/defer can delay HTML parsing.",
    blockingScripts.length===0?"pass":"warn",blockingScripts.length+" blocking script tag(s)",4);
  add(blockingScripts.length>0,"Defer non-critical JavaScript",
    blockingScripts.length+" script tag(s) do not use async, defer or type=module. Review whether they can be deferred.");

  addCheck("lazyImages","Lazy-loaded images","Below-the-fold images can use loading=lazy to avoid competing with visible content.",
    images.length===0||lazyImages>=Math.ceil(images.length/2)?"pass":"warn",lazyImages+"/"+images.length+" image(s) marked lazy",3);
  add(images.length>2&&lazyImages<Math.ceil(images.length/2),"Lazy-load offscreen images",
    "Several images do not declare loading=lazy. Use it for below-the-fold images; keep the main hero image eager.");

  addCheck("imageDimensions","Image dimensions","Explicit image dimensions help browsers reserve layout space and reduce layout shifts.",
    dimensionlessImages===0?"pass":"warn",dimensionlessImages+"/"+images.length+" image(s) missing width or height",3);
  add(dimensionlessImages>0,"Set image dimensions",
    dimensionlessImages+" image(s) do not declare both width and height. Add intrinsic dimensions to reduce layout shifts.");

  const cacheControl=String(headers["cache-control"]||"");
  const hasCachePolicy=Boolean(cacheControl||headers.expires);
  addCheck("cachePolicy","Cache policy header","Cache headers help browsers and CDNs reuse suitable responses.",
    hasCachePolicy?"pass":"warn",cacheControl||(headers.expires?"Expires: "+headers.expires:"No cache policy header"),2);
  add(!hasCachePolicy,"Review cache policy",
    "No Cache-Control or Expires header was observed on the main HTML response. Configure caching according to whether the page is static or personalized.");

  return {checks,recommendations,metrics:{resourceCount,images:images.length,scripts:scripts.length,stylesheets:stylesheets.length,blockingScripts:blockingScripts.length,lazyImages}};
}

module.exports={runPerformanceAudit};
