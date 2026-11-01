"use strict";

const STORAGE_KEY="webcheck.history.v1";
const DEFAULT_MAX_ENTRIES=8;
const DEFAULT_MAX_BYTES=1500*1024;

function byteLength(value){
  return new TextEncoder().encode(value).length;
}

function isValidReport(report){
  return Boolean(
    report&&typeof report==="object"&&
    typeof report.host==="string"&&report.host.length>0&&
    typeof report.finalUrl==="string"&&
    Number.isFinite(Number(report.score))&&
    Array.isArray(report.checks)
  );
}

function createHistoryStore(storage,{maxEntries=DEFAULT_MAX_ENTRIES,maxBytes=DEFAULT_MAX_BYTES,key=STORAGE_KEY}={}){
  if(!storage||typeof storage.getItem!=="function"||typeof storage.setItem!=="function"){
    throw new TypeError("A Storage-compatible object is required");
  }

  function read(){
    try{
      const raw=storage.getItem(key);
      if(!raw) return [];
      const parsed=JSON.parse(raw);
      if(!Array.isArray(parsed)) return [];
      return parsed.filter(item=>
        item&&typeof item.id==="string"&&
        isValidReport(item.report)&&
        typeof item.savedAt==="string"
      ).slice(0,Math.max(1,maxEntries));
    }catch{
      return [];
    }
  }

  function write(entries){
    const serialized=JSON.stringify(entries);
    if(byteLength(serialized)>maxBytes) return false;
    try{
      storage.setItem(key,serialized);
      return true;
    }catch{
      return false;
    }
  }

  function list(){
    return read().map(item=>({
      id:item.id,
      savedAt:item.savedAt,
      report:item.report
    }));
  }

  function save(report){
    if(!isValidReport(report)) return {saved:false,reason:"invalid-report"};
    let snapshot;
    try{snapshot=JSON.parse(JSON.stringify(report));}
    catch{return {saved:false,reason:"invalid-report"};}

    const savedAt=new Date().toISOString();
    const host=String(snapshot.host).toLowerCase();
    const baseId=Date.now()+"-"+host.replace(/[^a-z0-9.-]/g,"-");
    const current=read();
    let id=baseId;
    let suffix=1;
    while(current.some(item=>item.id===id)){
      id=baseId+"-"+suffix++;
    }
    const entry={id,savedAt,report:snapshot};
    const next=[entry,...current].slice(0,Math.max(1,maxEntries));

    while(next.length>0){
      if(write(next)) return {saved:true,entry,entries:next};
      next.pop();
    }
    return {saved:false,reason:"storage-unavailable"};
  }

  function remove(id){
    const current=read();
    const next=current.filter(item=>item.id!==id);
    if(next.length===current.length) return false;
    return write(next);
  }

  function clear(){
    try{storage.removeItem(key);return true;}
    catch{return false;}
  }

  function findLatestForHost(host,{excludeId=null}={}){
    const normalized=String(host||"").toLowerCase();
    return read().find(item=>
      item.id!==excludeId&&(
        siteKey(item.report)===normalized||
        String(item.report.host||"").toLowerCase()===normalized
      )
    )||null;
  }

  return {list,save,remove,clear,findLatestForHost};
}

function siteKey(report){
  try{
    const url=new URL(report.finalUrl);
    const defaultPort=(url.protocol==="https:"&&url.port==="443")||(url.protocol==="http:"&&url.port==="80");
    return url.hostname.toLowerCase()+(url.port&&!defaultPort?":"+url.port:"");
  }catch{
    return String(report.host||"").toLowerCase();
  }
}

function statusRank(status){
  return status==="pass"?2:status==="warn"?1:status==="fail"?0:-1;
}

function compareReports(current,previous){
  if(!isValidReport(current)||!isValidReport(previous)){
    throw new TypeError("Both reports must contain a host, score and checks");
  }
  const categories={};
  const names=new Set([
    ...Object.keys(current.categoryScores||{}),
    ...Object.keys(previous.categoryScores||{})
  ]);
  for(const name of names){
    const now=Number(current.categoryScores&&current.categoryScores[name]);
    const before=Number(previous.categoryScores&&previous.categoryScores[name]);
    categories[name]={
      current:Number.isFinite(now)?now:null,
      previous:Number.isFinite(before)?before:null,
      delta:Number.isFinite(now)&&Number.isFinite(before)?now-before:null
    };
  }

  const toMap=report=>new Map(report.checks.map(item=>[
    String(item.category)+":"+String(item.key),
    item
  ]));
  const currentChecks=toMap(current);
  const previousChecks=toMap(previous);
  const changes=[];

  for(const [key,item] of currentChecks){
    const old=previousChecks.get(key);
    if(!old){
      changes.push({key,label:item.label||key,state:"new",current:item.status,previous:null});
      continue;
    }
    if(item.status===old.status) continue;
    const nowRank=statusRank(item.status);
    const previousRank=statusRank(old.status);
    changes.push({
      key,label:item.label||old.label||key,
      state:nowRank>previousRank?"improved":nowRank<previousRank?"worsened":"changed",
      current:item.status,
      previous:old.status
    });
  }
  for(const [key,item] of previousChecks){
    if(!currentChecks.has(key)){
      changes.push({key,label:item.label||key,state:"resolved",current:null,previous:item.status});
    }
  }

  const nowBroken=Number(current.siteCrawl&&current.siteCrawl.broken)||0;
  const previousBroken=Number(previous.siteCrawl&&previous.siteCrawl.broken)||0;
  return {
    host:current.host,
    scoreDelta:Number(current.score)-Number(previous.score),
    currentScore:Number(current.score),
    previousScore:Number(previous.score),
    categories,
    changes,
    brokenPagesDelta:nowBroken-previousBroken,
    comparedAt:new Date().toISOString()
  };
}

const exported={createHistoryStore,compareReports,isValidReport,siteKey,STORAGE_KEY};
if(typeof module!=="undefined"&&module.exports) module.exports=exported;
if(typeof window!=="undefined") window.WebCheckHistory=exported;
