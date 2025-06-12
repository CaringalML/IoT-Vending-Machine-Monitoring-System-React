import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import './Charts.css';

const TimeSalesChart = ({ data }) => {
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
  const calculateChartWidth = () => {
    if (!chartMetrics.processedData.length) return '100%';
    
    const screenWidth = window.innerWidth;
    const baseItemWidth = screenWidth < 768 ? 30 : screenWidth < 1024 ? 40 : 50;
    const minWidth = screenWidth < 768 ? 350 : 450;
    const calculatedWidth = Math.max(minWidth, chartMetrics.processedData.length * baseItemWidth);
    
    // Only use scrolling if we have more than a certain number of data points
    const maxDisplayPoints = screenWidth < 768 ? 8 : screenWidth < 1024 ? 12 : 16;
    
    return chartMetrics.processedData.length > maxDisplayPoints ? `${calculatedWidth}px` : '100%';
  };

  const chartWidth = useMemo(() => calculateChartWidth(), [chartMetrics.processedData.length]);

  // Get chart margins based on screen size
  const getChartMargins = () => {
    const screenWidth = window.innerWidth;
    if (screenWidth < 480) {
      return { top: 15, right: 15, left: 25, bottom: 40 };
    } else if (screenWidth < 768) {
      return { top: 20, right: 20, left: 30, bottom: 45 };
    }
    return { top: 20, right: 30, left: 35, bottom: 50 };
  };

  // Format tooltip label for better readability
  const formatTooltipLabel = (label) => {
    try {
      const date = new Date(label);
      const screenWidth = window.innerWidth;
      
      if (screenWidth < 480) {
        return date.toLocaleDateString('en-NZ', {
          month: 'short',
          day: 'numeric'
        });
      } else if (screenWidth < 768) {
        return date.toLocaleDateString('en-NZ', {
          weekday: 'short',
          month: 'short',
          day: 'numeric'
        });
      }
      
      return date.toLocaleDateString('en-NZ', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      return label;
    }
  };

  // Format X-axis labels based on screen size and date
  const formatXAxisLabel = (value) => {
    try {
      const date = new Date(value);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      const screenWidth = window.innerWidth;
      
      // Show "Today" or "Yesterday" for recent dates on larger screens
      if (screenWidth >= 768) {
        if (date.toDateString() === today.toDateString()) {
          return 'Today';
        } else if (date.toDateString() === yesterday.toDateString()) {
          return 'Yesterday';
        }
      }
      
      // For different screen sizes, show appropriate format
      const daysDiff = Math.floor((today - date) / (1000 * 60 * 60 * 24));
      
      if (screenWidth < 480) {
        return date.toLocaleDateString('en-NZ', { day: 'numeric' });
      } else if (screenWidth < 768) {
        if (daysDiff <= 7) {
          return date.toLocaleDateString('en-NZ', { weekday: 'short' });
        }
        return date.toLocaleDateString('en-NZ', { month: 'short', day: 'numeric' });
      } else {
        if (daysDiff <= 7) {
          return date.toLocaleDateString('en-NZ', { weekday: 'short' });
        }
        return date.toLocaleDateString('en-NZ', { month: 'short', day: 'numeric' });
      }
    } catch (error) {
      return value;
    }
  };

  // Custom Tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      const isMaxValue = data.value === chartMetrics.maxSales && data.value > 0;
      
      return (
        <div className="chart-enhanced-tooltip">
          <p className="chart-enhanced-tooltip-label">
            {formatTooltipLabel(label)}
          </p>
          <div className="chart-enhanced-tooltip-value">
            <div 
              className="chart-enhanced-tooltip-color-indicator"
              style={{ backgroundColor: data.color }}
            ></div>
            <span className="chart-enhanced-tooltip-text">
              {data.value} {data.value === 1 ? 'sale' : 'sales'}
            </span>
          </div>
          {isMaxValue && data.value > 0 && (
            <p className="chart-enhanced-tooltip-badge">
              🏆 Peak sales day
            </p>
          )}
          {data.value === 0 && (
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
      const dotSize = window.innerWidth < 768 ? 4 : 6;
      return (
        <circle 
          cx={cx} 
          cy={cy} 
          r={dotSize} 
          fill="#667eea" 
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
          <div className="chart-enhanced-no-data-title">No time-series data available</div>
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
          {window.innerWidth < 480 ? 
            `${chartMetrics.totalSales} sales` : 
            `Total: ${chartMetrics.totalSales} sales`
          }
        </div>
      )}
      
      <div className="chart-enhanced-scrollable">
        <div 
          className="chart-enhanced-inner" 
          style={{ width: chartWidth, minWidth: '100%' }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartMetrics.processedData} margin={getChartMargins()}>
              <defs>
                <linearGradient id="timeSalesGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#667eea" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#667eea" stopOpacity={0}/>
                </linearGradient>
              </defs>
              
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke="#e2e8f0" 
                opacity={0.7}
              />
              
              <XAxis 
                dataKey="date" 
                stroke="#718096"
                fontSize={window.innerWidth < 768 ? 9 : 11}
                tickFormatter={formatXAxisLabel}
                interval="preserveStartEnd"
                tick={{ fontSize: window.innerWidth < 768 ? 9 : 11 }}
                angle={window.innerWidth < 480 ? -45 : 0}
                textAnchor={window.innerWidth < 480 ? 'end' : 'middle'}
                height={window.innerWidth < 480 ? 60 : 50}
              />
              
              <YAxis 
                stroke="#718096" 
                fontSize={window.innerWidth < 768 ? 9 : 11}
                tick={{ fontSize: window.innerWidth < 768 ? 9 : 11 }}
                tickFormatter={(value) => value % 1 === 0 ? value : ''}
                width={window.innerWidth < 480 ? 25 : 35}
              />
              
              <Tooltip content={<CustomTooltip />} />
              
              {/* Reference line for average - only show on larger screens to avoid clutter */}
              {chartMetrics.averageSales > 0 && window.innerWidth >= 768 && (
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
                stroke="#667eea" 
                strokeWidth={window.innerWidth < 768 ? 2 : 3}
                fill="url(#timeSalesGradient)"
                dot={<CustomDot />}
                activeDot={{ 
                  r: window.innerWidth < 768 ? 4 : 5, 
                  stroke: '#667eea', 
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
      {chartMetrics.processedData.length > 12 && (
        <div className="chart-data-count">
          {chartMetrics.processedData.length} days
        </div>
      )}
    </div>
  );
};

export default TimeSalesChart;