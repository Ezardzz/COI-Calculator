import './StatsTable.css'
import GameIcon from '@/components/GameIcon'


export default function ResourceDashboard({statistic}) {
  const totalItems = statistic?.totalItems ?? {};
  const deficientItems = statistic?.deficientItems ?? [];
  const pdData = formatData(totalItems)
  const rows = ['物品', '产出', '消耗', '使用率']
  return (
    <div className='item-stats-container'>
      <div className="pd-container">
        <div className='pd-header'>物品使用率统计</div>
        <div className="pd-table">

          {/* 左侧表头列 */}
          <div className="pd-col pd-col-header">
            {rows.map(label => (
              <div key={label} className="pd-cell pd-label-cell">{label}</div>
            ))}
          </div>
          {/* 数据列，每种资源一列 */}
            {Object.entries(pdData).map(([name, d]) => (
              <div key={name} className="pd-col pd-col-data">
                <div className="pd-cell pd-name-cell">
                  <GameIcon name={name} size={20} tooltip={"top"}/>
                </div>

                <div className="pd-cell pd-produced">
                  {d.produced}
                </div>

                <div className="pd-cell pd-consumed">
                  {d.consumption}
                </div>

                <div className="pd-cell pd-rate">
                  {d.useRate ? (d.useRate * 100).toFixed(1) + '%' : '—'}
                </div>
              </div>
            ))}


        </div>
      </div>
      {deficientItems.length > 0 && (
        <div className='deficiency-container'>
          <div className='deficiency-header'>以下物品存在缺口</div>
          <div className='deficiency-grid'>
            {deficientItems.map((item, index) => (
              <div key={index} className="deficiency-item-cell">
                <GameIcon name={item} size={20} tooltip={"top"}/>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function formatData(data) {
  const result = {};

  Object.entries(data).forEach(([key, value]) => {
    const { produced, consumption, ...rest } = value;

    // 判断是否需要小数（任一有小数就保留1位）
    const needDecimal =
      !Number.isInteger(produced) || !Number.isInteger(consumption);

    const digits = needDecimal ? 1 : 0;

    const format = (num) =>
      num.toLocaleString('en-US', {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      });

    result[key] = {
      produced: produced ? format(produced) : '—',
      consumption: consumption ? format(consumption) : '—',
      ...rest,
    };
  });

  return result;
}
