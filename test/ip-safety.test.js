"use strict";

const test=require("node:test");
const assert=require("node:assert/strict");
const {isPrivateIp}=require("../ip-safety");

test("blocks private, loopback, link-local and documentation IPv4 ranges",()=>{
  for(const address of [
    "0.0.0.1","10.0.0.1","100.64.0.1","127.0.0.1","169.254.1.1",
    "172.16.0.1","192.0.0.8","192.0.2.10","192.88.99.1","192.168.1.1",
    "198.18.0.1","198.51.100.10","203.0.113.8","224.0.0.1","255.255.255.255"
  ]) assert.equal(isPrivateIp(address),true,address);
});

test("allows ordinary globally routable IPv4 addresses",()=>{
  for(const address of ["1.1.1.1","8.8.8.8","93.184.216.34","203.0.114.1"]) {
    assert.equal(isPrivateIp(address),false,address);
  }
});

test("blocks non-global, special and mapped IPv6 ranges",()=>{
  for(const address of [
    "::","::1","::ffff:127.0.0.1","::ffff:c000:201","fc00::1","fd12::1",
    "fe80::1","ff02::1","2001:db8::1","2001:20::1","2001:0::1","2002::1","3fff::1"
  ]) assert.equal(isPrivateIp(address),true,address);
});

test("allows globally routable IPv6 addresses",()=>{
  for(const address of ["2001:4860:4860::8888","2606:4700:4700::1111","2a00:1450:4001:81b::200e"]) {
    assert.equal(isPrivateIp(address),false,address);
  }
});

test("rejects malformed addresses",()=>{
  assert.equal(isPrivateIp("not-an-ip"),true);
});
