"use strict";

const {parseAttributes}=require("./seo-audit");

function extractInternalLinks(html,baseUrl,limit=8){
  const base=new URL(baseUrl);
  const matches=[...String(html).matchAll(/<a\b[^>]*>/gi)];
  const seen=new Set();
  const links=[];
  for(const match of matches){
    const attrs=parseAttributes(match[0]);
    const href=String(attrs.href||"").trim();
    if(!href||/^(?:#|mailto:|tel:|javascript:|data:)/i.test(href)) continue;
    try{
      const candidate=new URL(href,base);
      if(!["http:","https:"].includes(candidate.protocol)||candidate.origin!==base.origin) continue;
      candidate.hash="";
      const normalized=candidate.toString();
      if(seen.has(normalized)) continue;
      seen.add(normalized);
      links.push(normalized);
      if(links.length>=limit) break;
    }catch{
      // Invalid link URLs are ignored by the crawler.
    }
  }
  return links;
}

async function crawlInternalLinks(html,baseUrl,probe,{limit=8,concurrency=3}={}){
  const urls=extractInternalLinks(html,baseUrl,limit);
  const results=new Array(urls.length);
  let cursor=0;
  const workers=Array.from({length:Math.min(concurrency,urls.length)},async()=>{
    while(true){
      const index=cursor++;
      if(index>=urls.length) return;
      try{
        const result=await probe(urls[index]);
        results[index]={
          url:urls[index],
          statusCode:Number(result.statusCode)||0,
          statusText:result.statusText||"",
          redirectTo:result.redirectTo||"",
          status:result.status==="blocked"?"blocked":
            Number(result.statusCode)>=400?"broken":
            Number(result.statusCode)>=300?"redirect":"ok"
        };
      }catch(error){
        results[index]={url:urls[index],statusCode:0,statusText:error.message||"Request failed",status:"unverified"};
      }
    }
  });
  await Promise.all(workers);
  return {
    checked:results.length,
    broken:results.filter(item=>item.status==="broken").length,
    redirects:results.filter(item=>item.status==="redirect").length,
    unverified:results.filter(item=>item.status==="blocked"||item.status==="unverified").length,
    results
  };
}

module.exports={extractInternalLinks,crawlInternalLinks};
