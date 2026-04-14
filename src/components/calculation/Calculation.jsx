import { useState,useEffect } from 'react';
import { useSolve } from '@/calculation/useSolve';
import { Calculator } from 'lucide-react';
import StatsTable from './StatsTable';
import './Calculation.css';

function Calculation() {
  const [statistic, setStatistic] = useState({});
  const { handleSolve, solving } = useSolve(setStatistic);

  return (
    <>
      <div className='calculation-header'>计算</div>
      <div className="calculation-container">
          <div className='calc-container'>
          <button className="calc-btn" onClick={handleSolve} disabled={solving}>
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

