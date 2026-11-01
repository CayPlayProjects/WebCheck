"use strict";

const {parseAttributes}=require("./seo-audit");

function decodeXml(value){
  return String(value||"")
    .replace(/&amp;/gi,"&")
    .replace(/&lt;/gi,"<")
    .replace(/&gt;/gi,">")
    .replace(/&quot;/gi,'"')
    .replace(/&#39;|&apos;/gi,"'");
}

function normalizeInternalUrl(value,origin){
  try{
    const url=new URL(value,origin);
    if(!["http:","https:"].includes(url.protocol)) return null;
    if(url.origin!==origin) return null;
    if(url.username||url.password) return null;
    url.hash="";
    if(url.pathname.length>1800) return null;
    return url.toString();
  }catch{
    return null;
  }
}

function isLikelyHtmlPage(url){
  try{
    const pathname=new URL(url).pathname.toLowerCase();
    return !/\.(?:7z|avi|bin|bmp|css|csv|docx?|eot|gif|gz|ico|jpe?g|js|json|map|m4a|m4v|mov|mp[34]|pdf|png|pptx?|rar|rss|svg|tar|tiff?|ttf|txt|wav|webm|webp|woff2?|xlsx?|xml|zip)$/i.test(pathname);
  }catch{
    return false;
  }
}

function extractPageLinks(html,baseUrl,limit=500){
  const base=new URL(baseUrl);
  const tags=String(html).match(/<a(?:\s|>)[^>]*>/gi)||[];
  const seen=new Set();
  const links=[];
  for(const tag of tags){
    const attrs=parseAttributes(tag);
    const rel=String(attrs.rel||"").toLowerCase().split(/\s+/);
    if(rel.includes("nofollow")) continue;
    const href=String(attrs.href||"").trim();
    if(!href||/^(?:#|mailto:|tel:|javascript:|data:|blob:)/i.test(href)) continue;
    const normalized=normalizeInternalUrl(href,base.origin);
    if(!normalized||!isLikelyHtmlPage(normalized)||seen.has(normalized)) continue;
    seen.add(normalized);
    links.push(normalized);
    if(links.length>=limit) break;
  }
  return links;
}

function parseRobotsRules(robotsTxt){
  const groups=[];
  let agents=[];
  let directives=[];
  const flush=()=>{
    if(agents.length) groups.push({agents:[...agents],directives:[...directives]});
    agents=[];
    directives=[];
  };

  for(const rawLine of String(robotsTxt||"").split(/\r?\n/)){
    const line=rawLine.split("#",1)[0].trim();
    if(!line) continue;
    const separator=line.indexOf(":");
    if(separator<0) continue;
    const name=line.slice(0,separator).trim().toLowerCase();
    const value=line.slice(separator+1).trim();
    if(name==="user-agent"){
      if(directives.length) flush();
      agents.push(value.toLowerCase());
    }else if(["allow","disallow"].includes(name)){
      if(agents.length&&value) directives.push({type:name,path:value});
    }
  }
  flush();

  const specific=groups.filter(group=>group.agents.some(agent=>agent==="webcheck"));
  const wildcard=groups.filter(group=>group.agents.includes("*"));
  const selected=specific.length?specific:wildcard;
  return selected.flatMap(group=>group.directives);
}

function robotsPatternMatches(pattern,path){
  const escaped=pattern.replace(/[.+?^$()|[\]\\{}]/g,"\\$&").replace(/\*/g,".*");
  const anchored=pattern.endsWith("$");
  try{
    return new RegExp("^"+escaped+(anchored?"$":"")).test(path);
  }catch{
    return false;
  }
}

function isAllowedByRobots(urlValue,rules){
  let path;
  try{
    const url=new URL(urlValue);
    path=url.pathname+url.search;
  }catch{
    return false;
  }
  let bestLength=-1;
  let bestType="allow";
  for(const rule of rules||[]){
    if(!robotsPatternMatches(rule.path,path)) continue;
    const length=rule.path.replace(/\*/g,"").replace(/\$$/,"").length;
    if(length>bestLength||(length===bestLength&&rule.type==="allow")){
      bestLength=length;
      bestType=rule.type;
    }
  }
  return bestType!=="disallow";
}

function extractSitemapUrls(xml,origin,limit=1000){
  const urls=[];
  const seen=new Set();
  const matches=String(xml||"").matchAll(/<loc\b[^>]*>([\s\S]*?)<\/loc>/gi);
  for(const match of matches){
    const normalized=normalizeInternalUrl(decodeXml(match[1].trim()),origin);
    if(!normalized||!isLikelyHtmlPage(normalized)||seen.has(normalized)) continue;
    seen.add(normalized);
    urls.push(normalized);
    if(urls.length>=limit) break;
  }
  return urls;
}

function pageTitle(html){
  const match=String(html||"").match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  return match?match[1].replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim().slice(0,180):"";
}

async function crawlSite({
  startUrl,rootPage,fetchPage,maxDepth=2,maxPages=10,concurrency=3,robotsTxt="",sitemapXml=""
}={}){
  if(typeof fetchPage!=="function") throw new TypeError("fetchPage must be a function");
  const root=new URL(startUrl);
  const origin=root.origin;
  const depthLimit=Math.max(0,Math.min(3,Number(maxDepth)||0));
  const pageLimit=Math.max(1,Math.min(30,Number(maxPages)||10));
  const workerLimit=Math.max(1,Math.min(4,Number(concurrency)||3));
  const robotsRules=parseRobotsRules(robotsTxt);
  const visited=new Set([root.toString()]);
  const queued=new Set([root.toString()]);
  const pages=[{
    url:root.toString(),depth:0,statusCode:Number(rootPage.statusCode)||0,status:"root",
    title:pageTitle(rootPage.html),linksFound:0,
    contentType:rootPage.headers&&rootPage.headers["content-type"]||""
  }];
  const queue=[];
  let skippedByRobots=0;
  let discovered=0;

  const addUrl=(value,depth)=>{
    const normalized=normalizeInternalUrl(value,origin);
    if(!normalized||queued.has(normalized)||visited.has(normalized)) return;
    queued.add(normalized);
    if(!isAllowedByRobots(normalized,robotsRules)){
      skippedByRobots++;
      pages.push({url:normalized,depth,statusCode:0,status:"robots-blocked",title:"",linksFound:0,contentType:""});
      return;
    }
    if(visited.size+queue.length>=pageLimit) return;
    queue.push({url:normalized,depth});
    discovered++;
  };

  if(depthLimit>0){
    for(const url of extractPageLinks(rootPage.html,startUrl,pageLimit*4)) addUrl(url,1);
    for(const url of extractSitemapUrls(sitemapXml,origin,pageLimit*4)) addUrl(url,1);
  }

  while(queue.length&&visited.size<pageLimit){
    const currentDepth=queue[0].depth;
    const batch=[];
    while(queue.length&&queue[0].depth===currentDepth&&batch.length<workerLimit&&visited.size+batch.length<pageLimit){
      const next=queue.shift();
      if(visited.has(next.url)) continue;
      visited.add(next.url);
      batch.push(next);
    }
    if(!batch.length) continue;

    const results=await Promise.all(batch.map(async item=>{
      try{return {item,page:await fetchPage(item.url)};}
      catch(error){return {item,error:error&&error.message||"Request failed"};}
    }));

    for(const entry of results){
      if(entry.error){
        pages.push({url:entry.item.url,depth:entry.item.depth,statusCode:0,status:"unverified",title:"",linksFound:0,contentType:"",error:entry.error});
        continue;
      }
      const page=entry.page||{};
      const statusCode=Number(page.statusCode)||0;
      let status=statusCode>=400?"broken":statusCode>=300?"redirect":statusCode>=200?"ok":"unverified";
      const redirectTo=page.redirectTo||"";
      if(redirectTo){
        try{
          if(new URL(redirectTo).origin!==origin) status="external-redirect";
        }catch{status="unverified";}
      }
      const contentType=String(page.headers&&page.headers["content-type"]||"");
      const isHtml=/text\/html|application\/xhtml\+xml/i.test(contentType);
      const html=isHtml?String(page.body||""):"";
      const childLinks=html&&status==="ok"&&entry.item.depth<depthLimit
        ? extractPageLinks(html,page.finalUrl||entry.item.url,pageLimit*4)
        : [];
      pages.push({
        url:entry.item.url,depth:entry.item.depth,statusCode,status,
        title:pageTitle(html),linksFound:childLinks.length,contentType,redirectTo
      });
      for(const nextUrl of childLinks) addUrl(nextUrl,entry.item.depth+1);
    }
  }

  const scanned=pages.filter(item=>item.status!=="robots-blocked");
  return {
    origin,maxDepth:depthLimit,maxPages:pageLimit,visited:scanned.length,
    discovered,skippedByRobots,
    broken:scanned.filter(item=>item.status==="broken").length,
    redirects:scanned.filter(item=>item.status==="redirect"||item.status==="external-redirect").length,
    unverified:scanned.filter(item=>item.status==="unverified").length,
    pages
  };
}

module.exports={crawlSite,extractPageLinks,extractSitemapUrls,parseRobotsRules,isAllowedByRobots,normalizeInternalUrl};
