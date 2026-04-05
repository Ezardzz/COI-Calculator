import './ResourceDashboard.css'
import GameIcon from '@/components/GameIcon'


export default function ResourceDashboard({data}) {
  const formattedData = formatData(data)
  const rows = ['物品', '产出', '消耗', '使用率']
  return (
      <div className="rd-panel">
        <div className='pd-header'>物品使用率统计</div>
        <div className="rd-table">

          {/* 左侧表头列 */}
          <div className="rd-col rd-col-header">
            {rows.map(label => (
              <div key={label} className="rd-cell rd-label-cell">{label}</div>
            ))}
          </div>

          {/* 数据列，每种资源一列 */}
          {Object.entries(formattedData).map(([name, d]) => (
            <div key={name} className="rd-col rd-col-data">
              <div className="rd-cell rd-name-cell">
                <GameIcon name={name} size={20} tooltip={"top"}/>
              </div>

              <div className="rd-cell rd-produced">
                {d.produced}
              </div>

              <div className="rd-cell rd-consumed">
                {d.consumption}
              </div>

              <div className="rd-cell rd-rate">
                {d.useRate ? (d.useRate * 100).toFixed(1) + '%' : '—'}
              </div>
            </div>
          ))}

        </div>
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
