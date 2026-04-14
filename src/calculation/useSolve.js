import { useState } from 'react';
import { useConfig } from '@/contexts/ConfigContext'
import { useGameData } from '@/contexts/GameDataContext'
import { useHighs } from '@/contexts/HighsContext';
import { useCalculation } from '@/contexts/CalculationContext';

import { cfg2recipe } from '@/calculation/cfg2recipe';
import { ResultsAnalysis } from '@/calculation/resultsAnalysis';
import { solve } from '@/calculation/solve';

export function useSolve(setStatistic) {
    const { setResults } = useCalculation();
    const { configuration } = useConfig();
    const { gameData, recipeData, contractData } = useGameData();
    const { lpSolve } = useHighs();

    const [solving, setSolving] = useState(false);

    const handleSolve = async () => {
        const pop = configuration.facility.demand.population
        // 冗余范围为±0.05
        const redundancy = Object.fromEntries(
            Object.entries(configuration.facility.demand.redundancy).map(([key, value]) => [
                key,
                [value - 0.05 > 1 ? value - 0.05 : 1, pop && key === '工人' ? value + 9999 : value + 0.05]
            ])
        );
        const noMaintenanceMode = configuration.facility.demand.noMaintenanceMode
        console.log(noMaintenanceMode);
        
        const Recipes = cfg2recipe(configuration, gameData, JSON.parse(JSON.stringify(recipeData)), contractData)
        setSolving(true);
        await new Promise(resolve => setTimeout(resolve, 0));
        try {
            const { resultRecipes, solution, pc } = await solve({
                lpSolve,
                Recipes,
                redundancy,
                noMaintenanceMode,
            })

            if (Object.keys(solution).length) {
                const validRecipes = JSON.parse(JSON.stringify(resultRecipes.filter(recipe => String(recipe?.ID) in solution)))
                const { categoryResults, specialItems, deficientItems } = ResultsAnalysis(solution, validRecipes, pc)
                if (setStatistic){
                    setStatistic({
                        totalItems: { ...specialItems, ...pc },
                        deficientItems: deficientItems
                    })
                }

                setResults(categoryResults);
            }
        } catch (e) {
            console.error('Solve failed:', e);
        } finally {
            setSolving(false);
        }
    };

    return { handleSolve, solving };
}
