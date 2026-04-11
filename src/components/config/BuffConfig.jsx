// components/BuffConfig.jsx
import { useState } from 'react';
import { Plus, Minus } from 'lucide-react';
import GameIcon from '../GameIcon';
import { useConfig } from '@/contexts/ConfigContext';
import { useGameData } from '@/contexts/GameDataContext'
import './BuffConfig.css';

function BuffConfig() {
  const [activeBuffTab, setActiveBuffTab] = useState('edicts');
  const { configuration, updateConfig } = useConfig();
  const buffConfig = configuration.buff || {};
  const { gameData } = useGameData();
  const buffData = gameData.Buff

  const handleBuffConfigChange = (newBuffConfig) => {
    updateConfig('buff', newBuffConfig);
  };

  // 法令档位切换
  const handleEdictChange = (edictID, level, effectValue, unityValue) => {
    const newBuffConfig = { ...buffConfig };
    if (!newBuffConfig.edicts) newBuffConfig.edicts = {};
    
    if (level === null) {
      delete newBuffConfig.edicts[edictID];
    } else {
      newBuffConfig.edicts[edictID] = {
        effect: effectValue,
        unity: unityValue
      };
    }
    handleBuffConfigChange(newBuffConfig);
  };

  // 办公室等级调整
  const handleOfficeGradeChange = (officeID, delta, data) => {
    const newBuffConfig = { ...buffConfig };
    if (!newBuffConfig.office) newBuffConfig.office = {};
    
    const current = newBuffConfig.office[officeID] || { grade: 0, effect: 0, focus: 0 };
    const newGrade = Math.max(0, Math.min(data.max_grade, current.grade + delta));
    
    if (newGrade === 0) {
      delete newBuffConfig.office[officeID];
    } else {
      const { a1, d } = data.focus_by_grade;
      const totalFocus = newGrade * a1 + 0.5 * newGrade * (newGrade - 1) * d;
      const totalEffect = newGrade * data.effect;
      
      newBuffConfig.office[officeID] = {
        grade: newGrade,
        effect: totalEffect,
        focus: totalFocus
      };
    }
    handleBuffConfigChange(newBuffConfig);
  };

  // 研究等级调整
  const handleResearchGradeChange = (researchID, delta, data) => {
    const newBuffConfig = { ...buffConfig };
    if (!newBuffConfig.research) newBuffConfig.research = {};
    
    const current = newBuffConfig.research[researchID] || { grade: 0, effect: [] };
    const newGrade = Math.max(0, Math.min(data.max_grade, current.grade + delta));
    
    if (newGrade === 0) {
      delete newBuffConfig.research[researchID];
    } else {
      const totalEffects = data.effect.map(e => e * newGrade);
      newBuffConfig.research[researchID] = {
        grade: newGrade,
        effect: totalEffects
      };
    }
    handleBuffConfigChange(newBuffConfig);
  };

  // 格式化intro显示
  const effectPercentStr = (effect) => {
    const effectPercent = effect * 100;
    return parseFloat(effectPercent.toFixed(10)).toString();
  };

  // 渲染法令卡片
  const renderEdictCard = (name, data) => {
    const currentLevel = buffConfig.edicts?.[data.ID];
    const isSpecial = ['更多家具用品', '更多家电', '更多消费电子产品'].includes(data.ID);
    const isSelected = !!currentLevel;
    const isUnityPositive = currentLevel && currentLevel.unity > 0;
    
    let formattedIntro = data.intro;
    if (currentLevel) {
      const currentIndex = data.effect.indexOf(currentLevel.effect);
      let tempIntro = data.intro;
      const value = effectPercentStr(data.effect[currentIndex]);
      tempIntro = tempIntro.replace('?', `<span class="highlight-value">${value}</span>`);
      formattedIntro = tempIntro;
    } else {
      let tempIntro = data.intro;
      const value = effectPercentStr(data.effect[0]);
      tempIntro = tempIntro.replace('?', `<span class="highlight-value dim">${value}</span>`);
      formattedIntro = tempIntro;
    }
    
    return (
      <div key={data.ID} className={`edict-card ${isSelected ? 'selected' : ''}`}>
        <div className="edict-card-header">
          <div className={`edict-name ${!isSelected ? 'inactive' : (isUnityPositive ? 'unity-positive-text' : '')}`}>
            {name}
          </div>
          {currentLevel && (
            <div className={`edict-unity ${isSpecial ? 'unity-percent' : (currentLevel.unity < 0 ? 'unity-negative' : 'unity-positive')}`}>
              {isSpecial ? 
                `${(currentLevel.unity * 100).toFixed(0)}%` : 
                `${currentLevel.unity > 0 ? '+' : ''}${currentLevel.unity}`
              }
              <GameIcon name="凝聚力" size={15} />
            </div>
          )}
        </div>
        
        <div className="edict-card-body">
          <GameIcon name={data.icon} size={30} />
          <div 
            className={`edict-intro ${!isSelected ? 'dim' : ''}`}
            dangerouslySetInnerHTML={{ __html: formattedIntro }}
          />
        </div>
        
        <div className="edict-levels">
          {data.effect.map((effect, index) => {
            const romanNumerals = ['0', 'I', 'II', 'III', 'IV', 'V'];
            const isActive = currentLevel && currentLevel.effect === effect;
            return (
              <button
                key={index}
                className={`level-button ${isActive ? 'active' : ''}`}
                onClick={() => handleEdictChange(
                  data.ID,
                  isActive ? null : index,
                  effect,
                  data.unity[index]
                )}
              >
                {romanNumerals[index + 1]}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  // 渲染办公室卡片
  const renderOfficeCard = (name, data) => {
    const current = buffConfig.office?.[data.ID] || { grade: 0, effect: 0, focus: 0 };
    const isSelected = current.grade > 0;
    
    const currentEffectPercent = effectPercentStr(current.effect);
    const displayName = name.replace('?', currentEffectPercent);
    const sign = data.effect > 0 ? '+' : '';
    
    const nextGrade = current.grade + 1;
    const { a1, d } = data.focus_by_grade;
    const nextLevelFocus = nextGrade <= data.max_grade ? (a1 + (nextGrade - 1) * d) : 0;
    
    return (
      <div key={data.ID} className={`office-card ${isSelected ? 'selected' : ''}`}>
        <div className="office-card-header">
          <GameIcon name={data.icon} size={20} /><div className="office-name">
            {sign}
            <span 
              className={`office-name-text ${!isSelected ? 'dim' : ''}`}
              dangerouslySetInnerHTML={{ 
                __html: displayName.replace(currentEffectPercent, `<span class="highlight-value ${!isSelected ? 'dim' : ''}">${currentEffectPercent}</span>`) 
              }}
            />
          </div>
        </div>
        
        <div className="grade-slider-container">
          <input
            type="range"
            min="0"
            max={data.max_grade}
            value={current.grade}
            onChange={(e) => {
              const newGrade = parseInt(e.target.value);
              const delta = newGrade - current.grade;
              handleOfficeGradeChange(data.ID, delta, data);
            }}
            className="grade-slider"
            style={{
              background: `linear-gradient(to right, 
                #00d9ff 0%, 
                #0ea5e9 ${(current.grade / data.max_grade) * 100}%, 
                #dededffb ${(current.grade / data.max_grade) * 100}%, 
                #dededffb 100%)`
            }}
          />
        </div>
        
        <div className="office-controls">
          <button 
            className="grade-button"
            onClick={() => handleOfficeGradeChange(data.ID, -1, data)}
            disabled={current.grade === 0}
          >
            <Minus size={16} />
          </button>
          
          <div className={`office-grade-display ${isSelected ? 'active' : 'inactive'}`}>
            <span className={isSelected ? 'current-grade' : ''}>{current.grade}</span>
            {' / '}
            <span className="max-grade">{data.max_grade}</span>
          </div>
          
          <button 
            className="grade-button"
            onClick={() => handleOfficeGradeChange(data.ID, 1, data)}
            disabled={current.grade >= data.max_grade}
          >
            <Plus size={16} />
          </button>
        </div>
        
        <div className="office-focus">
          <span className="focus-total">{current.focus.toFixed(0)}</span>
          {nextLevelFocus > 0 && current.grade < data.max_grade && (
            <span className="focus-next"> /+{nextLevelFocus}</span>
          )}
          <GameIcon name="专注点" size={13} />
        </div>
      </div>
    );
  };

  // 渲染研究卡片
  const renderResearchCard = (name, data) => {
    const current = buffConfig.research?.[data.ID] || { grade: 0, effect: [] };
    const isSelected = current.grade > 0;
    
    let formattedIntro = data.intro;
    const effectsToShow = isSelected ? current.effect : data.effect;
    effectsToShow.forEach((effect) => {
      const value = effectPercentStr(effect);
      const sign = effect > 0 ? '+' : '';
      formattedIntro = formattedIntro.replace('?', `<span class="highlight-value ${!isSelected ? 'dim' : ''}">${sign}${value}</span>`);
    });
    
    return (
      <div key={data.ID} className={`research-card ${isSelected ? 'selected' : ''}`}>
        <div className="research-card-header">
          <GameIcon name={data.icon} size={20} /><div className="research-name">{name}</div>
        </div>
        
        <div 
          className={`research-intro ${!isSelected ? 'dim' : ''}`}
          dangerouslySetInnerHTML={{ __html: formattedIntro }}
        />
        
        <div className="grade-slider-container">
          <input
            type="range"
            min="0"
            max={data.max_grade}
            value={current.grade}
            onChange={(e) => {
              const newGrade = parseInt(e.target.value);
              const delta = newGrade - current.grade;
              handleResearchGradeChange(data.ID, delta, data);
            }}
            className="grade-slider"
            style={{
              background: `linear-gradient(to right, 
                #00d9ff 0%, 
                #0ea5e9 ${(current.grade / data.max_grade) * 100}%, 
                #dededffb ${(current.grade / data.max_grade) * 100}%, 
                #dededffb 100%)`
            }}
          />
        </div>
        
        <div className="research-controls">
          <button 
            className="grade-button"
            onClick={() => handleResearchGradeChange(data.ID, -1, data)}
            disabled={current.grade === 0}
          >
            <Minus size={16} />
          </button>
          
          <div className={`research-grade-display ${isSelected ? 'active' : 'inactive'}`}>
            <span className={isSelected ? 'current-grade' : ''}>{current.grade}</span>
            {' / '}
            <span className="max-grade">{data.max_grade}</span>
          </div>
          
          <button 
            className="grade-button"
            onClick={() => handleResearchGradeChange(data.ID, 1, data)}
            disabled={current.grade >= data.max_grade}
          >
            <Plus size={16} />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="buff-container">
      <div className="buff-header">增益预设</div>
      
      <div className="buff-nav">
        <button
          className={`buff-nav-button ${activeBuffTab === 'edicts' ? 'active' : ''}`}
          onClick={() => setActiveBuffTab('edicts')}
        >
          法令
        </button>
        <button
          className={`buff-nav-button ${activeBuffTab === 'office' ? 'active' : ''}`}
          onClick={() => setActiveBuffTab('office')}
        >
          办公室
        </button>
        <button
          className={`buff-nav-button ${activeBuffTab === 'research' ? 'active' : ''}`}
          onClick={() => setActiveBuffTab('research')}
        >
          研究
        </button>
      </div>

      <div className="buff-content">
        {activeBuffTab === 'edicts' && (
          <div className="edicts-container">
            <div className="population-edicts">
              <div className="section-header">人口法令</div>
              <div className="edicts-grid">
                {Object.entries(buffData.edicts['人口法令']).map(([name, data]) => 
                  renderEdictCard(name, data)
                )}
              </div>
            </div>
            
            <div className="industry-edicts">
              <div className="section-header">工业法令</div>
              <div className="edicts-grid">
                {Object.entries(buffData.edicts['工业法令']).map(([name, data]) => 
                  renderEdictCard(name, data)
                )}
              </div>
            </div>
          </div>
        )}

        {activeBuffTab === 'office' && (
          <div className="office-container">
            <div className="buff-action-buttons">
              <button 
                className="buff-action-button reset-all"
                onClick={() => {
                  const newBuffConfig = { ...buffConfig };
                  newBuffConfig.office = {};
                  handleBuffConfigChange(newBuffConfig);
                }}
              >
                取消全部
              </button>
              <button 
                className="buff-action-button max-all"
                onClick={() => {
                  const newBuffConfig = { ...buffConfig };
                  if (!newBuffConfig.office) newBuffConfig.office = {};
                  
                  Object.entries(buffData.office).forEach(([name, data]) => {
                    const maxGrade = data.max_grade;
                    const { a1, d } = data.focus_by_grade;
                    const totalFocus = maxGrade * a1 + 0.5 * maxGrade * (maxGrade - 1) * d;
                    const totalEffect = maxGrade * data.effect;
                    
                    newBuffConfig.office[data.ID] = {
                      grade: maxGrade,
                      effect: totalEffect,
                      focus: totalFocus
                    };
                  });
                  
                  handleBuffConfigChange(newBuffConfig);
                }}
              >
                拉满全部
              </button>
            </div>
            <div className="office-content">
              {Object.entries(buffData.office).map(([name, data]) => 
                renderOfficeCard(name, data)
              )}
            </div>
          </div>
        )}

        {activeBuffTab === 'research' && (
          <div className="research-container">
            <div className="buff-action-buttons">
              <button 
                className="buff-action-button reset-all"
                onClick={() => {
                  const newBuffConfig = { ...buffConfig };
                  newBuffConfig.research = {};
                  handleBuffConfigChange(newBuffConfig);
                }}
              >
                取消全部
              </button>
              <button 
                className="buff-action-button max-all"
                onClick={() => {
                  const newBuffConfig = { ...buffConfig };
                  if (!newBuffConfig.research) newBuffConfig.research = {};
                  
                  Object.entries(buffData.research).forEach(([branchName, branchData]) => {
                    Object.entries(branchData).forEach(([researchName, researchData]) => {
                      const maxGrade = researchData.max_grade;
                      const totalEffects = researchData.effect.map(e => e * maxGrade);
                      
                      newBuffConfig.research[researchData.ID] = {
                        grade: maxGrade,
                        effect: totalEffects
                      };
                    });
                  });
                  
                  handleBuffConfigChange(newBuffConfig);
                }}
              >
                拉满全部
              </button>
            </div>
            <div className="research-node1">
              {/* <div className="section-header">分支1</div> */}
              <div className="research-grid">
                {Object.entries(buffData.research['分支1']).map(([name, data]) => 
                  renderResearchCard(name, data)
                )}
                {Object.entries(buffData.research['分支2']).map(([name, data]) => 
                  renderResearchCard(name, data)
                )}
              </div>
            </div>
            
            {/* <div className="research-node2">
              <div className="section-header">分支2</div>
              <div className="research-grid">
                {Object.entries(buffData.research['分支2']).map(([name, data]) => 
                  renderResearchCard(name, data)
                )}
              </div>
            </div> */}
          </div>
        )}
      </div>
    </div>
  );
}

export default BuffConfig;