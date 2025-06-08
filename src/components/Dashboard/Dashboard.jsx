import React, { useState, useEffect, useCallback } from 'react';
import { 
  DollarSign, 
  Package, 
  ShoppingCart, 
  AlertTriangle
} from 'lucide-react';
// Import date-fns for robust date manipulation
import { format, subDays, startOfDay } from 'date-fns';
import { toDate } from 'date-fns-tz';

import SalesChart from '../Charts/SalesChart';
import InventoryChart from '../Charts/InventoryChart';
import RevenueChart from '../Charts/RevenueChart';
import { 
  subscribeToSales, 
  subscribeToInventory, 
  subscribeToProducts,
  getDailySales // Assuming this function fetches sales for a given period
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

  // Memoize the data loading function to keep it stable
  const loadDailySalesData = useCallback(async () => {
    try {
      const allSales = await getDailySales(30); // Fetch last 30 days of sales
      
      // 1. Initialize a map with the last 30 days, ensuring all days are present
      const salesMap = new Map();
      const today = startOfDay(new Date());
      for (let i = 0; i < 30; i++) {
        const date = subDays(today, i);
        // Use a consistent, sortable date format (YYYY-MM-DD)
        const formattedDate = format(date, 'yyyy-MM-dd');
        salesMap.set(formattedDate, { 
          date: formattedDate, 
          // Format for display on the chart's X-axis
          displayDate: format(date, 'MMM d'), 
          sales: 0, 
          revenue: 0 
        });
      }

      // 2. Populate the map with actual sales data
      allSales.forEach(sale => {
        if (sale.timestamp?.seconds) {
          const saleDate = toDate(new Date(sale.timestamp.seconds * 1000));
          const formattedSaleDate = format(saleDate, 'yyyy-MM-dd');
          
          if (salesMap.has(formattedSaleDate)) {
            const dayData = salesMap.get(formattedSaleDate);
            dayData.sales += 1;
            dayData.revenue += sale.price || 0;
          }
        }
      });
      
      // 3. Convert map to a sorted array for the chart
      const chartData = Array.from(salesMap.values()).sort((a, b) => a.date.localeCompare(b.date));
      
      setDailySalesData(chartData);
    } catch (error) {
      console.error('Error loading daily sales:', error);
    }
  }, []); // Empty dependency array means this function is created only once

  useEffect(() => {
    // Initial data load for charts
    loadDailySalesData();

    const unsubscribeSales = subscribeToSales((salesData) => {
      setSales(salesData);
      const sortedSales = [...salesData].sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
      setRecentSales(sortedSales.slice(0, 5));
    });

    const unsubscribeInventory = subscribeToInventory(setInventory);

    // Convert products array to a map for efficient lookups
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
  }, [loadDailySalesData]); // Depend on the memoized function

  // Calculate high-level stats whenever underlying data changes
  useEffect(() => {
    const totalRevenue = sales.reduce((sum, sale) => sum + (sale.price || 0), 0);
    const lowStockItems = inventory.filter(item => item.quantity <= (item.lowStockThreshold || 5)).length;
    
    setStats({
      totalRevenue,
      totalSales: sales.length,
      lowStockItems,
      activeProducts: Object.values(products).filter(p => p.active).length,
    });
  }, [sales, inventory, products]);

  // --- Helper Functions ---

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD' }).format(amount);
  };

  const formatSaleTime = (timestamp) => {
    if (!timestamp?.seconds) return 'N/A';
    try {
      const saleDate = new Date(timestamp.seconds * 1000);
      const now = new Date();
      const diffDays = Math.floor((now - saleDate) / (1000 * 60 * 60 * 24));

      if (isNaN(saleDate.getTime())) return 'Invalid Date';

      if (diffDays === 0) return `Today at ${format(saleDate, 'p')}`;
      if (diffDays === 1) return `Yesterday at ${format(saleDate, 'p')}`;
      return `${format(saleDate, 'MMM d')} at ${format(saleDate, 'p')}`;

    } catch (error) {
      console.error('Error formatting sale time:', error);
      return 'Invalid Date';
    }
  };

  const getProductName = (productId) => {
    return products[productId]?.name || 'Unknown Product';
  };
  
  const activeInventory = inventory.filter(item => products[item.productId]);

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
          <div className="chart-header"><h3>Sales Trend (Last 30 Days)</h3></div>
          {/* The key prop helps React re-render the chart when data updates */}
          <SalesChart key={`sales-${dailySalesData.length}`} data={dailySalesData} />
        </div>
        <div className="chart-card">
          <div className="chart-header"><h3>Revenue Overview (Last 30 Days)</h3></div>
          <RevenueChart key={`revenue-${dailySalesData.length}`} data={dailySalesData} />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
