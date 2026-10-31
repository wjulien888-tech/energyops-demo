const { boot } = require("./harness.cjs");
const fs = require("node:fs");
const w = boot();
w.nodes.set("#detail", { showModal() {} });
w.nodes.set("#detail-body", { innerHTML: "" });
w.run('interfaceLanguage="en"');
const unmatched = new Map();
function scan(html, label) {
  for (const original of html
    .replace(/<[^>]*>/g, "\n")
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean)) {
    const translated = w.run(`translateText(${JSON.stringify(original)})`);
    if (/\p{Script=Han}/u.test(translated))
      unmatched.set(original, { original, translated, label });
  }
  for (const a of html.matchAll(
    /(?:aria-label|title|placeholder|alt)="([^"]*)"/g,
  )) {
    const translated = w.run(`translateText(${JSON.stringify(a[1])})`);
    if (/\p{Script=Han}/u.test(translated))
      unmatched.set(a[1], { original: a[1], translated, label });
  }
}
function collect(label) {
  scan(w.nodes.get("#app").innerHTML, label);
}
for (const page of ["overview", "forecast", "parameters", "fault", "reports"]) {
  w.run(`go('${page}')`);
  collect("empty-" + page);
}
for (const call of ["showTeam()", 'showEvidence("verification")']) {
  w.run(call);
  scan(w.nodes.get("#detail-body").innerHTML, "empty-" + call);
}
w.field("#cap", 320);
w.field("#power", 60);
w.run('go("forecast");outputForecast();saveAssets();go("dispatch");runPlan()');
w.run("S.current=null;render()");
collect("dispatch-preview");
w.run("runPlan()");
for (const curve of ["power", "battery", "soc", "carbon"]) {
  w.run(`UI.curve='${curve}';render()`);
  collect(curve);
}
for (const page of ["overview", "forecast", "parameters", "reports"]) {
  w.run(`go('${page}')`);
  collect("populated-" + page);
}
for (const type of ["data", "forecast", "parameters", "verification"]) {
  w.run(`showEvidence('${type}')`);
  scan(w.nodes.get("#detail-body").innerHTML, "evidence-" + type);
}
for (const call of [
  "showTeam()",
  'showOutput("FC-001")',
  "showResultSchema()",
  "openExplanation()",
]) {
  w.run(call);
  scan(w.nodes.get("#detail-body").innerHTML, call);
}
for (const value of ["full", "partial", "failed", "none"]) {
  w.run(
    `S.fault=null;runPlan();injectFault();diagnose();feedback('${value}');replan();go('fault')`,
  );
  collect("fault-" + value);
}
for (const tour of ["normal", "fault"])
  for (let i = 0; i < 4; i++) {
    w.run(`S.tour='${tour}';S.step=${i};render()`);
    collect("tour-" + tour + i);
  }
for (const r of w.run("S.records")) {
  if (r.plan)
    require("node:assert/strict").doesNotMatch(
      w.run(`reportText(S.records.find(x=>x.id===${JSON.stringify(r.id)}))`),
      /\p{Script=Han}/u,
    );
}

w.run("S.tour=null;resetDemo()");
w.field("#day", "2026-11-01");
w.run('outputForecast();go("forecast")');
collect("future");
for (const file of [
  "dist/app.js",
  "dist/business-ui.js",
  "dist/meeting-support.js",
]) {
  const src = fs.readFileSync(file, "utf8");
  for (const m of src.matchAll(/(?:toast|Error)\(\s*"([^"\n]+)"/g)) {
    scan(m[1], file + "-message");
  }
}
require("node:assert/strict").equal(
  unmatched.size,
  0,
  JSON.stringify([...unmatched.values()], null, 2),
);
console.log(
  "English UI: all tested pages, workflows, dialogs, messages and reports contain no Chinese",
);
