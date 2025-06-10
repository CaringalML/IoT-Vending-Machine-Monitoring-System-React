import React, { useState, useMemo, useEffect } from 'react';
import './CustomBarChart.css';

const CustomBarChart = ({ data, formatCurrency }) => {
  const [tooltip, setTooltip] = useState(null);
  const [animate, setAnimate] = useState(false);

  // Calculate the maximum value for scaling the bars.
  const maxValue = useMemo(() => {
    if (!data || data.length === 0) return 1;
    const maxRevenue = Math.max(...data.map(d => d.revenue));
    const maxCount = Math.max(...data.map(d => d.count));
    return Math.max(maxRevenue, maxCount) * 1.1;
  }, [data]);

  useEffect(() => {
    // This effect triggers the bar animations.
    // It resets the animation when data changes and then enables it.
    setAnimate(false);
    if (data && data.length > 0) {
      const timer = setTimeout(() => setAnimate(true), 100);
      return () => clearTimeout(timer);
    }
  }, [data]);

  const handleMouseOver = (e, item) => {
    const rect = e.target.getBoundingClientRect();
    const tooltipHeightEstimate = 90; // Estimated height of the tooltip
    const tooltipWidthEstimate = 180; // Estimated width of the tooltip

    // Decide vertical placement (above or below the bar)
    const spaceAbove = rect.top;
    const spaceBelow = window.innerHeight - rect.bottom;
    const isAbove = spaceAbove > tooltipHeightEstimate || spaceAbove > spaceBelow;
    
    const top = isAbove ? rect.top : rect.bottom;
    const transformY = isAbove ? 'translateY(-100%) translateY(-10px)' : 'translateY(10px)';

    // Decide horizontal placement and prevent viewport overflow
    let left = rect.left + rect.width / 2;
    let transformX = 'translateX(-50%)';

    if (left - (tooltipWidthEstimate / 2) < 10) { // Check left overflow
      left = 10;
      transformX = 'translateX(0)';
    } else if (left + (tooltipWidthEstimate / 2) > window.innerWidth - 10) { // Check right overflow
      left = window.innerWidth - 10;
      transformX = 'translateX(-100%)';
    }

    setTooltip({
      productName: item.productName,
      salesCount: item.count,
      revenue: item.revenue,
      top,
      left,
      transform: `${transformX} ${transformY}`,
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

      <div className="custom-chart-scroll-area">
        {data.map((item, index) => {
          const salesWidth = (item.count / maxValue) * 100;
          const revenueWidth = (item.revenue / maxValue) * 100;

          return (
            <div className="chart-row" key={index}>
              <div className="product-label" title={item.productName}>{item.productName}</div>
              <div className="bars-container">
                <div 
                  className="bar sales-bar" 
                  style={{ width: animate ? `${salesWidth}%` : '0%' }}
                  onMouseOver={(e) => handleMouseOver(e, item)}
                  onMouseLeave={handleMouseLeave}
                >
                  <span className="bar-annotation">{item.count}</span>
                </div>
                <div 
                  className="bar revenue-bar" 
                  style={{ width: animate ? `${revenueWidth}%` : '0%' }}
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

      {renderXAxis()}
      
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
            transform: tooltip.transform,
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