import { useState,useEffect } from 'react';
import { useConfig } from '@/contexts/ConfigContext'
import { useGameData } from '@/contexts/GameDataContext'
import { useHighs } from '@/contexts/HighsContext';
import { cfg2recipe } from '@/calculation/cfg2recipe';
import { ResultsAnalysis } from '@/calculation/resultsAnalysis';
import { solve } from '@/calculation/solve';
import { Calculator } from 'lucide-react';
import StatsTable from './StatsTable';
import './Calculation.css';

function Calculation({setResults}) {
    const { configuration } = useConfig();
    const { gameData, recipeData, contractData } = useGameData();
    const { lpSolve, loading } = useHighs();

    const [statistic, setStatistic] = useState({});
    const [solving, setSolving] = useState(false);


    // 自动生成上下限，每个值上下浮动0.05
    const pop = configuration.facility.demand.population //固定人口时工人不限制上限
    const redundancy = Object.fromEntries(
        Object.entries(configuration.facility.demand.redundancy).map(([key, value]) => [
            key,
            [value - 0.05 > 1 ? value - 0.05 : 1, pop && key ==="工人" ? value + 9999: value + 0.05]
        ])
    );
  /* ---------- 点击求解 ---------- */
    const handleSolve = async () => {
        const Recipes = cfg2recipe(configuration,gameData,JSON.parse(JSON.stringify(recipeData)),contractData)
        // console.log(Recipes);
        setSolving(true);
        await new Promise(resolve => setTimeout(resolve, 0));
        try {
            const {resultRecipes,solution,pc} = await solve({
                lpSolve,
                Recipes,
                redundancy
            })
            
            if (Object.keys(solution).length){
              const validRecipes = JSON.parse(JSON.stringify(resultRecipes.filter(recipe => String(recipe?.ID) in solution)))
              const {categoryResults,specialItems,deficientItems} = ResultsAnalysis(solution,validRecipes,pc)
              setStatistic({
                totalItems:{...specialItems,...pc},
                deficientItems:deficientItems
              })
              setResults(categoryResults);
            }

        } catch (e) {
            console.error("Solve failed:", e);
        } finally {
            setSolving(false);
            
        }
    };
    return (
      <>
        <div className='calculation-header'>计算</div>
        <div className="calculation-container">
            <div className='calc-container'>
            <button className="calc-btn" onClick={handleSolve}  disabled={solving}>
              <Calculator className="title-icon" size={20} />
              <span>{solving ? "求解中..." : "求解"}</span>
            </button>
            </div>
            <StatsTable statistic={statistic}></StatsTable>
        </div>
      </>

    );
}
export default Calculation;

