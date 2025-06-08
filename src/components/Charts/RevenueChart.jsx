import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const RevenueChart = ({ data }) => {
  // Helper to format currency for the tooltip
  const formatCurrency = (value) => new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD' }).format(value);

  // Custom Tooltip for better display
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip">
          <p className="label">{`Date: ${label}`}</p>
          <p className="intro" style={{ color: '#82ca9d' }}>{`Revenue: ${formatCurrency(payload[0].value)}`}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart
        data={data}
        margin={{
          top: 10,
          right: 30,
          left: 20,
          bottom: 5,
        }}
      >
        <defs>
          <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#82ca9d" stopOpacity={0.8}/>
            <stop offset="95%" stopColor="#82ca9d" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="displayDate" />
        <YAxis 
          tickFormatter={(value) => `$${value}`} 
          width={60} 
        />
        <Tooltip content={<CustomTooltip />} />
        {/* THE FIX: Ensure dataKey is "revenue" to match the data from Dashboard.jsx */}
        <Area type="monotone" dataKey="revenue" name="Daily Revenue" stroke="#82ca9d" fillOpacity={1} fill="url(#colorRevenue)" />
      </AreaChart>
    </ResponsiveContainer>
  );
};

export default RevenueChart;
