import {calFarmRecipe } from "./farmRecipe"
export function cfg2recipe(configuration,GameData,recipeData,contractData){
    const buffResult = calBuffResult(configuration)
    // 特殊配方
    const specialRecipe = {}
    for (let recipe of recipeData){  
        if(recipe.Factory.name.includes("#")){ //特殊标识筛选
            recipe.Factory.name = recipe.Factory.name.replace(/#/g, '')//删除特殊标识
            recipe.Enable = false //先禁用，根据configuration内配置决定是否启用
            const {material,product} = recipe.Items
            const FactoryName = recipe.Factory.name

            if (["维修站 I","维修站 II","维修站 III","破碎机","船长办公室 II","办公室 III","垃圾收集站","生物质收集站","可回收物收集站"].includes(FactoryName))
                recipe.Enable = true
            else{
                if (!specialRecipe[FactoryName]) specialRecipe[FactoryName] = {}

                if (FactoryName == "研究实验室 IV"){
                    if ("太空研究点数" in material) specialRecipe[FactoryName]["太空"] = recipe
                    else specialRecipe[FactoryName]["基础"] = recipe
                }
                else if (["食品市场 II","诊所","家居用品模块","家电模块","消费电子模块","奢侈品模块","供水设施","变压器","互联网模块"].includes(FactoryName)){
                    const item = Object.keys(material)[0]
                    if (FactoryName == "变压器") specialRecipe["电"] = recipe
                    else if (FactoryName == "互联网模块") specialRecipe["算力"] = recipe
                    else specialRecipe[item] = recipe
                }
                else if (FactoryName == "火箭组装站"){
                    const item = Object.keys(product)[0]
                    specialRecipe[FactoryName][item] = recipe
                }
                else if (FactoryName == "火箭发射台"){
                    const itemMt = Object.keys(material)[0]
                    const itemPd = Object.keys(product)[0]
                    if (!specialRecipe[FactoryName][itemMt]) specialRecipe[FactoryName][itemMt] = {}
                    specialRecipe[FactoryName][itemMt][itemPd] = recipe
                }
                else{
                    specialRecipe[FactoryName] = recipe
                }
            } 

        }
    }
    
    // 1：物流&原矿
    const {vehicleRecipe,sapling} = calVehicleRecipe(configuration,GameData,contractData,specialRecipe,buffResult)
    // 2：居民服务&农作物
    const settlementRecipe = calSettlementRecipe(configuration,GameData,specialRecipe,buffResult,sapling)
    // 3：固定数量设施
    const fixedRecipe = calFixedRecipe(configuration,specialRecipe,buffResult)
    // 4：基础配方增益影响
    const Recipe = [...recipeData,...settlementRecipe,...vehicleRecipe,...fixedRecipe]
    const resultRecipe = []
    let index = 0
    for (const recipeSrc of Recipe){        
        if (!recipeSrc.Enable)
            continue
        let recipe = JSON.parse(JSON.stringify(recipeSrc))
        recipe.ID = index++
        let consumption = recipe.Factory.consumption
        if ("维护 I" in consumption) consumption["维护 I"] *= buffResult.影响.维护.消耗
        if ("维护 II" in consumption) consumption["维护 II"] *= buffResult.影响.维护.消耗
        if ("维护 III" in consumption) consumption["维护 III"] *= buffResult.影响.维护.消耗
        let {material,product} = recipe.Items
        // 实验室
        if ("研究点数" in product) product["研究点数"] *= buffResult.影响.研究效率
        // 维护
        if ("维护 I" in product) product["维护 I"] *= buffResult.影响.维护.产出
        if ("维护 II" in product) product["维护 II"] *= buffResult.影响.维护.产出
        if ("维护 III" in product) product["维护 III"] *= buffResult.影响.维护.产出
        // 回收
        if ("铁废料" in product) product["铁废料"] *= buffResult.影响.回收
        if ("铜废料" in product) product["铜废料"] *= buffResult.影响.回收
        if ("铝废料" in product) product["铝废料"] *= buffResult.影响.回收
        if ("金废料" in product) product["金废料"] *= buffResult.影响.回收
        if ("碎玻璃" in product) product["碎玻璃"] *= buffResult.影响.回收
        // 住房
        if ("工人#" in material) material["工人#"] *= buffResult.影响.居民服务.住房容量
        if ("工人" in product) product["工人"] *= buffResult.影响.居民服务.住房容量  
        // 办公室
        if ("专注点" in product) product["专注点"] *= buffResult.影响.专注点
        // 太阳能
        if ((recipe.Factory.name).includes("太阳能")) product["电"] *= buffResult.影响.太阳能   

        resultRecipe.push(recipe)
    }

    return resultRecipe
}
function combineRecipe(recipeCalList, newFactoryName = null, newExtraPart = null) {
    // 初始化结果配方结构
    const resultRecipe = {
        ID:0,
        Factory: {
            name: newFactoryName || "",
            consumption: {}
        },
        Items: {
            material: {},
            product: {}
        }
    };
    
    // 遍历配方列表，进行加权求和
    recipeCalList.forEach(([recipe, multiplier]) => {
        // 处理Factory.consumption
        if (recipe.Factory?.consumption) {
            Object.entries(recipe.Factory.consumption).forEach(([key, value]) => {
                resultRecipe.Factory.consumption[key] = 
                    (resultRecipe.Factory.consumption[key] || 0) + value * multiplier;
            });
        }
        
        // 处理Items.material
        if (recipe.Items?.material) {
            Object.entries(recipe.Items.material).forEach(([key, value]) => {
                resultRecipe.Items.material[key] = 
                    (resultRecipe.Items.material[key] || 0) + value * multiplier;
            });
        }
        
        // 处理Items.product
        if (recipe.Items?.product) {
            Object.entries(recipe.Items.product).forEach(([key, value]) => {
                resultRecipe.Items.product[key] = 
                    (resultRecipe.Items.product[key] || 0) + value * multiplier;
            });
        }
    });
    
    // 合并额外部分
    if (newExtraPart) {
        Object.assign(resultRecipe, newExtraPart);
    }
    
    return resultRecipe;
}
function calBuffResult(configuration){
    const buff = configuration.buff
    const N = configuration.facility.demand.factory?.维护雕像 ?? 0
    const result={
        "影响":{
            "维护":{
                "消耗":(1 - (buff?.edicts?.减少维护?.effect ?? 0))
                      *(1 - 0.04 * (1 - 0.5 ** N) / (1 - 0.5)),
                "产出":(1 + (buff?.office?.维修产量?.effect ?? 0))
                     * (1 + (buff?.research?.维修产量?.effect[0] ?? 0)),
            },
            "回收":0.2 + (buff?.edicts?.增加回收?.effect ?? 0)
                      + (buff?.office?.回收效率?.effect ?? 0),
            "居民服务":{
                "食品消耗":(1 - (buff?.edicts?.节省食物?.effect ?? 0) 
                            + (buff?.edicts?.食物充沛?.effect ?? 0))
                            * (1 + (buff?.office?.食物消耗?.effect ?? 0)),
                "商品":{
                    "家庭用品":{
                        "消耗":1 + (buff?.edicts?.更多家具用品?.effect ?? 0),
                        "凝聚力":1 +(buff?.edicts?.更多家具用品?.unity ?? 0),
                    },
                    "家用设备":{
                        "消耗":1 + (buff?.edicts?.更多家电?.effect ?? 0),
                        "凝聚力":1 + (buff?.edicts?.更多家电?.unity ?? 0),
                    },
                    "消费类电子产品":{
                        "消耗":1 + (buff?.edicts?.更多消费电子产品?.effect ?? 0),
                        "凝聚力":1 + (buff?.edicts?.更多消费电子产品?.unity ?? 0),
                    },
                    "消耗":1 + (buff?.office?.商品与服务消耗?.effect ?? 0)//除了水和食物以外的服务
                },
                "水消耗":(1 - (buff?.edicts?.节水器?.effect ?? 0))
                      * (1 + (buff?.research?.定居点用水?.effect[0] ?? 0)),
                "凝聚力":1 + (buff?.office?.来自定居点的凝聚力?.effect ?? 0),
                "住房容量":1 + (buff?.research?.住房容量?.effect[0] ?? 0)
            },
            "农业":{
                "产量":(1 + (buff?.edicts?.农业提振?.effect ?? 0)) 
                    * (1 + (buff?.office?.农作物产量?.effect ?? 0))
                    * (1 + (buff?.research?.作物产量?.effect[0] ?? 0)),
                "耗水量":(1 - (buff?.edicts?.节水器?.effect ?? 0))
                      * (1 + (buff?.research?.作物产量?.effect[1] ?? 0))
            },
            "载具":{
                "燃料":{
                    "车辆":(1 - (buff?.edicts?.节省车辆燃料?.effect ?? 0))
                       * (1 + (buff?.research?.车辆燃料消耗?.effect[0] ?? 0)),
                    "火车":1 + (buff?.research?.火车燃料消耗?.effect[0] ?? 0),
                    "船舶":(1 - (buff?.edicts?.节省船舶燃料?.effect ?? 0))
                       * (1 + (buff?.research?.船舰燃料消耗?.effect[0] ?? 0)),
                },
                "载荷":{
                    "火箭":1 + (buff?.research?.火箭载荷量?.effect[0] ?? 0),
                }
            },
            "专注点":1 + (buff?.research?.专注点?.effect[0] ?? 0),
            "研究效率":(1 + (buff?.edicts?.研究效率?.effect ?? 0))
                       *(1  + (buff?.office?.研究效率?.effect ?? 0)),
            "太阳能":0.8 * (1 + (buff?.edicts?.清洁面板?.effect ?? 0))
                    * (1 + (buff?.research?.太阳能发电?.effect[0] ?? 0)),
            "合同凝聚力":1 + (buff?.office?.合同凝聚力消耗?.effect ?? 0)
        },
        "额外消耗":{
            "凝聚力":0
                - (buff?.edicts?.节省食物?.unity ?? 0)
                - (buff?.edicts?.食物充沛?.unity ?? 0)
                - (buff?.edicts?.节省车辆燃料?.unity ?? 0)
                - (buff?.edicts?.节省船舶燃料?.unity ?? 0)
                - (buff?.edicts?.减少维护?.unity ?? 0)
                - (buff?.edicts?.增加回收?.unity ?? 0)
                - (buff?.edicts?.农业提振?.unity ?? 0)
                - (buff?.edicts?.节水器?.unity ?? 0)
                - (buff?.edicts?.清洁面板?.unity ?? 0)
                - (buff?.edicts?.研究效率?.unity ?? 0),
            "专注点":0
                + (buff?.office?.研究效率?.focus ?? 0)
                + (buff?.office?.维修产量?.focus ?? 0)
                + (buff?.office?.农作物产量?.focus ?? 0)
                + (buff?.office?.食物消耗?.focus ?? 0)
                + (buff?.office?.商品与服务消耗?.focus ?? 0)
                + (buff?.office?.来自定居点的凝聚力?.focus ?? 0)
                + (buff?.office?.合同利润率?.focus ?? 0)
                + (buff?.office?.合同凝聚力消耗?.focus ?? 0),
        }
    }
    return result
}
function calSettlementRecipe(configuration, GameData, specialRecipe, buffResult, sapling){
    const foodCategory = {
        "碳水":["土豆","玉米","面包"],
        "肉":["肉","鸡蛋","豆腐","香肠"],
        "维生素":["蔬菜","水果"],
        "零食":["零食","蛋糕"],
    }
    const settlementRecipe = []
    const serviceData = GameData.Settlement.Service
    const housingData = GameData.Settlement.HousingTier

    const settlement = configuration.facility.settlement

    const food = settlement.food || []
    const medicine = settlement.medicine
    const commodity = settlement.commodity || []
    const housingTier = settlement.housing
    specialRecipe[housingTier].Enable = true
    const farmTier = settlement.farm


    // 农作物配方
    const kWater = buffResult.影响.农业.耗水量
    const kYield = buffResult.影响.农业.产量
    // 根据农场等级计算水肥消耗的产量的增益
    const cropDataBase = GameData.Settlement.Crop
    let cropData = JSON.parse(JSON.stringify(cropDataBase))
    for (const [crop,data] of Object.entries(cropData)){
        if (farmTier == "温室 I"){
            data.water *= 1.125//耗水量
            data.fertility *= 1.125//作物肥力
            data.yield *= 1.25//产量
            data.naturalFertility *= 1.1//自然补充
        }
        else if (farmTier == "温室 II"){
            data.water *= 1.25
            data.fertility *= 1.25
            data.yield *= 1.5
            data.naturalFertility *= 1.2
        }
    }
    const farmCsm = specialRecipe[farmTier].Factory.consumption
    //判断是否启用默认农业系统
    if (
        !sapling
        && food.length == 11
        && medicine == "医疗用品 III"
    ){
        const rotationList = {
            '["玉米","罂粟"]': 1,        
            '["土豆","小麦","油菜"]': 1,   
            '["玉米","蔬菜","玉米","水果"]': 1,
            '["小麦","水果","小麦","甘蔗"]': 1,
            '["大豆","土豆","大豆","小麦"]': 1,
            '["大豆","玉米","大豆","蔬菜"]': 1,
            '["蔬菜","土豆","蔬菜","水果"]': 1,
        }
        
        const farmCfg={
            farmCsm:farmCsm,
            cropData:cropData,
            rotationList:rotationList,
            kWater:kWater,
            kYield:kYield,
            fertilityCfg:["肥料 II",2.5,1.4],
            farmTier:farmTier
        }
        const recipe = calFarmRecipe(farmCfg)
        recipe.Category = specialRecipe["农业系统"].Category
        settlementRecipe.push(recipe)
    }
    else{
        for (const crop in cropData){
            const rotationList =  { [`["${crop}"]`]: 1 }
            const farmCfg={
                farmCsm:farmCsm,
                cropData:cropData,
                rotationList:rotationList,
                kWater:kWater,
                kYield:kYield,
                fertilityCfg:["肥料 II",2.5,1.4],
                farmTier:farmTier
            }
            const recipe = calFarmRecipe(farmCfg)
            recipe.Factory.name = crop
            recipe.Category = specialRecipe[farmTier].Category
            settlementRecipe.push(recipe)
        }
    }

    // 兜底配方
    for (const crop in cropData){
        const recipeCrop = {
            ID:0,
            Factory:{
                name:crop,
                consumption:{"占地":10000000,"工人":10000000}
            },
            Items:{
                material:{},
                product:{[crop]:1}
            },
            Category:"缺口",
            Enable:true,
            Deficiency:true 
        }
        settlementRecipe.push(recipeCrop)  
    }
    // 食物类别统计
    let categoryCount = 0
    const categoryFoodCount = {}
    for(const cat in foodCategory){
        const foods = foodCategory[cat].filter(f=>food.includes(f))
        if(foods.length>0){
            categoryCount++
            foods.forEach(f=>{
                categoryFoodCount[f] = foods.length
            })
        }
    }

    // 服务清单
    const serviceList = [
        ...food,
        medicine,
        ...commodity
    ].filter(Boolean)

    // 住房对商品消耗的增加数据
    const consumptionGrowth = housingData[housingTier]?.ConsumptionGrowth || {}

    // buff
    const buffFood = buffResult?.影响?.居民服务?.食品消耗 ?? 1
    const buffCommodity = buffResult?.影响?.居民服务?.商品?.消耗 ?? 1
    const buffWater = buffResult?.影响?.居民服务?.水消耗 ?? 1
    const buffUnityGlobal = buffResult?.影响?.居民服务?.凝聚力 ?? 1

    const buffCommoditySpecific = {
        "家庭用品": buffResult?.影响?.居民服务?.商品?.家庭用品?.消耗 ?? 1,
        "家用设备": buffResult?.影响?.居民服务?.商品?.家用设备?.消耗 ?? 1,
        "消费类电子产品": buffResult?.影响?.居民服务?.商品?.消费类电子产品?.消耗 ?? 1
    }

    const buffUnitySpecific = {
        "家庭用品": buffResult?.影响?.居民服务?.商品?.家庭用品?.凝聚力 ?? 1,
        "家用设备": buffResult?.影响?.居民服务?.商品?.家用设备?.凝聚力 ?? 1,
        "消费类电子产品": buffResult?.影响?.居民服务?.商品?.消费类电子产品?.凝聚力 ?? 1
    }

    // 满足条件时住房对凝聚力的增益
    function getHousingUnityGain(){
        const order = ["住房 II","住房 III","住房 IV"]
        let tierIndex = order.indexOf(housingTier)
        while(tierIndex >= 0){
            const tierName = order[tierIndex]
            const housing = housingData[tierName]
            if(housing?.UnityGainNeed){
                const needs = housing.UnityGainNeed
                    .map((need,i)=>({
                        need,
                        gain:housing.UnityGain[i]
                    }))
                    .sort((a,b)=>b.need.length-a.need.length)
                for(const n of needs){
                    const ok = n.need.every(s=>serviceList.includes(s))
                    if(ok){
                        return n.gain
                    }
                }
            }
            tierIndex--
        }
        return 1
    }

    const gain = getHousingUnityGain()
    // 计算服务消耗与Unity
    const service = {}
    const serviceDetail = {}
    for(const item of serviceList){
        const data = serviceData[item]
        if(!data) continue
        // 对应服务项的配方使能
        specialRecipe[item].Enable = true
        let demand = data.demand
        // 食物
        if(food.includes(item)){
            const m = categoryFoodCount[item] || 1
            const n = categoryCount || 1
            demand = demand/(n*m)
            demand *= buffFood
        }
        // 商品
        else{
            demand *= buffCommodity

            if(buffCommoditySpecific[item]){
                demand *= buffCommoditySpecific[item]
            }
            if(item === "水"){
                demand *= buffWater
            }
        }
        // 住房对商品消耗的增加
        if(consumptionGrowth[item]){
            demand *= consumptionGrowth[item]
        }
        if (item == "电" || item == "算力")
            service[item] = demand
        else
            service[item+"#"] = demand
        // 凝聚力
        let unity = data.unity
        unity *= buffUnityGlobal
        if(buffUnitySpecific[item]){
            unity *= buffUnitySpecific[item]
        }
        if(data.unityBuff){
            unity *= gain
        }
        serviceDetail[item] = {
            consumption: demand,
            unity: unity
        }
    }
    // 食物（基础）Unity
    const baseFood = "食物（基础）"
    if(serviceData[baseFood]){
        let unity = serviceData[baseFood].unity
        unity *= buffUnityGlobal
        if(serviceData[baseFood].unityBuff){
            unity *= gain
        }
        serviceDetail[baseFood] = {
            consumption:0,
            unity:unity
        }
    }

    // 总Unity
    let Unity = 0
    for(const item in serviceDetail){
        Unity += serviceDetail[item].unity
    }
    buffResult.额外消耗.凝聚力 -= Unity

    // 计算populationRecipe
    const populationRecipe = {
        ID:0,
        Factory:{
            name:"人口",
            consumption:{}
        },
        Items:{
            product:{
                "工人#":1000,
                "垃圾#":29.3,
            },
            material:service
        },
        Category:specialRecipe["人口"].Category,
        Enable:true
    }
    const population = configuration.facility.demand.population
    if (population) populationRecipe.FixedValue = population/1000

    settlementRecipe.push(populationRecipe)
    
    return settlementRecipe
}
function calVehicleRecipe(configuration, GameData, contractData, specialRecipe, buffResult){
    const vehicleData = GameData.Facility.vehicle
    const mineData = GameData.Facility.mine
    const vehicleRecipe = []
    let sapling = false
    let maxCarportTier = 1

    function extractVehicleRecipe(vehicleName,info,vehicleCategory,category){
        let vehicleInfo = JSON.parse(JSON.stringify(info))
        let {material,product} = vehicleInfo.Items
        // console.log(buffResult);
        
        if ("柴油" in material) material["柴油"] *= buffResult.影响.载具.燃料[vehicleCategory]
        if ("重油" in material) material["重油"] *= buffResult.影响.载具.燃料[vehicleCategory]
        if ("氢" in material) material["氢"] *= buffResult.影响.载具.燃料[vehicleCategory]
        if ("空气污染" in product) product["空气污染"] *= buffResult.影响.载具.燃料[vehicleCategory]
        const recipe = {
            ID:0,
            Factory:{
                name:vehicleName,
                consumption:vehicleInfo.consumption
            },
            Items:{
                material:material,
                product:product
            },
            Category:category,
            Enable:true,
        }
        return recipe
    }
    function addFixedVehicleRecipe(vehicles,vehicleCategory,index1,index2){
        for (const [vehicle,amount] of Object.entries(vehicles)) {
            const vehicleInfo = vehicleData[index1][index2][vehicle]
            const recipe = extractVehicleRecipe(vehicle,vehicleInfo,vehicleCategory,"物流")
            recipe.FixedValue = amount
            vehicleRecipe.push(recipe)
            if (vehicleInfo?.车库等级){
                const carportTier = vehicleInfo.车库等级
                maxCarportTier = maxCarportTier > carportTier ? maxCarportTier : carportTier;
            }
        }     
    }
    // 卡车
    const trunks = configuration.facility.logistics.trunk.trunk
    const trunkFuel = configuration.facility.logistics.trunk.fuel
    addFixedVehicleRecipe(trunks,"车辆","卡车",trunkFuel)
    // 火车
    const trains = configuration.facility.logistics.train.train
    const trainTier = configuration.facility.logistics.train.tier
    addFixedVehicleRecipe(trains,"火车","火车",trainTier)
    // 火箭
    const rocket = configuration.facility.logistics.rocket
    let rocketPeriod = 4//单个火箭的制造所需月数
    if (rocket == "火箭 II") rocketPeriod = 6
    specialRecipe["火箭组装站"][rocket].Enable = true
    const {material,product} = specialRecipe["火箭组装站"][rocket].Items
    Object.keys(material).forEach(item => {
        material[item] /= rocketPeriod
    })
    Object.keys(product).forEach(item => {
        product[item] /= rocketPeriod
    })
    for (const [item,recipe] of Object.entries(specialRecipe["火箭发射台"][rocket])){
        recipe.Enable = true
        // 由于关系到火箭消耗，实际运载量要进行四舍五入取整操作
        recipe.Items.product[item] = Math.round(recipe.Items.product[item] * buffResult.影响.载具.载荷.火箭)
        if (item != "宇航员"){
            recipe.Items.material[item.replace(/#/g, '')] = Math.round(recipe.Items.material[item.replace(/#/g, '')] * buffResult.影响.载具.载荷.火箭)
        }
        const {material,product} = recipe.Items
        Object.keys(material).forEach(item => {
            material[item] *= 2//每2个组装站使用1个发射台
            material[item] /= rocketPeriod
        })
        Object.keys(product).forEach(item => {
            product[item] *= 2
            product[item] /= rocketPeriod
        })
    }    
    
    // 开采
    const excavator = configuration.facility.mineral.map.miner.excavator
    const logger = configuration.facility.mineral.map.miner.logger
    const minerFuel = configuration.facility.mineral.map.miner.fuel
    const mines = configuration.facility.mineral.map.mine

    if (excavator){
        const excavatorInfo = vehicleData.开采[minerFuel][excavator]
        let trunkMine = null
        if (excavator.startsWith("小型挖掘机")){
            trunkMine = "皮卡" + (minerFuel == "氢" ? "【氢】" : '')
        }
        else if (excavator.startsWith("挖掘机")){
            trunkMine = "卡车" + (minerFuel == "氢" ? "【氢】" : '')
        }
        else if (excavator.startsWith("超大型挖掘机")){
            trunkMine = "巨型卡车(散装)" + (minerFuel == "氢" ? "【氢】" : '')
        }
        
        const trunkMineInfo = vehicleData.卡车[minerFuel][trunkMine]

        const excavatorRecipe = extractVehicleRecipe("-",excavatorInfo,"车辆","-")
        const trunkMineRecipe = extractVehicleRecipe("-",trunkMineInfo,"车辆","-")
        
        for(const mine of mines){
            if (mine == "木材") continue
            // 替换"开采速率"为对应矿物属性
            const excavatorRecipeCopy = JSON.parse(JSON.stringify(excavatorRecipe))
            excavatorRecipeCopy.Items.product[mine] = excavatorRecipeCopy.Items.product["开采速率"]
            delete excavatorRecipeCopy.Items.product["开采速率"]
            const combine_recipe = combineRecipe([[excavatorRecipeCopy,1],[trunkMineRecipe,2]],"开采",
                {
                    Enable:true,
                    Category:specialRecipe["开采"].Category === "特殊" ? "原矿" : specialRecipe["开采"].Category
                }
            )
            combine_recipe.Items.material[excavator + '!'] = 1
            combine_recipe.Items.material[trunkMine + '!'] = 2
            // 1辆挖掘机 + 2辆同级别卡车
            vehicleRecipe.push(combine_recipe)
        }
        const carportTier = excavatorInfo.车库等级
        maxCarportTier = maxCarportTier > carportTier ? maxCarportTier : carportTier;
    }
    if(logger && mines.includes("木材")){
        sapling = true

        const loggerInfo = vehicleData.开采[minerFuel][logger]
        const planter = "植树机" + (minerFuel == "氢" ? "【氢】" : '')
        const planterInfo = vehicleData.开采[minerFuel][planter]
        const forestryInfo = vehicleData.开采[minerFuel]["伐木场"]
        let trunkLogger = null
        if (logger.startsWith("伐木机")){
            trunkLogger = "皮卡" + (minerFuel == "氢" ? "【氢】" : '')
        }
        else if (logger.startsWith("大型伐木机")){
            trunkLogger = "卡车" + (minerFuel == "氢" ? "【氢】" : '')
        }
        const trunkLoggerInfo = vehicleData.卡车[minerFuel][trunkLogger]
        //配方
        const loggerRecipe = extractVehicleRecipe("-",loggerInfo,"车辆","-")
        const planterRecipe = extractVehicleRecipe("-",planterInfo,"车辆","-")
        const trunkRecipe = extractVehicleRecipe("-",trunkLoggerInfo,"车辆","-")
        const forestryRecipe = extractVehicleRecipe("-",forestryInfo,"-","-")
        console.log(loggerRecipe);
        console.log(planterRecipe);
        console.log(trunkRecipe);
        console.log(forestryRecipe);
        
        
        // 1个伐木场 + 2辆植树机 + 2辆伐木机 + 5辆同级别卡车
        const recipeCalList = [
            [loggerRecipe,2],
            [planterRecipe,2],
            [trunkRecipe,5],
            [forestryRecipe,1],
        ]
        const combine_recipe = combineRecipe(recipeCalList,"伐木场",{
                Enable:true,
                Category:specialRecipe["伐木场"].Category === "特殊" ? "原矿" : specialRecipe["伐木场"].Category
            }
        )
        combine_recipe.Items.material[logger + '!'] = 2
        combine_recipe.Items.material[planter + '!'] = 2
        combine_recipe.Items.material[trunkLogger + '!'] = 5
        vehicleRecipe.push(combine_recipe)

        const carportTier = loggerInfo.车库等级
        maxCarportTier = maxCarportTier > carportTier ? maxCarportTier : carportTier;
    }

    // 海外矿
    const cargoDepot = configuration.facility.mineral.ocean.ship.cargoDepot
    const shipFuel = configuration.facility.mineral.ocean.ship.fuel
    const oceanMines = configuration.facility.mineral.ocean.mine
    const vehicleInfo = vehicleData.船舶[shipFuel][cargoDepot]
    const cargoDepotRecipe = extractVehicleRecipe(cargoDepot,vehicleInfo,"船舶",specialRecipe["货运港"].Category === "特殊" ? "原矿" : specialRecipe["货运港"].Category)
    for(const mine of oceanMines){
        // 海外矿：原矿 改为 原矿+"#"
        const mineRecipe = JSON.parse(JSON.stringify(mineData[mine]))
        mineRecipe.Items.product[mine + "#"] = mineRecipe.Items.product[mine]
        delete mineRecipe.Items.product[mine]
        mineRecipe.Category = "原矿"
        mineRecipe.Enable = true
        vehicleRecipe.push(mineRecipe)
        // 海外矿运输：产物里替换"运输效率"为对应原矿，原料里加上原矿+"#"
        let recipe = JSON.parse(JSON.stringify(cargoDepotRecipe))
        delete recipe.Factory.consumption["单程月数"];
        recipe.Items.product[mine] = recipe.Items.product["运输效率"]
        recipe.Items.material[mine + "#"] = recipe.Items.product["运输效率"]
        delete recipe.Items.product["运输效率"]
        vehicleRecipe.push(recipe)
    }
    // 贸易
    const contractCfg = configuration.facility.mineral.ocean.trade
    for (const [mine,contractIndexList] of Object.entries(contractCfg)){
        for (const contractIndex of contractIndexList){
            const contract = contractData[mine][contractIndex]
            // 合同凝聚力消耗直接并入额外凝聚力消耗计算
            buffResult.额外消耗.凝聚力 += contract["凝聚力/月"]

            // 计算单个配方凝聚力消耗
            let recipe = JSON.parse(JSON.stringify(cargoDepotRecipe));
            let consumption = recipe.Factory.consumption
            consumption["凝聚力"] = contract["凝聚力/船"]/consumption["单程月数"];
            const fuel = recipe.Items.material
            // 构建配方
            const contractRecipe = {
                ID:0,
                Factory:{
                    name:cargoDepot,
                    consumption:{
                        ...consumption,
                        ...{
                            "进口模块":contract.进口.模块数,
                            "出口模块":contract.出口.模块数,
                        }
                    }
                },
                Items:{
                    material:fuel,
                    product:{}
                },
                Category:specialRecipe["货运港"].Category === "特殊" ? "原矿" : specialRecipe["货运港"].Category,
                Enable:true

            }
            contractRecipe.Items.material[contract.出口.物品] = contract.出口.数量/consumption["单程月数"]
            contractRecipe.Items.product[contract.进口.物品] = contract.进口.数量/consumption["单程月数"]
            delete contractRecipe.Factory.consumption["单程月数"];
            vehicleRecipe.push(contractRecipe)
        }
    }

    // 车库
    if (maxCarportTier == 1) specialRecipe["车库 I"].Enable = true
    if (maxCarportTier == 2) specialRecipe["车库 II"].Enable = true
    if (maxCarportTier == 3) specialRecipe["车库 III"].Enable = true

    // 兜底配方，若计算结果中出现了以下配方就代表配置不可行
    for(const mine of ['原油','煤', '铁矿石', '铜矿石', '沙', '石英', '石灰石', '金矿石', '铀矿石', '钛矿石', '铝土矿', '岩石', '木材','进口商品']){
        const recipeMine = {
            ID:0,
            Factory:{
                name:mine,
                consumption:{"占地":10000000}
            },
            Items:{
                material:{},
                product:{}
            },
            Category:"缺口",
            Enable:true,
            Deficiency:true        
        }
        recipeMine.Items.product[mine] = 1
        vehicleRecipe.push(recipeMine)
        
    }
    const recipeUnity = {
        ID:0,
        Factory:{
            name:"凝聚力",
            consumption:{"占地":10000000}
        },
        Items:{
            material:{},
            product:{"凝聚力":1}
        },
        Category:"缺口",
        Enable:true,
        Deficiency:true 
    }
    vehicleRecipe.push(recipeUnity)
    // console.log(vehicleRecipe);
    
    return {vehicleRecipe,sapling}
}
function calFixedRecipe(configuration, specialRecipe, buffResult){
    const factorys = configuration.facility.demand.factory
    const researchCfg = configuration.facility.demand.research
    const recipeList = []
    // 研究实验室
    const researchTier = researchCfg.research
    const researchAmount = researchCfg.amount
    if (researchTier){
        if (researchTier != "研究实验室 IV"){
            specialRecipe[researchTier].Enable = true
            specialRecipe[researchTier].FixedValue = researchAmount
        }
        else{
            if (researchCfg.spaceResearch){
                specialRecipe[researchTier]["太空"].Enable = true
                specialRecipe[researchTier]["太空"].FixedValue = researchAmount
            }
            else{
                specialRecipe[researchTier]["基础"].Enable = true
                specialRecipe[researchTier]["基础"].FixedValue = researchAmount
            }    
        }
    }
    // 特殊建筑
    for(let [name,amount] of Object.entries(factorys)){
        if (researchCfg.spaceResearch) amount = researchAmount + 2 
        
        if (name === "空间站"){
            const recipe = {
                ID:0,
                Factory:{
                    name:name,
                    consumption:{
                        "工人":(amount - 1) * 2
                    }
                },
                Items:{
                    material:{
                        "宇航员":(amount - 1) * 2 / 24,
                        "空间站部件#":amount * 0.25,
                        "船员补给品#":(amount -1) * 0.4,
                    },
                    product:{
                        "凝聚力":0.1 + amount * 0.05,
                    }
                },
                Category:specialRecipe["空间站"].Category,
                FixedValue:1,
                Enable:true,
            }
            
            if (researchCfg.spaceResearch){
                const spaceResearchPoint = researchCfg.amount * 48
                recipe.Items.product["太空研究点数"] = spaceResearchPoint
                recipe.Items.material["电子产品 IV#"] = spaceResearchPoint / 24
            }
            recipeList.push(recipe)
            buffResult.影响.研究效率 *= 1 + 0.05 + amount * 0.05
        }
        else{
            specialRecipe[name].Enable = true
            specialRecipe[name].FixedValue = amount 
        }
    }
    // 需求
    const demand = JSON.parse(JSON.stringify(configuration.facility.demand.items))
    const recipe = {
        ID:0,
        Factory:{
            name:"需求",
            consumption:{}
        },
        Items:{
            material:demand,
            product:{}
        },
        Category:specialRecipe["需求"].Category,
        FixedValue:1,
        Enable:true,
    }
    const buffFocus = buffResult.额外消耗.专注点
    recipe.Items.material["专注点"] = buffFocus
    const buffUnity = buffResult.额外消耗.凝聚力
    if (buffUnity > 0) recipe.Items.material["凝聚力"] = buffUnity
    else recipe.Items.product["凝聚力"] = -1 * buffUnity

    recipeList.push(recipe)

    return recipeList
}

