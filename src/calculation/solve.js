import { buildLP } from "./buildLP";
import {calFarmRecipe } from "@/calculation/farmRecipe"

export  async function solve({
  lpSolve,
  Recipes,
  redundancy,
  MAX_ITER = 20,
}) {
  let bestFallback = null;
  // 构建配方
  let RecipesW = JSON.parse(JSON.stringify(Recipes));
  // console.log(Recipes);
  
  for (let iter = 0; iter < MAX_ITER; iter++) {
    console.log("次数",iter+1);
    // -----------------------------
    // 一：全部配方连续解
    // -----------------------------
    const lpData1 = buildLP(RecipesW);
    const lpRes1 = await lpSolve(lpData1);
    console.log(lpRes1.Status);
    if (lpRes1.Status !== "Optimal"){
      RecipesW.map(recipe => {
        if (recipe.Factory.name === "人口"){
          recipe.FixedValue = null
        }
      })
      if (redundancy["工人"][1] >= 9999){
        redundancy["工人"][1] -= 9999
      }
      continue
    }
    // 提取解向量
    let solution = {};
    for (const [name, col] of Object.entries(lpRes1.Columns)) {
      if (col.Primal > 1e-6) solution[name.replace("x_", "")] = col.Primal;
    }
    // -----------------------------
    // 二：核电配方整数解
    // -----------------------------
    let RecipesWInt = JSON.parse(JSON.stringify(RecipesW))
    let NumFBR = 0 
    for(const recipe of [...RecipesWInt].reverse()){
      if (String(recipe?.ID) in solution){
        if (recipe.Factory.name === "办公室 III"){
            recipe.FixedValue = Math.ceil(solution[recipe.ID]) 
        }
        if (recipe.Factory.name === "核反应堆 I"){
            recipe.FixedValue =Math.ceil(solution[recipe.ID] * 3) / 3 
        }
        if (recipe.Factory.name === "核反应堆 II"){
            recipe.FixedValue = Math.ceil(solution[recipe.ID] * 4) / 4 
        }
        if (JSON.stringify(recipe.Items.product) === JSON.stringify( {"蒸汽（超高压）": 384,"核心燃料（用过）": 16,"毯式燃料（浓缩）": 16})){
          recipe.FixedValue = Math.ceil(solution[recipe.ID] * 4) / 4 
        }
        if (JSON.stringify(recipe.Items.product) === JSON.stringify( {"蒸汽（超高压）": 96,"核心燃料（用过）": 16,"毯式燃料（浓缩）": 48})){
          NumFBR = Math.ceil(solution[recipe.ID] * 4) / 4 //向上取值到0.25的整数倍
          recipe.FixedValue = NumFBR
        }
        if (JSON.stringify(recipe.Items.product) === JSON.stringify( {"蒸汽（超高压）": 384,"核心燃料（用过）": 8})){
          recipe.FixedValue = NumFBR * 4
        }
      }
      else{
        if (["核反应堆 I","核反应堆 II","快中子增殖反应堆"].includes(recipe.Factory.name)){
          recipe.FixedValue = 0
        }
      }
    }
    const lpData2 = buildLP(RecipesWInt);
    const lpRes2 = await lpSolve(lpData2);
    solution = {};
    for (const [name, col] of Object.entries(lpRes2.Columns)) {
      if (col.Primal > 1e-6) solution[name.replace("x_", "")] = col.Primal;
    }
    // -----------------------------
    // 三：农业配方整数解
    // -----------------------------   
    let index = RecipesWInt.length
    let farmRecipe = null
    for(const recipe of RecipesWInt){
      const farmCfg = recipe?.farmCfg      
      if (farmCfg && recipe.Factory.name == "农业系统" ){
        if (!(String(recipe?.ID) in solution)) continue
        const amount = solution[recipe.ID]
        const amountInt = Math.floor(amount)
        const amountDec = amount - Math.floor(amount)

        recipe.FixedValue = amountInt
        // 计算小数部分对应的农业系统
        const ftK = 1.02// 农作物产量冗余系数
        const ftTargetNew = Math.ceil(Math.max(1.4*ftK*amountDec,0.6)/0.1)*0.1
        const ftCfg = ["肥料 II",2.5,ftTargetNew]

        farmRecipe = JSON.parse(JSON.stringify(recipe))
        farmRecipe.farmCfg.fertilityCfg = ftCfg
        farmRecipe.Items = (calFarmRecipe(farmRecipe.farmCfg)).Items
        farmRecipe.FixedValue = 1
        farmRecipe.ID = index

        const lpData3 = buildLP([...RecipesWInt,farmRecipe]);
        const lpRes3 = await lpSolve(lpData3);
        solution = {};
        for (const [name, col] of Object.entries(lpRes3.Columns)) {
          if (col.Primal > 1e-6) solution[name.replace("x_", "")] = col.Primal;
        }
        break
      }
    }

    // -----------------------------
    // 四：计算使用率，判断是否可行
    // -----------------------------
    /* ---------- 1. 计算真实产出、消耗 ---------- */
    let resultRecipes = Recipes
    if(farmRecipe) resultRecipes = [...Recipes,farmRecipe]
    
    const pc = calcRealPC(
      resultRecipes,
      solution,
      redundancy
    );
    
    /* ---------- 2. 使用判断率 ---------- */
    let allOK = true;
    let useRates = {}
    for (const item in redundancy) {
      const { produced, consumption } = pc[item];

      const useRate = produced / consumption 
      pc[item]["useRate"] = useRate

      useRates[item] = useRate
      const [low, high] = redundancy[item];
      if (useRate < low || useRate > high) {
        allOK = false;
      }
    }
    console.log(pc);
    if (pc["工人"].useRate < 1){
      RecipesW.map(recipe => {
        if (recipe.Factory.name === "人口"){
          recipe.FixedValue = null
        }
      })
      if (redundancy["工人"][1] >= 9999){
        redundancy["工人"][1] -= (9999-0.05)
      }
    }
    /* ---------- 3. 满足条件直接返回 ---------- */
    if (allOK) {
      console.log("满足");
      console.log(solution);
      return {
        resultRecipes,       
        solution,
        pc,
      };
    }
    /* ---------- 4. 记录兜底解 ---------- */
    const penalty = Object.entries(useRates)
      .filter(([_, r]) => r > 1)
      .reduce((sum, [item, r]) => {
        const [l, h] = redundancy[item];
        return sum + Math.abs(r - (l + h) / 2);
      }, 0);

    if (!bestFallback || penalty < bestFallback.penalty) {
      bestFallback = {
        resultRecipes,       
        solution,
        pc,
        penalty,
      };
    }

    /* ---------- 5. 权重调整 ---------- */
    adjustRecipeWeights(
      RecipesW,
      useRates,
      redundancy
    );
  }

  /* ---------- 6. 兜底返回 ---------- */
  if (bestFallback) {
    return bestFallback;
  }

  return { feasible: false };
}

/**
 * 统计 LP 解对应的真实产出、消耗 
 */
function RealCsm(item,amount,recipeAmount){
  if (item === "工人") 
    return amount * Math.ceil(recipeAmount)
  else if (item.startsWith("维护")){
    const floorN = Math.floor(recipeAmount);
    return amount * (0.8 * recipeAmount + 0.2 * floorN);
  }
  else
    return amount * recipeAmount
}
function calcRealPC(recipes, solution, redundancy) {
  const targets = Object.keys(redundancy);

  const pc = {};
  for (const name of targets) {
    pc[name] = {
      produced: 0,
      consumption: 0
    };
  }

  for (const r of recipes) {
    const x = solution[r.ID] ?? 0;
    if (x < 0) continue;

    /* ========= 消耗：Factory.consumption & Items.material ========= */
    for (const [item, amount] of Object.entries(r.Factory?.consumption || {})) {
      if (!pc[item]) continue;
      pc[item].consumption += RealCsm(item, amount, x);
    }

    for (const [item, amount] of Object.entries(r.Items?.material || {})) {
      if (!pc[item]) continue;
      pc[item].consumption += RealCsm(item, amount, x);
    }
    /* ========= 产出：Items.product ========= */
    for (const [item, amount] of Object.entries(r.Items?.product || {})) {
      if (!pc[item]) continue;
      pc[item].produced += amount * x;
    }
  }

  return pc;
}


/**
 * 权重调整
 */

function adjustRecipeWeights(
  recipes,
  useRates,
  redundancy
) {
  const clamp = (x, min, max) => Math.max(min, Math.min(max, x));

  for (const item in redundancy) {
    const rate = useRates[item];
    if (!rate) continue;

    const [low, high] = redundancy[item];
    if ((rate >= low && rate <= high) || high >= 9999) continue;

    const avg = (low + high) / 2;
    const weight = clamp(rate / avg, 0.7, 1.3);
    // const weight = clamp(rate / avg, 0.95, 1.05);
    // const weight = rate / avg

    for (const r of recipes) {
      if (!r.Items?.product) continue;
      if (r.Items.product[item] !== undefined) {
        // console.log("权重调整前:", item, r.Items.product[item]);
        r.Items.product[item] *= weight;
        // console.log("权重调整后:", item, r.Items.product[item]);
      }
    }
  }
}




