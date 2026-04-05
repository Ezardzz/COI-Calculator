export function calFarmRecipe(farmCfg) {
    const {farmCsm,cropData,rotationList,kWater,kYield,fertilityCfg,farmTier} = farmCfg
    const [ftType, ftScale, ftTarget] = fertilityCfg;
    // 计算总体消耗与产出
    let farmRecipe = {
        ID:0,
        Factory:{
            name:"农业系统",
            consumption:{}
        },
        Items:{
            product:{},
            material:{}
        },
        Category:"食品制造",
        Farm:{},
        farmCfg:farmCfg,
        Enable:true
    }
    let {material,product} = farmRecipe.Items
    let totalAmount = 0
    for (const [rotation,rotationAmount] of Object.entries(rotationList)){
        farmRecipe.Farm[rotation] = rotationAmount
        totalAmount += rotationAmount
        const r = JSON.parse(rotation)
        // rotation(cropData,ftConfig,kWater,kYield,JSON.parse(rotation),material,product,amount)
        // 计算轮作表的总周期
        let rotationTime = 0
        for (const crop of r) rotationTime += cropData[crop].period
        // 计算各种作物的产出以及水肥消耗的月均值        
        let Wc = 0; // 一个周期内作物的水总消耗
        let Fc = 0; // 一个周期内作物生长的肥力总消耗    
        for (const crop of r) {            
            // 水总消耗
            Wc += cropData[crop].water * kWater
            
            // 肥力总消耗 = 作物肥力消耗 + 自然补充消耗
            // 自然补充的肥力消耗：Fc为作物肥力总月均需求，Ft为肥力目标（小数），Fs为自然补充肥力
            // 肥力目标 < 1时：肥力总消耗 = Fc + (Ft - 1) * 10 * 3
            // 肥力目标 >= 1时：肥力总消耗 = Fc + (Ft - 1) * 10 * Fs
            if (ftTarget < 1) {
                Fc += cropData[crop].fertility + (ftTarget - 1) * 10 * 3;
            } else {
                Fc += cropData[crop].fertility + (ftTarget - 1) * 10 * cropData[crop].naturalFertility;
            }  
            // 每月产出
            product[crop] = (product[crop] || 0) + cropData[crop].yield * kYield * ftTarget / rotationTime * rotationAmount
        }          
        material["水"] = (material["水"] || 0) + Wc / rotationTime * rotationAmount
        material[ftType] = (material[ftType] || 0) + Fc / ftScale / rotationTime * rotationAmount
    }
    totalAmount = Math.ceil(totalAmount)
    let consumption = JSON.parse(JSON.stringify(farmCsm))
    Object.keys(consumption).forEach(item => {
        consumption[item] *= totalAmount;
    });
    farmRecipe.Factory.consumption = consumption

    return farmRecipe;
}