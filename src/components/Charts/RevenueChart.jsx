import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import './Charts.css';

const RevenueChart = ({ data }) => {
  // Helper to format currency for the tooltip
  const formatCurrency = (value) => new Intl.NumberFormat('en-NZ', { 
    style: 'currency', 
    currency: 'NZD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(value);

  // Process data and calculate metrics
  const chartMetrics = useMemo(() => {
    if (!data || data.length === 0) {
      return {
        processedData: [],
        totalRevenue: 0,
        averageRevenue: 0,
        maxRevenue: 0,
        hasData: false
      };
    }

    const validData = data.filter(item => item.revenue !== undefined && item.revenue !== null);
    const totalRevenue = validData.reduce((sum, item) => sum + (item.revenue || 0), 0);
    const averageRevenue = validData.length > 0 ? totalRevenue / validData.length : 0;
    const maxRevenue = Math.max(...validData.map(item => item.revenue || 0));

    return {
      processedData: validData,
      totalRevenue,
      averageRevenue,
      maxRevenue,
      hasData: validData.length > 0 && totalRevenue > 0
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
      return { top: 10, right: 15, left: 40, bottom: 25 };
    } else if (screenWidth < 768) {
      return { top: 15, right: 20, left: 50, bottom: 30 };
    }
    return { top: 20, right: 30, left: 60, bottom: 35 };
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
      const isMaxValue = value === chartMetrics.maxRevenue && value > 0;
      
      return (
        <div className="chart-enhanced-tooltip">
          <p className="chart-enhanced-tooltip-label">
            {label}
          </p>
          <div className="chart-enhanced-tooltip-value">
            <div 
              className="chart-enhanced-tooltip-color-indicator"
              style={{ backgroundColor: '#82ca9d' }}
            ></div>
            <span className="chart-enhanced-tooltip-text">
              Revenue: {formatCurrency(value)}
            </span>
          </div>
          {isMaxValue && (
            <p className="chart-enhanced-tooltip-badge">
              🏆 Highest revenue day
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

  // Format Y-axis ticks
  const formatYAxisTick = (value) => {
    const screenWidth = window.innerWidth;
    if (screenWidth < 480) {
      return value >= 1000 ? `$${(value/1000).toFixed(0)}k` : `$${value}`;
    }
    return `$${value}`;
  };

  if (!chartMetrics.hasData) {
    return (
      <div className="chart-enhanced-container">
        <div className="chart-enhanced-no-data">
          <div className="chart-enhanced-no-data-icon">💰</div>
          <div className="chart-enhanced-no-data-title">No revenue data available</div>
          <div className="chart-enhanced-no-data-subtitle">
            Revenue trends will appear here once sales are recorded
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="chart-enhanced-container">
      {/* Growth indicator */}
      {chartMetrics.totalRevenue > 0 && (
        <div className="chart-growth-indicator positive">
          Total: {formatCurrency(chartMetrics.totalRevenue)}
        </div>
      )}
      
      <div className="chart-enhanced-scrollable">
        <div 
          className="chart-enhanced-inner" 
          style={{ width: chartWidth, minWidth: '100%' }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartMetrics.processedData}
              margin={getChartMargins()}
            >
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#82ca9d" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#82ca9d" stopOpacity={0.1}/>
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
                tickFormatter={formatYAxisTick}
                width={window.innerWidth < 480 ? 40 : window.innerWidth < 768 ? 50 : 60}
              />
              
              <Tooltip content={<CustomTooltip />} />
              
              {/* Average line reference */}
              {chartMetrics.averageRevenue > 0 && (
                <ReferenceLine 
                  y={chartMetrics.averageRevenue} 
                  stroke="#ed8936" 
                  strokeDasharray="5 5"
                  strokeOpacity={0.6}
                  label={{ 
                    value: `Avg: ${formatCurrency(chartMetrics.averageRevenue)}`, 
                    position: "topRight",
                    className: "chart-reference-label",
                    style: { fill: '#ed8936' }
                  }}
                />
              )}
              
              <Area 
                type="monotone" 
                dataKey="revenue" 
                name="Daily Revenue" 
                stroke="#82ca9d" 
                strokeWidth={window.innerWidth < 768 ? 2 : 3}
                fillOpacity={1} 
                fill="url(#colorRevenue)"
                activeDot={{ 
                  r: window.innerWidth < 768 ? 4 : 5, 
                  stroke: '#82ca9d', 
                  strokeWidth: 2, 
                  fill: '#ffffff',
                  className: 'chart-active-dot'
                }}
              />
            </AreaChart>
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

export default RevenueChart;