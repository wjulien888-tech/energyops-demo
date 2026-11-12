const vm = require("node:vm");
const fs = require("node:fs");
const path = require("node:path");
const Engine = require("../dist/engine.js");
function boot(options = {}) {
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
    window: { scrollTo() {}, ENERGYOPS_DISABLE_JOINT_DEFAULT: !options.jointDefault, ENERGYOPS_DISABLE_MODEL_DEFAULT: !options.modelDefault },
    document: {
      querySelector: (id) => nodes.get(id) || null,
      querySelectorAll: () => [],
    },
  });
  for (const file of [
    "meeting-support.js",
    "i18n.js",
    "carbon-factor-data.js",
    "carbon-factor.js",
    "load-forecast-data.js",
    "load-forecast.js",
    "app.js",
    "business-ui.js",
    "load-forecast-ui.js",
    "joint-forecast-data.js",
    "joint-forecast-ui.js",
    "carbon-factor-ui.js",
  ])
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

module.exports = { boot };
