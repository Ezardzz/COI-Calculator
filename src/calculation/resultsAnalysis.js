export function ResultsAnalysis(result,Recipes,pc){
  const categoryResults = {};
  const categoryTotalItems = {};
  const specialItems ={
    "占地":{
      consumption: 0
    },
    "凝聚力":{
      produced: 0,
      consumption: 0
    },
    "研究点数":{
      produced: 0  
    }
  }
  const deficientItems = [] // 存在缺口的物品
  const totalItems = {}
  const noStatsItems = new Set([...["占地","水污染","空气污染","模块等级","进口模块","出口模块","目标肥力","农场数"], ...Object.keys(pc)])
//   console.log(Recipes);
  
  // 构建骨架
  for (const recipe of Recipes) {
    const category = recipe.Category;
    if (category in categoryResults) continue;
    categoryResults[category] = {
        recipes: [],
        totalOutput: {},
        totalInput: {},
        totalConsumption: {}
    };
    
    categoryTotalItems[category] = {};
  }
  
  // 统计
  for (let recipe of Recipes) {
    const C = categoryResults[recipe.Category];
    const T = categoryTotalItems[recipe.Category];
    const recipeAmount = result[recipe.ID]
    recipe.Amount = toSignificantDigits(recipeAmount)
    // 主产物（改为对象取第一个key）
    recipe.MainProduct = recipe.Items.product
      ? Object.keys(recipe.Items.product)[0]
      : null; 
    // 若出现兜底配方则表示出现物品缺口
    if ("Deficiency" in recipe) deficientItems.push(recipe.MainProduct)
    // 建筑消耗
    Object.entries(recipe.Factory.consumption || {}).forEach(([itemName, itemAmount]) => {
      recipe.Factory.consumption[itemName] = toSignificantDigits(itemAmount)
      const Amount = RealCsm(itemName,itemAmount,recipeAmount);
      C.totalConsumption[itemName] =
          (C.totalConsumption[itemName] || 0) + Amount;
      if (itemName in specialItems) specialItems[itemName].consumption += Amount
      else if (!noStatsItems.has(itemName)) totalItems[itemName] = (totalItems[itemName] || 0) - Amount
    });
    
    // 产品
    Object.entries(recipe.Items.product || {}).forEach(([itemName, itemAmount]) => {
      recipe.Items.product[itemName] = toSignificantDigits(itemAmount)
      const Amount = itemAmount * recipeAmount;
      T[itemName] = (T[itemName] || 0) + Amount;
      if (itemName == "凝聚力") specialItems["凝聚力"].produced += Amount
      else if (itemName == "研究点数") {
        let k = 1

        recipe.Items.product[itemName] = toSignificantDigits(itemAmount * (1 + 0.05 * pc["工人"].produced / 1000))
        specialItems["研究点数"].produced += recipe.Items.product[itemName] * recipeAmount
      }
      else if (!noStatsItems.has(itemName)) totalItems[itemName] = (totalItems[itemName] || 0) + Amount
    });
    
    // 原料
    Object.entries(recipe.Items.material || {}).forEach(([itemName, itemAmount]) => {
      recipe.Items.material[itemName] = toSignificantDigits(itemAmount)
      const Amount = itemAmount * recipeAmount;
      T[itemName] = (T[itemName] || 0) - Amount;
      if (itemName == "凝聚力") specialItems["凝聚力"].consumption += Amount
      else if (!noStatsItems.has(itemName)) totalItems[itemName] = (totalItems[itemName] || 0) - Amount
    });

    // 添加配方
    C.recipes.push(recipe);
  }
  
  // 输入输出分类
  Object.entries(categoryTotalItems).forEach(([category, items]) => {
    Object.entries(items).forEach(([itemName, itemAmount]) => {
      if (itemAmount > 0.01)
        categoryResults[category].totalOutput[itemName] = toSignificantDigits(itemAmount);
      
      if (itemAmount < -0.01)
        categoryResults[category].totalInput[itemName] = -1 * toSignificantDigits(itemAmount);
    });
  });
  specialItems.凝聚力.produced = toSignificantDigits(specialItems.凝聚力.produced)
  specialItems.凝聚力.consumption = toSignificantDigits(specialItems.凝聚力.consumption)

  const TotalItems =  filterSmallValues(totalItems)
  console.log(TotalItems);
  return {categoryResults,specialItems,deficientItems};
};



// 工具函数
function RealCsm(item,amount,recipeAmount){
  if (item === "工人" || item === "占地") 
    return amount * Math.ceil(recipeAmount)
  else if (item.startsWith("维护"))
    return amount * (0.8 * recipeAmount + 0.2 * Math.ceil(recipeAmount));
  else
    return amount * recipeAmount
}
function toSignificantDigits(num, digits = 4) {
  if (num === 0) return 0;
  
  const magnitude = Math.floor(Math.log10(Math.abs(num)));
  const numDigits = magnitude + 1;  // num 的位数
  
  // 实际有效位数取 digits 和 numDigits 中的较大值
  const effectiveDigits = Math.max(digits, numDigits);
  
  const factor = Math.pow(10, effectiveDigits - magnitude - 1);
  return Math.round(num * factor) / factor;
}

function filterSmallValues(obj) {
    const result = {};
    Object.entries(obj).forEach(([key, value]) => {
        if (Math.abs(value) >= 0.1) {
            result[key] = value;
        }
    });
    return result;
}
