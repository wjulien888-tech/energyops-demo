const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { boot } = require("./harness.cjs");

const realEngine = require("../dist/engine.js");
const Engine = { ...realEngine };
const context = vm.createContext({ Engine, console });
context.globalThis = context;
context.window = context;
for (const file of ["carbon-factor-data.js", "carbon-factor.js"])
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, "../dist", file), "utf8"),
    context,
  );
const api = context.EnergyOpsCarbonFactor;
const ids = api.bundle.profiles.map((item) => item.id);
assert.equal(ids.join(","), "low,medium,high");
assert.equal(api.series("low")[0], 0.38135757575757584);
assert.equal(api.series("medium")[0], 0.46366300578034686);
assert.equal(api.series("high")[13], 0.2737238993710693);
for (const id of ids) {
  const values = api.series(id);
  assert.equal(values.length, 24);
  assert.ok(values.every((value) => value > 0 && value < 1));
}
assert.ok(
  api.profile("low").daily_mean <
    api.profile("medium").daily_mean &&
    api.profile("medium").daily_mean < api.profile("high").daily_mean,
);
const overlaid = context.Engine.dataset("sunny");
assert.deepEqual(overlaid.carbon, api.series("medium"));
assert.equal(overlaid.carbonFactor.representative_date, "2025-01-18");
const synthetic = realEngine.dataset("sunny");
assert.notEqual(synthetic.carbon[0], overlaid.carbon[0]);

const page = boot();
assert.equal(page.run("S.carbonProfile"), "medium");
assert.equal(page.run("data.carbon[0]"), api.series("medium")[0]);
page.run('go("parameters")');
let html = page.nodes.get("#app").innerHTML;
assert.ok(html.includes('id="carbon-profile"'));
assert.ok(html.includes("低碳典型日"));
assert.ok(html.includes("中碳典型日"));
assert.ok(html.includes("高碳典型日"));
assert.equal(page.run("setCarbonProfile('low')"), true);
assert.equal(page.run("data.carbonFactor.representative_date"), "2025-01-30");
assert.equal(page.run("parametersReady()"), false);
page.field("#cap", 320);
page.field("#power", 60);
page.run("saveAssets()");
html = page.nodes.get("#app").innerHTML;
assert.ok(html.includes("分时碳因子"));
assert.ok(html.includes("2025-01-30"));
assert.equal(page.run("S.archive.at(-1).version"), "GD-S1-2025-K3");
assert.equal(page.run("setCarbonProfile('missing')"), false);
console.log(
  "Carbon factors passed: three frozen centroids, medium default, profile switch invalidates parameter output.",
);
