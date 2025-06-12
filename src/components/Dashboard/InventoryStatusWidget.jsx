import React, { useState, useEffect } from 'react';
import { AlertTriangle, Package, CheckCircle, XCircle } from 'lucide-react';
import { subscribeToInventory, subscribeToProducts } from '../../services/firestore';

const InventoryStatusWidget = () => {
  const [inventory, setInventory] = useState([]);
  const [products, setProducts] = useState([]);
  const [alerts, setAlerts] = useState({
    outOfStock: [],
    lowStock: [],
    critical: []
  });

  useEffect(() => {
    const unsubscribeInventory = subscribeToInventory(setInventory);
    const unsubscribeProducts = subscribeToProducts(setProducts);

    return () => {
      unsubscribeInventory();
      unsubscribeProducts();
    };
  }, []);

  useEffect(() => {
    if (inventory.length > 0) {
      analyzeInventoryStatus();
    }
  }, [inventory, products]);

  const analyzeInventoryStatus = () => {
    const productLookup = products.reduce((acc, product) => {
      acc[product.id] = product;
      return acc;
    }, {});

    const newAlerts = {
      outOfStock: [],
      lowStock: [],
      critical: []
    };

    inventory.forEach(item => {
      if (!item.productId && !item.deletedProductName) return;

      const isDeletedProduct = !item.productId && item.deletedProductName;
      const product = isDeletedProduct 
        ? { name: item.deletedProductName, slot: item.slot }
        : productLookup[item.productId];

      if (!product) return;

      const threshold = item.lowStockThreshold || 5;
      const criticalThreshold = Math.ceil(threshold / 2);

      if (item.quantity === 0) {
        newAlerts.outOfStock.push({
          slot: item.slot,
          product: product.name,
          quantity: item.quantity,
          maxCapacity: item.maxCapacity || 20
        });
      } else if (item.quantity <= criticalThreshold) {
        newAlerts.critical.push({
          slot: item.slot,
          product: product.name,
          quantity: item.quantity,
          threshold: threshold,
          maxCapacity: item.maxCapacity || 20
        });
      } else if (item.quantity <= threshold) {
        newAlerts.lowStock.push({
          slot: item.slot,
          product: product.name,
          quantity: item.quantity,
          threshold: threshold,
          maxCapacity: item.maxCapacity || 20
        });
      }
    });

    setAlerts(newAlerts);
  };

  const responsiveStyles = {
    container: {
      marginBottom: '24px'
    },
    title: {
      fontSize: 'clamp(16px, 2.5vw, 18px)',
      fontWeight: '600',
      color: '#2d3748',
      marginBottom: '16px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      flexWrap: 'wrap'
    },
    alertsContainer: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'clamp(8px, 2vw, 12px)'
    },
    alertBox: {
      padding: 'clamp(10px, 2vw, 12px) clamp(12px, 3vw, 16px)',
      borderRadius: '8px',
      border: '1px solid'
    },
    alertHeader: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      marginBottom: '8px',
      fontWeight: '600',
      fontSize: 'clamp(12px, 2vw, 14px)'
    },
    badgeContainer: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 'clamp(6px, 1.5vw, 8px)'
    },
    badge: {
      padding: '4px 8px',
      borderRadius: '12px',
      fontSize: 'clamp(10px, 1.8vw, 12px)',
      fontWeight: '500',
      whiteSpace: 'nowrap',
      wordBreak: 'break-word',
      lineHeight: '1.2'
    },
    allGoodContainer: {
      padding: 'clamp(12px, 3vw, 16px)',
      background: '#f0fff4',
      border: '1px solid #9ae6b4',
      borderRadius: '8px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      color: '#22543d',
      fontSize: 'clamp(12px, 2vw, 14px)',
      flexWrap: 'wrap'
    }
  };

  const totalAlerts = alerts.outOfStock.length + alerts.lowStock.length + alerts.critical.length;

  if (totalAlerts === 0) {
    return (
      <div style={responsiveStyles.allGoodContainer}>
        <CheckCircle size={20} style={{ flexShrink: 0 }} />
        <span>All inventory levels are adequate</span>
      </div>
    );
  }

  return (
    <div style={responsiveStyles.container}>
      <h3 style={responsiveStyles.title}>
        <AlertTriangle size={20} style={{ color: '#ed8936', flexShrink: 0 }} />
        <span>Inventory Alerts ({totalAlerts})</span>
      </h3>
      
      <div style={responsiveStyles.alertsContainer}>
        {/* Out of Stock Alerts */}
        {alerts.outOfStock.length > 0 && (
          <div style={{
            ...responsiveStyles.alertBox,
            background: '#fed7d7',
            borderColor: '#fc8181'
          }}>
            <div style={{
              ...responsiveStyles.alertHeader,
              color: '#742a2a'
            }}>
              <XCircle size={16} style={{ flexShrink: 0 }} />
              <span>Out of Stock ({alerts.outOfStock.length})</span>
            </div>
            <div style={responsiveStyles.badgeContainer}>
              {alerts.outOfStock.map((alert, index) => (
                <span key={index} style={{
                  ...responsiveStyles.badge,
                  background: '#f56565',
                  color: 'white'
                }}>
                  {alert.slot}: {alert.product}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Critical Low Stock */}
        {alerts.critical.length > 0 && (
          <div style={{
            ...responsiveStyles.alertBox,
            background: '#fef5e7',
            borderColor: '#f6ad55'
          }}>
            <div style={{
              ...responsiveStyles.alertHeader,
              color: '#744210'
            }}>
              <AlertTriangle size={16} style={{ flexShrink: 0 }} />
              <span>Critical Low Stock ({alerts.critical.length})</span>
            </div>
            <div style={responsiveStyles.badgeContainer}>
              {alerts.critical.map((alert, index) => (
                <span key={index} style={{
                  ...responsiveStyles.badge,
                  background: '#ed8936',
                  color: 'white'
                }}>
                  {alert.slot}: {alert.product} ({alert.quantity} left)
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Low Stock */}
        {alerts.lowStock.length > 0 && (
          <div style={{
            ...responsiveStyles.alertBox,
            background: '#fefcbf',
            borderColor: '#f6e05e'
          }}>
            <div style={{
              ...responsiveStyles.alertHeader,
              color: '#744210'
            }}>
              <Package size={16} style={{ flexShrink: 0 }} />
              <span>Low Stock ({alerts.lowStock.length})</span>
            </div>
            <div style={responsiveStyles.badgeContainer}>
              {alerts.lowStock.map((alert, index) => (
                <span key={index} style={{
                  ...responsiveStyles.badge,
                  background: '#ecc94b',
                  color: '#744210'
                }}>
                  {alert.slot}: {alert.product} ({alert.quantity} left)
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InventoryStatusWidget;