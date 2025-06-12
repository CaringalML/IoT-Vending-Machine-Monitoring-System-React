import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import './Charts.css';

const InventoryChart = ({ data }) => {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    // Sort data by slot for better visualization
    return [...data].sort((a, b) => {
      // Extract numeric part of slot for proper sorting
      const slotA = parseInt(a.slot.replace(/\D/g, '')) || 0;
      const slotB = parseInt(b.slot.replace(/\D/g, '')) || 0;
      return slotA - slotB;
    });
  }, [data]);

  const getBarColor = (quantity, threshold = 5) => {
    if (quantity === 0) return '#f56565'; // Red for out of stock
    if (quantity <= threshold) return '#ed8936'; // Orange for low stock
    if (quantity <= threshold * 2) return '#ecc94b'; // Yellow for medium stock
    return '#38a169'; // Green for good stock
  };

  const getStockStatus = (quantity, threshold = 5) => {
    if (quantity === 0) return 'Out of Stock';
    if (quantity <= threshold) return 'Low Stock';
    if (quantity <= threshold * 2) return 'Medium Stock';
    return 'Good Stock';
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const threshold = data.lowStockThreshold || 5;
      const status = getStockStatus(data.quantity, threshold);
      
      return (
        <div className="chart-enhanced-tooltip">
          <p className="chart-enhanced-tooltip-label">
            Slot {label}
          </p>
          <div className="chart-enhanced-tooltip-value">
            <div 
              className="chart-enhanced-tooltip-color-indicator"
              style={{ backgroundColor: getBarColor(data.quantity, threshold) }}
            ></div>
            <span className="chart-enhanced-tooltip-text">
              {data.quantity} units
            </span>
          </div>
          <p className="chart-enhanced-tooltip-badge">
            Status: {status}
          </p>
          {data.quantity <= threshold && data.quantity > 0 && (
            <p className="chart-enhanced-tooltip-warning">
              ⚠️ Needs restocking
            </p>
          )}
          {data.quantity === 0 && (
            <p className="chart-enhanced-tooltip-warning">
              🚫 Empty slot
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  // Calculate dynamic width based on number of items and screen size
  const chartWidth = useMemo(() => {
    if (!chartData.length) return '100%';
    
    const screenWidth = window.innerWidth;
    const baseItemWidth = screenWidth < 768 ? 45 : screenWidth < 1024 ? 55 : 65;
    const minWidth = screenWidth < 768 ? 300 : 400;
    const calculatedWidth = Math.max(minWidth, chartData.length * baseItemWidth);
    
    return `${calculatedWidth}px`;
  }, [chartData.length]);

  // Calculate margins based on screen size
  const getChartMargins = () => {
    const screenWidth = window.innerWidth;
    if (screenWidth < 480) {
      return { top: 10, right: 15, left: 15, bottom: 25 };
    } else if (screenWidth < 768) {
      return { top: 15, right: 20, left: 20, bottom: 30 };
    }
    return { top: 20, right: 30, left: 20, bottom: 35 };
  };

  if (!chartData || chartData.length === 0) {
    return (
      <div className="chart-enhanced-container">
        <div className="chart-enhanced-no-data">
          <div className="chart-enhanced-no-data-icon">📦</div>
          <div className="chart-enhanced-no-data-title">No inventory data available</div>
          <div className="chart-enhanced-no-data-subtitle">
            Inventory levels will appear here once products are stocked
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="chart-enhanced-container">
      <div className="chart-enhanced-scrollable inventory-chart-container">
        <div 
          className="chart-enhanced-inner" 
          style={{ width: chartWidth, minWidth: '100%' }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={chartData} 
              margin={getChartMargins()}
            >
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke="#e2e8f0" 
                opacity={0.7}
              />
              <XAxis 
                dataKey="slot" 
                stroke="#718096"
                fontSize={window.innerWidth < 768 ? 10 : 12}
                interval={0}
                angle={window.innerWidth < 480 ? -45 : 0}
                textAnchor={window.innerWidth < 480 ? 'end' : 'middle'}
                height={window.innerWidth < 480 ? 60 : 40}
                tick={{ fontSize: window.innerWidth < 768 ? 10 : 11 }}
              />
              <YAxis 
                stroke="#718096" 
                fontSize={window.innerWidth < 768 ? 10 : 12}
                width={window.innerWidth < 480 ? 35 : 45}
                tick={{ fontSize: window.innerWidth < 768 ? 10 : 11 }}
              />
              <Tooltip 
                content={<CustomTooltip />}
                cursor={{ fill: 'rgba(102, 126, 234, 0.1)' }}
              />
              <Bar 
                dataKey="quantity" 
                radius={[4, 4, 0, 0]}
                maxBarSize={window.innerWidth < 480 ? 30 : window.innerWidth < 768 ? 40 : 50}
              >
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={getBarColor(entry.quantity, entry.lowStockThreshold)} 
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      {/* Data count indicator */}
      {chartData.length > 10 && (
        <div className="chart-data-count">
          {chartData.length} slots
        </div>
      )}
    </div>
  );
};

export default InventoryChart;