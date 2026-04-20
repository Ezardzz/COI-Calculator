import { createContext, useContext, useState, useCallback } from 'react'

const ConfigContext = createContext(null)

export const useConfig = () => {
  const ctx = useContext(ConfigContext)
  if (!ctx) throw new Error('useConfig must be used within ConfigProvider')
  return ctx
}

const initialConfig = {
  facility: {
    demand: {
      population: null,
      factory: { '维护雕像': 4 },
      research:{ amount: 0, research: null, spaceResearch: false },
      items: {},
      redundancy:{
        "维护 I":1.5,
        "维护 II":1.1,
        "维护 III":1.1,
        "工人":1.1,
        "电":1.1,
        "算力":1.1,
      },
      noMaintenanceMode:{
        "isOpen":false,
        "itemList":["维护 I","维护 II","维护 III","工人","电","算力",
                    "原油","煤","铁矿石","铜矿石","沙","石英","石灰石","金矿石","金","铀矿石","钛矿石","铝土矿","岩石","木材",
                    "矿渣","废气"],
      }
    },
    settlement: {
      housing: '住房 IV',
      food: ['土豆', '蔬菜', '面包', '玉米', '豆腐', '鸡蛋', '肉', '零食', '水果', '蛋糕', '香肠'],
      medicine: '医疗用品 III',
      commodity: ['水', '家庭用品', '家用设备', '消费类电子产品', '奢侈品', '电', '算力'],
      farm:"温室 II",
    },
    logistics: {
      trunk: { fuel: '氢', trunk: {} },
      train: { tier: '2级', train: {} },
      rocket: "火箭 II",
    },
    mineral: {
      map: {
        miner: { 
          fuel: '氢', 
          excavator: '超大型挖掘机【氢】',
          logger: '大型伐木机【氢】'
        },
        mine: ['岩石'],
      },
      ocean: {
        ship: { fuel: '氢', cargoDepot: '货运港（8）' },
        mine: [],
        trade: {
          "原油": [3],
          "煤": [4],
          "铁矿石": [2],
          "铜矿石": [3],
          "石英": [3],
          "石灰石": [2],
          "金": [0],
          "铀矿石": [3],
          "钛矿石": [1],
          "铝土矿": [4],
          "木材": [1],
          "进口商品": [1]
        },
      },
    },
  },
  buff: {},
  interface: {
    recipeCfg: false,
    itemCfg: false,
    contractSelector: false,
    recipeViewer: false,
  }
}

const farmSystemRecipe = () => {
  setRecipeData(prev => 
    prev.map(recipe => ({ ...recipe, Enable: true }))
  );
};
export const ConfigProvider = ({ children }) => {
  const [configuration, setConfiguration] = useState(initialConfig)

  const updateConfig = useCallback((path, value) => {
    setConfiguration(prev => {
      // ✅ 空路径：直接整体替换
      if (!path) {
        return value
      }

      const next = JSON.parse(JSON.stringify(prev))
      const keys = path.split('.')
      let cur = next

      for (let i = 0; i < keys.length - 1; i++) {
        if (typeof cur[keys[i]] !== 'object' || cur[keys[i]] === null) {
          cur[keys[i]] = {}
        }
        cur = cur[keys[i]]
      }

      cur[keys[keys.length - 1]] = value
      return next
    })
  }, [])

  return (
    <ConfigContext.Provider value={{ configuration, updateConfig }}>
      {children}
    </ConfigContext.Provider>
  )
}
