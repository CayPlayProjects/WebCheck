"use strict";

function parseAttributes(tag){
  const attributes = {};
  const pattern = /([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
  let match;
  while((match=pattern.exec(tag))){
    const name=match[1].toLowerCase();
    if(name.startsWith("<")) continue;
    attributes[name]=match[2] ?? match[3] ?? match[4] ?? "";
  }
  return attributes;
}

function findMeta(html,key,value){
  const tags=String(html).match(/<meta\b[^>]*>/gi)||[];
  for(const tag of tags){
    const attrs=parseAttributes(tag);
    if(String(attrs[key]||"").toLowerCase()===value.toLowerCase()) return attrs.content||"";
  }
  return "";
}

function runSeoAudit({html="",finalUrl=""}={}){
  const source=String(html);
  const checks=[];
  const recommendations=[];
  const addCheck=(key,label,description,status,value,weight=3)=>{
    checks.push({category:"seo",key,label,description,status,value,weight});
  };
  const add=(condition,title,text,priority="medium")=>{
    if(condition) recommendations.push({title,text,priority});
  };
  const titleMatch=source.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  const title=titleMatch?titleMatch[1].replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim():"";
  const description=findMeta(source,"name","description").trim();
  const canonicalTag=(source.match(/<link\b[^>]*>/gi)||[]).find(tag=>/\brel\s*=\s*["'][^"']*\bcanonical\b/i.test(tag));
  const canonical=canonicalTag?parseAttributes(canonicalTag).href||"":"";
  const robots=findMeta(source,"name","robots").toLowerCase();
  const headingTags=[...source.matchAll(/<h([1-6])\b[^>]*>/gi)].map(match=>Number(match[1]));
  const jsonLd=[...source.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
    .filter(match=>/type\s*=\s*["']application\/ld\+json["']/i.test(match[1]));
  let validJsonLd=0;
  let invalidJsonLd=0;
  for(const item of jsonLd){
    try{JSON.parse(item[2].trim());validJsonLd++;}
    catch{invalidJsonLd++;}
  }
  const twitterCard=findMeta(source,"name","twitter:card");
  const hreflangCount=(source.match(/<link\b[^>]*\bhreflang\s*=/gi)||[]).length;

  const titleLength=title.length;
  addCheck("titleLength","Title length","A concise title is usually easier to understand in search results.",
    titleLength>=30&&titleLength<=60?"pass":"warn",title?titleLength+" characters":"No title to measure",4);
  add(title&&(titleLength<30||titleLength>60),"Improve title length",
    "The title contains "+titleLength+" characters. Review it for clarity and avoid unnecessary truncation.");

  const descriptionLength=description.length;
  addCheck("descriptionLength","Description length","A useful description should summarize the page without excessive truncation.",
    descriptionLength>=70&&descriptionLength<=160?"pass":"warn",description?descriptionLength+" characters":"Not provided",4);
  add(!description||descriptionLength<70||descriptionLength>160,"Review meta description",
    description?"The description contains "+descriptionLength+" characters. Make it concise and informative.":"Add a unique description that accurately summarizes the page.");

  const noindex=/(?:^|[,\s])noindex(?:$|[,\s])/i.test(robots);
  const nofollow=/(?:^|[,\s])nofollow(?:$|[,\s])/i.test(robots);
  addCheck("robotsMeta","Robots meta directive","Checks whether the page explicitly asks search engines not to index or follow it.",
    noindex?"warn":"pass",robots||"No restrictive robots directive",5);
  add(noindex,"Review noindex directive",
    "The page includes a noindex directive. Confirm that search engines are intentionally prevented from indexing it.","high");
  if(nofollow) addCheck("nofollowMeta","Nofollow directive","The page asks crawlers not to follow its links.",
    "warn",robots,2);

  let canonicalStatus="pass";
  let canonicalValue="Not specified";
  if(canonical){
    try{
      const canonicalUrl=new URL(canonical,finalUrl);
      const pageUrl=new URL(finalUrl);
      canonicalValue=canonicalUrl.toString();
      if(!["https:","http:"].includes(canonicalUrl.protocol)||canonicalUrl.hostname!==pageUrl.hostname||
        canonicalUrl.pathname!==pageUrl.pathname||canonicalUrl.search!==pageUrl.search) canonicalStatus="warn";
    }catch{canonicalStatus="fail";canonicalValue="Invalid canonical URL";}
  }
  addCheck("canonicalConsistency","Canonical consistency","Checks whether the canonical URL is valid and points to the same page host and path.",
    canonicalStatus,canonicalValue,4);
  add(canonicalStatus!=="pass","Review canonical URL",
    "Verify that the canonical URL resolves correctly and points to the intended preferred page.");

  const skips=[];
  for(let index=1;index<headingTags.length;index++){
    if(headingTags[index]>headingTags[index-1]+1) skips.push(headingTags[index-1]+"→"+headingTags[index]);
  }
  addCheck("headingHierarchy","Heading hierarchy","Heading levels should form a logical outline without skipping levels.",
    skips.length?"warn":"pass",headingTags.length?headingTags.length+" headings"+(skips.length?"; skips "+skips.join(", "):""):"No headings found",3);
  add(skips.length>0,"Fix heading hierarchy","Heading levels skip from "+skips.join(", ")+". Use headings in a logical order.");

  const schemaStatus=invalidJsonLd>0?"warn":validJsonLd>0?"pass":"warn";
  addCheck("structuredData","Structured data (JSON-LD)","Checks whether JSON-LD structured data is present and parses as JSON.",
    schemaStatus,validJsonLd?validJsonLd+" valid block(s)":invalidJsonLd?invalidJsonLd+" invalid block(s)":"No JSON-LD found",3);
  add(invalidJsonLd>0,"Fix invalid structured data",invalidJsonLd+" JSON-LD block(s) could not be parsed as JSON.");
  add(validJsonLd===0&&invalidJsonLd===0,"Consider structured data","Add relevant Schema.org JSON-LD where it accurately describes the page.");

  addCheck("twitterCard","Twitter/X card metadata","A card declaration helps control link previews on supported social platforms.",
    twitterCard?"pass":"warn",twitterCard||"Not provided",2);
  add(!twitterCard,"Add Twitter/X card metadata",
    "Consider adding twitter:card and, where relevant, twitter:title, twitter:description and twitter:image.");

  addCheck("hreflang","International language alternates","hreflang annotations help search engines understand localized page versions.",
    hreflangCount>0?"pass":"warn",hreflangCount?hreflangCount+" alternate link(s)":"None declared",2);

  return {checks,recommendations,meta:{title,description,robots,canonical,twitterCard,validJsonLd,invalidJsonLd,hreflangCount}};
}

module.exports={runSeoAudit,parseAttributes,findMeta};
