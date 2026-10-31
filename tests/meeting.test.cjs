const assert = require("node:assert/strict");
const { boot } = require("./harness.cjs");
const Engine = require("../dist/engine.js");
const w = boot();
w.field("#cap", 320);
w.field("#power", 60);
w.run('outputForecast();saveAssets();go("dispatch");runPlan()');
assert.equal(w.run("S.current.inputs.forecast"), "FC-001");
assert.equal(w.run("S.current.inputs.parameters"), "PA-002");
assert.equal(w.run("S.archive.length"), 2);
const archived = w.run("JSON.stringify(S.archive[0])");
const firstPlan = w.run("JSON.stringify(S.records[0])");
const oldCost = w.run("S.current.plan.cost"),
  oldCarbon = w.run("S.current.plan.carbon");
w.run("applyBudget(10)");
assert.ok(w.run("S.current.plan.cost") > oldCost);
assert.ok(w.run("S.current.plan.carbon") < oldCarbon);
assert.equal(w.run("JSON.stringify(S.archive[0])"), archived);
assert.equal(w.run("JSON.stringify(S.records[0])"), firstPlan);
w.run("applyBudget(30)");
assert.ok(w.nodes.get("#app").innerHTML.includes("B、C结果一致"));
assert.ok(!/<label>费用增幅<\/label>/.test(w.nodes.get("#app").innerHTML));
w.run('UI.curve="carbon";render()');
let html = w.nodes.get("#app").innerHTML;
assert.ok(html.includes("逐时购电碳排"));
assert.ok(html.includes("kgCO₂</text>"));
const emitted = w.run("S.current.plan.rows.reduce((s,r)=>s+r.grid*r.carbon,0)");
assert.ok(Math.abs(emitted - w.run("S.current.plan.carbon")) < 1e-6);
const d = Engine.dataset(),
  baseline = Engine.noStorage(d);
assert.ok(
  baseline.rows.every(
    (r) => Math.abs(r.pv + r.grid - r.load - r.curtail) < 1e-6,
  ),
);
assert.ok(
  Math.abs(
    baseline.cost -
      baseline.rows.reduce((s, r) => s + r.grid * d.price[r.h], 0),
  ) < 1e-6,
);
w.run('choose("green")');
const safety = {
  kind: "stability-result",
  park_id: "campus-demo",
  capacity_kWh: 320,
  power_kW: 60,
  pv_kWp: 150,
  model_version: "TEST-ONLY",
  case_name: "test",
  time_s: [0, 0.1, 0.2],
  frequency_Hz: [50, 49.9, 50],
};
assert.throws(() =>
  w.run(
    `acceptSafety(${JSON.stringify({ ...safety, capacity_kWh: 400 })},'bad.json')`,
  ),
);
assert.throws(() =>
  w.run(
    `acceptSafety(${JSON.stringify({ ...safety, time_s: [0, 0, 0.1] })},'bad.json')`,
  ),
);
w.run(`acceptSafety(${JSON.stringify(safety)},'test-only.json')`);
w.run('go("fault")');
assert.ok(w.nodes.get("#app").innerHTML.includes("未提供验收判据"));
assert.ok(!w.nodes.get("#app").innerHTML.includes("稳定性通过</span>"));
const f = boot();
f.field("#day", "2026-11-01");
f.run("outputForecast()");
html = f.nodes.get("#app").innerHTML;
assert.ok(!html.includes("实际值(kW)"));
assert.ok(!html.includes('class="prediction-stats"'));
assert.ok(html.includes("未来预测没有实际值"));
assert.equal(f.run("S.archive[0].data.actual"), undefined);
f.field("#day", "2027-01-01");
assert.equal(f.run("applyFilters(true)"), false);
assert.equal(f.run("S.date"), "2026-11-01");
assert.equal(f.run('validDate("2026-99-10")'), false);
assert.equal(f.run('translateText("输出预测数据")'), "输出预测数据");
f.run('interfaceLanguage="en"');
assert.equal(f.run('translateText("输出预测数据")'), "Generate forecast");
console.log(
  "Meeting revision passed: immutable outputs, horizon, future observations withheld, budget recalculation, baseline, hourly carbon, safety result import validation, language labels.",
);
