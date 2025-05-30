import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const RevenueChart = ({ data }) => {
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-NZ', {
      style: 'currency',
      currency: 'NZD'
    }).format(value);
  };

  const formatTooltipLabel = (label) => {
    return `Date: ${label}`;
  };

  const formatTooltipValue = (value, name) => {
    if (name === 'revenue') {
      return [formatCurrency(value), 'Revenue'];
    }
    return [value, name];
  };

  return (
    <div style={{ width: '100%', height: '300px', padding: '20px' }}>
      {data && data.length > 0 ? (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#667eea" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#667eea" stopOpacity={0.1}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis 
              dataKey="date" 
              stroke="#718096"
              fontSize={12}
              tickFormatter={(value) => {
                const date = new Date(value);
                return `${date.getMonth() + 1}/${date.getDate()}`;
              }}
            />
            <YAxis 
              stroke="#718096" 
              fontSize={12}
              tickFormatter={(value) => `$${value}`}
            />
            <Tooltip 
              labelFormatter={formatTooltipLabel}
              formatter={formatTooltipValue}
              contentStyle={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
              }}
            />
            <Area 
              type="monotone" 
              dataKey="revenue" 
              stroke="#667eea" 
              strokeWidth={2}
              fillOpacity={1} 
              fill="url(#revenueGradient)" 
            />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          height: '100%',
          color: '#718096',
          fontSize: '14px'
        }}>
          No revenue data available
        </div>
      )}
    </div>
  );
};

export default RevenueChart;