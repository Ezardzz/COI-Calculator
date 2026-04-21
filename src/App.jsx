// 主体文件
import { useState, useEffect, useRef } from 'react';

import { Calculator } from 'lucide-react';
import { ConfigProvider } from '@/contexts/ConfigContext';
import { GameDataProvider } from '@/contexts/GameDataContext';
import { HighsProvider } from "./contexts/HighsContext";
import { CalculationProvider } from '@/contexts/CalculationContext';
import { useCalculation } from '@/contexts/CalculationContext';
import { useConfig } from '@/contexts/ConfigContext';
import { useGameData } from '@/contexts/GameDataContext';

import RecipeCfg from '@/components/config/RecipeCfg';
import ItemCfg   from '@/components/config/ItemCfg';
import ContractSelector from '@/components/config/ContractSelector'
import ConfigPanel from '@/components/config/ConfigPanel';
import Calculation from '@/components/calculation/Calculation';
import ResultsDisplay from '@/components/result/ResultsDisplay';
import RecipeViewer from '@/components/result/RecipeViewer';
import '@/App.css';

function AppContent() {
  const { interfaceOpen } = useCalculation();
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
        {interfaceOpen.recipeCfg && <RecipeCfg />}
        {interfaceOpen.itemCfg   && <ItemCfg />}
        {interfaceOpen.contractSelector && <ContractSelector />}
        {interfaceOpen.recipeViewer && <RecipeViewer/> }
        <ConfigPanel />
        <Calculation />
        <ResultsDisplay />
      </div>
    </div>
  );
}

function App() {
  return (
    <HighsProvider>
      <ConfigProvider>
        <GameDataProvider>
          <CalculationProvider>
            <AppContent />
          </CalculationProvider>       
        </GameDataProvider>
      </ConfigProvider>
    </HighsProvider>
  );
}

export default App;