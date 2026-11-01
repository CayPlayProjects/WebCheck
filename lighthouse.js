"use strict";

const https=require("https");

const API_HOST="www.googleapis.com";
const API_PATH="/pagespeedonline/v5/runPagespeed";
const MAX_RESPONSE_BYTES=8*1024*1024;

function clampScore(value){
  return typeof value==="number"&&Number.isFinite(value)
    ? Math.max(0,Math.min(100,Math.round(value*100)))
    : null;
}

function parseLighthouseResponse(payload){
  const lighthouse=payload&&payload.lighthouseResult;
  if(!lighthouse) throw new Error("Google PageSpeed did not return a Lighthouse report");

  const categories=lighthouse.categories||{};
  const scores={
    performance:clampScore(categories.performance&&categories.performance.score),
    accessibility:clampScore(categories.accessibility&&categories.accessibility.score),
    bestPractices:clampScore(categories["best-practices"]&&categories["best-practices"].score),
    seo:clampScore(categories.seo&&categories.seo.score)
  };
  const audits=lighthouse.audits||{};
  const metricDefinitions=[
    ["first-contentful-paint","First Contentful Paint","fcp"],
    ["largest-contentful-paint","Largest Contentful Paint","lcp"],
    ["speed-index","Speed Index","speedIndex"],
    ["total-blocking-time","Total Blocking Time","tbt"],
    ["cumulative-layout-shift","Cumulative Layout Shift","cls"],
    ["interactive","Time to Interactive","tti"]
  ];
  const metrics={};
  for(const [id,label,key] of metricDefinitions){
    const audit=audits[id];
    if(audit&&audit.displayValue){
      metrics[key]={label,value:audit.displayValue,numericValue:typeof audit.numericValue==="number"?audit.numericValue:null};
    }
  }

  const opportunities=[];
  const refs=categories.performance&&categories.performance.auditRefs||[];
  for(const ref of refs){
    if(!ref||ref.weight===0) continue;
    const audit=audits[ref.id];
    if(!audit||audit.score===null||audit.score>=1) continue;
    const details=audit.details||{};
    if(!["opportunity","table","list","debugdata"].includes(details.type)&&!audit.displayValue) continue;
    opportunities.push({
      id:ref.id,
      title:audit.title||ref.id,
      description:String(audit.description||"").replace(/\s+/g," ").slice(0,500),
      displayValue:audit.displayValue||"",
      score:clampScore(audit.score),
      savingsMs:typeof details.overallSavingsMs==="number"?Math.round(details.overallSavingsMs):null,
      savingsBytes:typeof details.overallSavingsBytes==="number"?Math.round(details.overallSavingsBytes):null
    });
  }
  opportunities.sort((a,b)=>(b.savingsMs||0)-(a.savingsMs||0)||(b.savingsBytes||0)-(a.savingsBytes||0));

  return {
    provider:"Google PageSpeed Insights / Lighthouse",
    reportType:"lab",
    strategy:lighthouse.configSettings&&lighthouse.configSettings.emulatedFormFactor||"unknown",
    lighthouseVersion:lighthouse.lighthouseVersion||"",
    fetchTime:lighthouse.fetchTime||"",
    finalUrl:lighthouse.finalUrl||payload.id||"",
    scores,
    metrics,
    opportunities:opportunities.slice(0,8),
    warnings:(lighthouse.runWarnings||[]).map(item=>String(item).slice(0,400)).slice(0,10)
  };
}

function requestPageSpeed(targetUrl,{strategy="mobile",locale="en",apiKey="",timeoutMs=65000}={}){
  return new Promise((resolve,reject)=>{
    const params=new URLSearchParams();
    params.set("url",targetUrl);
    params.set("strategy",strategy==="desktop"?"desktop":"mobile");
    params.set("locale",locale==="ru"?"ru":"en");
    for(const category of ["performance","accessibility","best-practices","seo"]){
      params.append("category",category);
    }
    if(apiKey) params.set("key",apiKey);

    const request=https.get({
      hostname:API_HOST,
      path:API_PATH+"?"+params.toString(),
      headers:{
        "Accept":"application/json",
        "User-Agent":"WebCheck/0.5 Lighthouse diagnostics"
      }
    },response=>{
      const chunks=[];
      let bytes=0;
      response.on("data",chunk=>{
        bytes+=chunk.length;
        if(bytes>MAX_RESPONSE_BYTES){
          request.destroy(new Error("PageSpeed response exceeded the size limit"));
          return;
        }
        chunks.push(chunk);
      });
      response.on("end",()=>{
        const body=Buffer.concat(chunks).toString("utf8");
        let data;
        try{data=JSON.parse(body);}
        catch{reject(new Error("PageSpeed returned an invalid JSON response"));return;}
        if(response.statusCode<200||response.statusCode>=300){
          const message=data.error&&data.error.message||"PageSpeed API request failed";
          const error=new Error(response.statusCode===429
            ? "PageSpeed API quota reached. Try later or configure PAGESPEED_API_KEY."
            : message);
          error.statusCode=response.statusCode;
          reject(error);
          return;
        }
        try{resolve(parseLighthouseResponse(data));}
        catch(error){reject(error);}
      });
    });
    request.setTimeout(timeoutMs,()=>request.destroy(new Error("Lighthouse request timed out")));
    request.on("error",reject);
  });
}

module.exports={requestPageSpeed,parseLighthouseResponse};
