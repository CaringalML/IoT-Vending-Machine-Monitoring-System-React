import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const SalesChart = ({ data }) => {
  const formatTooltipLabel = (label) => {
    return `Date: ${label}`;
  };

  const formatTooltipValue = (value, name) => {
    if (name === 'sales') {
      return [`${value} sales`, 'Sales Count'];
    }
    return [value, name];
  };

  return (
    <div style={{ width: '100%', height: '300px', padding: '20px' }}>
      {data && data.length > 0 ? (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
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
            <YAxis stroke="#718096" fontSize={12} />
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
            <Line 
              type="monotone" 
              dataKey="sales" 
              stroke="#667eea" 
              strokeWidth={3}
              dot={{ fill: '#667eea', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: '#667eea', strokeWidth: 2 }}
            />
          </LineChart>
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
          No sales data available
        </div>
      )}
    </div>
  );
};

export default SalesChart;