"use strict";

function createRateLimiter({limit=10,windowMs=60000,maxKeys=5000}={}){
  const buckets=new Map();

  function consume(key,now=Date.now()){
    const normalized=String(key||"unknown");
    let bucket=buckets.get(normalized);
    if(!bucket||now-bucket.startedAt>=windowMs){
      bucket={startedAt:now,count:0};
      buckets.set(normalized,bucket);
    }
    bucket.count++;

    if(buckets.size>maxKeys){
      for(const [bucketKey,value] of buckets){
        if(now-value.startedAt>=windowMs) buckets.delete(bucketKey);
      }
      while(buckets.size>maxKeys){
        const oldest=buckets.keys().next().value;
        if(oldest===undefined) break;
        buckets.delete(oldest);
      }
    }

    const remaining=Math.max(0,limit-bucket.count);
    const retryAfter=Math.max(1,Math.ceil((bucket.startedAt+windowMs-now)/1000));
    return {allowed:bucket.count<=limit,remaining,retryAfter};
  }

  return {consume,get size(){return buckets.size;}};
}

module.exports={createRateLimiter};
