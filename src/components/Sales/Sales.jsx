import React, { useState, useEffect, useCallback } from 'react';
import { Download, TrendingUp, DollarSign, Calendar, Filter } from 'lucide-react';
import { 
  subscribeToSales, 
  subscribeToProducts
} from '../../services/firestore';
import SalesChart from '../Charts/SalesChart';
import TimeSalesChart from '../Charts/TimeSalesChart';
import RevenueChart from '../Charts/RevenueChart';
import LoadingSpinner from '../Common/LoadingSpinner';
import './Sales.css';

const Sales = () => {
  const [sales, setSales] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  const [filteredSales, setFilteredSales] = useState([]);
  const [salesStats, setSalesStats] = useState({
    totalSales: 0,
    totalRevenue: 0,
    averageTransaction: 0,
    topProduct: null
  });
  const [chartData, setChartData] = useState([]);
  const [quickFilter, setQuickFilter] = useState('30days');

  useEffect(() => {
    // Set default date range based on quick filter
    applyQuickFilter('30days');

    // Subscribe to real-time data
    const unsubscribeSales = subscribeToSales(setSales);
    const unsubscribeProducts = subscribeToProducts(setProducts);

    return () => {
      unsubscribeSales();
      unsubscribeProducts();
    };
  }, []);

  const applyQuickFilter = (filterType) => {
    const endDate = new Date();
    const startDate = new Date();
    
    switch (filterType) {
      case 'today':
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'yesterday':
        startDate.setDate(startDate.getDate() - 1);
        startDate.setHours(0, 0, 0, 0);
        endDate.setDate(endDate.getDate() - 1);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'week':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30days':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '90days':
        startDate.setDate(startDate.getDate() - 90);
        break;
      default:
        startDate.setDate(startDate.getDate() - 30);
    }
    
    setDateRange({
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    });
    setQuickFilter(filterType);
  };

  // Filter sales by date range
  const filterSalesByDate = useCallback(() => {
    if (!dateRange.startDate || !dateRange.endDate || sales.length === 0) {
      setFilteredSales([]);
      return;
    }

    const startDate = new Date(dateRange.startDate);
    const endDate = new Date(dateRange.endDate);
    endDate.setHours(23, 59, 59, 999); // Include the entire end date

    const filtered = sales.filter(sale => {
      if (!sale.timestamp?.seconds) return false;
      const saleDate = new Date(sale.timestamp.seconds * 1000);
      return saleDate >= startDate && saleDate <= endDate;
    });

    console.log(`Filtered ${filtered.length} sales from ${sales.length} total for period ${dateRange.startDate} to ${dateRange.endDate}`);
    setFilteredSales(filtered);
  }, [dateRange.startDate, dateRange.endDate, sales]);

  // Calculate stats from filtered sales
  const calculateStats = useCallback(() => {
    const totalSales = filteredSales.length;
    const totalRevenue = filteredSales.reduce((sum, sale) => sum + (sale.price || 0), 0);
    const averageTransaction = totalSales > 0 ? totalRevenue / totalSales : 0;

    // Find top product in FILTERED period (not all-time)
    const productCounts = {};
    filteredSales.forEach(sale => {
      if (sale.productId) {
        productCounts[sale.productId] = (productCounts[sale.productId] || 0) + 1;
      }
    });

    let topProduct = null;
    if (Object.keys(productCounts).length > 0) {
      const topProductId = Object.keys(productCounts).reduce((a, b) => 
        productCounts[a] > productCounts[b] ? a : b
      );
      topProduct = products.find(p => p.id === topProductId);
    }

    console.log('Stats calculated:', { totalSales, totalRevenue, averageTransaction, topProduct: topProduct?.name });

    setSalesStats({
      totalSales,
      totalRevenue,
      averageTransaction,
      topProduct
    });
  }, [filteredSales, products]);

  // Generate chart data from filtered sales
  const generateChartData = useCallback(() => {
    if (filteredSales.length === 0) {
      setChartData([]);
      return;
    }

    // Create a complete date range for the chart
    const startDate = new Date(dateRange.startDate);
    const endDate = new Date(dateRange.endDate);
    const dateMap = {};

    // Initialize all dates in range with zero values
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toDateString();
      dateMap[dateStr] = { date: dateStr, sales: 0, revenue: 0 };
    }

    // Fill in actual sales data
    filteredSales.forEach(sale => {
      if (sale.timestamp?.seconds) {
        const date = new Date(sale.timestamp.seconds * 1000);
        const dateStr = date.toDateString();
        
        if (dateMap[dateStr]) {
          dateMap[dateStr].sales += 1;
          dateMap[dateStr].revenue += sale.price || 0;
        }
      }
    });

    const chartData = Object.values(dateMap).sort((a, b) => 
      new Date(a.date) - new Date(b.date)
    );

    console.log(`Generated chart data with ${chartData.length} data points`);
    setChartData(chartData);
  }, [filteredSales, dateRange.startDate, dateRange.endDate]);

  // Apply filters when sales data changes
  useEffect(() => {
    if (sales.length > 0) {
      filterSalesByDate();
      setLoading(false);
    } else if (sales.length === 0 && !loading) {
      // Handle case where all sales are loaded but array is empty
      setFilteredSales([]);
      setSalesStats({
        totalSales: 0,
        totalRevenue: 0,
        averageTransaction: 0,
        topProduct: null
      });
      setChartData([]);
    }
  }, [sales, filterSalesByDate, loading]);

  // Recalculate stats and charts when filtered sales change
  useEffect(() => {
    calculateStats();
    generateChartData();
  }, [filteredSales, calculateStats, generateChartData]);

  const handleDateRangeChange = (field, value) => {
    setDateRange(prev => ({
      ...prev,
      [field]: value
    }));
    setQuickFilter(''); // Clear quick filter when manually setting dates
  };

  const exportSalesData = () => {
    if (filteredSales.length === 0) {
      alert('No sales data to export for the selected date range.');
      return;
    }

    const csvContent = [
      ['Date', 'Time', 'Product', 'Slot', 'Price', 'Payment Method'].join(','),
      ...filteredSales.map(sale => {
        const saleDate = new Date(sale.timestamp?.seconds * 1000);
        return [
          saleDate.toLocaleDateString('en-NZ'),
          saleDate.toLocaleTimeString('en-NZ'),
          `"${getProductName(sale.productId).replace(/"/g, '""')}"`, // Escape quotes in product names
          sale.slot,
          sale.price,
          sale.paymentMethod || 'cash'
        ].join(',');
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sales-report-${dateRange.startDate}-to-${dateRange.endDate}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-NZ', {
      style: 'currency',
      currency: 'NZD'
    }).format(amount);
  };

  const getProductName = (productId) => {
    const product = products.find(p => p.id === productId);
    return product?.name || 'Unknown Product';
  };

  const calculateDailyAverage = (total, startDate, endDate) => {
    if (!startDate || !endDate || total === 0) return 0;
    
    // Calculate actual days in the date range
    const start = new Date(startDate);
    const end = new Date(endDate);
    const timeDiff = end.getTime() - start.getTime();
    const days = Math.max(1, Math.ceil(timeDiff / (1000 * 60 * 60 * 24)) + 1); // +1 to include both start and end date
    
    return total / days;
  };

  // Get filtered top products for the current period
  const getFilteredTopProducts = () => {
    if (filteredSales.length === 0) return [];

    const productStats = {};
    
    filteredSales.forEach(sale => {
      if (sale.productId) {
        if (!productStats[sale.productId]) {
          productStats[sale.productId] = {
            productId: sale.productId,
            count: 0,
            revenue: 0
          };
        }
        productStats[sale.productId].count += 1;
        productStats[sale.productId].revenue += sale.price || 0;
      }
    });

    return Object.values(productStats)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  };

  const filteredTopProducts = getFilteredTopProducts();

  if (loading) {
    return <LoadingSpinner text="Loading sales data..." />;
  }

  return (
    <div className="sales">
      <div className="sales-header">
        <div>
          <h1>Sales Analytics</h1>
          <p>Track your vending machine sales performance and trends</p>
        </div>
        <button 
          className="btn btn-primary" 
          onClick={exportSalesData}
          disabled={filteredSales.length === 0}
        >
          <Download size={16} />
          Export Data
        </button>
      </div>

      {/* Enhanced Date Range Filter */}
      <div className="sales-filters">
        <div className="filter-section">
          <h3 className="filter-section-title">
            <Filter size={16} />
            Time Period
          </h3>
          
          {/* Quick Filter Buttons */}
          <div className="quick-filters">
            {[
              { key: 'today', label: 'Today' },
              { key: 'yesterday', label: 'Yesterday' },
              { key: 'week', label: 'Last 7 Days' },
              { key: '30days', label: 'Last 30 Days' },
              { key: '90days', label: 'Last 90 Days' }
            ].map(filter => (
              <button
                key={filter.key}
                className={`filter-btn ${quickFilter === filter.key ? 'active' : ''}`}
                onClick={() => applyQuickFilter(filter.key)}
              >
                {filter.label}
              </button>
            ))}
          </div>

          {/* Custom Date Range */}
          <div className="date-range">
            <div className="date-input-group">
              <label htmlFor="startDate" className="date-label">
                <Calendar size={14} />
                From:
              </label>
              <input
                type="date"
                id="startDate"
                value={dateRange.startDate}
                onChange={(e) => handleDateRangeChange('startDate', e.target.value)}
                className="form-input"
              />
            </div>
            <div className="date-input-group">
              <label htmlFor="endDate" className="date-label">
                <Calendar size={14} />
                To:
              </label>
              <input
                type="date"
                id="endDate"
                value={dateRange.endDate}
                onChange={(e) => handleDateRangeChange('endDate', e.target.value)}
                className="form-input"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Stats Overview */}
      <div className="sales-stats">
        <div className="stat-card">
          <div className="stat-icon sales-icon">
            <TrendingUp size={24} />
          </div>
          <div className="stat-content">
            <h3>{salesStats.totalSales}</h3>
            <p>Total Sales</p>
            {salesStats.totalSales > 0 && (
              <small className="stat-secondary">
                {calculateDailyAverage(salesStats.totalSales, dateRange.startDate, dateRange.endDate).toFixed(1)} per day avg
              </small>
            )}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon revenue-icon">
            <DollarSign size={24} />
          </div>
          <div className="stat-content">
            <h3>{formatCurrency(salesStats.totalRevenue)}</h3>
            <p>Total Revenue</p>
            {salesStats.totalRevenue > 0 && (
              <small className="stat-secondary">
                {formatCurrency(calculateDailyAverage(salesStats.totalRevenue, dateRange.startDate, dateRange.endDate))} per day avg
              </small>
            )}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon average-icon">
            <DollarSign size={24} />
          </div>
          <div className="stat-content">
            <h3>{formatCurrency(salesStats.averageTransaction)}</h3>
            <p>Avg Transaction</p>
            <small className="stat-secondary">
              Per sale value
            </small>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon product-icon">
            <TrendingUp size={24} />
          </div>
          <div className="stat-content">
            <h3 className="stat-product-name">
              {salesStats.topProduct?.name || 'No Data'}
            </h3>
            <p>Top Product</p>
            <small className="stat-secondary">
              {salesStats.topProduct ? 'Best seller this period' : 'No sales in period'}
            </small>
          </div>
        </div>
      </div>

      {/* Enhanced Charts Section */}
      <div className="sales-charts">
        <div className="chart-card">
          <div className="chart-header">
            <h3>Product Sales</h3>
            {filteredSales.length > 0 && (
              <div className="chart-summary">
                Top {Math.min(10, filteredTopProducts.length)} products • {salesStats.totalSales} total sales
              </div>
            )}
          </div>
          <SalesChart 
            data={chartData} 
            products={products} 
            filteredSales={filteredSales} 
          />
        </div>

        <div className="chart-card">
          <div className="chart-header">
            <h3>Sales Trend</h3>
            {chartData.length > 0 && (
              <div className="chart-summary">
                {chartData.length} days • {chartData.reduce((sum, day) => sum + day.sales, 0)} total sales
              </div>
            )}
          </div>
          <TimeSalesChart data={chartData} />
        </div>

        <div className="chart-card">
          <div className="chart-header">
            <h3>Revenue Trend</h3>
            {chartData.length > 0 && (
              <div className="chart-summary">
                {chartData.length} days • {formatCurrency(chartData.reduce((sum, day) => sum + day.revenue, 0))} total
              </div>
            )}
          </div>
          <RevenueChart data={chartData} />
        </div>
      </div>

      {/* Enhanced Sales Table and Top Products */}
      <div className="sales-bottom">
        <div className="sales-table-container">
          <div className="card">
            <div className="card-header">
              <h3>Recent Sales</h3>
              <div className="table-info">
                Showing {Math.min(20, filteredSales.length)} of {filteredSales.length} sales
              </div>
            </div>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Date & Time</th>
                    <th>Product</th>
                    <th>Slot</th>
                    <th>Price</th>
                    <th>Payment</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSales.slice(0, 20).map(sale => (
                    <tr key={sale.id}>
                      <td className="table-timestamp">
                        <div className="table-date">
                          {new Date(sale.timestamp?.seconds * 1000).toLocaleDateString('en-NZ', { 
                            month: 'short', 
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </div>
                        <div className="table-time">
                          {new Date(sale.timestamp?.seconds * 1000).toLocaleTimeString('en-NZ', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </div>
                      </td>
                      <td>
                        <div className="table-product-name">{getProductName(sale.productId)}</div>
                      </td>
                      <td>
                        <span className="table-slot-badge">
                          {sale.slot}
                        </span>
                      </td>
                      <td className="table-price">
                        {formatCurrency(sale.price)}
                      </td>
                      <td>
                        <span className="payment-method">
                          {sale.paymentMethod || 'cash'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {filteredSales.length === 0 && (
                    <tr>
                      <td colSpan="5" className="no-data">
                        <div className="no-data-content">
                          <div className="no-data-icon">📊</div>
                          <div className="no-data-title">No sales found</div>
                          <div className="no-data-subtitle">Try adjusting your date range</div>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="top-products-container">
          <div className="card">
            <div className="card-header">
              <h3>Top Products ({quickFilter || 'Custom Period'})</h3>
            </div>
            <div className="card-body">
              {filteredTopProducts.length > 0 ? (
                <div className="top-products-list">
                  {filteredTopProducts.map((product, index) => (
                    <div key={product.productId} className="top-product-item">
                      <div className="product-rank">
                        {index + 1}
                      </div>
                      <div className="product-details">
                        <div className="product-name">
                          {products.find(p => p.id === product.productId)?.name || 'Unknown Product'}
                        </div>
                        <div className="product-sales">
                          {product.count} sales • {formatCurrency(product.revenue)} revenue
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="no-data-content">
                  <div className="no-data-icon">🏆</div>
                  <div className="no-data-title">No top products</div>
                  <div className="no-data-subtitle">No sales in selected period</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sales;