/* Selects one frozen 24-hour Guangdong carbon-factor centroid for dispatch. */
(function (root) {
  const bundle = root.ENERGYOPS_CARBON_FACTORS;
  function finite(value) {
    return typeof value === "number" && Number.isFinite(value) && value >= 0;
  }
  function profile(id) {
    return bundle.profiles.find((item) => item.id === id) || null;
  }
  function series(id) {
    const selected = profile(id);
    if (
      !selected ||
      selected.centroid.length !== bundle.point_count ||
      !selected.centroid.every(finite)
    )
      throw new Error("Invalid carbon factor profile");
    return selected.centroid.slice();
  }
  function selectedId() {
    if (typeof S !== "undefined" && S.carbonProfile && profile(S.carbonProfile))
      return S.carbonProfile;
    return bundle.default_id;
  }
  const original = Engine.dataset;
  Engine.dataset = function (scenario) {
    const data = original(scenario);
    const id = selectedId();
    const selected = profile(id);
    data.carbon = series(id);
    data.carbonFactor = {
      id: selected.id,
      name: selected.name,
      cluster: selected.cluster,
      version: bundle.version,
      region: bundle.region,
      scenario: bundle.scenario,
      year: bundle.year,
      unit: bundle.unit,
      source_unit: bundle.source_unit,
      representative_date: selected.representative_date,
      days: selected.days,
      weight: selected.weight,
      daily_mean: selected.daily_mean,
      method: bundle.method,
    };
    return data;
  };
  const api = { bundle, profile, series, selectedId };
  root.EnergyOpsCarbonFactor = api;
  globalThis.EnergyOpsCarbonFactor = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
