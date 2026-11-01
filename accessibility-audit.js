"use strict";

const {parseAttributes}=require("./seo-audit");

function runAccessibilityAudit({html=""}={}){
  const source=String(html);
  const checks=[];
  const recommendations=[];
  const addCheck=(key,label,description,status,value,weight=3)=>{
    checks.push({category:"accessibility",key,label,description,status,value,weight});
  };
  const add=(condition,title,text,priority="medium")=>{
    if(condition) recommendations.push({title,text,priority});
  };

  const images=[...source.matchAll(/<img\b[^>]*>/gi)].map(match=>parseAttributes(match[0]));
  const missingAlt=images.filter(attrs=>!("alt" in attrs)).length;
  addCheck("imageAlt","Image alternative text","Informative images need useful alt text; decorative images should use alt=\"\".",
    missingAlt===0?"pass":"warn",missingAlt+"/"+images.length+" image(s) missing alt",5);
  add(missingAlt>0,"Add image alternative text",
    missingAlt+" image(s) do not declare an alt attribute. Add meaningful alt text or an empty alt for decorative images.");

  const ids=[...source.matchAll(/\bid\s*=\s*["']([^"']+)["']/gi)].map(match=>match[1]);
  const duplicates=[...new Set(ids.filter((id,index)=>ids.indexOf(id)!==index))];
  addCheck("uniqueIds","Unique element IDs","Duplicate IDs can break labels, scripts and assistive-technology references.",
    duplicates.length===0?"pass":"fail",duplicates.length?duplicates.join(", "):ids.length+" unique ID(s)",4);
  add(duplicates.length>0,"Make element IDs unique","Duplicate IDs found: "+duplicates.join(", ")+".","high");

  const labels=[...source.matchAll(/<label\b([^>]*)>([\s\S]*?)<\/label>/gi)];
  const explicitLabelIds=new Set(labels.map(match=>parseAttributes("<label "+match[1]+">").for).filter(Boolean));
  const wrappedLabels=labels.map(match=>match[0]);
  const controls=[...source.matchAll(/<(input|select|textarea)\b([^>]*)>/gi)]
    .map(match=>({tag:match[1].toLowerCase(),attrs:parseAttributes(match[0]),raw:match[0]}))
    .filter(item=>!["hidden","submit","reset","button","image"].includes(String(item.attrs.type||"").toLowerCase()));
  const unlabeled=controls.filter(item=>{
    const id=item.attrs.id;
    const explicitlyLinked=id&&explicitLabelIds.has(id);
    const wrapped=wrappedLabels.some(label=>label.toLowerCase().includes("<"+item.tag));
    return !explicitlyLinked&&!wrapped&&!item.attrs["aria-label"]&&!item.attrs["aria-labelledby"];
  }).length;
  addCheck("formLabels","Form control labels","Inputs, selects and textareas need programmatic labels or accessible names.",
    unlabeled===0?"pass":"warn",unlabeled+"/"+controls.length+" control(s) without a detected label",5);
  add(unlabeled>0,"Label form controls",
    unlabeled+" form control(s) have no detected label, aria-label or aria-labelledby reference.","high");

  const buttons=[...source.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/gi)];
  const unlabeledButtons=buttons.filter(match=>{
    const attrs=parseAttributes("<button "+match[1]+">");
    const text=match[2].replace(/<[^>]+>/g,"").replace(/\s+/g,"").trim();
    return !text&&!attrs["aria-label"]&&!attrs["aria-labelledby"]&&!attrs.title;
  }).length;
  addCheck("buttonNames","Button accessible names","Buttons should expose a readable name to assistive technologies.",
    unlabeledButtons===0?"pass":"warn",unlabeledButtons+"/"+buttons.length+" button(s) without a detected name",4);
  add(unlabeledButtons>0,"Add accessible button names",
    unlabeledButtons+" button(s) have no visible text or accessible name.");

  const links=[...source.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)];
  const emptyLinks=links.filter(match=>{
    const attrs=parseAttributes("<a "+match[1]+">");
    const text=match[2].replace(/<[^>]+>/g,"").trim();
    const hasImageAlt=/<img\b[^>]*\balt\s*=\s*["'][^"']+["']/i.test(match[2]);
    return !text&&!hasImageAlt&&!attrs["aria-label"]&&!attrs["aria-labelledby"]&&!attrs.title;
  }).length;
  addCheck("linkNames","Link accessible names","Links should describe their destination or action.",
    emptyLinks===0?"pass":"warn",emptyLinks+"/"+links.length+" link(s) without a detected name",3);
  add(emptyLinks>0,"Give links descriptive names",
    emptyLinks+" link(s) have no visible text or accessible name.");

  const mainCount=(source.match(/<main\b/gi)||[]).length;
  addCheck("mainLandmark","Main landmark","A page should expose one main landmark for its primary content.",
    mainCount===1?"pass":"warn",mainCount+" main landmark(s)",3);
  add(mainCount!==1,"Review the main landmark","Provide exactly one main landmark for the primary page content.");

  const positiveTabindex=[...source.matchAll(/\btabindex\s*=\s*["']([1-9]\d*)["']/gi)].length;
  addCheck("tabOrder","Keyboard tab order","Positive tabindex values can create a confusing focus order.",
    positiveTabindex===0?"pass":"warn",positiveTabindex+" positive tabindex value(s)",2);
  add(positiveTabindex>0,"Avoid positive tabindex values",
    "Use the natural DOM order and tabindex=\"0\" or tabindex=\"-1\" rather than positive tabindex values.");

  const tables=[...source.matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/gi)];
  const tablesWithoutHeaders=tables.filter(match=>!/<th\b/i.test(match[1])).length;
  addCheck("tableHeaders","Data table headers","Data tables should identify column or row headers with th elements.",
    tablesWithoutHeaders===0?"pass":"warn",tablesWithoutHeaders+"/"+tables.length+" table(s) without th",2);
  add(tablesWithoutHeaders>0,"Add table headers",
    tablesWithoutHeaders+" table(s) do not contain th elements. Use headers for tabular data.");

  return {checks,recommendations,metrics:{images:images.length,controls:controls.length,links:links.length,buttons:buttons.length}};
}

module.exports={runAccessibilityAudit};
