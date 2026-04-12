// 主体文件
import { useState, useEffect, useRef } from 'react';

import { Calculator } from 'lucide-react';
import { ConfigProvider } from '@/contexts/ConfigContext';
import { GameDataProvider } from '@/contexts/GameDataContext';
import { HighsProvider } from "./contexts/HighsContext";
import { useConfig } from '@/contexts/ConfigContext';
import { useGameData } from '@/contexts/GameDataContext';

import ItemSelector     from '@/components/config/ItemSelector'
import ContractSelector from '@/components/config/ContractSelector'
import ConfigPanel from '@/components/config/ConfigPanel';
import Calculation from '@/components/calculation/Calculation';
import ResultsDisplay from '@/components/result/ResultsDisplay';
import RecipeViewer from '@/components/result/RecipeViewer';
import '@/App.css';

function AppContent() {
  const [results, setResults] = useState(null);
  const [itemRecord, setItemRecord] = useState([]);
  const { configuration, updateConfig } = useConfig();
  const iface = configuration.interface
  const { 
    loading, 
    error
  } = useGameData();

  if (loading) {
    return (
      <div className="app">
        <div className="grid-bg"></div>
        <div className="container loading-container">
          <div className="loading-spinner"></div>
          <p>加载游戏数据中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app">
        <div className="grid-bg"></div>
        <div className="container error-container">
          <p className="error-message">加载失败: {error}</p>
        </div>
      </div>
    );
  }

  const handleItemClick = (itemName) => {
    setItemRecord([itemName]);
    updateConfig('interface.recipeViewer', true);
  };

  return (
    <div className="app">
      <div className="grid-bg"></div>

      <div className="container">
        <h1 className="main-title">
          <Calculator className="title-icon" size={48} />
          COI-量化计算器
        </h1>
        {iface.itemSelector     && <ItemSelector />}
        {iface.contractSelector && <ContractSelector />}
        {iface.recipeViewer && (
          <RecipeViewer
            Results={results}
            itemRecord={itemRecord}
            setItemRecord={setItemRecord}
          />
        )}
        <ConfigPanel />
        <Calculation setResults={setResults}/>
        <ResultsDisplay Results={results} onItemClick={handleItemClick}  />
      </div>
    </div>
  );
}

function App() {
  return (
    <HighsProvider>
      <ConfigProvider>
        <GameDataProvider>
          <AppContent />
        </GameDataProvider>
      </ConfigProvider>
    </HighsProvider>
  );
}

export default App;