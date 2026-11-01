"use strict";

const test=require("node:test");
const assert=require("node:assert/strict");
const {createRateLimiter}=require("../rate-limit");

test("limits requests per key within a fixed window",()=>{
  const limiter=createRateLimiter({limit:2,windowMs:60000});
  assert.equal(limiter.consume("client-a",1000).allowed,true);
  assert.equal(limiter.consume("client-a",2000).allowed,true);
  const blocked=limiter.consume("client-a",3000);
  assert.equal(blocked.allowed,false);
  assert.equal(blocked.remaining,0);
  assert.equal(blocked.retryAfter,58);
});

test("starts a fresh window after the configured period",()=>{
  const limiter=createRateLimiter({limit:1,windowMs:1000});
  assert.equal(limiter.consume("client-a",100).allowed,true);
  assert.equal(limiter.consume("client-a",500).allowed,false);
  assert.equal(limiter.consume("client-a",1100).allowed,true);
});

test("bounds the number of remembered clients",()=>{
  const limiter=createRateLimiter({limit:1,windowMs:1000,maxKeys:2});
  limiter.consume("a",0);
  limiter.consume("b",0);
  limiter.consume("c",0);
  assert.ok(limiter.size<=2);
});
