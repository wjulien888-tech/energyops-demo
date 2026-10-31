/* Deterministic demonstration engine. No production optimizer or trained model. */
(function (root) {
  const hours = Array.from({ length: 24 }, (_, i) => i);
  function dataset(scenario = "sunny") {
    const load = hours.map((h) =>
      Math.round(
        103 +
          63 * Math.exp(-(((h - 11) / 4) ** 2)) +
          78 * Math.exp(-(((h - 19) / 3) ** 2)),
      ),
    );
    const pv = hours.map((h) =>
      Math.round(
        Math.max(0, Math.sin(((h - 6) / 12) * Math.PI)) *
          145 *
          (scenario === "cloudy" ? 0.48 : 1),
      ),
    );
    const actual = load.map((v, h) =>
      Math.round(v * (1 + 0.045 * Math.sin(h * 1.7))),
    );
    const actualPV = pv.map((v, h) =>
      Math.round(v * (0.92 + 0.07 * Math.cos(h * 1.3))),
    );
    const price = hours.map((h) =>
      h < 7 ? 0.32 : h >= 17 && h < 22 ? 1.18 : h >= 10 && h < 15 ? 0.65 : 0.82,
    );
    const carbon = hours.map((h) =>
      h < 7 ? 0.68 : h >= 10 && h < 16 ? 0.32 : h >= 17 && h < 22 ? 0.78 : 0.5,
    );
    return { hours, load, pv, actual, actualPV, price, carbon };
  }
  function calculate(
    data,
    config,
    weight = 0,
    state = "normal",
    prefix = null,
  ) {
    const capacity = Number(config.capacity),
      power = Number(config.power),
      eff = 0.95,
      min = capacity * 0.15,
      max = capacity * 0.9,
      initial = capacity * 0.5;
    let energy = initial;
    const rows = [];
    const available = state !== "failed";
    const score = data.price.map((p, h) => p + weight * data.carbon[h]);
    const sorted = [...score].sort((a, b) => a - b),
      low = sorted[7],
      high = sorted[16];
    for (let h = 0; h < 24; h++) {
      if (prefix && h < 14) {
        const r = { ...prefix[h] };
        rows.push(r);
        energy = r.energy;
        continue;
      }
      const active = available || h < 14;
      let net = data.load[h] - data.pv[h],
        charge = 0,
        discharge = 0;
      const p = state === "partial" && h >= 14 ? power * 0.35 : power;
      if (active) {
        if (net < 0) charge = Math.min(-net, p, (max - energy) / eff);
        else if (score[h] < (low + high) / 2 && h < 21)
          charge = Math.min(
            p *
              Math.min(
                1,
                ((low + high) / 2 - score[h]) /
                  Math.max(0.01, (low + high) / 2 - sorted[0]),
              ),
            (max - energy) / eff,
          );
        else if (score[h] > (low + high) / 2)
          discharge = Math.min(
            p *
              Math.min(
                1,
                (score[h] - (low + high) / 2) /
                  Math.max(0.01, sorted[23] - (low + high) / 2),
              ),
            net,
            (energy - min) * eff,
          );
        if (h === 23) {
          if (energy > initial)
            discharge = Math.min(p, Math.max(0, net), (energy - initial) * eff);
          else charge = Math.min(p, (initial - energy) / eff);
        }
      }
      if (active) {
        const remaining = (23 - h) * p;
        const floor = initial - remaining * eff,
          ceiling = initial + remaining / eff;
        const projected = energy + charge * eff - discharge / eff;
        if (projected < floor) {
          discharge = 0;
          charge = Math.min(p, Math.max(0, (floor - energy) / eff));
        }
        if (projected > ceiling) {
          charge = 0;
          discharge = Math.min(
            p,
            Math.max(0, net),
            Math.max(0, (energy - ceiling) * eff),
          );
        }
      }
      energy += charge * eff - discharge / eff;
      const grid = Math.max(0, net + charge - discharge),
        curtail = Math.max(0, -net - charge);
      rows.push({
        h,
        load: data.load[h],
        pv: data.pv[h],
        charge,
        discharge,
        grid,
        curtail,
        soc: (energy / capacity) * 100,
        energy,
        price: data.price[h],
        carbon: data.carbon[h],
      });
    }
    return {
      rows,
      cost: rows.reduce((s, r) => s + r.grid * r.price, 0),
      carbon: rows.reduce((s, r) => s + r.grid * r.carbon, 0),
      grid: rows.reduce((s, r) => s + r.grid, 0),
      curtail: rows.reduce((s, r) => s + r.curtail, 0),
      capacity,
      power,
      weight,
      state,
      initial,
      terminal: energy,
    };
  }
  function plans(data, config, state = "normal", prefix = null) {
    const candidates = Array.from({ length: 81 }, (_, i) =>
      calculate(data, config, i * 0.1, state, prefix),
    );
    const base = candidates.reduce((a, b) => (b.cost < a.cost ? b : a));
    const green = candidates.reduce((a, b) => (b.carbon < a.carbon ? b : a));
    const feasible = candidates.filter(
      (p) => p.cost <= base.cost * (1 + Number(config.budget) / 100) + 1e-6,
    );
    const constrained = feasible.sort((a, b) => a.carbon - b.carbon)[0] || base;
    return [
      { ...base, key: "economic", name: "经济优先" },
      { ...green, key: "green", name: "低碳优先" },
      { ...constrained, key: "balanced", name: "成本约束低碳" },
    ];
  }
  function verify(plan) {
    const balance = Math.max(
      ...plan.rows.map((r) =>
        Math.abs(r.pv + r.grid + r.discharge - r.load - r.charge - r.curtail),
      ),
    );
    let e = plan.initial,
      energyError = 0;
    for (const r of plan.rows) {
      e += r.charge * 0.95 - r.discharge / 0.95;
      energyError = Math.max(energyError, Math.abs(e - r.energy));
    }
    const bounds = plan.rows.every(
      (r) =>
        r.soc >= 15 - 1e-6 &&
        r.soc <= 90 + 1e-6 &&
        r.charge <=
          (r.h >= 14 && plan.state === "partial"
            ? plan.power * 0.35
            : r.h >= 14 && plan.state === "failed"
              ? 0
              : plan.power) +
            1e-6 &&
        r.discharge <=
          (r.h >= 14 && plan.state === "partial"
            ? plan.power * 0.35
            : r.h >= 14 && plan.state === "failed"
              ? 0
              : plan.power) +
            1e-6 &&
        r.charge * r.discharge < 1e-6,
    );
    const cost = plan.rows.reduce((s, r) => s + r.grid * r.price, 0),
      carbon = plan.rows.reduce((s, r) => s + r.grid * r.carbon, 0);
    return {
      ok:
        balance < 1e-6 &&
        energyError < 1e-6 &&
        bounds &&
        Math.abs(cost - plan.cost) < 1e-6 &&
        Math.abs(carbon - plan.carbon) < 1e-6,
      balance,
      energyError,
      bounds,
      cost,
      carbon,
      terminal: plan.terminal - plan.initial,
    };
  }
  function noStorage(data) {
    const rows = data.hours.map((h) => ({
      h,
      load: data.load[h],
      pv: data.pv[h],
      grid: Math.max(0, data.load[h] - data.pv[h]),
      curtail: Math.max(0, data.pv[h] - data.load[h]),
    }));
    return {
      rows,
      cost: rows.reduce((s, r) => s + r.grid * data.price[r.h], 0),
      carbon: rows.reduce((s, r) => s + r.grid * data.carbon[r.h], 0),
    };
  }
  function error(pred, actual) {
    return {
      mae:
        pred.reduce((s, v, i) => s + Math.abs(v - actual[i]), 0) / pred.length,
      rmse: Math.sqrt(
        pred.reduce((s, v, i) => s + (v - actual[i]) ** 2, 0) / pred.length,
      ),
    };
  }
  const api = { dataset, calculate, plans, verify, error, noStorage };
  root.Engine = api;
  if (typeof module !== "undefined") module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
