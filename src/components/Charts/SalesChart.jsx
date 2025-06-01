import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import './Charts.css';

const SalesChart = ({ data, products = [], filteredSales = [] }) => {
  // Generate product sales data from filtered sales
  const generateProductSalesData = () => {
    if (!filteredSales || filteredSales.length === 0) {
      return [];
    }

    // Count sales by product
    const productSales = {};
    filteredSales.forEach(sale => {
      if (sale.productId) {
        if (!productSales[sale.productId]) {
          productSales[sale.productId] = {
            productId: sale.productId,
            sales: 0,
            revenue: 0
          };
        }
        productSales[sale.productId].sales += 1;
        productSales[sale.productId].revenue += sale.price || 0;
      }
    });

    // Convert to chart data with product names
    const chartData = Object.values(productSales).map(item => {
      const product = products.find(p => p.id === item.productId);
      return {
        productId: item.productId,
        name: product?.name || 'Unknown Product',
        sales: item.sales,
        revenue: item.revenue,
        // Truncate long product names for display
        displayName: product?.name ? 
          (product.name.length > 12 ? product.name.substring(0, 12) + '...' : product.name) 
          : 'Unknown'
      };
    });

    // Sort by sales count (descending) and take top 10
    return chartData
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 10);
  };

  const productSalesData = generateProductSalesData();
  const maxSales = productSalesData.length > 0 ? Math.max(...productSalesData.map(item => item.sales)) : 0;

  // Color palette for bars
  const colors = [
    '#667eea', '#f093fb', '#4facfe', '#fdbb2d', '#11998e',
    '#764ba2', '#f5576c', '#00f2fe', '#22c1c3', '#38ef7d'
  ];

  const getBarColor = (index, sales) => {
    // Highlight the top performer
    if (sales === maxSales && maxSales > 0) {
      return '#38a169'; // Green for top performer
    }
    return colors[index % colors.length];
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="chart-enhanced-tooltip">
          <p className="chart-enhanced-tooltip-label">
            {data.name}
          </p>
          <div className="chart-enhanced-tooltip-value">
            <div 
              className="chart-enhanced-tooltip-color-indicator"
              style={{ backgroundColor: payload[0].color }}
            ></div>
            <span className="chart-enhanced-tooltip-text">
              {data.sales} {data.sales === 1 ? 'sale' : 'sales'}
            </span>
          </div>
          <div style={{ marginTop: '4px', fontSize: '12px', color: '#718096' }}>
            Revenue: {new Intl.NumberFormat('en-NZ', {
              style: 'currency',
              currency: 'NZD'
            }).format(data.revenue)}
          </div>
          {data.sales === maxSales && maxSales > 0 && (
            <p className="chart-enhanced-tooltip-badge">
              🏆 Top seller this period
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  const CustomLabelList = (props) => {
    const { x, y, width, value } = props;
    
    if (value === 0) return null;
    
    return (
      <text
        x={x + width / 2}
        y={y - 5}
        fill="#4a5568"
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="12"
        fontWeight="500"
      >
        {value}
      </text>
    );
  };

  return (
    <div className="chart-enhanced-container">
      {productSalesData && productSalesData.length > 0 ? (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart 
            data={productSalesData} 
            margin={{ top: 30, right: 30, left: 20, bottom: 60 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.7} />
            
            <XAxis 
              dataKey="displayName"
              stroke="#718096"
              fontSize={11}
              tick={{ fontSize: 11 }}
              angle={-45}
              textAnchor="end"
              height={80}
              interval={0}
            />
            
            <YAxis 
              stroke="#718096" 
              fontSize={11}
              tick={{ fontSize: 11 }}
              tickFormatter={(value) => value % 1 === 0 ? value : ''}
            />
            
            <Tooltip content={<CustomTooltip />} />
            
            <Bar 
              dataKey="sales" 
              radius={[4, 4, 0, 0]}
              label={<CustomLabelList />}
            >
              {productSalesData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={getBarColor(index, entry.sales)}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div className="chart-enhanced-no-data">
          <div className="chart-enhanced-no-data-icon">📊</div>
          <div className="chart-enhanced-no-data-title">No product sales data</div>
          <div className="chart-enhanced-no-data-subtitle">
            {filteredSales && filteredSales.length === 0 
              ? 'No sales in selected period' 
              : 'Product sales will appear here once transactions are recorded'
            }
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesChart;