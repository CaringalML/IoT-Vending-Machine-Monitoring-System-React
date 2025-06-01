import React, { useState, useEffect } from 'react';
import { Package, AlertTriangle, RefreshCw, Trash2, Archive } from 'lucide-react';
import { 
  subscribeToInventory, 
  subscribeToProducts,
  refillInventory,
  clearInventorySlot
} from '../../services/firestore';
import Modal from '../Common/Modal';
import LoadingSpinner from '../Common/LoadingSpinner';
import DeleteConfirmation from '../Common/DeleteConfirmation';
import './Inventory.css';

const Inventory = () => {
  const [inventory, setInventory] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showRefillModal, setShowRefillModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [refillQuantity, setRefillQuantity] = useState('');
  const [processingRefill, setProcessingRefill] = useState(false);
  const [filter, setFilter] = useState('all'); // all, low, out, deleted
  const [imageLoading, setImageLoading] = useState(false);
  const [filteredItems, setFilteredItems] = useState([]);
  const [refillError, setRefillError] = useState('');

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

  // Filter items whenever inventory or filter changes
  useEffect(() => {
    const filtered = inventory.filter(item => {
      const isDeleted = isDeletedProduct(item);
      const hasProduct = item.productId || isDeleted;
      
      // Only show items that have a product or are deleted products
      if (!hasProduct) return false;
      
      console.log(`Filtering item ${item.slot}: filter="${filter}", quantity=${item.quantity}, maxCapacity=${item.maxCapacity}`);
      
      switch (filter) {
        case 'low':
          // Must not be deleted and must have quantity > 0
          if (isDeleted || item.quantity === 0) return false;
          // Calculate percentage and check if it's low stock (≤25%)
          const percentage = getStockPercentage(item.quantity, item.maxCapacity || 20);
          console.log(`Item ${item.slot} percentage: ${percentage}%, low stock: ${percentage <= 25}`);
          return percentage <= 25;
        case 'out':
          // Must not be deleted and must have quantity = 0
          return !isDeleted && item.quantity === 0;
        case 'deleted':
          // Must be a deleted product
          return isDeleted;
        case 'all':
        default:
          // Show all items with products
          return true;
      }
    });
    
    console.log(`Filter "${filter}" applied. Showing ${filtered.length} items out of ${inventory.length}`);
    setFilteredItems(filtered);
  }, [inventory, filter]);

  const getProductInfo = (productId, inventoryItem = null) => {
    // If it's a deleted product, use the stored deleted product info
    if (inventoryItem && isDeletedProduct(inventoryItem)) {
      return {
        name: inventoryItem.deletedProductName || 'Deleted Product',
        price: 0,
        sku: inventoryItem.deletedProductSKU || null
      };
    }
    
    // Otherwise, find the product in the current products array
    return products.find(p => p.id === productId) || { 
      name: 'Unknown Product', 
      price: 0 
    };
  };

  const getStockStatus = (quantity, maxCapacity, threshold = 5) => {
    if (quantity === 0) return 'out';
    
    const percentage = (quantity / maxCapacity) * 100;
    
    // Use percentage-based thresholds for better accuracy
    if (percentage <= 25) return 'low';      // 25% or less = low stock
    if (percentage <= 50) return 'medium';   // 26-50% = medium stock
    return 'good';                           // 51%+ = good stock
  };

  const getStockPercentage = (quantity, maxCapacity) => {
    if (maxCapacity === 0) return 0;
    return Math.round((quantity / maxCapacity) * 100);
  };

  const getStockStatusLabel = (quantity, maxCapacity) => {
    if (quantity === 0) return 'Out of Stock';
    
    const percentage = getStockPercentage(quantity, maxCapacity);
    
    if (percentage <= 25) return `Low Stock (${percentage}%)`;
    if (percentage <= 50) return `Medium Stock (${percentage}%)`;
    return `Good Stock (${percentage}%)`;
  };

  const getStockStatusColor = (status) => {
    switch (status) {
      case 'out': return '#f56565';
      case 'low': return '#f56565';       // Red for low stock
      case 'medium': return '#ed8936';    // Orange for medium stock  
      case 'good': return '#38a169';      // Green for good stock
      default: return '#718096';
    }
  };

  const isDeletedProduct = (item) => {
    return !item.productId && item.deletedProductName;
  };

  const getFilteredCount = (filterType) => {
    return inventory.filter(item => {
      const isDeleted = isDeletedProduct(item);
      const hasProduct = item.productId || isDeleted;
      
      if (!hasProduct) return false;
      
      switch (filterType) {
        case 'low':
          if (isDeleted || item.quantity === 0) return false;
          const percentage = getStockPercentage(item.quantity, item.maxCapacity || 20);
          return percentage <= 25;
        case 'out':
          return !isDeleted && item.quantity === 0;
        case 'deleted':
          return isDeleted;
        default:
          return true;
      }
    }).length;
  };

  const handleFilterChange = (newFilter) => {
    console.log(`Changing filter from "${filter}" to "${newFilter}"`);
    setFilter(newFilter);
  };

  const handleRefill = (slot) => {
    if (isDeletedProduct(slot)) {
      return; // Can't refill deleted products
    }
    setSelectedSlot(slot);
    setRefillQuantity(slot.maxCapacity || '20');
    setImageLoading(false); // Reset image loading state
    setRefillError(''); // Reset any previous errors
    setShowRefillModal(true);
  };

  const validateRefillQuantity = (quantity, maxCapacity) => {
    const num = parseInt(quantity);
    
    if (isNaN(num)) {
      return 'Please enter a valid number.';
    }
    
    if (num < 0) {
      return 'Quantity cannot be negative.';
    }
    
    if (num > maxCapacity) {
      return `Cannot exceed maximum capacity of ${maxCapacity} items.`;
    }
    
    return ''; // No error
  };

  const handleRefillQuantityChange = (e) => {
    const newQuantity = e.target.value;
    setRefillQuantity(newQuantity);
    
    if (selectedSlot) {
      const maxCapacity = selectedSlot.maxCapacity || 20;
      const error = validateRefillQuantity(newQuantity, maxCapacity);
      setRefillError(error);
    }
  };

  const handleDeleteSlot = (slot) => {
    setSelectedSlot(slot);
    setShowDeleteConfirm(true);
  };

  const handleRefillSubmit = async () => {
    if (!selectedSlot || !refillQuantity) return;

    const maxCapacity = selectedSlot.maxCapacity || 20;
    const error = validateRefillQuantity(refillQuantity, maxCapacity);
    
    if (error) {
      setRefillError(error);
      return;
    }

    const newQuantity = parseInt(refillQuantity);

    setProcessingRefill(true);
    try {
      await refillInventory(selectedSlot.id, newQuantity);
      setShowRefillModal(false);
      setSelectedSlot(null);
      setRefillQuantity('');
      setRefillError('');
    } catch (error) {
      console.error('Error refilling inventory:', error);
      setRefillError('Error refilling inventory. Please try again.');
    } finally {
      setProcessingRefill(false);
    }
  };

  const handleClearSlot = async () => {
    if (!selectedSlot) return;

    try {
      await clearInventorySlot(selectedSlot.id);
      setShowDeleteConfirm(false);
      setSelectedSlot(null);
    } catch (error) {
      console.error('Error clearing inventory slot:', error);
      throw new Error('Failed to clear inventory slot. Please try again.');
    }
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
            <h3>{inventory.filter(item => item.productId || isDeletedProduct(item)).length}</h3>
            <p>Total Slots</p>
          </div>
        </div>

        <div className="summary-card low">
          <div className="summary-icon">
            <AlertTriangle size={24} />
          </div>
          <div className="summary-content">
            <h3>{getFilteredCount('low')}</h3>
            <p>Low Stock</p>
          </div>
        </div>

        <div className="summary-card out">
          <div className="summary-icon">
            <Package size={24} />
          </div>
          <div className="summary-content">
            <h3>{getFilteredCount('out')}</h3>
            <p>Out of Stock</p>
          </div>
        </div>

        <div className="summary-card deleted">
          <div className="summary-icon">
            <Archive size={24} />
          </div>
          <div className="summary-content">
            <h3>{getFilteredCount('deleted')}</h3>
            <p>Old Products</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="inventory-filters">
        <div className="filter-buttons">
          <button 
            className={filter === 'all' ? 'filter-btn active' : 'filter-btn'}
            onClick={() => handleFilterChange('all')}
          >
            All Items ({inventory.filter(item => item.productId || isDeletedProduct(item)).length})
          </button>
          <button 
            className={filter === 'low' ? 'filter-btn active' : 'filter-btn'}
            onClick={() => handleFilterChange('low')}
          >
            Low Stock ({getFilteredCount('low')})
          </button>
          <button 
            className={filter === 'out' ? 'filter-btn active' : 'filter-btn'}
            onClick={() => handleFilterChange('out')}
          >
            Out of Stock ({getFilteredCount('out')})
          </button>
          <button 
            className={filter === 'deleted' ? 'filter-btn active' : 'filter-btn'}
            onClick={() => handleFilterChange('deleted')}
          >
            Old Products ({getFilteredCount('deleted')})
          </button>
        </div>
      </div>

      {/* Inventory Grid */}
      <div className="inventory-grid">
        {filteredItems.map((item) => {
          const isDeleted = isDeletedProduct(item);
          const product = getProductInfo(item.productId, item);
          const status = isDeleted ? 'deleted' : getStockStatus(item.quantity, item.maxCapacity || 20, item.lowStockThreshold);
          
          return (
            <div key={item.id} className={`inventory-card ${isDeleted ? 'deleted-product' : ''}`}>
              <div className="inventory-card-header">
                <div className="slot-info">
                  <span className="slot-number">{item.slot}</span>
                  <div 
                    className="stock-indicator"
                    style={{ backgroundColor: isDeleted ? '#a0aec0' : getStockStatusColor(status) }}
                  ></div>
                </div>
                <div className="slot-actions">
                  {!isDeleted && (
                    <button 
                      className="refill-btn"
                      onClick={() => handleRefill(item)}
                      title="Refill Stock"
                    >
                      <RefreshCw size={16} />
                    </button>
                  )}
                  {isDeleted && (
                    <button 
                      className="delete-btn"
                      onClick={() => handleDeleteSlot(item)}
                      title="Clear Slot"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>

              <div className="inventory-card-body">
                <h3 className={`product-name ${isDeleted ? 'deleted-name' : ''}`}>
                  {product.name}
                  {isDeleted && <span className="deleted-label">(Deleted)</span>}
                </h3>
                
                {!isDeleted && (
                  <div className="stock-info">
                    <div className="stock-level">
                      <span className="current-stock">{item.quantity}</span>
                      <span className="max-capacity">/ {item.maxCapacity || 20}</span>
                      <span className="stock-percentage-display">({getStockPercentage(item.quantity, item.maxCapacity || 20)}%)</span>
                    </div>
                    <div className="stock-percentage">
                      <div 
                        className="stock-bar"
                        style={{
                          width: `${getStockPercentage(item.quantity, item.maxCapacity || 20)}%`,
                          backgroundColor: getStockStatusColor(status)
                        }}
                      ></div>
                    </div>
                  </div>
                )}

                <div className="inventory-details">
                  {!isDeleted && (
                    <div className="detail-item">
                      <span className="detail-label">Price:</span>
                      <span className="detail-value">
                        {new Intl.NumberFormat('en-NZ', {
                          style: 'currency',
                          currency: 'NZD'
                        }).format(product.price)}
                      </span>
                    </div>
                  )}
                  
                  {product.sku && (
                    <div className="detail-item">
                      <span className="detail-label">SKU:</span>
                      <span className="detail-value">{product.sku}</span>
                    </div>
                  )}
                  
                  <div className="detail-item">
                    <span className="detail-label">Status:</span>
                    <span className={`status-badge status-${status}`}>
                      {isDeleted ? 'Old Product' : getStockStatusLabel(item.quantity, item.maxCapacity || 20)}
                    </span>
                  </div>
                  
                  {isDeleted && item.deletedAt && (
                    <div className="detail-item">
                      <span className="detail-label">Deleted:</span>
                      <span className="detail-value">
                        {new Date(item.deletedAt.seconds * 1000).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                  
                  {!isDeleted && item.lastRefilled && (
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

      {filteredItems.length === 0 && (
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
              <div className="refill-product-header">
                <div className="refill-product-image">
                  {(() => {
                    const product = products.find(p => p.id === selectedSlot?.productId);
                    return product?.image ? (
                      <>
                        {imageLoading && (
                          <div className="refill-image-loading">
                            <div className="refill-image-spinner"></div>
                          </div>
                        )}
                        <img 
                          src={product.image} 
                          alt={product.name}
                          onLoad={() => setImageLoading(false)}
                          onLoadStart={() => setImageLoading(true)}
                          onError={() => setImageLoading(false)}
                          style={{ display: imageLoading ? 'none' : 'block' }}
                        />
                      </>
                    ) : (
                      <div className="refill-product-placeholder">
                        <Package size={64} />
                      </div>
                    );
                  })()}
                </div>
                <div className="refill-product-info">
                  <h4>Slot {selectedSlot?.slot}</h4>
                  <p className="refill-product-name">{getProductInfo(selectedSlot?.productId, selectedSlot).name}</p>
                  <p>Current Stock: <span className="stock-highlight">{selectedSlot?.quantity}</span></p>
                  <p>Max Capacity: <span className="capacity-highlight">{selectedSlot?.maxCapacity || 20}</span></p>
                </div>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="refillQuantity" className="form-label">
                New Quantity
              </label>
              <input
                type="number"
                id="refillQuantity"
                value={refillQuantity}
                onChange={handleRefillQuantityChange}
                className={`form-input ${refillError ? 'error' : ''}`}
                min="0"
                max={selectedSlot?.maxCapacity || 20}
                placeholder="Enter quantity"
              />
              {refillError && (
                <div className="form-error" style={{ 
                  color: '#e53e3e', 
                  fontSize: '12px', 
                  marginTop: '4px',
                  fontWeight: '500'
                }}>
                  {refillError}
                </div>
              )}
              <small className="form-help" style={{ display: 'block', marginTop: '4px' }}>
                Maximum capacity: {selectedSlot?.maxCapacity || 20} items
              </small>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="refill-modal-btn secondary"
                onClick={() => setShowRefillModal(false)}
                disabled={processingRefill}
              >
                Cancel
              </button>
              <button
                type="button"
                className="refill-modal-btn primary"
                onClick={handleRefillSubmit}
                disabled={processingRefill || !refillQuantity || refillError}
              >
                {processingRefill ? (
                  <div className="refill-loading-content">
                    <div className="refill-loading-spinner"></div>
                    <span>Refilling...</span>
                  </div>
                ) : (
                  'Refill'
                )}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation */}
      <DeleteConfirmation
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleClearSlot}
        title="Remove Old Product"
        message="This will completely remove this old product from the inventory."
        itemName={selectedSlot?.deletedProductName}
        type="old product"
        warningText="This action cannot be undone. The slot will be completely removed from inventory."
        confirmText="Remove Completely"
        showInput={false}
      />
    </div>
  );
};

export default Inventory;