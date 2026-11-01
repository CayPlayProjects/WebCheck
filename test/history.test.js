"use strict";

const test=require("node:test");
const assert=require("node:assert/strict");
const {createHistoryStore,compareReports,isValidReport}=require("../public/history.js");

function memoryStorage(){
  const values=new Map();
  return {
    getItem:key=>values.has(key)?values.get(key):null,
    setItem:(key,value)=>values.set(key,String(value)),
    removeItem:key=>values.delete(key),
    dump:key=>values.get(key)
  };
}

function report(overrides={}){
  return {
    host:"example.test",
    finalUrl:"https://example.test/",
    checkedAt:new Date().toISOString(),
    score:80,
    categoryScores:{seo:80,security:75},
    checks:[
      {category:"seo",key:"title",label:"Title",status:"pass"},
      {category:"security",key:"csp",label:"CSP",status:"warn"}
    ],
    recommendations:[],
    ...overrides
  };
}

test("validates reports before saving",()=>{
  assert.equal(isValidReport(report()),true);
  assert.equal(isValidReport({host:"",score:10,checks:[],finalUrl:""}),false);
  const store=createHistoryStore(memoryStorage());
  assert.deepEqual(store.save({}).reason,"invalid-report");
  assert.equal(store.list().length,0);
});

test("saves newest-first, caps the history and removes selected entries",()=>{
  const storage=memoryStorage();
  const store=createHistoryStore(storage,{maxEntries:2});
  const first=store.save(report({score:70}));
  const second=store.save(report({score:80}));
  const third=store.save(report({score:90}));
  const list=store.list();
  assert.equal(list.length,2);
  assert.equal(list[0].report.score,90);
  assert.equal(list[1].report.score,80);
  assert.equal(store.remove(first.entry.id),false);
  assert.equal(store.remove(second.entry.id),true);
  assert.equal(store.list().length,1);
  assert.equal(store.clear(),true);
  assert.equal(store.list().length,0);
});

test("ignores malformed saved JSON without throwing",()=>{
  const storage=memoryStorage();
  storage.setItem("webcheck.history.v1","not-json");
  const store=createHistoryStore(storage);
  assert.deepEqual(store.list(),[]);
});

test("does not discard all older reports when a new report exceeds the byte cap",()=>{
  const storage=memoryStorage();
  const store=createHistoryStore(storage,{maxBytes:180});
  store.save(report({score:65}));
  const before=store.list();
  const result=store.save(report({score:99,checks:[{category:"seo",key:"huge",label:"Huge",status:"pass",value:"x".repeat(500)}]}));
  assert.equal(result.saved,false);
  assert.deepEqual(store.list().map(item=>item.report.score),before.map(item=>item.report.score));
});

test("finds the latest report for a host and can exclude an entry",()=>{
  const store=createHistoryStore(memoryStorage());
  store.save(report({host:"a.test"}));
  const newest=store.save(report({host:"a.test",score:90}));
  store.save(report({host:"b.test"}));
  assert.equal(store.findLatestForHost("a.test").report.score,90);
  assert.notEqual(store.findLatestForHost("a.test",{excludeId:newest.entry.id}).report.score,90);
});

test("compares scores, categories and changed checks",()=>{
  const before=report({
    score:70,
    categoryScores:{seo:70,security:50},
    siteCrawl:{broken:3},
    checks:[
      {category:"seo",key:"title",label:"Title",status:"warn"},
      {category:"security",key:"csp",label:"CSP",status:"pass"},
      {category:"seo",key:"legacy",label:"Legacy",status:"fail"}
    ]
  });
  const after=report({
    score:86,
    categoryScores:{seo:90,security:70},
    siteCrawl:{broken:1},
    checks:[
      {category:"seo",key:"title",label:"Title",status:"pass"},
      {category:"security",key:"csp",label:"CSP",status:"warn"},
      {category:"seo",key:"new",label:"New check",status:"warn"}
    ]
  });
  const comparison=compareReports(after,before);
  assert.equal(comparison.scoreDelta,16);
  assert.equal(comparison.categories.seo.delta,20);
  assert.equal(comparison.brokenPagesDelta,-2);
  assert.deepEqual(comparison.changes.map(item=>item.state).sort(),["improved","new","resolved","worsened"]);
});
