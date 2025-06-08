import React, { useState, useEffect, useCallback } from 'react';
import { 
  DollarSign, 
  Package, 
  ShoppingCart, 
  AlertTriangle
} from 'lucide-react';
import SalesChart from '../Charts/SalesChart';
import InventoryChart from '../Charts/InventoryChart';
import RevenueChart from '../Charts/RevenueChart';
import { 
  subscribeToSales, 
  subscribeToInventory, 
  subscribeToProducts,
  getDailySales 
} from '../../services/firestore';
import './Dashboard.css';

const Dashboard = () => {
  const [sales, setSales] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [products, setProducts] = useState([]);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalSales: 0,
    lowStockItems: 0,
    activeProducts: 0
  });
  const [recentSales, setRecentSales] = useState([]);
  const [dailySalesData, setDailySalesData] = useState([]);

  useEffect(() => {
    const unsubscribeSales = subscribeToSales((salesData) => {
      setSales(salesData);
      // Sort sales by timestamp in descending order (newest first) and take top 5
      const sortedSales = salesData.sort((a, b) => {
        const timeA = a.timestamp?.seconds || 0;
        const timeB = b.timestamp?.seconds || 0;
        return timeB - timeA; // Descending order (newest first)
      });
      setRecentSales(sortedSales.slice(0, 5));
    });

    const unsubscribeInventory = subscribeToInventory(setInventory);
    const unsubscribeProducts = subscribeToProducts(setProducts);

    loadDailySalesData();

    return () => {
      unsubscribeSales();
      unsubscribeInventory();
      unsubscribeProducts();
    };
  }, []);

  // Memoize calculateStats to use it as a stable dependency
  const calculateStats = useCallback(() => {
    const totalRevenue = sales.reduce((sum, sale) => sum + (sale.price || 0), 0);
    const totalSales = sales.length;
    const lowStockItems = inventory.filter(item => 
      item.quantity <= (item.lowStockThreshold || 5)
    ).length;
    const activeProducts = products.filter(product => product.active).length;

    setStats({
      totalRevenue,
      totalSales,
      lowStockItems,
      activeProducts
    });
  }, [sales, inventory, products]);

  useEffect(() => {
    calculateStats();
  }, [calculateStats]);

  const loadDailySalesData = async () => {
    try {
      const dailySales = await getDailySales(30);
      const salesByDate = {};
      dailySales.forEach(sale => {
        const date = new Date(sale.timestamp?.seconds * 1000).toLocaleDateString();
        if (!salesByDate[date]) {
          salesByDate[date] = { date, sales: 0, revenue: 0 };
        }
        salesByDate[date].sales += 1;
        salesByDate[date].revenue += sale.price || 0;
      });

      const chartData = Object.values(salesByDate).sort((a, b) => 
        new Date(a.date) - new Date(b.date)
      );

      setDailySalesData(chartData);
    } catch (error) {
      console.error('Error loading daily sales:', error);
    }
  };

  // Helper function to check if item is deleted product
  const isDeletedProduct = (item) => {
    return !item.productId && item.deletedProductName;
  };

  // Filter inventory to exclude deleted products
  const activeInventory = inventory.filter(item => !isDeletedProduct(item));

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-NZ', {
      style: 'currency',
      currency: 'NZD'
    }).format(amount);
  };

  // Updated formatTimestamp function with better browser time handling
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'N/A';
    
    try {
      // Handle Firestore timestamp format
      let date;
      if (timestamp.seconds) {
        // Convert Firestore timestamp to JavaScript Date
        date = new Date(timestamp.seconds * 1000);
      } else if (timestamp instanceof Date) {
        date = timestamp;
      } else {
        // Try to parse as regular timestamp
        date = new Date(timestamp);
      }

      // Check if date is valid
      if (isNaN(date.getTime())) {
        return 'Invalid Date';
      }

      // Get current browser time for comparison
      const now = new Date();
      const timeDiff = now.getTime() - date.getTime();
      const daysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24));

      // Format based on how recent the timestamp is
      if (daysDiff === 0) {
        // Today - show time only
        return date.toLocaleString('en-NZ', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true
        });
      } else if (daysDiff === 1) {
        // Yesterday - show "Yesterday" with time
        return `Yesterday ${date.toLocaleString('en-NZ', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        })}`;
      } else if (daysDiff <= 7) {
        // This week - show day name with time
        return date.toLocaleString('en-NZ', {
          weekday: 'short',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        });
      } else {
        // Older - show full date and time
        return date.toLocaleString('en-NZ', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        });
      }
    } catch (error) {
      console.error('Error formatting timestamp:', error);
      return 'Invalid Date';
    }
  };

  // Format actual sale time with proper date/time display
  const formatSaleTime = (timestamp) => {
    if (!timestamp) return 'N/A';
    
    try {
      let date;
      if (timestamp.seconds) {
        date = new Date(timestamp.seconds * 1000);
      } else if (timestamp instanceof Date) {
        date = timestamp;
      } else {
        date = new Date(timestamp);
      }

      if (isNaN(date.getTime())) {
        return 'Invalid Date';
      }

      const now = new Date();
      const daysDiff = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

      // Show actual time based on how recent it is
      if (daysDiff === 0) {
        // Today - show "Today at HH:MM AM/PM"
        return `Today at ${date.toLocaleString('en-NZ', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        })}`;
      } else if (daysDiff === 1) {
        // Yesterday - show "Yesterday at HH:MM AM/PM"
        return `Yesterday at ${date.toLocaleString('en-NZ', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        })}`;
      } else if (daysDiff <= 7) {
        // This week - show "Day at HH:MM AM/PM"
        return `${date.toLocaleDateString('en-NZ', { weekday: 'long' })} at ${date.toLocaleString('en-NZ', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        })}`;
      } else {
        // Older - show "MMM DD at HH:MM AM/PM" or "MMM DD, YYYY at HH:MM AM/PM"
        const sameYear = date.getFullYear() === now.getFullYear();
        return `${date.toLocaleDateString('en-NZ', {
          month: 'short',
          day: 'numeric',
          year: sameYear ? undefined : 'numeric'
        })} at ${date.toLocaleString('en-NZ', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        })}`;
      }
    } catch (error) {
      console.error('Error formatting sale time:', error);
      return 'Invalid Date';
    }
  };

  const getProductName = (productId) => {
    const product = products.find(p => p.id === productId);
    return product?.name || 'Unknown Product';
  };

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Dashboard Overview</h1>
        <p>Monitor your vending machine performance in real-time</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card revenue">
          <div className="stat-icon"><DollarSign size={24} /></div>
          <div className="stat-content">
            <h3>{formatCurrency(stats.totalRevenue)}</h3>
            <p>Total Revenue</p>
          </div>
        </div>

        <div className="stat-card sales">
          <div className="stat-icon"><ShoppingCart size={24} /></div>
          <div className="stat-content">
            <h3>{stats.totalSales}</h3>
            <p>Total Sales</p>
          </div>
        </div>

        <div className="stat-card products">
          <div className="stat-icon"><Package size={24} /></div>
          <div className="stat-content">
            <h3>{stats.activeProducts}</h3>
            <p>Active Products</p>
          </div>
        </div>

        <div className="stat-card alerts">
          <div className="stat-icon"><AlertTriangle size={24} /></div>
          <div className="stat-content">
            <h3>{stats.lowStockItems}</h3>
            <p>Low Stock Alerts</p>
          </div>
        </div>
      </div>

      {/* Recent Sales Section - Now displayed first with improved time formatting */}
      <div className="dashboard-bottom">
        <div className="recent-sales card">
          <div className="card-header">
            <h3>Recent Sales</h3>
            <div style={{ fontSize: '12px', color: '#718096' }}>
              Live updates • Browser time: {new Date().toLocaleString('en-NZ', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: true
              })}
            </div>
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
                        <span className="sale-time" title={formatTimestamp(sale.timestamp)}>
                          {formatSaleTime(sale.timestamp)}
                        </span>
                      </div>
                    </div>
                    <div className="sale-price">{formatCurrency(sale.price)}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="no-data">No recent sales</p>
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

      {/* Charts Section - Now displayed after Recent Sales */}
      <div className="charts-grid">
        <div className="chart-card">
          <div className="chart-header"><h3>Sales Trend (Last 30 Days)</h3></div>
          <SalesChart data={dailySalesData} />
        </div>

        <div className="chart-card">
          <div className="chart-header"><h3>Revenue Overview</h3></div>
          <RevenueChart data={dailySalesData} />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;