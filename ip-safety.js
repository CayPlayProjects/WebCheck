"use strict";

const net=require("net");

function isPrivateIp(address){
  const family=net.isIP(address);
  if(!family) return true;

  if(family===4){
    const p=address.split(".").map(Number);
    return (
      p[0]===0 ||
      p[0]===10 ||
      p[0]===127 ||
      (p[0]===100 && p[1]>=64 && p[1]<=127) ||
      (p[0]===169 && p[1]===254) ||
      (p[0]===172 && p[1]>=16 && p[1]<=31) ||
      (p[0]===192 && (
        p[1]===0 ||
        p[1]===2 ||
        (p[1]===88 && p[2]===99) ||
        p[1]===168
      )) ||
      (p[0]===198 && (p[1]===18 || p[1]===19 || p[1]===51 && p[2]===100)) ||
      (p[0]===203 && p[1]===0 && p[2]===113) ||
      p[0]>=224
    );
  }

  const ip=address.toLowerCase();
  if(ip.startsWith("::")) return true;

  const segments=ip.split(":");
  const first=parseInt(segments[0]||"0",16);
  const second=parseInt(segments[1]||"0",16);

  // Only global-unicast IPv6 space (2000::/3) is eligible.
  if(first<0x2000 || first>0x3fff) return true;

  // Special-purpose and documentation ranges.
  if(first===0x2001 && second<=0x01ff) return true;
  if(ip.startsWith("2001:db8:")) return true;
  if(first===0x2002) return true; // 6to4
  if(first===0x3fff && second<=0x0fff) return true; // documentation

  return false;
}

module.exports={isPrivateIp};
