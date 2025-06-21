import React, { useState, useEffect, useCallback } from 'react';
import { 
  DollarSign, 
  Package, 
  ShoppingCart, 
  AlertTriangle,
} from 'lucide-react';
// Import date-fns for robust date manipulation
import { format, subDays, startOfDay } from 'date-fns';

import SalesChart from '../Charts/SalesChart';
import InventoryChart from '../Charts/InventoryChart';
import RevenueChart from '../Charts/RevenueChart';
import { 
  subscribeToSales, 
  subscribeToInventory, 
  subscribeToProducts
} from '../../services/firestore';
import './Dashboard.css';

const Dashboard = () => {
  const [sales, setSales] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [products, setProducts] = useState({}); // Use an object for faster lookups
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalSales: 0,
    lowStockItems: 0,
    activeProducts: 0
  });
  const [recentSales, setRecentSales] = useState([]);
  const [dailySalesData, setDailySalesData] = useState([]);
  const [isLoading, setIsLoading] = useState(true); // State for loading charts

  // Memoize the data loading function to make it stable
  const loadDailySalesData = useCallback(() => {
    setIsLoading(true);
    try {
      console.log("Loading daily sales data...");
      // Use the same sales data that's already loaded from subscription
      console.log("Using sales data from subscription:", sales);
      
      // Initialize a map with the last 30 days to ensure all days are present
      const salesMap = new Map();
      const today = startOfDay(new Date());
      // Loop from past to present to ensure chronological order for the chart
      for (let i = 29; i >= 0; i--) {
        const date = subDays(today, i);
        const formattedDate = format(date, 'yyyy-MM-dd');
        salesMap.set(formattedDate, { 
          date: formattedDate, 
          displayDate: format(date, 'MMM d'), 
          sales: 0, 
          revenue: 0 
        });
      }

      // Populate the map with actual sales data from the subscription
      sales.forEach(sale => {
        console.log("Processing sale:", sale);
        let saleDate = null;
        
        // Handle Firestore Timestamp objects (most common from your seeder)
        if (sale.timestamp && typeof sale.timestamp === 'object') {
          if (sale.timestamp.seconds) {
            // Firestore Timestamp with seconds property
            saleDate = new Date(sale.timestamp.seconds * 1000);
          } else if (sale.timestamp.toDate && typeof sale.timestamp.toDate === 'function') {
            // Firestore Timestamp object with toDate() method
            saleDate = sale.timestamp.toDate();
          } else if (sale.timestamp._seconds) {
            // Alternative Firestore Timestamp format
            saleDate = new Date(sale.timestamp._seconds * 1000);
          }
        } else if (typeof sale.timestamp === 'string') {
          // String timestamp
          saleDate = new Date(sale.timestamp);
        } else if (sale.timestamp instanceof Date) {
          // Already a Date object
          saleDate = sale.timestamp;
        }
        
        if (saleDate && !isNaN(saleDate.getTime())) {
          const formattedSaleDate = format(saleDate, 'yyyy-MM-dd');
          
          if (salesMap.has(formattedSaleDate)) {
            const dayData = salesMap.get(formattedSaleDate);
            dayData.sales += 1;
            dayData.revenue += sale.price || 0;
            console.log(`Updated ${formattedSaleDate}:`, dayData);
          } else {
            console.log(`Date ${formattedSaleDate} not in range (last 30 days)`);
          }
        } else {
          console.warn('Sale with invalid timestamp:', sale);
        }
      });
      
      // Convert map to a sorted array for the chart
      const chartData = Array.from(salesMap.values());
      
      console.log("Final aggregated chart data:", chartData);
      console.log("Chart data summary:", {
        totalDays: chartData.length,
        daysWithSales: chartData.filter(d => d.sales > 0).length,
        totalSales: chartData.reduce((sum, d) => sum + d.sales, 0),
        totalRevenue: chartData.reduce((sum, d) => sum + d.revenue, 0)
      });
      
      setDailySalesData(chartData);

    } catch (error) {
      console.error('Error in loadDailySalesData:', error);
      // Set empty data on error to prevent infinite loading
      setDailySalesData([]);
    } finally {
      setIsLoading(false);
    }
  }, [sales]); // Now depends on sales array

  useEffect(() => {
    const unsubscribeSales = subscribeToSales((salesData) => {
      console.log("Sales subscription update:", salesData);
      setSales(salesData);
      const sortedSales = [...salesData].sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
      setRecentSales(sortedSales.slice(0, 5));
    });

    const unsubscribeInventory = subscribeToInventory(setInventory);

    const unsubscribeProducts = subscribeToProducts((productsData) => {
        const productsMap = productsData.reduce((acc, product) => {
            acc[product.id] = product;
            return acc;
        }, {});
        setProducts(productsMap);
    });

    return () => {
      unsubscribeSales();
      unsubscribeInventory();
      unsubscribeProducts();
    };
  }, []);

  // Load chart data whenever sales data changes
  useEffect(() => {
    if (sales.length > 0) {
      loadDailySalesData();
    } else {
      // If no sales, set empty chart data
      setDailySalesData([]);
      setIsLoading(false);
    }
  }, [sales, loadDailySalesData]);

  useEffect(() => {
    const totalRevenue = sales.reduce((sum, sale) => sum + (sale.price || 0), 0);
    const lowStockItems = inventory.filter(item => item.quantity <= (item.lowStockThreshold || 5)).length;
    
    const newStats = {
      totalRevenue,
      totalSales: sales.length,
      lowStockItems,
      activeProducts: Object.values(products).filter(p => p.active).length,
    };
    
    console.log("Updated stats:", newStats);
    setStats(newStats);
  }, [sales, inventory, products]);

  // --- Helper Functions ---

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD' }).format(amount);
  };

  const formatSaleTime = (timestamp) => {
    if (!timestamp) return 'N/A';
    
    let saleDate = null;
    
    try {
      // Handle Firestore Timestamp objects
      if (typeof timestamp === 'object') {
        if (timestamp.seconds) {
          // Firestore Timestamp with seconds property
          saleDate = new Date(timestamp.seconds * 1000);
        } else if (timestamp.toDate && typeof timestamp.toDate === 'function') {
          // Firestore Timestamp object with toDate() method
          saleDate = timestamp.toDate();
        } else if (timestamp._seconds) {
          // Alternative Firestore Timestamp format
          saleDate = new Date(timestamp._seconds * 1000);
        }
      } else if (typeof timestamp === 'string') {
        // String timestamp
        saleDate = new Date(timestamp);
      } else if (timestamp instanceof Date) {
        // Already a Date object
        saleDate = timestamp;
      }
      
      if (!saleDate || isNaN(saleDate.getTime())) {
        return 'Invalid Date';
      }

      const now = new Date();
      const diffDays = Math.floor((startOfDay(now) - startOfDay(saleDate)) / (1000 * 60 * 60 * 24));

      if (diffDays === 0) return `Today at ${format(saleDate, 'p')}`;
      if (diffDays === 1) return `Yesterday at ${format(saleDate, 'p')}`;
      return `${format(saleDate, 'MMM d')} at ${format(saleDate, 'p')}`;
    } catch (error) {
      console.error('Error formatting sale time:', error, timestamp);
      return 'Invalid Date';
    }
  };

  const getProductName = (productId) => {
    return products[productId]?.name || 'Unknown Product';
  };
  
  const activeInventory = inventory.filter(item => products[item.productId]);

  // Improved data validation for charts
  const hasSalesData = !isLoading && dailySalesData.length > 0 && dailySalesData.some(d => d.sales > 0);
  const hasRevenueData = !isLoading && dailySalesData.length > 0 && dailySalesData.some(d => d.revenue > 0);

  console.log("Chart data validation:", {
    isLoading,
    dailySalesDataLength: dailySalesData.length,
    hasSalesData,
    hasRevenueData,
    statsData: stats
  });

  return (
    <div className="dashboard">


      <div className="stats-grid">
        <div className="stat-card revenue">
          <div className="stat-icon">
            <DollarSign size={28} />
          </div>
          <div className="stat-content">
            <h3>{formatCurrency(stats.totalRevenue)}</h3>
            <p>Total Revenue</p>
          </div>
        </div>
        
        <div className="stat-card sales">
          <div className="stat-icon">
            <ShoppingCart size={28} />
          </div>
          <div className="stat-content">
            <h3>{stats.totalSales}</h3>
            <p>Total Sales</p>
          </div>
        </div>
        
        <div className="stat-card products">
          <div className="stat-icon">
            <Package size={28} />
          </div>
          <div className="stat-content">
            <h3>{stats.activeProducts}</h3>
            <p>Active Products</p>
          </div>
        </div>
        
        <div className="stat-card alerts">
          <div className="stat-icon">
            <AlertTriangle size={28} />
          </div>
          <div className="stat-content">
            <h3>{stats.lowStockItems}</h3>
            <p>Low Stock Alerts</p>
          </div>
        </div>
      </div>

      <div className="dashboard-bottom">
        <div className="recent-sales card">
          <div className="card-header">
            <h3>Recent Sales</h3>
            <span className="live-indicator">Live</span>
          </div>
          <div className="card-body">
            {recentSales.length > 0 ? (
              <div className="sales-list">
                {recentSales.map((sale) => (
                  <div key={sale.id} className="sale-item">
                    <div className="sale-info">
                      <span className="product-name">{getProductName(sale.productId)}</span>
                      <div className="sale-details">
                        <span className="sale-slot">Slot: {sale.slot}</span>
                        <span className="sale-time">{formatSaleTime(sale.timestamp)}</span>
                      </div>
                    </div>
                    <div className="sale-price">{formatCurrency(sale.price)}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="no-data">No recent sales to display.</p>
            )}
          </div>
        </div>

        <div className="inventory-status card">
          <div className="card-header"><h3>Inventory Status</h3></div>
          <div className="card-body">
            <InventoryChart data={activeInventory} />
            {stats.lowStockItems > 0 && (
              <div className="low-stock-alert">
                <AlertTriangle size={16} />
                <span>{stats.lowStockItems} items need restocking</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="charts-grid">
        <div className="chart-card">
          <div className="chart-header">
            <h3>Sales Trend (Last 30 Days)</h3>
            {!isLoading && (
              <span style={{ fontSize: '12px', color: '#718096' }}>
                {dailySalesData.filter(d => d.sales > 0).length} days with sales
              </span>
            )}
          </div>
          {isLoading ? (
            <div className="chart-loading">
              <div className="chart-loading-spinner"></div>
              <span>Loading Chart Data...</span>
            </div>
          ) : hasSalesData ? (
            <SalesChart data={dailySalesData} />
          ) : (
            <div className="chart-enhanced-no-data">
              <div className="chart-enhanced-no-data-icon">📈</div>
              <div className="chart-enhanced-no-data-title">No sales data in last 30 days</div>
              <div className="chart-enhanced-no-data-subtitle">
                Sales trends will appear here once transactions are recorded
              </div>
            </div>
          )}
        </div>
        
        <div className="chart-card">
          <div className="chart-header">
            <h3>Revenue Overview (Last 30 Days)</h3>
            {!isLoading && (
              <span style={{ fontSize: '12px', color: '#718096' }}>
                {dailySalesData.filter(d => d.revenue > 0).length} days with revenue
              </span>
            )}
          </div>
          {isLoading ? (
            <div className="chart-loading">
              <div className="chart-loading-spinner"></div>
              <span>Loading Chart Data...</span>
            </div>
          ) : hasRevenueData ? (
            <RevenueChart data={dailySalesData} />
          ) : (
            <div className="chart-enhanced-no-data">
              <div className="chart-enhanced-no-data-icon">💰</div>
              <div className="chart-enhanced-no-data-title">No revenue data in last 30 days</div>
              <div className="chart-enhanced-no-data-subtitle">
                Revenue trends will appear here once sales are recorded
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;