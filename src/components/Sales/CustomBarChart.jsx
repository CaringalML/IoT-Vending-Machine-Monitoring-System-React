import React, { useState, useMemo } from 'react';
import './CustomBarChart.css';

const CustomBarChart = ({ data, formatCurrency }) => {
  const [tooltip, setTooltip] = useState(null);

  // Calculate the maximum value for scaling the bars.
  const maxValue = useMemo(() => {
    if (!data || data.length === 0) return 1;
    const maxRevenue = Math.max(...data.map(d => d.revenue));
    const maxCount = Math.max(...data.map(d => d.count));
    return Math.max(maxRevenue, maxCount) * 1.1;
  }, [data]);

  const handleMouseOver = (e, item) => {
    const rect = e.target.getBoundingClientRect();
    setTooltip({
      productName: item.productName,
      salesCount: item.count,
      revenue: item.revenue,
      top: rect.top + window.scrollY,
      left: rect.left + window.scrollX + rect.width / 2,
    });
  };

  const handleMouseLeave = () => {
    setTooltip(null);
  };
  
  // Render the horizontal axis labels
  const renderXAxis = () => {
    const ticks = 5;
    const labels = [];
    for (let i = 0; i <= ticks; i++) {
        const value = (maxValue / ticks) * i;
        const position = (i / ticks) * 100;
        labels.push(
            <div key={i} className="x-axis-label" style={{ left: `${position}%` }}>
                {Math.round(value)}
            </div>
        );
    }
    return <div className="x-axis-container">{labels}</div>;
  };

  if (!data || data.length === 0) {
    return (
      <div className="custom-chart-no-data">
        <div className="no-data-icon">📊</div>
        <div className="no-data-title">No product sales data</div>
        <div className="no-data-subtitle">Product performance will appear here.</div>
      </div>
    );
  }

  return (
    <div className="custom-chart-container">
      <div className="custom-chart-header">
        <div className="y-axis-title">Products</div>
        <div className="x-axis-title">Total Value (Sales & Revenue)</div>
      </div>

      {/* The scrollable area now contains only the bars */}
      <div className="custom-chart-scroll-area">
        {data.map((item, index) => {
        const salesWidth = (item.count / maxValue) * 100;
        const revenueWidth = (item.revenue / maxValue) * 100;

        return (
            <div className="chart-row" key={index}>
            <div className="product-label">{item.productName}</div>
            <div className="bars-container">
                <div 
                    className="bar sales-bar" 
                    style={{ width: `${salesWidth}%` }}
                    onMouseOver={(e) => handleMouseOver(e, item)}
                    onMouseLeave={handleMouseLeave}
                >
                <span className="bar-annotation">{item.count}</span>
                </div>
                <div 
                    className="bar revenue-bar" 
                    style={{ width: `${revenueWidth}%` }}
                    onMouseOver={(e) => handleMouseOver(e, item)}
                    onMouseLeave={handleMouseLeave}
                >
                <span className="bar-annotation">{formatCurrency(item.revenue)}</span>
                </div>
            </div>
            </div>
        );
        })}
      </div>

      {/* The x-axis is now outside the scroll area, so it's always visible */}
      {renderXAxis()}
      
      {/* The legend also remains outside the scroll area */}
      <div className="custom-chart-legend">
        <div className="legend-item">
          <div className="legend-color-box sales-bar"></div>
          Sales Count
        </div>
        <div className="legend-item">
          <div className="legend-color-box revenue-bar"></div>
          Revenue (NZD)
        </div>
      </div>
      
      {tooltip && (
        <div 
          className="custom-tooltip"
          style={{
            top: `${tooltip.top}px`,
            left: `${tooltip.left}px`,
            transform: 'translate(-50%, -100%) translateY(-10px)',
          }}
        >
          <div className="tooltip-title">{tooltip.productName}</div>
          <div className="tooltip-row">
            <span>Sales:</span>
            <span>{tooltip.salesCount}</span>
          </div>
          <div className="tooltip-row">
            <span>Revenue:</span>
            <span>{formatCurrency(tooltip.revenue)}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomBarChart;