import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const InventoryChart = ({ data }) => {
  const getBarColor = (quantity, threshold = 5) => {
    if (quantity <= threshold) return '#f56565'; // Red for low stock
    if (quantity <= threshold * 2) return '#ed8936'; // Orange for medium stock
    return '#38a169'; // Green for good stock
  };

  const formatTooltipValue = (value, name) => {
    if (name === 'quantity') {
      return [`${value} units`, 'Stock Level'];
    }
    return [value, name];
  };

  return (
    <div style={{ width: '100%', height: '250px', padding: '16px 0' }}>
      {data && data.length > 0 ? (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data.slice(0, 8)}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis 
              dataKey="slot" 
              stroke="#718096"
              fontSize={12}
            />
            <YAxis 
              stroke="#718096" 
              fontSize={12}
            />
            <Tooltip 
              formatter={formatTooltipValue}
              contentStyle={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
              }}
            />
            <Bar dataKey="quantity" radius={[4, 4, 0, 0]}>
              {data.slice(0, 8).map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={getBarColor(entry.quantity, entry.lowStockThreshold)} 
                />
              ))}
            </Bar>
          </BarChart>
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
          No inventory data available
        </div>
      )}
    </div>
  );
};

export default InventoryChart;