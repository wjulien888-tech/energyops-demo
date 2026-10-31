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
  for (const file of ["meeting-support.js", "app.js", "business-ui.js"])
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
