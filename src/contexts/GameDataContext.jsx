import { createContext, useContext, useState, useEffect,useMemo } from 'react';
import { useConfig } from './ConfigContext'
const GameDataContext = createContext(null);

export const useGameData = () => {
  const context = useContext(GameDataContext);
  if (!context) {
    throw new Error('useGameData must be used within GameDataProvider');
  }
  return context;
};

// ── 合同数据处理 ──────────────────────────────────────────────────────────────

// 最优港口模块分布
// contract 原始字段：出口、出口量、进口、进口量、凝聚力/进口、凝聚力/月
// maxModule：港口总模块数，capacity：单模块容量
// rUnity：凝聚力系数，rProfit：利润率系数
function optimizeContract(contract, maxModule, capacity, rUnity, rProfit) {
  const exportItem = contract['出口']
  if (["铁矿石","铜矿石","机制砂"].includes(exportItem)) rProfit = 1 //0.8.2版本，出口这3种产品时不吃办公室的利润增益
  const exportQty  = contract['出口量']
  const importItem = contract['进口']
  const importQty  = contract['进口量']
  let   unityPerImport = contract['凝聚力/进口']
  let   unityPerMouth = contract['凝聚力/月']

  // 凝聚力消耗增益修正
  unityPerImport *= rUnity
  unityPerMouth *= rUnity
  // 进出口比例增益修正
  let Kio = importQty / exportQty
  Kio *= rProfit

  // 搜索最优模块分配
  // x：出口模块数，
  // 出口带来的进口 = x * capacity * Kio
  // 进口模块容量   = (maxModule - x) * capacity
  // 理论最优 x = maxModule / (1 + Kio)
  let best = null
  const xTheory = Math.floor(maxModule / (1 + Kio))
  // 搜索边界设置
  const start   = Math.max(0, xTheory - 10)
  const end     = Math.min(maxModule, xTheory + 10)

  // 在理论最优附近搜索最佳的进出口模块数
  for (let x = start; x <= end; x++) {
    const y = maxModule - x

    const exportTotal    = x * capacity
    const importTrade    = exportTotal * Kio
    const importCapacity = y * capacity
    const importReal     = Math.min(importTrade, importCapacity)
    const exportUsed     = Kio !== 0 ? importReal / Kio : 0

    if (best === null || importReal > best.import_qty) {
      best = {
        export_modules: x,
        import_modules: y,
        export_qty:     exportUsed,
        import_qty:     importReal,
        unity_per_import: unityPerImport,
        unity_per_mouth: unityPerMouth,
      }
    }
  }

  const unityPerShip = best.import_qty * best.unity_per_import

  return {
    '出口': { '物品': exportItem, '数量': Math.floor(best.export_qty), '模块数': best.export_modules },
    '进口': { '物品': importItem, '数量': Math.floor(best.import_qty), '模块数': best.import_modules },
    '凝聚力/月': best.unity_per_mouth,
    '凝聚力/船': Number(unityPerShip.toFixed(4)),
  }
}

// 处理当前港口全部合同
// data 结构：{ 货运港: { [港口名]: { 模块数, 模块容量 } }, 合同: { [进口物品]: [...] } }
function processAll(data, cargoDepot, rUnity, rProfit) {
  if (!data || !cargoDepot) return {}

  const depot = data["货运港"][cargoDepot];
  const maxModule = depot["模块数"];
  const capacity = depot["模块容量"];

  const result = {};

  for (const importItem in data["合同"]) {
      result[importItem] = [];
      const contracts = data["合同"][importItem];

      for (const c of contracts) {
          // 计算最优港口模块分布
          const optimized = optimizeContract(
              c,
              maxModule,
              capacity,
              rUnity,
              rProfit
          );
          result[importItem].push(optimized);
      }
  }
  return result
}

// recipeData重组数据为以工厂划分的数据格式recipeDataFactory
function reorganizeToFactoryStructure(recipes,GameData){
  const buildingCatDef = GameData?.Category?.建筑 || {};

  // 预建反向索引: 建筑名 → 所属类别
  const buildingToCat = {};
  Object.entries(buildingCatDef).forEach(([catName, buildings]) => {
    buildings.forEach(bld => { buildingToCat[bld] = catName; });
  });

  // 先把配方塞进无序的临时结构
  const raw = {};
  recipes.forEach(recipe => {
    const factoryName    = recipe.Factory.name;
    const buildingCategory = buildingToCat[factoryName];
    if (!buildingCategory) return; // 未归类则跳过

    if (!raw[buildingCategory])             raw[buildingCategory] = {};
    if (!raw[buildingCategory][factoryName]) raw[buildingCategory][factoryName] = [];
    raw[buildingCategory][factoryName].push({ ...recipe, buildingCategory });
  });

  // 按照 Category.建筑 的类别顺序重建对象
  const factoryStructure = {};
  Object.keys(buildingCatDef).forEach(catName => {
    if (!raw[catName]) return; // 该类别下没有任何配方则跳过

    // 按照该类别内建筑的定义顺序排列
    const orderedBuildings = {};
    buildingCatDef[catName].forEach(bld => {
      if (raw[catName][bld]) {
        orderedBuildings[bld] = raw[catName][bld];
      }
    });

    if (Object.keys(orderedBuildings).length > 0) {
      factoryStructure[catName] = orderedBuildings;
    }
  });

  return factoryStructure;
};

export const GameDataProvider = ({ children }) => {
  const [gameData, setGameData] = useState(null);
  const [recipeData, setRecipeData] = useState([]);
  const [recipeDataFactory, setRecipeDataFactory] = useState({}); 
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const { configuration } = useConfig()
  // 从 configuration 读取影响合同的动态参数
  const cargoDepot = configuration.facility.mineral.ocean.ship.cargoDepot
  const rUnity  = 1 + (configuration?.buff?.office?.['合同凝聚力消耗']?.effect ?? 0)
  const rProfit = 1 + (configuration?.buff?.office?.['合同利润率']?.effect    ?? 0)
  // contractData：随 cargoDepot / rUnity / rProfit / gameData 变化自动更新
  // gameData.Facility 结构预期：{ 货运港: { [港口]: { 模块数, 模块容量 } }, 合同: { [物品]: [...] } }
  const contractData = useMemo(() => {
    if (!gameData?.Facility) return {}
    return processAll(gameData.Facility.contract, cargoDepot, rUnity, rProfit)
  }, [gameData, cargoDepot, rUnity, rProfit])

  //当 recipeData 变化时更新 recipeDataFactory
  useEffect(() => {
    if (recipeData.length > 0 && gameData) {
      const newFactoryStructure = reorganizeToFactoryStructure(recipeData,gameData);
      setRecipeDataFactory(newFactoryStructure);
    }
  }, [recipeData, gameData]);
  //读取原始数据
  useEffect(() => {
    const fetchGameData = async () => {
      try {
        setLoading(true);
        const response = await fetch('/data/GameData.json');
        if (!response.ok) {
          throw new Error('Failed to load game data');
        }
        const data = await response.json();
        setGameData(data);
        
        // 初始化 recipeData和recipeDataFactory
        const initialRecipeData = data.Recipe.map(recipe => ({
          ...recipe,
          Enable: true
        }));
        setRecipeData(initialRecipeData);
        // setRecipeDataFactory(reorganizeToFactoryStructure(initialRecipeData,data));
        
      } catch (err) {
        setError(err.message);
        console.error('Error loading game data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchGameData();
  }, []);

  // 更新单个配方的 Enable 状态
  const updateRecipeEnable = (recipeId, enabled) => {
    setRecipeData(prev => {
      const newData = prev.map(recipe => 
        recipe.ID === recipeId 
          ? { ...recipe, Enable: enabled }
          : recipe
      );
      return newData;
    });
  };

  // 批量更新配方的 Enable 状态
  const updateRecipesEnable = (recipeIds, enabled) => {
    setRecipeData(prev => {
      const newData = prev.map(recipe => 
        recipeIds.includes(recipe.ID) 
          ? { ...recipe, Enable: enabled }
          : recipe
      );
      return newData;
    });
  };

  // 重置所有配方为启用状态
  const resetAllRecipes = () => {
    setRecipeData(prev => 
      prev.map(recipe => ({ ...recipe, Enable: true }))
    );
  };

  // 根据条件过滤配方
  const getEnabledRecipes = () => {
    return recipeData.filter(recipe => recipe.Enable);
  };

  const getDisabledRecipes = () => {
    return recipeData.filter(recipe => !recipe.Enable);
  };

  // 获取所有建筑类别
  const getBuildingCategories = () => {
    return Object.keys(recipeDataFactory);
  };

  // 获取特定类别的所有建筑
  const getBuildingsByCategory = (category) => {
    return recipeDataFactory[category] || {};
  };

  // 获取特定建筑的所有配方
  const getRecipesByBuilding = (category, buildingName) => {
    return recipeDataFactory[category]?.[buildingName] || [];
  };

  // 预处理数据（基于原始 gameData）
  // const processedData = gameData ? {
  //   ...gameData,
  //   allItems: (() => {
  //     const itemsSet = new Set();
  //     gameData.Recipe?.forEach(recipe => {
  //       recipe.Items?.product?.forEach(([item]) => itemsSet.add(item));
  //       recipe.Items?.material?.forEach(([item]) => itemsSet.add(item));
  //     });
  //     return Array.from(itemsSet);
  //   })(),
  //   recipesByCategory: (() => {
  //     const byCategory = {};
  //     gameData.Recipe?.forEach(recipe => {
  //       const category = recipe.Category;
  //       if (!byCategory[category]) {
  //         byCategory[category] = [];
  //       }
  //       byCategory[category].push(recipe);
  //     });
  //     return byCategory;
  //   })(),
  //   recipeIndex: (() => {
  //     const index = {};
  //     gameData.Recipe?.forEach(recipe => {
  //       index[recipe.ID] = recipe;
  //     });
  //     return index;
  //   })()
  // } : null;

  const value = {
    gameData: gameData,
    recipeData,
    recipeDataFactory,
    contractData,
    loading,
    error,
    updateRecipeEnable,
    updateRecipesEnable,
    resetAllRecipes,
    getEnabledRecipes,
    getDisabledRecipes,
    getBuildingCategories, // 获取所有建筑类别
    getBuildingsByCategory, // 获取特定类别的建筑
    getRecipesByBuilding, // 获取特定建筑的配方
  };

  return (
    <GameDataContext.Provider value={value}>
      {children}
    </GameDataContext.Provider>
  );
};



