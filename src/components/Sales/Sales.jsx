import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Download, TrendingUp, DollarSign, Calendar, Filter, Search, X, FileText, FileSpreadsheet, FileImage, Trash2, Info } from 'lucide-react';
import {
  subscribeToSales,
  subscribeToProducts,
  deleteSale  // Add this import
} from '../../services/firestore';
import LoadingSpinner from '../Common/LoadingSpinner';
import Modal from '../Common/Modal';
import DeleteConfirmation from '../Common/DeleteConfirmation';  // Add this import
import CustomBarChart from './CustomBarChart'; 
import ChartForecast from './ChartForecast';
// Fixed import - make sure all exports are imported correctly
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
  const [quickFilter, setQuickFilter] = useState('all'); // Changed default to 'all'
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  
  // Debug info state
  const [dataInfo, setDataInfo] = useState({
    totalSalesInDB: 0,
    dateRange: { oldest: null, newest: null },
    filteredCount: 0
  });
  
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

  // Delete confirmation states
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [saleToDelete, setSaleToDelete] = useState(null);

  // Responsive state
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    applyQuickFilter('all'); // Start with all data
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
      case 'all':
        // Show all data - set very wide date range
        startDate.setFullYear(2020, 0, 1); // Start from 2020
        endDate.setFullYear(2030, 11, 31); // End at 2030
        break;
      default:
        // Default to all data
        startDate.setFullYear(2020, 0, 1);
        endDate.setFullYear(2030, 11, 31);
    }

    setDateRange({
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    });
    setQuickFilter(filterType);
  };

  // Calculate data info for debugging
  const calculateDataInfo = useCallback(() => {
    if (sales.length === 0) {
      setDataInfo({
        totalSalesInDB: 0,
        dateRange: { oldest: null, newest: null },
        filteredCount: 0
      });
      return;
    }

    // Find oldest and newest dates
    const dates = sales
      .map(sale => sale.timestamp?.seconds ? new Date(sale.timestamp.seconds * 1000) : null)
      .filter(Boolean)
      .sort((a, b) => a - b);

    const oldest = dates[0];
    const newest = dates[dates.length - 1];

    setDataInfo({
      totalSalesInDB: sales.length,
      dateRange: { 
        oldest: oldest ? oldest.toLocaleDateString('en-NZ') : null, 
        newest: newest ? newest.toLocaleDateString('en-NZ') : null 
      },
      filteredCount: filteredSales.length
    });
  }, [sales, filteredSales]);

  // FIXED: Direct filtering function that recalculates everything
  const filterAndCalculateAll = useCallback(() => {
    console.log('🔄 Starting filterAndCalculateAll');
    console.log('📊 Total sales in database:', sales.length);
    console.log('📅 Filter range:', dateRange.startDate, 'to', dateRange.endDate);
    console.log('🔍 Quick filter:', quickFilter);
    
    if (!dateRange.startDate || !dateRange.endDate) {
      console.log('❌ No date range set');
      setFilteredSales([]);
      setSalesStats({
        totalSales: 0,
        totalRevenue: 0,
        averageTransaction: 0,
        topProduct: null
      });
      return;
    }

    if (sales.length === 0) {
      console.log('❌ No sales data');
      setFilteredSales([]);
      setSalesStats({
        totalSales: 0,
        totalRevenue: 0,
        averageTransaction: 0,
        topProduct: null
      });
      return;
    }

    // Filter sales by date range
    const startDate = new Date(dateRange.startDate);
    const endDate = new Date(dateRange.endDate);
    endDate.setHours(23, 59, 59, 999);

    console.log('📅 Filtering between:', startDate.toISOString(), 'and', endDate.toISOString());

    const filtered = sales.filter(sale => {
      if (!sale.timestamp?.seconds) {
        console.log('⚠️ Sale without timestamp:', sale.id);
        return false;
      }
      const saleDate = new Date(sale.timestamp.seconds * 1000);
      const inRange = saleDate >= startDate && saleDate <= endDate;
      
      if (!inRange) {
        console.log('🚫 Sale outside range:', sale.id, 'date:', saleDate.toISOString());
      }
      
      return inRange;
    });

    console.log('📊 Filtered sales count:', filtered.length);
    console.log('📊 Sample filtered sales:', filtered.slice(0, 3).map(s => ({
      id: s.id,
      date: new Date(s.timestamp.seconds * 1000).toISOString(),
      product: s.productId,
      price: s.price
    })));

    setFilteredSales(filtered);

    // Calculate stats immediately
    const totalSales = filtered.length;
    const totalRevenue = filtered.reduce((sum, sale) => sum + (sale.price || 0), 0);
    const averageTransaction = totalSales > 0 ? totalRevenue / totalSales : 0;

    const productCounts = {};
    filtered.forEach(sale => {
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

    const newStats = {
      totalSales,
      totalRevenue,
      averageTransaction,
      topProduct
    };

    console.log('📈 New stats calculated:', newStats);
    setSalesStats(newStats);

    if (sales.length > 0) {
      setLoading(false);
    }
  }, [dateRange.startDate, dateRange.endDate, sales, products, quickFilter]);

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
  
  // FIXED: Improved rankedProductData calculation with better dependency tracking
  const rankedProductData = useMemo(() => {
    console.log('🏆 Recalculating ranked product data, filteredSales:', filteredSales.length);
    
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

    const ranked = Object.entries(productStats)
      .map(([productId, stats]) => ({
        productId,
        productName: getProductName(productId),
        ...stats,
      }))
      .sort((a, b) => b.count - a.count);

    console.log('🏆 Ranked product data:', ranked);
    return ranked;
  }, [filteredSales, products, getProductName]);

  const getSalesToDisplay = () => {
    return searchTerm.trim() ? searchResults : filteredSales;
  };

  // FIXED: Optimistic updates for immediate UI response
  const handleDeleteClick = (sale) => {
    setSaleToDelete(sale);
    setShowDeleteConfirmation(true);
  };

  const handleDeleteConfirm = async () => {
    if (!saleToDelete) return;

    try {
      console.log('🗑️ Starting delete process for sale:', saleToDelete.id);
      
      // OPTIMISTIC UPDATE: Remove from local state immediately
      console.log('⚡ Applying optimistic update');
      setSales(currentSales => {
        const updated = currentSales.filter(sale => sale.id !== saleToDelete.id);
        console.log('⚡ Sales updated from', currentSales.length, 'to', updated.length);
        return updated;
      });
      
      // Close the modal immediately
      setShowDeleteConfirmation(false);
      setSaleToDelete(null);
      
      // Delete from Firebase (this will sync with real-time subscription)
      await deleteSale(saleToDelete.id);
      console.log('✅ Sale deleted from Firebase successfully');
      
    } catch (error) {
      console.error('❌ Error deleting sale:', error);
      
      // ROLLBACK: If delete fails, add the sale back to local state
      console.log('🔄 Rolling back optimistic update');
      setSales(currentSales => {
        const restored = [...currentSales, saleToDelete].sort((a, b) => 
          (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0)
        );
        console.log('🔄 Sales restored to', restored.length);
        return restored;
      });
      
      throw error; // Let DeleteConfirmation handle the error display
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteConfirmation(false);
    setSaleToDelete(null);
  };

  const getSaleDescription = (sale) => {
    const product = products.find(p => p.id === sale.productId);
    const saleDate = new Date(sale.timestamp?.seconds * 1000);
    const formattedDate = saleDate.toLocaleDateString('en-NZ', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit', 
      minute: '2-digit' 
    });
    
    return `${product?.name || 'Unknown Product'} - ${formatCurrency(sale.price)} - ${formattedDate}`;
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
          // Fixed: Use the correct static method call
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

  // FIXED: Single effect that handles all data processing
  useEffect(() => {
    console.log('🔄 Data changed - triggering recalculation');
    filterAndCalculateAll();
    calculateDataInfo();
  }, [filterAndCalculateAll, calculateDataInfo]);

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
    setQuickFilter('custom');
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
      return `Top 5 Products (${quickFilter === 'all' ? 'All Time' : quickFilter || 'Custom Period'})`;
    } else {
      return `Top Products (${quickFilter === 'all' ? 'All Time' : quickFilter || 'Custom Period'})`;
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
          {isMobile ? 'Export' : 'Export Data'}
        </button>
      </div>

      {/* Debug Info Panel */}
      <div className="sales-debug-info" style={{ 
        background: '#f0f9ff', 
        border: '1px solid #0ea5e9', 
        borderRadius: '8px', 
        padding: '16px', 
        marginBottom: '24px',
        fontSize: '14px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontWeight: '600', color: '#0369a1' }}>
          <Info size={16} />
          Data Information
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, 1fr)', gap: '12px', fontSize: '13px' }}>
          <div>
            <strong>Total in Database:</strong> {dataInfo.totalSalesInDB} sales
          </div>
          <div>
            <strong>Currently Showing:</strong> {dataInfo.filteredCount} sales
          </div>
          <div>
            <strong>Date Range in DB:</strong> {dataInfo.dateRange.oldest ? `${dataInfo.dateRange.oldest} to ${dataInfo.dateRange.newest}` : 'No data'}
          </div>
          <div>
            <strong>Active Filter:</strong> {quickFilter === 'all' ? 'All Data' : quickFilter || 'Custom'}
          </div>
        </div>
      </div>

      <div className="sales-filters">
        <div className="filter-section">
          <h3 className="filter-section-title">
            <Filter size={16} />
            Time Period
          </h3>
          <div className="quick-filters">
            {[
              { key: 'all', label: 'All Data', color: '#10b981' },
              { key: 'today', label: 'Today' },
              { key: 'yesterday', label: 'Yesterday' },
              { key: 'week', label: isMobile ? '7 Days' : 'Last 7 Days' },
              { key: '30days', label: isMobile ? '30 Days' : 'Last 30 Days' },
              { key: '90days', label: isMobile ? '90 Days' : 'Last 90 Days' }
            ].map(filter => (
              <button
                key={filter.key}
                className={`filter-btn ${quickFilter === filter.key ? 'active' : ''}`}
                onClick={() => applyQuickFilter(filter.key)}
                style={filter.key === 'all' && quickFilter === filter.key ? {
                  background: '#10b981',
                  borderColor: '#10b981',
                  color: 'white'
                } : filter.key === 'all' ? {
                  borderColor: '#10b981',
                  color: '#10b981'
                } : {}}
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
            {salesStats.totalSales > 0 && quickFilter !== 'all' && (
              <small className="stat-secondary">
                {calculateDailyAverage(salesStats.totalSales, dateRange.startDate, dateRange.endDate).toFixed(1)} per day avg
              </small>
            )}
            {quickFilter === 'all' && (
              <small className="stat-secondary">
                All time data
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
            {salesStats.totalRevenue > 0 && quickFilter !== 'all' && (
              <small className="stat-secondary">
                {formatCurrency(calculateDailyAverage(salesStats.totalRevenue, dateRange.startDate, dateRange.endDate))} per day avg
              </small>
            )}
            {quickFilter === 'all' && (
              <small className="stat-secondary">
                All time revenue
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
            <p>{isMobile ? 'Avg Sale' : 'Avg Transaction'}</p>
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
              {salesStats.topProduct ? (quickFilter === 'all' ? 'Best seller all time' : 'Best seller this period') : 'No sales in period'}
            </small>
          </div>
        </div>
      </div>
      
      <div className="sales-table-container" style={{ marginBottom: '32px' }}>
        <div className="card">
          <div className="card-header">
            <h3>Sales Transactions</h3>
            <div className="table-info">
              {isMobile ? 
                `${getSalesToDisplay().length} of ${filteredSales.length}` :
                `Showing ${getSalesToDisplay().length} of ${filteredSales.length} transactions`
              }
              {searchTerm && (
                <span style={{ color: '#667eea', marginLeft: '8px' }}>
                  • {isMobile ? `"${searchTerm}"` : `Filtered by "${searchTerm}"`}
                </span>
              )}
            </div>
          </div>
          
          <div style={{ padding: isMobile ? '12px 16px' : '16px 20px', borderBottom: '1px solid #e2e8f0', background: '#f7fafc' }}>
            <div style={{ position: 'relative', maxWidth: isMobile ? 'none' : '400px' }}>
              <div style={{ position: 'relative' }}>
                <Search size={20} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#718096', pointerEvents: 'none' }} />
                <input
                  type="text"
                  placeholder={isMobile ? "Search transactions..." : "Search by product, slot, date, payment..."}
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
                  <th>{isMobile ? 'Pay' : 'Payment'}</th>
                  <th style={{ width: '80px', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {getSalesToDisplay().map(sale => (
                    <tr key={sale.id}>
                      <td className="table-timestamp">
                        <div className="table-date">
                          {new Date(sale.timestamp?.seconds * 1000).toLocaleDateString('en-NZ', { 
                            month: 'short', 
                            day: 'numeric', 
                            year: isMobile ? '2-digit' : 'numeric' 
                          })}
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
                      <td style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => handleDeleteClick(sale)}
                          className="btn btn-danger"
                          style={{
                            padding: isMobile ? '6px' : '8px',
                            minWidth: 'auto',
                            fontSize: '12px',
                            background: '#fed7d7',
                            color: '#742a2a',
                            border: '1px solid #feb2b2'
                          }}
                          title="Delete transaction"
                        >
                          <Trash2 size={isMobile ? 14 : 16} />
                          {!isMobile && <span style={{ marginLeft: '4px' }}>Delete</span>}
                        </button>
                      </td>
                    </tr>
                  )
                )}
                {getSalesToDisplay().length === 0 && (
                  <tr>
                    <td colSpan="6" className="no-data">
                      <div className="no-data-content">
                        <div className="no-data-icon">📊</div>
                        <div className="no-data-title">
                          {searchTerm ? 'No matching transactions found' : 'No transactions found'}
                        </div>
                        <div className="no-data-subtitle">
                          {searchTerm 
                            ? `No transactions match "${searchTerm}" in the selected period`
                            : quickFilter === 'all' 
                              ? 'No sales data in database'
                              : 'Try selecting "All Data" or adjusting your date range'
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
            <h3>{isMobile ? 'Top Products' : getTopProductsHeader()}</h3>
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
            {rankedProductData.length > 0 ? 
              (isMobile ? `${rankedProductData.length} products` : `All ${rankedProductData.length} products ranked by sales`) : 
              'No product data for this period'
            }
          </div>
        </div>
        <div className="chart-body">
            <CustomBarChart data={rankedProductData} formatCurrency={formatCurrency} />
        </div>
      </div>

      <ChartForecast data={filteredSales} formatCurrency={formatCurrency} />

      {/* Delete Confirmation Modal */}
      {showDeleteConfirmation && saleToDelete && (
        <DeleteConfirmation
          isOpen={showDeleteConfirmation}
          onClose={handleDeleteCancel}
          onConfirm={handleDeleteConfirm}
          title="Delete Sales Transaction"
          message="Are you sure you want to delete this sales transaction?"
          itemName={getSaleDescription(saleToDelete)}
          type="transaction"
          warningText="This action cannot be undone. This will permanently remove the transaction from your sales records."
          confirmText="Delete Transaction"
          showInput={false}
        />
      )}

      {/* Enhanced Responsive Export Modal */}
      {showExportModal && (
        <Modal
          title="Export Sales Data"
          onClose={() => setShowExportModal(false)}
          size={isMobile ? "full" : "medium"}
        >
          <div className="export-modal-content">
            <div className="export-info">
              <h4 className="export-summary-title">Export Summary</h4>
              <p className="export-summary-text">
                Exporting <strong>{filteredSales.length} sales transactions</strong> from 
                <strong> {quickFilter === 'all' ? 'All Time' : quickFilter ? quickFilter.charAt(0).toUpperCase() + quickFilter.slice(1) : 'Custom Period'}</strong>
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
                    <FileText size={isMobile ? 20 : 24} className={`export-format-icon ${exportFormat === 'csv' ? 'active' : ''}`} />
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
                    <FileSpreadsheet size={isMobile ? 20 : 24} className={`export-format-icon ${exportFormat === 'excel' ? 'active' : ''}`} />
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
                    <FileImage size={isMobile ? 20 : 24} className={`export-format-icon ${exportFormat === 'pdf' ? 'active' : ''}`} />
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
                  <span className="export-checkbox-text">
                    {isMobile ? 'Product details (ID, category, SKU)' : 'Include product details (ID, category, SKU)'}
                  </span>
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
                  <span className="export-checkbox-text">
                    {isMobile ? 'Detailed timestamps' : 'Include detailed timestamps (day of week, hour)'}
                  </span>
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
                  <span className="export-checkbox-text">
                    {isMobile ? 'Payment method details' : 'Include payment method details'}
                  </span>
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
                  <span className="export-checkbox-text">
                    {isMobile ? 'Summary statistics' : 'Include summary statistics'}
                  </span>
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
                  <span className="export-checkbox-text">
                    {isMobile ? 'Group by product' : 'Group transactions by product'}
                  </span>
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
                  <span className="export-checkbox-text">
                    {isMobile ? 'Group by date' : 'Group transactions by date'}
                  </span>
                </label>
              </div>
            </div>

            {/* Preview */}
            {exportPreview && !isMobile && (
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
                    <span>{isMobile ? 'Exporting...' : 'Exporting...'}</span>
                  </div>
                ) : (
                  <div className="export-button-content">
                    <Download size={16} />
                    <span>{isMobile ? `Export ${exportFormat.toUpperCase()}` : `Export ${exportFormat.toUpperCase()}`}</span>
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