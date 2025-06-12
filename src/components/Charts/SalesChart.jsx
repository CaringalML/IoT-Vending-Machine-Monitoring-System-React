import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import './Charts.css';

const SalesChart = ({ data }) => {
  // Process data and calculate metrics
  const chartMetrics = useMemo(() => {
    if (!data || data.length === 0) {
      return {
        processedData: [],
        totalSales: 0,
        averageSales: 0,
        maxSales: 0,
        hasData: false
      };
    }

    const validData = data.filter(item => item.sales !== undefined && item.sales !== null);
    const totalSales = validData.reduce((sum, item) => sum + (item.sales || 0), 0);
    const averageSales = validData.length > 0 ? totalSales / validData.length : 0;
    const maxSales = Math.max(...validData.map(item => item.sales || 0));

    return {
      processedData: validData,
      totalSales,
      averageSales,
      maxSales,
      hasData: validData.length > 0 && totalSales > 0
    };
  }, [data]);

  // Calculate dynamic width for horizontal scrolling when needed
  const chartWidth = useMemo(() => {
    if (!chartMetrics.processedData.length) return '100%';
    
    const screenWidth = window.innerWidth;
    const baseItemWidth = screenWidth < 768 ? 25 : screenWidth < 1024 ? 35 : 45;
    const minWidth = screenWidth < 768 ? 300 : 400;
    const calculatedWidth = Math.max(minWidth, chartMetrics.processedData.length * baseItemWidth);
    
    // Only use scrolling if we have more than a certain number of data points
    const maxDisplayPoints = screenWidth < 768 ? 10 : screenWidth < 1024 ? 15 : 20;
    
    return chartMetrics.processedData.length > maxDisplayPoints ? `${calculatedWidth}px` : '100%';
  }, [chartMetrics.processedData.length]);

  // Get chart margins based on screen size
  const getChartMargins = () => {
    const screenWidth = window.innerWidth;
    if (screenWidth < 480) {
      return { top: 10, right: 15, left: 25, bottom: 25 };
    } else if (screenWidth < 768) {
      return { top: 15, right: 20, left: 30, bottom: 30 };
    }
    return { top: 20, right: 30, left: 35, bottom: 35 };
  };

  // Format X-axis labels based on screen size
  const formatXAxisLabel = (value) => {
    if (!value) return '';
    
    const screenWidth = window.innerWidth;
    if (screenWidth < 480) {
      // Show only day for very small screens
      return value.toString().split(' ')[1] || value.toString().substring(0, 3);
    } else if (screenWidth < 768) {
      // Show abbreviated format for small screens
      return value.toString().length > 6 ? value.toString().substring(0, 6) + '...' : value;
    }
    return value;
  };

  // Custom Tooltip for better display
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const value = payload[0].value;
      const isMaxValue = value === chartMetrics.maxSales && value > 0;
      
      return (
        <div className="chart-enhanced-tooltip">
          <p className="chart-enhanced-tooltip-label">
            {label}
          </p>
          <div className="chart-enhanced-tooltip-value">
            <div 
              className="chart-enhanced-tooltip-color-indicator"
              style={{ backgroundColor: '#8884d8' }}
            ></div>
            <span className="chart-enhanced-tooltip-text">
              {value} {value === 1 ? 'sale' : 'sales'}
            </span>
          </div>
          {isMaxValue && value > 0 && (
            <p className="chart-enhanced-tooltip-badge">
              🏆 Peak sales day
            </p>
          )}
          {value === 0 && (
            <p className="chart-enhanced-tooltip-warning">
              No sales this day
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  // Custom dot for peak sales
  const CustomDot = (props) => {
    const { cx, cy, payload } = props;
    if (payload.sales === chartMetrics.maxSales && payload.sales > 0) {
      return (
        <circle 
          cx={cx} 
          cy={cy} 
          r={window.innerWidth < 768 ? 4 : 6} 
          fill="#8884d8" 
          stroke="#ffffff" 
          strokeWidth={2}
          className="chart-peak-dot"
        />
      );
    }
    return null;
  };

  if (!chartMetrics.hasData) {
    return (
      <div className="chart-enhanced-container">
        <div className="chart-enhanced-no-data">
          <div className="chart-enhanced-no-data-icon">📈</div>
          <div className="chart-enhanced-no-data-title">No sales data available</div>
          <div className="chart-enhanced-no-data-subtitle">
            Sales trends will appear here once transactions are recorded
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="chart-enhanced-container">
      {/* Growth indicator */}
      {chartMetrics.totalSales > 0 && (
        <div className="chart-growth-indicator positive">
          Total: {chartMetrics.totalSales} sales
        </div>
      )}
      
      <div className="chart-enhanced-scrollable">
        <div 
          className="chart-enhanced-inner" 
          style={{ width: chartWidth, minWidth: '100%' }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartMetrics.processedData}
              margin={getChartMargins()}
            >
              <defs>
                <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8884d8" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
                </linearGradient>
              </defs>
              
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke="#e2e8f0" 
                opacity={0.7}
              />
              
              <XAxis 
                dataKey="displayDate" 
                stroke="#718096"
                fontSize={window.innerWidth < 768 ? 10 : 12}
                tick={{ fontSize: window.innerWidth < 768 ? 10 : 11 }}
                tickFormatter={formatXAxisLabel}
                interval="preserveStartEnd"
                angle={window.innerWidth < 480 ? -45 : 0}
                textAnchor={window.innerWidth < 480 ? 'end' : 'middle'}
                height={window.innerWidth < 480 ? 60 : 40}
              />
              
              <YAxis 
                stroke="#718096"
                fontSize={window.innerWidth < 768 ? 10 : 12}
                tick={{ fontSize: window.innerWidth < 768 ? 10 : 11 }}
                allowDecimals={false}
                width={window.innerWidth < 480 ? 25 : window.innerWidth < 768 ? 30 : 35}
              />
              
              <Tooltip content={<CustomTooltip />} />
              
              {/* Show legend only on larger screens */}
              {window.innerWidth >= 768 && (
                <Legend 
                  wrapperStyle={{ 
                    fontSize: window.innerWidth < 1024 ? '12px' : '14px',
                    paddingTop: '10px' 
                  }}
                />
              )}
              
              {/* Average line reference */}
              {chartMetrics.averageSales > 0 && (
                <ReferenceLine 
                  y={Math.round(chartMetrics.averageSales)} 
                  stroke="#ed8936" 
                  strokeDasharray="5 5"
                  strokeOpacity={0.6}
                  label={{ 
                    value: `Avg: ${Math.round(chartMetrics.averageSales)}`, 
                    position: "topRight",
                    className: "chart-reference-label",
                    style: { fill: '#ed8936' }
                  }}
                />
              )}
              
              <Line 
                type="monotone" 
                dataKey="sales" 
                name="Daily Sales" 
                stroke="#8884d8" 
                strokeWidth={window.innerWidth < 768 ? 2 : 3}
                fill="url(#salesGradient)"
                dot={<CustomDot />}
                activeDot={{ 
                  r: window.innerWidth < 768 ? 4 : 5, 
                  stroke: '#8884d8', 
                  strokeWidth: 2, 
                  fill: '#ffffff',
                  className: 'chart-active-dot'
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      {/* Data count indicator */}
      {chartMetrics.processedData.length > 15 && (
        <div className="chart-data-count">
          {chartMetrics.processedData.length} days
        </div>
      )}
    </div>
  );
};

export default SalesChart;