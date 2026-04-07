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
import '@/App.css';

function AppContent() {
  const [results, setResults] = useState(null);
  const { configuration } = useConfig();
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
        <ConfigPanel />
        <Calculation setResults={setResults}/>
        <ResultsDisplay Results={results} />
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