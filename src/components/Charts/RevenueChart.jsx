import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import './Charts.css';

const RevenueChart = ({ data }) => {
  // Calculate statistics
  const totalRevenue = data && data.length > 0 
    ? data.reduce((sum, item) => sum + (item.revenue || 0), 0) 
    : 0;
    
  const averageRevenue = data && data.length > 0 
    ? totalRevenue / data.length 
    : 0;

  // Find peak revenue day
  const peakRevenue = data && data.length > 0 
    ? Math.max(...data.map(item => item.revenue || 0))
    : 0;

  // Calculate growth trend (comparing first half vs second half of data)
  const getGrowthTrend = () => {
    if (!data || data.length < 4) return null;
    
    const midPoint = Math.floor(data.length / 2);
    const firstHalf = data.slice(0, midPoint);
    const secondHalf = data.slice(midPoint);
    
    const firstHalfAvg = firstHalf.reduce((sum, item) => sum + (item.revenue || 0), 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce((sum, item) => sum + (item.revenue || 0), 0) / secondHalf.length;
    
    const growth = ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100;
    return isFinite(growth) ? growth : null;
  };

  const growthTrend = getGrowthTrend();

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-NZ', {
      style: 'currency',
      currency: 'NZD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(value);
  };

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
    if (name === 'revenue') {
      return [formatCurrency(value), 'Revenue'];
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
              style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', borderRadius: '2px' }}
            ></div>
            <span className="chart-enhanced-tooltip-text">
              {formatTooltipValue(data.value, data.dataKey)[0]}
            </span>
          </div>
          {data.value === peakRevenue && data.value > 0 && (
            <p className="chart-enhanced-tooltip-badge">
              💰 Best revenue day
            </p>
          )}
          {data.value < averageRevenue && averageRevenue > 0 && (
            <p className="chart-enhanced-tooltip-warning">
              📉 Below average
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="chart-enhanced-container">
      {data && data.length > 0 ? (
        <>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#667eea" stopOpacity={0.8}/>
                  <stop offset="20%" stopColor="#667eea" stopOpacity={0.6}/>
                  <stop offset="50%" stopColor="#764ba2" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#764ba2" stopOpacity={0.1}/>
                </linearGradient>
                
                {/* Gradient for the stroke */}
                <linearGradient id="revenueStroke" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#667eea"/>
                  <stop offset="100%" stopColor="#764ba2"/>
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
                tickFormatter={(value) => `$${Math.round(value)}`}
                tick={{ fontSize: 11 }}
              />
              
              <Tooltip content={<CustomTooltip />} />
              
              {/* Reference line for average revenue */}
              {averageRevenue > 0 && (
                <ReferenceLine 
                  y={averageRevenue} 
                  stroke="#ed8936" 
                  strokeDasharray="5 5"
                  strokeOpacity={0.6}
                  label={{ 
                    value: `Avg: ${formatCurrency(averageRevenue)}`, 
                    position: "topRight",
                    className: "chart-reference-label",
                    style: { fill: '#ed8936' }
                  }}
                />
              )}
              
              <Area 
                type="monotone" 
                dataKey="revenue" 
                stroke="url(#revenueStroke)"
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#revenueGradient)" 
                activeDot={{ 
                  r: 5, 
                  stroke: '#667eea', 
                  strokeWidth: 2, 
                  fill: '#ffffff',
                  className: 'chart-active-dot'
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
          
          {/* Growth indicator */}
          {growthTrend !== null && (
            <div className={`chart-growth-indicator ${growthTrend >= 0 ? 'positive' : 'negative'}`}>
              {growthTrend >= 0 ? '↗' : '↘'} {Math.abs(growthTrend).toFixed(1)}%
            </div>
          )}
        </>
      ) : (
        <div className="chart-enhanced-no-data">
          <div className="chart-enhanced-no-data-icon">💰</div>
          <div className="chart-enhanced-no-data-title">No revenue data available</div>
          <div className="chart-enhanced-no-data-subtitle">Revenue will appear here once sales are recorded</div>
        </div>
      )}
    </div>
  );
};

export default RevenueChart;