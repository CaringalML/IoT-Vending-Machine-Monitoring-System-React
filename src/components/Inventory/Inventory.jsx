import React, { useState, useEffect } from 'react';
import { Package, AlertTriangle, RefreshCw } from 'lucide-react';
import { 
  subscribeToInventory, 
  subscribeToProducts,
  refillInventory 
} from '../../services/firestore';
import Modal from '../Common/Modal';
import LoadingSpinner from '../Common/LoadingSpinner';
import './Inventory.css';

const Inventory = () => {
  const [inventory, setInventory] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showRefillModal, setShowRefillModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [refillQuantity, setRefillQuantity] = useState('');
  const [processingRefill, setProcessingRefill] = useState(false);
  const [filter, setFilter] = useState('all'); // all, low, out

  useEffect(() => {
    const unsubscribeInventory = subscribeToInventory((inventoryData) => {
      setInventory(inventoryData);
      setLoading(false);
    });

    const unsubscribeProducts = subscribeToProducts(setProducts);

    return () => {
      unsubscribeInventory();
      unsubscribeProducts();
    };
  }, []);

  const getProductInfo = (productId) => {
    return products.find(p => p.id === productId) || { name: 'Unknown Product', price: 0 };
  };

  const getStockStatus = (quantity, threshold = 5) => {
    if (quantity === 0) return 'out';
    if (quantity <= threshold) return 'low';
    return 'good';
  };

  const getStockStatusColor = (status) => {
    switch (status) {
      case 'out': return '#f56565';
      case 'low': return '#ed8936';
      case 'good': return '#38a169';
      default: return '#718096';
    }
  };

  const filteredInventory = inventory.filter(item => {
    switch (filter) {
      case 'low':
        return item.quantity <= (item.lowStockThreshold || 5) && item.quantity > 0;
      case 'out':
        return item.quantity === 0;
      default:
        return true;
    }
  });

  const handleRefill = (slot) => {
    setSelectedSlot(slot);
    setRefillQuantity(slot.maxCapacity || '20');
    setShowRefillModal(true);
  };

  const handleRefillSubmit = async () => {
    if (!selectedSlot || !refillQuantity) return;

    setProcessingRefill(true);
    try {
      await refillInventory(selectedSlot.id, parseInt(refillQuantity));
      setShowRefillModal(false);
      setSelectedSlot(null);
      setRefillQuantity('');
    } catch (error) {
      console.error('Error refilling inventory:', error);
      alert('Error refilling inventory. Please try again.');
    } finally {
      setProcessingRefill(false);
    }
  };

  const getLowStockCount = () => {
    return inventory.filter(item => 
      item.quantity <= (item.lowStockThreshold || 5) && item.quantity > 0
    ).length;
  };

  const getOutOfStockCount = () => {
    return inventory.filter(item => item.quantity === 0).length;
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="inventory">
      <div className="inventory-header">
        <div>
          <h1>Inventory Management</h1>
          <p>Monitor and manage your vending machine stock levels</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="inventory-summary">
        <div className="summary-card total">
          <div className="summary-icon">
            <Package size={24} />
          </div>
          <div className="summary-content">
            <h3>{inventory.length}</h3>
            <p>Total Slots</p>
          </div>
        </div>

        <div className="summary-card low">
          <div className="summary-icon">
            <AlertTriangle size={24} />
          </div>
          <div className="summary-content">
            <h3>{getLowStockCount()}</h3>
            <p>Low Stock</p>
          </div>
        </div>

        <div className="summary-card out">
          <div className="summary-icon">
            <Package size={24} />
          </div>
          <div className="summary-content">
            <h3>{getOutOfStockCount()}</h3>
            <p>Out of Stock</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="inventory-filters">
        <div className="filter-buttons">
          <button 
            className={filter === 'all' ? 'filter-btn active' : 'filter-btn'}
            onClick={() => setFilter('all')}
          >
            All Items ({inventory.length})
          </button>
          <button 
            className={filter === 'low' ? 'filter-btn active' : 'filter-btn'}
            onClick={() => setFilter('low')}
          >
            Low Stock ({getLowStockCount()})
          </button>
          <button 
            className={filter === 'out' ? 'filter-btn active' : 'filter-btn'}
            onClick={() => setFilter('out')}
          >
            Out of Stock ({getOutOfStockCount()})
          </button>
        </div>
      </div>

      {/* Inventory Grid */}
      <div className="inventory-grid">
        {filteredInventory.map((item) => {
          const product = getProductInfo(item.productId);
          const status = getStockStatus(item.quantity, item.lowStockThreshold);
          
          return (
            <div key={item.id} className="inventory-card">
              <div className="inventory-card-header">
                <div className="slot-info">
                  <span className="slot-number">{item.slot}</span>
                  <div 
                    className="stock-indicator"
                    style={{ backgroundColor: getStockStatusColor(status) }}
                  ></div>
                </div>
                <button 
                  className="refill-btn"
                  onClick={() => handleRefill(item)}
                  title="Refill Stock"
                >
                  <RefreshCw size={16} />
                </button>
              </div>

              <div className="inventory-card-body">
                <h3 className="product-name">{product.name}</h3>
                <div className="stock-info">
                  <div className="stock-level">
                    <span className="current-stock">{item.quantity}</span>
                    <span className="max-capacity">/ {item.maxCapacity || 20}</span>
                  </div>
                  <div className="stock-percentage">
                    <div 
                      className="stock-bar"
                      style={{
                        width: `${(item.quantity / (item.maxCapacity || 20)) * 100}%`,
                        backgroundColor: getStockStatusColor(status)
                      }}
                    ></div>
                  </div>
                </div>

                <div className="inventory-details">
                  <div className="detail-item">
                    <span className="detail-label">Price:</span>
                    <span className="detail-value">
                      {new Intl.NumberFormat('en-NZ', {
                        style: 'currency',
                        currency: 'NZD'
                      }).format(product.price)}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Status:</span>
                    <span className={`status-badge status-${status}`}>
                      {status === 'out' ? 'Out of Stock' : status === 'low' ? 'Low Stock' : 'Good Stock'}
                    </span>
                  </div>
                  {item.lastRefilled && (
                    <div className="detail-item">
                      <span className="detail-label">Last Refilled:</span>
                      <span className="detail-value">
                        {new Date(item.lastRefilled.seconds * 1000).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredInventory.length === 0 && (
        <div className="no-inventory">
          <Package size={48} />
          <h3>No items found</h3>
          <p>No inventory items match the current filter.</p>
        </div>
      )}

      {/* Refill Modal */}
      {showRefillModal && (
        <Modal
          title="Refill Inventory"
          onClose={() => setShowRefillModal(false)}
        >
          <div className="refill-modal-content">
            <div className="refill-info">
              <h4>Slot {selectedSlot?.slot}</h4>
              <p>{getProductInfo(selectedSlot?.productId).name}</p>
              <p>Current Stock: {selectedSlot?.quantity}</p>
              <p>Max Capacity: {selectedSlot?.maxCapacity || 20}</p>
            </div>

            <div className="form-group">
              <label htmlFor="refillQuantity" className="form-label">
                New Quantity
              </label>
              <input
                type="number"
                id="refillQuantity"
                value={refillQuantity}
                onChange={(e) => setRefillQuantity(e.target.value)}
                className="form-input"
                min="0"
                max={selectedSlot?.maxCapacity || 20}
                placeholder="Enter quantity"
              />
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowRefillModal(false)}
                disabled={processingRefill}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleRefillSubmit}
                disabled={processingRefill || !refillQuantity}
              >
                {processingRefill ? <LoadingSpinner size="small" /> : 'Refill'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default Inventory;