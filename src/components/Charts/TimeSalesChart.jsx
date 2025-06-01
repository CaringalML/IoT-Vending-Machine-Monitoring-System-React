import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import './Charts.css';

const TimeSalesChart = ({ data }) => {
  // Calculate average sales for reference line
  const averageSales = data && data.length > 0 
    ? data.reduce((sum, item) => sum + (item.sales || 0), 0) / data.length 
    : 0;

  // Find peak sales day
  const peakSales = data && data.length > 0 
    ? Math.max(...data.map(item => item.sales || 0))
    : 0;

  const formatTooltipLabel = (label) => {
    const date = new Date(label);
    return date.toLocaleDateString('en-NZ', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTooltipValue = (value, name) => {
    if (name === 'sales') {
      return [`${value} ${value === 1 ? 'sale' : 'sales'}`, 'Sales Count'];
    }
    return [value, name];
  };

  const formatXAxisLabel = (value) => {
    const date = new Date(value);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Show "Today" or "Yesterday" for recent dates
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    
    // For dates within the last week, show day name
    const daysDiff = Math.floor((today - date) / (1000 * 60 * 60 * 24));
    if (daysDiff <= 7) {
      return date.toLocaleDateString('en-NZ', { weekday: 'short' });
    }
    
    // Otherwise show month/day
    return date.toLocaleDateString('en-NZ', { month: 'short', day: 'numeric' });
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0];
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
              {formatTooltipValue(data.value, data.dataKey)[0]}
            </span>
          </div>
          {data.value === peakSales && data.value > 0 && (
            <p className="chart-enhanced-tooltip-badge">
              🏆 Peak sales day
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  const CustomDot = (props) => {
    const { cx, cy, payload } = props;
    if (payload.sales === peakSales && payload.sales > 0) {
      return (
        <circle 
          cx={cx} 
          cy={cy} 
          r={6} 
          fill="#667eea" 
          stroke="#ffffff" 
          strokeWidth={2}
          className="chart-peak-dot"
        />
      );
    }
    return null;
  };

  return (
    <div className="chart-enhanced-container">
      {data && data.length > 0 ? (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
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
              fontSize={11}
              tickFormatter={formatXAxisLabel}
              interval="preserveStartEnd"
              tick={{ fontSize: 11 }}
            />
            
            <YAxis 
              stroke="#718096" 
              fontSize={11}
              tick={{ fontSize: 11 }}
              tickFormatter={(value) => value % 1 === 0 ? value : ''}
            />
            
            <Tooltip content={<CustomTooltip />} />
            
            {/* Reference line for average */}
            {averageSales > 0 && (
              <ReferenceLine 
                y={Math.round(averageSales)} 
                stroke="#ed8936" 
                strokeDasharray="5 5"
                strokeOpacity={0.6}
                label={{ 
                  value: `Avg: ${Math.round(averageSales)}`, 
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
              strokeWidth={3}
              fill="url(#timeSalesGradient)"
              dot={<CustomDot />}
              activeDot={{ 
                r: 5, 
                stroke: '#667eea', 
                strokeWidth: 2, 
                fill: '#ffffff',
                className: 'chart-active-dot'
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div className="chart-enhanced-no-data">
          <div className="chart-enhanced-no-data-icon">📈</div>
          <div className="chart-enhanced-no-data-title">No time-series data available</div>
          <div className="chart-enhanced-no-data-subtitle">Sales trends will appear here once transactions are recorded</div>
        </div>
      )}
    </div>
  );
};

export default TimeSalesChart;