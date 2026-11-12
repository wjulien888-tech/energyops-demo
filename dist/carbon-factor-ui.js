/* Parameter-page switch among the three saved typical-day carbon factors. */
(function () {
  function setCarbonProfile(id) {
    if (!EnergyOpsCarbonFactor.profile(id)) {
      toast("没有该碳因子典型日");
      return false;
    }
    if (S.carbonProfile === id) return true;
    invalidateOutputs("parameters");
    S.carbonProfile = id;
    S.dataVersion++;
    data = Engine.dataset(S.scenario);
    draft = Engine.plans(data, S);
    S.current = null;
    S.fault = null;
    render();
    return true;
  }
  globalThis.setCarbonProfile = setCarbonProfile;
  const previousReport = reportText;
  reportText = function (record) {
    const text = previousReport(record);
    const factor = record?.inputs?.data?.carbonFactor || data.carbonFactor;
    if (!factor) return text;
    if (interfaceLanguage === "en")
      return (
        text +
        `\nCarbon factors: Guangdong ${factor.year} scenario ${factor.scenario} K-means ${factor.id} centroid; representative date ${factor.representative_date}; ${factor.days} days; unit ${factor.unit} (source ${factor.source_unit}). Not co-located or same-year measured with the load or PV series.\n`
      );
    return (
      text +
      `\n碳因子：${factor.name}，广东${factor.year}年${factor.scenario}情景K-means聚类中心，代表日${factor.representative_date}，${factor.days}天，单位${factor.unit}（来源${factor.source_unit}）。与负荷、光伏不是同一地点、同一年份的同步实测。\n`
    );
  };
})();
