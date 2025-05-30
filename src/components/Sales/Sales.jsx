import React, { useState, useEffect, useCallback } from 'react';
import { Download, TrendingUp, DollarSign } from 'lucide-react';
import { 
  subscribeToSales, 
  subscribeToProducts,
  getTopProducts
} from '../../services/firestore';
import SalesChart from '../Charts/SalesChart';
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
  const [topProducts, setTopProducts] = useState([]);
  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    // Set default date range (last 30 days)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    
    setDateRange({
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    });

    // Subscribe to real-time data
    const unsubscribeSales = subscribeToSales(setSales);
    const unsubscribeProducts = subscribeToProducts(setProducts);

    // Load top products
    loadTopProducts();

    return () => {
      unsubscribeSales();
      unsubscribeProducts();
    };
  }, []);

  // Wrap filterSalesByDate in useCallback to use as dependency
  const filterSalesByDate = useCallback(() => {
    if (!dateRange.startDate || !dateRange.endDate) {
      setFilteredSales(sales);
      return;
    }

    const startDate = new Date(dateRange.startDate);
    const endDate = new Date(dateRange.endDate);
    endDate.setHours(23, 59, 59, 999); // Include the entire end date

    const filtered = sales.filter(sale => {
      const saleDate = new Date(sale.timestamp?.seconds * 1000);
      return saleDate >= startDate && saleDate <= endDate;
    });

    setFilteredSales(filtered);
  }, [dateRange.startDate, dateRange.endDate, sales]);

  // Wrap calculateStats in useCallback
  const calculateStats = useCallback(() => {
    const totalSales = filteredSales.length;
    const totalRevenue = filteredSales.reduce((sum, sale) => sum + (sale.price || 0), 0);
    const averageTransaction = totalSales > 0 ? totalRevenue / totalSales : 0;

    // Find top product in current period
    const productCounts = {};
    filteredSales.forEach(sale => {
      productCounts[sale.productId] = (productCounts[sale.productId] || 0) + 1;
    });

    const topProductId = Object.keys(productCounts).reduce((a, b) => 
      productCounts[a] > productCounts[b] ? a : b, null
    );

    const topProduct = products.find(p => p.id === topProductId);

    setSalesStats({
      totalSales,
      totalRevenue,
      averageTransaction,
      topProduct
    });
  }, [filteredSales, products]);

  // Wrap generateChartData in useCallback
  const generateChartData = useCallback(() => {
    // Group sales by date
    const salesByDate = {};
    
    filteredSales.forEach(sale => {
      const date = new Date(sale.timestamp?.seconds * 1000).toDateString();
      if (!salesByDate[date]) {
        salesByDate[date] = { date, sales: 0, revenue: 0 };
      }
      salesByDate[date].sales += 1;
      salesByDate[date].revenue += sale.price || 0;
    });

    const chartData = Object.values(salesByDate).sort((a, b) => 
      new Date(a.date) - new Date(b.date)
    );

    setChartData(chartData);
  }, [filteredSales]);

  useEffect(() => {
    if (sales.length > 0) {
      filterSalesByDate();
      setLoading(false);
    }
  }, [sales, filterSalesByDate]);

  useEffect(() => {
    if (filteredSales.length > 0) {
      calculateStats();
      generateChartData();
    }
  }, [filteredSales, calculateStats, generateChartData]);

  const loadTopProducts = async () => {
    try {
      const topProductsData = await getTopProducts(5);
      setTopProducts(topProductsData);
    } catch (error) {
      console.error('Error loading top products:', error);
    }
  };

  const handleDateRangeChange = (field, value) => {
    setDateRange(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const exportSalesData = () => {
    const csvContent = [
      ['Date', 'Product', 'Slot', 'Price', 'Payment Method'].join(','),
      ...filteredSales.map(sale => [
        new Date(sale.timestamp?.seconds * 1000).toLocaleDateString(),
        getProductName(sale.productId),
        sale.slot,
        sale.price,
        sale.paymentMethod || 'cash'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
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

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp.seconds * 1000);
    return date.toLocaleString();
  };

  const getProductName = (productId) => {
    const product = products.find(p => p.id === productId);
    return product?.name || 'Unknown Product';
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="sales">
      <div className="sales-header">
        <div>
          <h1>Sales Analytics</h1>
          <p>Track your vending machine sales performance and trends</p>
        </div>
        <button className="btn btn-primary" onClick={exportSalesData}>
          <Download size={16} />
          Export Data
        </button>
      </div>

      {/* Date Range Filter */}
      <div className="sales-filters">
        <div className="date-range">
          <div className="date-input-group">
            <label htmlFor="startDate">From:</label>
            <input
              type="date"
              id="startDate"
              value={dateRange.startDate}
              onChange={(e) => handleDateRangeChange('startDate', e.target.value)}
              className="form-input"
            />
          </div>
          <div className="date-input-group">
            <label htmlFor="endDate">To:</label>
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

      {/* Stats Overview */}
      <div className="sales-stats">
        <div className="stat-card">
          <div className="stat-icon sales-icon">
            <TrendingUp size={24} />
          </div>
          <div className="stat-content">
            <h3>{salesStats.totalSales}</h3>
            <p>Total Sales</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon revenue-icon">
            <DollarSign size={24} />
          </div>
          <div className="stat-content">
            <h3>{formatCurrency(salesStats.totalRevenue)}</h3>
            <p>Total Revenue</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon average-icon">
            <DollarSign size={24} />
          </div>
          <div className="stat-content">
            <h3>{formatCurrency(salesStats.averageTransaction)}</h3>
            <p>Avg Transaction</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon product-icon">
            <TrendingUp size={24} />
          </div>
          <div className="stat-content">
            <h3>{salesStats.topProduct?.name || 'N/A'}</h3>
            <p>Top Product</p>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="sales-charts">
        <div className="chart-card">
          <div className="chart-header">
            <h3>Sales Trend</h3>
          </div>
          <SalesChart data={chartData} />
        </div>

        <div className="chart-card">
          <div className="chart-header">
            <h3>Revenue Trend</h3>
          </div>
          <RevenueChart data={chartData} />
        </div>
      </div>

      {/* Sales Table and Top Products */}
      <div className="sales-bottom">
        <div className="sales-table-container">
          <div className="card">
            <div className="card-header">
              <h3>Recent Sales</h3>
            </div>
            <table className="sales-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Product</th>
                  <th>Slot</th>
                  <th>Price</th>
                  <th>Payment Method</th>
                </tr>
              </thead>
              <tbody>
                {filteredSales.slice(0, 20).map(sale => (
                  <tr key={sale.id}>
                    <td>{formatTimestamp(sale.timestamp)}</td>
                    <td>{getProductName(sale.productId)}</td>
                    <td>{sale.slot}</td>
                    <td>{formatCurrency(sale.price)}</td>
                    <td>{sale.paymentMethod || 'cash'}</td>
                  </tr>
                ))}
                {filteredSales.length === 0 && (
                  <tr>
                    <td colSpan="5" className="no-data">No sales found for selected dates.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="top-products-container">
          <div className="card">
            <div className="card-header">
              <h3>Top Products</h3>
            </div>
            <ul className="top-products-list">
              {topProducts.map(product => (
                <li key={product.id}>
                  <span className="product-name">{product.name}</span>
                  <span className="product-sales">{product.salesCount} sales</span>
                </li>
              ))}
              {topProducts.length === 0 && <li>No top products data.</li>}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sales;
