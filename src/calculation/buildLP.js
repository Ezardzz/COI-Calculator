export function buildLP(recipes) {
  const varX = (id) => `x_${id}`;
  const varN = (id) => `n_${id}`;
  // console.log(recipes);
  
  let lp = "";

  /* =====================
   * 1.IntList
   * ===================== */
  // const IntList = new Set(
  //   recipes
  //     .filter(r =>
  //       (r.Factory?.consumption?.find(c => c[0] === "占地")?.[1] ?? 0) > 80
  //     )
  //     .map(r => r.ID)
  // );
  // const IntList = new Set(
  //   recipes
  //     .filter(r =>
  //       (["快中子增殖反应堆"].includes(r.Factory.name))
  //     )
  //     .map(r => r.ID)
  // );
  // console.log(IntList);
  
  const IntList = new Set([]);

  /* =====================
   * 2. 目标函数
   * ===================== */
  const TargetItem = "占地";
  const Direction = "MIN";
  const sense = Direction === "MAX" ? "Maximize\n" : "Minimize\n";
  const pollutionWeight = 10

  lp += sense + " obj:\n";

  lp += recipes.map(r => {
    // 占地值
    let str = ''
    const land = r.Factory?.consumption?.[TargetItem] ?? 0;
    if (IntList.has(r.ID)) 
      str += `${land} ${varN(r.ID)}`;
    else 
      str += `${land} ${varX(r.ID)}`;
    // 污染值
    const waterPollution = (r.Items?.product?.["空气污染"] ?? 0) * pollutionWeight;
    if (waterPollution){
      str += " + "
      if (IntList.has(r.ID)) 
        str += `${waterPollution} ${varN(r.ID)}`;
      else 
        str += `${waterPollution} ${varX(r.ID)}`;    
    }
    const airPollution = (r.Items?.product?.["水污染"] ?? 0) * pollutionWeight;
    if (airPollution){
      str += " + "
      if (IntList.has(r.ID)) 
        str += `${airPollution} ${varN(r.ID)}`;
      else 
        str += `${airPollution} ${varX(r.ID)}`;    
    }

    return str
  }).join(" + ");

  lp += "\n";

  /* =====================
   * 3. 物料平衡约束
   * ===================== */
  lp += "Subject To\n";

  const itemStats = new Map();

  const mark = (item, type) => {
    if (!itemStats.has(item)) {
      itemStats.set(item, { hasProduct: false, hasConsumption: false });
    }
    itemStats.get(item)[type] = true;
  };

  recipes.forEach(r => {
    Object.keys(r.Items?.product || {}).forEach(item => mark(item, "hasProduct"));
    Object.keys(r.Items?.material || {}).forEach(item => mark(item, "hasConsumption"));
    Object.keys(r.Factory?.consumption || {}).forEach(item => mark(item, "hasConsumption"));
  });

  itemStats.forEach((stat, item) => {
    if (["占地","水污染","空气污染","模块等级","进口模块","出口模块"].includes(item) || item.includes('!')) return;
    if (["维护 I","维护 II","维护 III","工人","电","算力"].includes(item)) return;
    if (['原油','煤', '铁矿石', '铜矿石', '沙', '石英', '石灰石', '金矿石','金', '铀矿石', '钛矿石', '铝土矿', '岩石', '木材'].includes(item)) return;
    // if (!(stat.hasProduct && stat.hasConsumption)) return;
    let terms = [];

    recipes.forEach(r => {
      const x = varX(r.ID);

      Object.entries(r.Items?.product || {}).forEach(([name, qty]) => {
        if (name === item && qty !== 0) {
          terms.push(`${qty} ${x}`);
        }
      });

      Object.entries(r.Items?.material || {}).forEach(([name, qty]) => {
        if (name === item && qty !== 0) {
          terms.push(`- ${qty} ${x}`);
        }
      });

      Object.entries(r.Factory?.consumption || {}).forEach(([name, qty]) => {
        if (name === item && qty !== 0) {
          terms.push(`- ${qty} ${x}`);
        }
      });
    });

    // 防止生成空约束
    if (terms.length === 0) return;

    // 拼接表达式（不会有开头 +）
    const expr = terms.join(" ");
    const safe = item.replace(/\s+/g, "_");
    if (["凝聚力","专注点","研究点数","工人","电"].includes(item)){
      lp += ` balance_${safe}: ${expr} >= 0\n`;
    }
    else{
      lp += ` balance_${safe}: ${expr} = 0\n`;
    }
  });

  /* =====================
   * 4. 向上取整约束（n_i ≥ x_i）
   * ===================== */
  recipes.forEach(r => {
    if (!IntList.has(r.ID)) return;
    lp += ` ceil_${r.ID}: ${varN(r.ID)} - ${varX(r.ID)} >= 0\n`;
  });

  /* =====================
   * 5. Bounds（新增）
   * ===================== */
  lp += "Bounds\n";

  recipes.forEach(r => {
    const x = varX(r.ID);

    // FixedValue 优先级最高
    if (r.FixedValue !== undefined && r.FixedValue !== null ) {
      lp += ` ${x} = ${r.FixedValue}\n`;      
      return;
    }
    // UpperBound
    if (r.UpperBound !== undefined && r.UpperBound !== null) {
      lp += ` ${x} <= ${r.UpperBound}\n`;
    }
    // LowerBound
    if (r.LowerBound !== undefined && r.LowerBound !== null) {
      lp += ` ${x} >= ${r.LowerBound}\n`;
    }
    else{
      // 默认下界
      lp += ` ${x} >= 0\n`;
    }
  });
  /* =====================
   * 6. 整数变量声明
   * ===================== */

  lp += "Integers\n";

  recipes.forEach(r => {
    if (IntList.has(r.ID)) {
      lp += ` ${varN(r.ID)}\n`;
    }
    if ("Int" in r){
      lp += ` ${varX(r.ID)}\n`;
    }
  });
  /* =====================
   * 7. 结尾
   * ===================== */
  lp += "End\n";
  // console.log(lp);
  
  return lp;
}