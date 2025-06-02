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

  const getStatusColor = (type) => {
    switch (type) {
      case 'outOfStock': return '#f56565';
      case 'critical': return '#ed8936';
      case 'lowStock': return '#ecc94b';
      default: return '#48bb78';
    }
  };

  const getStatusIcon = (type) => {
    switch (type) {
      case 'outOfStock': return XCircle;
      case 'critical': return AlertTriangle;
      case 'lowStock': return Package;
      default: return CheckCircle;
    }
  };

  const totalAlerts = alerts.outOfStock.length + alerts.lowStock.length + alerts.critical.length;

  if (totalAlerts === 0) {
    return (
      <div style={{
        padding: '16px',
        background: '#f0fff4',
        border: '1px solid #9ae6b4',
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        color: '#22543d'
      }}>
        <CheckCircle size={20} />
        <span>All inventory levels are adequate</span>
      </div>
    );
  }

  return (
    <div style={{ marginBottom: '24px' }}>
      <h3 style={{ 
        fontSize: '18px', 
        fontWeight: '600', 
        color: '#2d3748', 
        marginBottom: '16px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <AlertTriangle size={20} style={{ color: '#ed8936' }} />
        Inventory Alerts ({totalAlerts})
      </h3>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* Out of Stock Alerts */}
        {alerts.outOfStock.length > 0 && (
          <div style={{
            padding: '12px 16px',
            background: '#fed7d7',
            border: '1px solid #fc8181',
            borderRadius: '8px'
          }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              marginBottom: '8px',
              color: '#742a2a',
              fontWeight: '600'
            }}>
              <XCircle size={16} />
              Out of Stock ({alerts.outOfStock.length})
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {alerts.outOfStock.map((alert, index) => (
                <span key={index} style={{
                  background: '#f56565',
                  color: 'white',
                  padding: '4px 8px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: '500'
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
            padding: '12px 16px',
            background: '#fef5e7',
            border: '1px solid #f6ad55',
            borderRadius: '8px'
          }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              marginBottom: '8px',
              color: '#744210',
              fontWeight: '600'
            }}>
              <AlertTriangle size={16} />
              Critical Low Stock ({alerts.critical.length})
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {alerts.critical.map((alert, index) => (
                <span key={index} style={{
                  background: '#ed8936',
                  color: 'white',
                  padding: '4px 8px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: '500'
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
            padding: '12px 16px',
            background: '#fefcbf',
            border: '1px solid #f6e05e',
            borderRadius: '8px'
          }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              marginBottom: '8px',
              color: '#744210',
              fontWeight: '600'
            }}>
              <Package size={16} />
              Low Stock ({alerts.lowStock.length})
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {alerts.lowStock.map((alert, index) => (
                <span key={index} style={{
                  background: '#ecc94b',
                  color: '#744210',
                  padding: '4px 8px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: '500'
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