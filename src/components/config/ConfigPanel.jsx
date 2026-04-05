import { useEffect } from 'react';
import FacilityConfig from './FacilityConfig';
import BuffConfig from './BuffConfig';
import './ConfigPanel.css';

function ConfigPanel() {
  return (
    <div className="configuration-container">
      <div className="configuration-header">生产配置</div>
      <div className="configuration-content">
        <FacilityConfig />
        <BuffConfig />
      </div>
    </div>
  );
}

export default ConfigPanel;