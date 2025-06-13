import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Download, TrendingUp, DollarSign, Calendar, Filter, Search, X, FileText, FileSpreadsheet, FileImage } from 'lucide-react';
import {
  subscribeToSales,
  subscribeToProducts
} from '../../services/firestore';
import LoadingSpinner from '../Common/LoadingSpinner';
import Modal from '../Common/Modal';
import CustomBarChart from './CustomBarChart'; 
import ChartForecast from './ChartForecast';
import { CSVExport, ExcelExport, PDFExport } from './exports';
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
  
  // Export modal states
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState('csv');
  const [exportOptions, setExportOptions] = useState({
    includeProductDetails: true,
    includeTimestamps: true,
    includePaymentMethods: true,
    includeSummaryStats: true,
    groupByProduct: false,
    groupByDate: false
  });
  const [exportLoading, setExportLoading] = useState(false);
  const [exportPreview, setExportPreview] = useState(null);

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
  }, [filteredSales, products]);

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

  // Export functionality
  const generateExportPreview = useCallback(() => {
    if (!filteredSales.length) return null;

    const formats = {
      csv: {
        format: 'CSV',
        description: 'Excel, Sheets compatible',
        features: [
          'Universal spreadsheet compatibility',
          'Lightweight file format',
          'Easy to import and manipulate',
          'Compatible with Excel, Google Sheets'
        ]
      },
      excel: {
        format: 'Excel (.xlsx)',
        description: '.xlsx format',
        features: [
          'Formatted headers with styling',
          'Multiple worksheets',
          'Advanced formulas and charts',
          'Currency and date formatting',
          'Summary statistics sheet'
        ]
      },
      pdf: {
        format: 'PDF',
        description: 'Print-ready report',
        features: [
          'Professional formatting',
          'Print-optimized layout',
          'Executive summary',
          'Charts and visualizations',
          'Company branding'
        ]
      }
    };

    const baseColumns = ['Transaction ID', 'Date', 'Time', 'Product Name', 'Slot', 'Price'];
    let columns = [...baseColumns];

    if (exportOptions.includeProductDetails) {
      columns.push('Product ID', 'Category', 'SKU');
    }
    if (exportOptions.includePaymentMethods) {
      columns.push('Payment Method');
    }
    if (exportOptions.includeTimestamps) {
      columns.push('Timestamp', 'Day of Week', 'Hour');
    }

    return {
      ...formats[exportFormat],
      itemCount: filteredSales.length,
      columns,
      estimatedSize: `${(filteredSales.length * 0.1).toFixed(1)} KB`,
      dateRange: `${dateRange.startDate} to ${dateRange.endDate}`,
      searchFilter: searchTerm ? `Filtered by "${searchTerm}"` : null
    };
  }, [filteredSales, exportFormat, exportOptions, dateRange, searchTerm]);

  useEffect(() => {
    if (showExportModal) {
      setExportPreview(generateExportPreview());
    }
  }, [showExportModal, generateExportPreview]);

  const handleExportSales = () => {
    setShowExportModal(true);
  };

  const performExport = async () => {
    if (!filteredSales.length) {
      alert('No sales data to export.');
      return;
    }

    setExportLoading(true);
    
    try {
      const exportData = getSalesToDisplay();

      switch (exportFormat) {
        case 'csv':
          CSVExport.exportSalesCSV({
            salesData: exportData,
            dateRange: dateRange,
            getProductName: getProductName,
            stats: salesStats,
            options: exportOptions
          });
          break;
          
        case 'excel':
          ExcelExport.exportSalesExcel({
            salesData: exportData,
            stats: salesStats,
            dateRange: dateRange,
            formatCurrency: formatCurrency,
            getProductName: getProductName,
            productData: rankedProductData,
            options: exportOptions
          });
          break;
          
        case 'pdf':
          PDFExport.exportSalesPDF({
            salesData: exportData,
            stats: salesStats,
            dateRange: dateRange,
            formatCurrency: formatCurrency,
            getProductName: getProductName,
            title: `Sales Report${searchTerm ? ` - Search: ${searchTerm}` : ''}`,
            options: exportOptions
          });
          break;
          
        default:
          throw new Error(`Unsupported export format: ${exportFormat}`);
      }

      setShowExportModal(false);
      console.log(`${exportFormat.toUpperCase()} export completed successfully`);
      
    } catch (error) {
      console.error(`Export error (${exportFormat}):`, error);
      alert(`Failed to export ${exportFormat.toUpperCase()}: ${error.message}`);
    } finally {
      setExportLoading(false);
    }
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
          onClick={handleExportSales}
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
                <Search size={20} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#718096', pointerEvents: 'none' }} />
                <input
                  type="text"
                  placeholder="Search by product, slot, date, payment..."
                  value={searchTerm}
                  onChange={handleSearchChange}
                  className="form-input"
                  style={{ paddingLeft: '40px', paddingRight: searchTerm ? '40px' : '12px', fontSize: '14px' }}
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
                    <X size={16} />
                  </button>
                )}
              </div>
              {searchTerm && (
                <div style={{ fontSize: '12px', color: '#718096', marginTop: '4px', paddingLeft: '40px' }}>
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

      <div style={{ marginBottom: '32px' }}>
          <ChartForecast data={filteredSales} formatCurrency={formatCurrency} />
      </div>

      {/* Export Modal */}
      {showExportModal && (
        <Modal
          title="Export Sales Data"
          onClose={() => setShowExportModal(false)}
          size="medium"
        >
          <div className="export-modal-content">
            <div className="export-info">
              <h4 className="export-summary-title">Export Summary</h4>
              <p className="export-summary-text">
                Exporting <strong>{filteredSales.length} sales transactions</strong> from 
                <strong> {quickFilter ? quickFilter.charAt(0).toUpperCase() + quickFilter.slice(1) : 'Custom Period'}</strong>
                {searchTerm && <span> matching "<strong>{searchTerm}</strong>"</span>}
              </p>
            </div>

            {/* File Format Selection */}
            <div className="form-group">
              <label className="form-label">Export Format</label>
              <div className="export-format-options">
                <label className={`export-format-option ${exportFormat === 'csv' ? 'active' : ''}`}>
                  <input
                    type="radio"
                    name="exportFormat"
                    value="csv"
                    checked={exportFormat === 'csv'}
                    onChange={(e) => setExportFormat(e.target.value)}
                    className="export-format-radio"
                  />
                  <div className="export-format-content">
                    <FileText size={24} className={`export-format-icon ${exportFormat === 'csv' ? 'active' : ''}`} />
                    <span className="export-format-name">CSV</span>
                    <span className="export-format-description">Excel, Sheets</span>
                  </div>
                </label>

                <label className={`export-format-option ${exportFormat === 'excel' ? 'active' : ''}`}>
                  <input
                    type="radio"
                    name="exportFormat"
                    value="excel"
                    checked={exportFormat === 'excel'}
                    onChange={(e) => setExportFormat(e.target.value)}
                    className="export-format-radio"
                  />
                  <div className="export-format-content">
                    <FileSpreadsheet size={24} className={`export-format-icon ${exportFormat === 'excel' ? 'active' : ''}`} />
                    <span className="export-format-name">Excel</span>
                    <span className="export-format-description">.xlsx format</span>
                  </div>
                </label>

                <label className={`export-format-option ${exportFormat === 'pdf' ? 'active' : ''}`}>
                  <input
                    type="radio"
                    name="exportFormat"
                    value="pdf"
                    checked={exportFormat === 'pdf'}
                    onChange={(e) => setExportFormat(e.target.value)}
                    className="export-format-radio"
                  />
                  <div className="export-format-content">
                    <FileImage size={24} className={`export-format-icon ${exportFormat === 'pdf' ? 'active' : ''}`} />
                    <span className="export-format-name">PDF</span>
                    <span className="export-format-description">Print-ready</span>
                  </div>
                </label>
              </div>
            </div>

            {/* Export Options */}
            <div className="form-group">
              <label className="form-label">Export Options</label>
              <div className="export-options">
                <label className="export-checkbox-label">
                  <input
                    type="checkbox"
                    checked={exportOptions.includeProductDetails}
                    onChange={(e) => setExportOptions(prev => ({ 
                      ...prev, 
                      includeProductDetails: e.target.checked 
                    }))}
                    className="export-checkbox-input"
                  />
                  <span className="export-checkbox-checkmark"></span>
                  <span className="export-checkbox-text">Include product details (ID, category, SKU)</span>
                </label>

                <label className="export-checkbox-label">
                  <input
                    type="checkbox"
                    checked={exportOptions.includeTimestamps}
                    onChange={(e) => setExportOptions(prev => ({ 
                      ...prev, 
                      includeTimestamps: e.target.checked 
                    }))}
                    className="export-checkbox-input"
                  />
                  <span className="export-checkbox-checkmark"></span>
                  <span className="export-checkbox-text">Include detailed timestamps (day of week, hour)</span>
                </label>

                <label className="export-checkbox-label">
                  <input
                    type="checkbox"
                    checked={exportOptions.includePaymentMethods}
                    onChange={(e) => setExportOptions(prev => ({ 
                      ...prev, 
                      includePaymentMethods: e.target.checked 
                    }))}
                    className="export-checkbox-input"
                  />
                  <span className="export-checkbox-checkmark"></span>
                  <span className="export-checkbox-text">Include payment method details</span>
                </label>

                <label className="export-checkbox-label">
                  <input
                    type="checkbox"
                    checked={exportOptions.includeSummaryStats}
                    onChange={(e) => setExportOptions(prev => ({ 
                      ...prev, 
                      includeSummaryStats: e.target.checked 
                    }))}
                    className="export-checkbox-input"
                  />
                  <span className="export-checkbox-checkmark"></span>
                  <span className="export-checkbox-text">Include summary statistics</span>
                </label>

                <label className="export-checkbox-label">
                  <input
                    type="checkbox"
                    checked={exportOptions.groupByProduct}
                    onChange={(e) => setExportOptions(prev => ({ 
                      ...prev, 
                      groupByProduct: e.target.checked,
                      groupByDate: e.target.checked ? false : prev.groupByDate 
                    }))}
                    className="export-checkbox-input"
                  />
                  <span className="export-checkbox-checkmark"></span>
                  <span className="export-checkbox-text">Group transactions by product</span>
                </label>

                <label className="export-checkbox-label">
                  <input
                    type="checkbox"
                    checked={exportOptions.groupByDate}
                    onChange={(e) => setExportOptions(prev => ({ 
                      ...prev, 
                      groupByDate: e.target.checked,
                      groupByProduct: e.target.checked ? false : prev.groupByProduct 
                    }))}
                    className="export-checkbox-input"
                  />
                  <span className="export-checkbox-checkmark"></span>
                  <span className="export-checkbox-text">Group transactions by date</span>
                </label>
              </div>
            </div>

            {/* Preview */}
            {exportPreview && (
              <div className="export-preview">
                <h4 className="export-preview-title">Export Preview</h4>
                <div className="export-preview-details">
                  <div className="export-preview-item">
                    <span className="export-preview-label">Format:</span>
                    <span className="export-preview-value">{exportPreview.format}</span>
                  </div>
                  <div className="export-preview-item">
                    <span className="export-preview-label">Items:</span>
                    <span className="export-preview-value">{exportPreview.itemCount} transactions</span>
                  </div>
                  <div className="export-preview-item">
                    <span className="export-preview-label">Columns:</span>
                    <span className="export-preview-value">{exportPreview.columns.length} data fields</span>
                  </div>
                  <div className="export-preview-item">
                    <span className="export-preview-label">Period:</span>
                    <span className="export-preview-value">{exportPreview.dateRange}</span>
                  </div>
                  {exportPreview.searchFilter && (
                    <div className="export-preview-item">
                      <span className="export-preview-label">Filter:</span>
                      <span className="export-preview-value">{exportPreview.searchFilter}</span>
                    </div>
                  )}
                  <div className="export-preview-item">
                    <span className="export-preview-label">Features:</span>
                    <span className="export-preview-value">{exportPreview.features.slice(0, 2).join(', ')}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="export-modal-actions">
              <button
                type="button"
                className="btn btn-secondary export-modal-btn-secondary"
                onClick={() => setShowExportModal(false)}
                disabled={exportLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary export-modal-btn-primary"
                onClick={performExport}
                disabled={filteredSales.length === 0 || exportLoading}
              >
                {exportLoading ? (
                  <div className="export-loading-content">
                    <div className="export-loading-spinner"></div>
                    <span>Exporting...</span>
                  </div>
                ) : (
                  <div className="export-button-content">
                    <Download size={16} />
                    <span>Export {exportFormat.toUpperCase()}</span>
                  </div>
                )}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default Sales;