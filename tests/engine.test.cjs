const assert = require("node:assert/strict");
const E = require("../dist/engine.js");
let count = 0;
for (const scenario of ["sunny", "cloudy"])
  for (const capacity of [100, 320, 1000])
    for (const power of [20, 60, 100])
      for (const budget of [0, 5, 30]) {
        const cfg = { capacity, power, budget },
          data = E.dataset(scenario),
          normal = E.plans(data, cfg),
          original = normal[2];
        for (const state of ["normal", "full", "partial", "failed"]) {
          const plans =
            state === "normal"
              ? normal
              : E.plans(data, cfg, state, original.rows);
          for (const p of plans) {
            assert.equal(
              E.verify(p).ok,
              true,
              JSON.stringify({ scenario, capacity, power, budget, state }),
            );
            if (["normal", "full"].includes(state))
              assert.ok(
                Math.abs(p.terminal - p.initial) < 1e-6,
                "terminal energy",
              );
            if (state !== "normal")
              assert.deepEqual(
                p.rows.slice(0, 14),
                original.rows.slice(0, 14),
                "pre-fault history must stay unchanged",
              );
            count++;
          }
          assert.ok(
            plans[2].cost <= plans[0].cost * (1 + budget / 100) + 1e-6,
            "carbon budget",
          );
          assert.ok(
            plans[0].cost <= plans[1].cost + 1e-6,
            "economic candidate costs",
          );
          assert.ok(
            plans[1].carbon <= plans[0].carbon + 1e-6,
            "carbon candidate ordering",
          );
        }
      }
const corrupted = E.plans(E.dataset(), {
  capacity: 320,
  power: 60,
  budget: 5,
})[0];
corrupted.rows[5].grid += 10;
assert.equal(E.verify(corrupted).ok, false, "tampered balance rejected");
console.log(
  `${count} plans passed: balance, energy, state-dependent power, budget, terminal and preserved fault history. Tamper detection passed.`,
);
