import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Download, TrendingUp, DollarSign, Calendar, Filter } from 'lucide-react';
import {
  subscribeToSales,
  subscribeToProducts
} from '../../services/firestore';
import LoadingSpinner from '../Common/LoadingSpinner';
import CustomBarChart from './CustomBarChart'; 
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
  const [quickFilter, setQuickFilter] = useState('30days');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  useEffect(() => {
    applyQuickFilter('30days');
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

  const filterSalesByDate = useCallback(() => {
    if (!dateRange.startDate || !dateRange.endDate || sales.length === 0) {
      setFilteredSales([]);
      return;
    }

    const startDate = new Date(dateRange.startDate);
    const endDate = new Date(dateRange.endDate);
    endDate.setHours(23, 59, 59, 999);

    const filtered = sales.filter(sale => {
      if (!sale.timestamp?.seconds) return false;
      const saleDate = new Date(sale.timestamp.seconds * 1000);
      return saleDate >= startDate && saleDate <= endDate;
    });

    setFilteredSales(filtered);
  }, [dateRange.startDate, dateRange.endDate, sales]);

  const calculateStats = useCallback(() => {
    const totalSales = filteredSales.length;
    const totalRevenue = filteredSales.reduce((sum, sale) => sum + (sale.price || 0), 0);
    const averageTransaction = totalSales > 0 ? totalRevenue / totalSales : 0;

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

    setSalesStats({
      totalSales,
      totalRevenue,
      averageTransaction,
      topProduct
    });
  }, [filteredSales, products]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-NZ', {
      style: 'currency',
      currency: 'NZD'
    }).format(amount);
  };

  const getProductName = useCallback((productId) => {
    const product = products.find(p => p.id === productId);
    return product?.name || 'Unknown Product';
  }, [products]);

  const performSearch = useCallback((term) => {
    if (!term.trim()) {
      setSearchResults([]);
      return;
    }

    const searchLower = term.toLowerCase();
    const results = filteredSales.filter(sale => {
      const product = products.find(p => p.id === sale.productId);
      const saleDate = new Date(sale.timestamp?.seconds * 1000);

      const searchFields = [
        product?.name || 'Unknown Product',
        product?.sku || '',
        product?.category || '',
        sale.slot || '',
        sale.paymentMethod || 'cash',
        formatCurrency(sale.price),
        sale.price?.toString() || '',
        saleDate.toLocaleDateString('en-NZ'),
        saleDate.toLocaleDateString('en-US'),
        saleDate.toISOString().split('T')[0]
      ].filter(Boolean).map(field => field.toString().toLowerCase());

      return searchFields.some(field => field.includes(searchLower));
    });

    setSearchResults(results);
  }, [filteredSales, products, getProductName]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      performSearch(searchTerm);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, performSearch]);
  
  const rankedProductData = useMemo(() => {
    if (filteredSales.length === 0 || products.length === 0) return [];

    const productStats = {};
    filteredSales.forEach(sale => {
      if (sale.productId) {
        if (!productStats[sale.productId]) {
          productStats[sale.productId] = {
            count: 0,
            revenue: 0
          };
        }
        productStats[sale.productId].count += 1;
        productStats[sale.productId].revenue += sale.price || 0;
      }
    });

    return Object.entries(productStats)
      .map(([productId, stats]) => ({
        productId,
        productName: getProductName(productId),
        ...stats,
      }))
      .sort((a, b) => b.count - a.count);
  }, [filteredSales, products, getProductName]);


  const getSalesToDisplay = () => {
    return searchTerm.trim() ? searchResults : filteredSales;
  };

  useEffect(() => {
    if (sales.length > 0) {
      filterSalesByDate();
      setLoading(false);
    } else if (sales.length === 0 && !loading) {
      setFilteredSales([]);
      setSalesStats({
        totalSales: 0,
        totalRevenue: 0,
        averageTransaction: 0,
        topProduct: null
      });
    }
  }, [sales, filterSalesByDate, loading]);

  useEffect(() => {
    calculateStats();
  }, [filteredSales, calculateStats]);

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const clearSearch = () => {
    setSearchTerm('');
    setSearchResults([]);
  };

  const handleDateRangeChange = (field, value) => {
    setDateRange(prev => ({
      ...prev,
      [field]: value
    }));
    setQuickFilter('');
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
          `"${getProductName(sale.productId).replace(/"/g, '""')}"`,
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

  const calculateDailyAverage = (total, startDate, endDate) => {
    if (!startDate || !endDate || total === 0) return 0;

    const start = new Date(startDate);
    const end = new Date(endDate);
    const timeDiff = end.getTime() - start.getTime();
    const days = Math.max(1, Math.ceil(timeDiff / (1000 * 60 * 60 * 24)) + 1);

    return total / days;
  };

  const getTopProductsHeader = () => {
    const uniqueProductCount = rankedProductData.length;

    if (uniqueProductCount >= 5) {
      return `Top 5 Products (${quickFilter || 'Custom Period'})`;
    } else {
      return `Top Products (${quickFilter || 'Custom Period'})`;
    }
  };
  
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

      <div className="sales-filters">
        <div className="filter-section">
          <h3 className="filter-section-title">
            <Filter size={16} />
            Time Period
          </h3>
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

      <div className="chart-card" style={{ marginBottom: '32px' }}>
        <div className="chart-header">
          <h3>Product Performance</h3>
          <div className="chart-summary">
            {rankedProductData.length > 0 ? `All ${rankedProductData.length} products ranked by sales` : 'No product data for this period'}
          </div>
        </div>
        <div className="chart-body">
            <CustomBarChart data={rankedProductData} formatCurrency={formatCurrency} />
        </div>
      </div>

      <div className="sales-table-container" style={{ marginBottom: '32px' }}>
        <div className="card">
          <div className="card-header">
            <h3>Sales Transactions</h3>
            <div className="table-info">
              Showing {getSalesToDisplay().length} of {filteredSales.length} transactions
              {searchTerm && (
                <span style={{ color: '#667eea', marginLeft: '8px' }}>
                  • Filtered by "{searchTerm}"
                </span>
              )}
            </div>
          </div>
          
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', background: '#f7fafc' }}>
            <div style={{ position: 'relative', maxWidth: '400px' }}>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  placeholder="Search by product, slot, date, payment..."
                  value={searchTerm}
                  onChange={handleSearchChange}
                  className="form-input"
                  style={{ paddingLeft: '12px', paddingRight: searchTerm ? '40px' : '12px', fontSize: '14px' }}
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={clearSearch}
                    style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#718096', cursor: 'pointer', padding: '4px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'color 0.2s ease' }}
                    onMouseEnter={(e) => e.target.style.color = '#4a5568'}
                    onMouseLeave={(e) => e.target.style.color = '#718096'}
                    title="Clear search"
                  >
                    ×
                  </button>
                )}
              </div>
              {searchTerm && (
                <div style={{ fontSize: '12px', color: '#718096', marginTop: '4px' }}>
                  {searchResults.length > 0 
                    ? `Found ${searchResults.length} result${searchResults.length !== 1 ? 's' : ''}`
                    : 'No results found'
                  }
                </div>
              )}
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
                {getSalesToDisplay().map(sale => (
                    <tr key={sale.id}>
                      <td className="table-timestamp">
                        <div className="table-date">
                          {new Date(sale.timestamp?.seconds * 1000).toLocaleDateString('en-NZ', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                        <div className="table-time">
                          {new Date(sale.timestamp?.seconds * 1000).toLocaleTimeString('en-NZ', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                      <td>
                        <div className="table-product-name">{getProductName(sale.productId)}</div>
                      </td>
                      <td>
                        <span className="table-slot-badge">{sale.slot}</span>
                      </td>
                      <td className="table-price">{formatCurrency(sale.price)}</td>
                      <td>
                        <span className="payment-method">{sale.paymentMethod || 'cash'}</span>
                      </td>
                    </tr>
                  )
                )}
                {getSalesToDisplay().length === 0 && (
                  <tr>
                    <td colSpan="5" className="no-data">
                      <div className="no-data-content">
                        <div className="no-data-icon">📊</div>
                        <div className="no-data-title">
                          {searchTerm ? 'No matching transactions found' : 'No transactions found'}
                        </div>
                        <div className="no-data-subtitle">
                          {searchTerm 
                            ? `No transactions match "${searchTerm}" in the selected period`
                            : 'Try adjusting your date range'
                          }
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="top-products-container" style={{ marginBottom: '32px' }}>
        <div className="card">
          <div className="card-header">
            <h3>{getTopProductsHeader()}</h3>
          </div>
          <div className="card-body">
            {rankedProductData.length > 0 ? (
              <div className="top-products-list">
                {rankedProductData.slice(0, 5).map((product, index) => (
                  <div key={product.productId} className="top-product-item">
                    <div className="product-rank">
                      {index + 1}
                    </div>
                    <div className="product-details">
                      <div className="product-name">
                        {getProductName(product.productId)}
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
  );
};

export default Sales;
