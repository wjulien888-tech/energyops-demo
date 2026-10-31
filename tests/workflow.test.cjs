const assert = require("node:assert/strict");
const vm = require("node:vm");
const fs = require("node:fs");
const path = require("node:path");
const Engine = require("../dist/engine.js");
function boot() {
  const nodes = new Map();
  const node = (id) => {
    if (!nodes.has(id))
      nodes.set(id, {
        innerHTML: "",
        textContent: "",
        classList: { add() {}, remove() {} },
      });
    return nodes.get(id);
  };
  node("#app");
  node("#toast");
  const context = vm.createContext({
    Engine,
    console,
    setTimeout: () => 0,
    clearTimeout() {},
    window: { scrollTo() {} },
    document: {
      querySelector: (id) => nodes.get(id) || null,
      querySelectorAll: () => [],
    },
  });
  for (const file of ["app.js", "business-ui.js"])
    vm.runInContext(
      fs.readFileSync(path.join(__dirname, "../dist", file), "utf8"),
      context,
    );
  return {
    run: (code) => vm.runInContext(code, context),
    nodes,
    field: (id, value) => {
      node(id).value = String(value);
    },
  };
}
let checks = 0;
function readyFlow(parametersFirst = false) {
  const w = boot();
  assert.equal(w.run("S.page"), "forecast");
  assert.equal(w.run("dispatchReady()"), false);
  assert.equal(w.run('go("dispatch")'), false);
  assert.equal(w.run("runPlan()"), false);
  assert.equal(w.run("injectFault()"), false);
  assert.equal(w.run("S.records.length"), 0);
  assert.ok(!w.nodes.get("#app").innerHTML.includes("运行场景"));
  w.field("#cap", 320);
  w.field("#power", 60);
  w.run(parametersFirst ? "saveAssets()" : "outputForecast()");
  assert.equal(w.run("dispatchReady()"), false, "one output is insufficient");
  w.run(parametersFirst ? "outputForecast()" : "saveAssets()");
  assert.equal(w.run("dispatchReady()"), true, "both outputs unlock dispatch");
  w.run('go("dispatch")');
  assert.equal(w.run("S.page"), "dispatch");
  assert.equal(w.run("runPlan()"), true);
  assert.equal(w.run("S.records.length"), 1);
  w.run('injectFault(); diagnose(); feedback("partial"); replan()');
  assert.equal(
    w.run("S.records.length"),
    2,
    "recovery remains available after valid output",
  );
  assert.equal(w.run("S.fault.newId"), "EO-002");
  checks += 14;
  return w;
}
const w = readyFlow();
readyFlow(true);
w.run('go("parameters"); invalidateOutputs("parameters")');
assert.equal(
  w.run("forecastReady()"),
  true,
  "battery edit preserves the independent forecast",
);
assert.equal(w.run("dispatchReady()"), false);
assert.equal(w.run("runPlan()"), false);
assert.equal(w.run("replan()"), false);
w.field("#cap", 480);
w.run("saveAssets()");
assert.equal(w.run("dispatchReady()"), true);
assert.equal(w.run("S.capacity"), 480);
w.run("invalidateOutputs()");
w.field("#day", "2026-02-20");
w.run("applyFilters(true)");
assert.equal(w.run("forecastReady()"), false);
assert.equal(w.run("parametersReady()"), false);
w.run("outputForecast()");
assert.equal(w.run("dispatchReady()"), false);
w.run("saveAssets()");
assert.equal(w.run("dispatchReady()"), true);
w.run("toggleMissingInput()");
assert.equal(w.run("dispatchReady()"), false);
w.run("toggleMissingInput()");
assert.equal(
  w.run("dispatchReady()"),
  false,
  "restoring data does not replace explicit output",
);
w.run("saveAssets()");
assert.equal(w.run("dispatchReady()"), true);
w.run("resetDemo()");
assert.equal(w.run("dispatchReady()"), false);
assert.equal(w.run("S.page"), "forecast");
checks += 15;
const invalid = boot();
invalid.run("data.pv[5]=NaN");
assert.equal(invalid.run("outputForecast()"), false);
invalid.field("#cap", 0);
invalid.field("#power", 60);
invalid.run("saveAssets()");
assert.equal(invalid.run("parametersReady()"), false);
invalid.field("#cap", 320);
invalid.run("data.carbon[4]=null;saveAssets()");
assert.equal(invalid.run("parametersReady()"), false);
for (const page of ["overview", "forecast", "parameters", "fault", "reports"]) {
  invalid.run(`go('${page}')`);
  assert.ok(!invalid.nodes.get("#app").innerHTML.includes("运行场景"), page);
}
console.log(
  `Workflow gates passed: both output orders, all entry points, invalidation, recovery, invalid data, reset and scenario filter removal (${checks}+ checks).`,
);

const display = boot();
let html = display.nodes.get("#app").innerHTML;
assert.ok(
  !html.includes('data-output-results="forecast"'),
  "prediction results absent before output",
);
assert.ok(!html.includes('class="prediction-layout"'));
assert.ok(!html.includes("平均绝对误差"));
display.run("outputForecast()");
html = display.nodes.get("#app").innerHTML;
assert.ok(html.includes('data-output-results="forecast"'));
assert.ok(html.includes('class="prediction-layout"'));
assert.ok(html.includes("平均绝对误差"));
display.run('go("parameters")');
html = display.nodes.get("#app").innerHTML;
assert.ok(html.includes('id="cap"'), "inputs remain editable before output");
assert.ok(!html.includes('data-output-results="parameters"'));
assert.ok(!html.includes("设备参数结果"));
assert.ok(!html.includes("分时碳因子"));
display.field("#cap", 320);
display.field("#power", 60);
display.run("saveAssets()");
html = display.nodes.get("#app").innerHTML;
assert.ok(html.includes('data-output-results="parameters"'));
assert.ok(html.includes("设备参数结果"));
assert.ok(html.includes("分时碳因子"));
display.run('invalidateOutputs("parameters");render()');
assert.ok(
  !display.nodes
    .get("#app")
    .innerHTML.includes('data-output-results="parameters"'),
);
display.run('go("forecast")');
assert.ok(
  display.nodes
    .get("#app")
    .innerHTML.includes('data-output-results="forecast"'),
  "unrelated parameter edit preserves prediction output",
);
display.run("invalidateOutputs();render()");
assert.ok(
  !display.nodes
    .get("#app")
    .innerHTML.includes('data-output-results="forecast"'),
);
for (const unit of ["kW", "%", "kgCO₂/kWh", "元/kWh"]) {
  const rendered = display.run(
    `chart([{name:"测试曲线",values:data.load,color:"#1677ff"}],${JSON.stringify(unit)})`,
  );
  const legend = rendered.match(/<div class="legend">([\s\S]*?)<\/div>/)[1];
  assert.ok(!legend.includes(unit), "units do not appear in legends");
  assert.ok(rendered.includes('class="axis-unit"'));
  assert.ok(rendered.includes(`>${unit}</text>`), "units appear on y axis");
  assert.ok(rendered.includes("rotate(-90"));
}
console.log(
  "Output visibility and y-axis units passed: initial, output, invalidation and all four unit types.",
);
