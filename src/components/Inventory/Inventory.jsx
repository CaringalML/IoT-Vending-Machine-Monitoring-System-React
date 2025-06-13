import React, { useState, useEffect, useCallback } from 'react';
import { Package, AlertTriangle, RefreshCw, Trash2, Archive, Download, Upload, Zap, Search, X, FileText, FileSpreadsheet, FileImage } from 'lucide-react';
import { 
  subscribeToInventory, 
  subscribeToProducts,
  refillInventory,
  clearInventorySlot,
  bulkUpdateInventory,
  cleanupOrphanedInventorySlots,
  syncInventoryWithProducts
} from '../../services/firestore';
import Modal from '../Common/Modal';
import LoadingSpinner from '../Common/LoadingSpinner';
import DeleteConfirmation from '../Common/DeleteConfirmation';
import { formatCurrency } from '../../utils/helpers';
import { createExportManager } from './exports/ExportUtils';
import './Inventory.css';
import './ExportModal.css';

const Inventory = () => {
  const [inventory, setInventory] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showRefillModal, setShowRefillModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showBulkUpdateModal, setShowBulkUpdateModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [refillQuantity, setRefillQuantity] = useState('');
  const [processingRefill, setProcessingRefill] = useState(false);
  const [filter, setFilter] = useState('all'); // all, low, out, deleted
  const [imageLoading, setImageLoading] = useState(false);
  const [filteredItems, setFilteredItems] = useState([]);
  const [refillError, setRefillError] = useState('');
  const [bulkUpdates, setBulkUpdates] = useState([]);
  const [processingBulk, setProcessingBulk] = useState(false);
  const [actionLoading, setActionLoading] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState('csv');
  const [exportOptions, setExportOptions] = useState({
    includeImages: false,
    includeDeletedProducts: true,
    groupByCategory: false,
    includeStockHistory: false
  });
  const [exportManager, setExportManager] = useState(null);
  const [exportPreview, setExportPreview] = useState(null);
  const [exportLoading, setExportLoading] = useState(false);

  // Enhanced statistics
  const [stats, setStats] = useState({
    total: 0,
    low: 0,
    out: 0,
    deleted: 0,
    totalValue: 0,
    averageStock: 0
  });

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

  // Initialize export manager when data is available
  useEffect(() => {
    if (inventory.length > 0 && products.length > 0) {
      const manager = createExportManager(inventory, products, stats);
      setExportManager(manager);
    }
  }, [inventory, products, stats]);

  // Helper function for checking if item is deleted product
  const isDeletedProduct = useCallback((item) => {
    return !item.productId && item.deletedProductName;
  }, []);

  // Helper function for getting stock percentage
  const getStockPercentage = useCallback((quantity, maxCapacity) => {
    if (maxCapacity === 0) return 0;
    return Math.round((quantity / maxCapacity) * 100);
  }, []);

  // Helper function for getting product info
  const getProductInfo = useCallback((productId, inventoryItem = null) => {
    if (inventoryItem && isDeletedProduct(inventoryItem)) {
      return {
        name: inventoryItem.deletedProductName || 'Deleted Product',
        price: 0,
        sku: inventoryItem.deletedProductSKU || null
      };
    }
    
    return products.find(p => p.id === productId) || { 
      name: 'Unknown Product', 
      price: 0 
    };
  }, [products, isDeletedProduct]);

  // Calculate enhanced statistics
  const calculateStats = useCallback(() => {
    const hasProductItems = inventory.filter(item => item.productId || isDeletedProduct(item));
    
    const lowStockItems = hasProductItems.filter(item => {
      if (isDeletedProduct(item) || item.quantity === 0) return false;
      const percentage = getStockPercentage(item.quantity, item.maxCapacity || 20);
      return percentage <= 25;
    });

    const outOfStockItems = hasProductItems.filter(item => 
      !isDeletedProduct(item) && item.quantity === 0
    );

    const deletedItems = hasProductItems.filter(isDeletedProduct);

    const totalValue = hasProductItems.reduce((sum, item) => {
      if (isDeletedProduct(item)) return sum;
      const product = getProductInfo(item.productId, item);
      return sum + (item.quantity * (product.price || 0));
    }, 0);

    const activeItems = hasProductItems.filter(item => !isDeletedProduct(item));
    const averageStock = activeItems.length > 0 
      ? activeItems.reduce((sum, item) => {
          return sum + getStockPercentage(item.quantity, item.maxCapacity || 20);
        }, 0) / activeItems.length
      : 0;

    setStats({
      total: hasProductItems.length,
      low: lowStockItems.length,
      out: outOfStockItems.length,
      deleted: deletedItems.length,
      totalValue,
      averageStock: Math.round(averageStock)
    });
  }, [inventory, getProductInfo, getStockPercentage, isDeletedProduct]);

  useEffect(() => {
    calculateStats();
  }, [calculateStats]);

  // Search functionality
  const performSearch = useCallback((term) => {
    if (!term.trim()) {
      setSearchResults([]);
      return;
    }

    const searchLower = term.toLowerCase();
    const results = inventory.filter(item => {
      const isDeleted = isDeletedProduct(item);
      const hasProduct = item.productId || isDeleted;
      
      if (!hasProduct) return false;

      const product = getProductInfo(item.productId, item);
      
      const searchFields = [
        item.slot,
        product.name,
        product.sku,
        isDeleted ? 'deleted' : 'active',
        isDeleted ? item.deletedProductName : '',
      ].filter(Boolean).map(field => field.toString().toLowerCase());

      return searchFields.some(field => field.includes(searchLower));
    });

    setSearchResults(results);
  }, [inventory, getProductInfo, isDeletedProduct]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      performSearch(searchTerm);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, performSearch]);

  // Filter items whenever inventory, filter, or search changes
  useEffect(() => {
    let itemsToFilter = searchTerm.trim() ? searchResults : inventory;
    
    const filtered = itemsToFilter.filter(item => {
      const isDeleted = isDeletedProduct(item);
      const hasProduct = item.productId || isDeleted;
      
      if (!hasProduct) return false;
      
      switch (filter) {
        case 'low':
          if (isDeleted || item.quantity === 0) return false;
          const percentage = getStockPercentage(item.quantity, item.maxCapacity || 20);
          return percentage <= 25;
        case 'out':
          return !isDeleted && item.quantity === 0;
        case 'deleted':
          return isDeleted;
        case 'all':
        default:
          return true;
      }
    });
    
    setFilteredItems(filtered);
  }, [inventory, filter, searchTerm, searchResults, isDeletedProduct, getStockPercentage]);

  // Update export preview when format or options change
  useEffect(() => {
    if (exportManager && showExportModal) {
      const preview = exportManager.getExportPreview(exportFormat, filteredItems, exportOptions);
      setExportPreview(preview);
    }
  }, [exportManager, exportFormat, exportOptions, filteredItems, showExportModal]);

  // Additional helper functions
  const getStockStatus = (quantity, maxCapacity, threshold = 5) => {
    if (quantity === 0) return 'out';
    
    const percentage = (quantity / maxCapacity) * 100;
    
    if (percentage <= 25) return 'low';
    if (percentage <= 50) return 'medium';
    return 'good';
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
      case 'low': return '#f56565';
      case 'medium': return '#ed8936';
      case 'good': return '#38a169';
      default: return '#718096';
    }
  };

  const getFilteredCount = (filterType) => {
    const itemsToCount = searchTerm.trim() ? searchResults : inventory;
    
    return itemsToCount.filter(item => {
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

  // Event handlers
  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const clearSearch = () => {
    setSearchTerm('');
    setSearchResults([]);
  };

  const handleRefill = (slot) => {
    if (isDeletedProduct(slot)) {
      return;
    }
    setSelectedSlot(slot);
    setRefillQuantity(slot.maxCapacity || '20');
    setImageLoading(false);
    setRefillError('');
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
    
    return '';
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

  // Enhanced bulk operations
  const handleBulkRefill = () => {
    const activeItems = filteredItems.filter(item => !isDeletedProduct(item));
    const updates = activeItems.map(item => ({
      slotId: item.id,
      quantity: item.maxCapacity || 20,
      currentQuantity: item.quantity
    }));
    setBulkUpdates(updates);
    setShowBulkUpdateModal(true);
  };

  const handleBulkUpdateSubmit = async () => {
    setProcessingBulk(true);
    try {
      const validUpdates = bulkUpdates.filter(update => 
        update.quantity !== update.currentQuantity
      );
      
      if (validUpdates.length > 0) {
        await bulkUpdateInventory(validUpdates);
      }
      
      setShowBulkUpdateModal(false);
      setBulkUpdates([]);
    } catch (error) {
      console.error('Error bulk updating inventory:', error);
      alert('Error updating inventory. Please try again.');
    } finally {
      setProcessingBulk(false);
    }
  };

  const updateBulkQuantity = (slotId, quantity) => {
    setBulkUpdates(prev => 
      prev.map(update => 
        update.slotId === slotId 
          ? { ...update, quantity: parseInt(quantity) || 0 }
          : update
      )
    );
  };

  // Advanced actions
  const handleCleanupOrphaned = async () => {
    setActionLoading(prev => ({ ...prev, cleanup: true }));
    try {
      const cleaned = await cleanupOrphanedInventorySlots();
      alert(`Cleaned up ${cleaned} orphaned inventory slots.`);
    } catch (error) {
      console.error('Error cleaning up orphaned slots:', error);
      alert('Error cleaning up orphaned slots. Please try again.');
    } finally {
      setActionLoading(prev => ({ ...prev, cleanup: false }));
    }
  };

  const handleSyncWithProducts = async () => {
    setActionLoading(prev => ({ ...prev, sync: true }));
    try {
      const updates = await syncInventoryWithProducts();
      alert(`Synchronized ${updates} inventory slots with products.`);
    } catch (error) {
      console.error('Error syncing inventory:', error);
      alert('Error syncing inventory. Please try again.');
    } finally {
      setActionLoading(prev => ({ ...prev, sync: false }));
    }
  };

  // Export functionality using the new export modules
  const handleExportInventory = () => {
    setShowExportModal(true);
  };

  const performExport = async () => {
    if (!exportManager) {
      alert('Export manager not initialized. Please try again.');
      return;
    }

    setExportLoading(true);
    try {
      const metadata = {
        filter,
        searchTerm
      };

      const result = await exportManager.exportData(
        exportFormat, 
        filteredItems, 
        exportOptions, 
        metadata
      );

      if (result.success) {
        setShowExportModal(false);
        // Optional: Show success message
        console.log('Export successful:', result.message);
      } else {
        alert(`Export failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Export error:', error);
      alert('Export failed. Please try again.');
    } finally {
      setExportLoading(false);
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
        <div className="header-actions" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" onClick={handleExportInventory}>
            <Download size={16} />
            Export Data
          </button>
          <button 
            className="btn btn-primary" 
            onClick={handleBulkRefill}
            disabled={filteredItems.filter(item => !isDeletedProduct(item)).length === 0}
          >
            <Upload size={16} />
            Bulk Refill
          </button>
        </div>
      </div>

      {/* Enhanced Summary Cards */}
      <div className="inventory-summary">
        <div className="summary-card total">
          <div className="summary-icon">
            <Package size={24} />
          </div>
          <div className="summary-content">
            <h3>{stats.total}</h3>
            <p>Total Slots</p>
          </div>
        </div>

        <div className="summary-card low">
          <div className="summary-icon">
            <AlertTriangle size={24} />
          </div>
          <div className="summary-content">
            <h3>{stats.low}</h3>
            <p>Low Stock</p>
          </div>
        </div>

        <div className="summary-card out">
          <div className="summary-icon">
            <Package size={24} />
          </div>
          <div className="summary-content">
            <h3>{stats.out}</h3>
            <p>Out of Stock</p>
          </div>
        </div>

        <div className="summary-card deleted">
          <div className="summary-icon">
            <Archive size={24} />
          </div>
          <div className="summary-content">
            <h3>{stats.deleted}</h3>
            <p>Old Products</p>
          </div>
        </div>

        {/* Additional stats */}
        <div className="summary-card value" style={{ gridColumn: 'span 2' }}>
          <div className="summary-icon" style={{ background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)' }}>
            <Package size={24} />
          </div>
          <div className="summary-content">
            <h3>{formatCurrency(stats.totalValue)}</h3>
            <p>Total Inventory Value</p>
          </div>
        </div>

        <div className="summary-card average" style={{ gridColumn: 'span 2' }}>
          <div className="summary-icon" style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }}>
            <Package size={24} />
          </div>
          <div className="summary-content">
            <h3>{stats.averageStock}%</h3>
            <p>Average Stock Level</p>
          </div>
        </div>
      </div>

      {/* Advanced Actions */}
      <div className="advanced-actions">
        <button 
          className="btn btn-secondary"
          onClick={handleCleanupOrphaned}
          disabled={actionLoading.cleanup}
        >
          {actionLoading.cleanup ? (
            <>
              <div className="spinner small" style={{ marginRight: '8px' }}></div>
              Cleaning...
            </>
          ) : (
            <>
              <Archive size={16} />
              Cleanup Orphaned
            </>
          )}
        </button>
        
        <button 
          className="btn btn-secondary"
          onClick={handleSyncWithProducts}
          disabled={actionLoading.sync}
        >
          {actionLoading.sync ? (
            <>
              <div className="spinner small" style={{ marginRight: '8px' }}></div>
              Syncing...
            </>
          ) : (
            <>
              <Zap size={16} />
              Sync with Products
            </>
          )}
        </button>
      </div>

      {/* Search and Filters */}
      <div className="search-and-filters">
        {/* Search Input */}
        <div className="search-container">
          <div className="search-input-wrapper">
            <Search size={20} className="search-icon" />
            <input
              type="text"
              placeholder="Search by slot, product name, SKU..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="form-input search-input"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={clearSearch}
                className="search-clear-btn"
                title="Clear search"
              >
                <X size={16} />
              </button>
            )}
          </div>
          {searchTerm && (
            <div className="search-info">
              {searchResults.length > 0 
                ? `Found ${searchResults.length} result${searchResults.length !== 1 ? 's' : ''}`
                : 'No results found'
              }
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="inventory-filters">
          <div className="filter-buttons">
            <button 
              className={filter === 'all' ? 'filter-btn active' : 'filter-btn'}
              onClick={() => handleFilterChange('all')}
            >
              All Items ({getFilteredCount('all')})
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
                    <>
                      <div className="detail-item">
                        <span className="detail-label">Price:</span>
                        <span className="detail-value">{formatCurrency(product.price)}</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Value:</span>
                        <span className="detail-value">
                          {formatCurrency(item.quantity * (product.price || 0))}
                        </span>
                      </div>
                    </>
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
                        {(() => {
                          const date = new Date(item.deletedAt.seconds * 1000);
                          const dateStr = date.toLocaleDateString('en-NZ', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          });
                          const timeStr = date.toLocaleTimeString('en-NZ', {
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true
                          });
                          return `${dateStr} at ${timeStr}`;
                        })()}
                      </span>
                    </div>
                  )}
                  
                  {!isDeleted && item.lastRefilled && (
                    <div className="detail-item">
                      <span className="detail-label">Last Refilled:</span>
                      <span className="detail-value">
                        {(() => {
                          const date = new Date(item.lastRefilled.seconds * 1000);
                          const dateStr = date.toLocaleDateString('en-NZ', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          });
                          const timeStr = date.toLocaleTimeString('en-NZ', {
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true
                          });
                          return `${dateStr} at ${timeStr}`;
                        })()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* No Results State */}
      {filteredItems.length === 0 && (
        <div className="no-inventory">
          <Package size={48} />
          <h3>{searchTerm ? 'No search results' : 'No items found'}</h3>
          <p>
            {searchTerm 
              ? `No inventory items match "${searchTerm}" with the current filter.`
              : 'No inventory items match the current filter.'
            }
          </p>
          {searchTerm && (
            <button 
              className="btn btn-secondary clear-search-btn" 
              onClick={clearSearch}
            >
              Clear Search
            </button>
          )}
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
                <div className="refill-error">
                  {refillError}
                </div>
              )}
              <small className="refill-help">
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

      {/* Bulk Update Modal */}
      {showBulkUpdateModal && (
        <Modal
          title="Bulk Refill Inventory"
          onClose={() => setShowBulkUpdateModal(false)}
          size="large"
        >
          <div className="bulk-update-content">
            <p className="bulk-description">
              Update quantities for multiple slots at once. Only changed values will be updated.
            </p>
            
            <div className="bulk-update-list">
              <table className="table">
                <thead>
                  <tr>
                    <th>Slot</th>
                    <th>Product</th>
                    <th>Current</th>
                    <th>Max</th>
                    <th>New Quantity</th>
                  </tr>
                </thead>
                <tbody>
                  {bulkUpdates.map((update) => {
                    const item = inventory.find(i => i.id === update.slotId);
                    const product = getProductInfo(item?.productId, item);
                    
                    return (
                      <tr key={update.slotId}>
                        <td>{item?.slot}</td>
                        <td>{product.name}</td>
                        <td>{update.currentQuantity}</td>
                        <td>{item?.maxCapacity || 20}</td>
                        <td>
                          <input
                            type="number"
                            value={update.quantity}
                            onChange={(e) => updateBulkQuantity(update.slotId, e.target.value)}
                            className="form-input bulk-quantity-input"
                            min="0"
                            max={item?.maxCapacity || 20}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="bulk-actions">
              <div className="bulk-action-buttons">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    const maxUpdates = bulkUpdates.map(update => {
                      const item = inventory.find(i => i.id === update.slotId);
                      return { ...update, quantity: item?.maxCapacity || 20 };
                    });
                    setBulkUpdates(maxUpdates);
                  }}
                >
                  Fill All to Max
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    const resetUpdates = bulkUpdates.map(update => ({
                      ...update,
                      quantity: update.currentQuantity
                    }));
                    setBulkUpdates(resetUpdates);
                  }}
                >
                  Reset Changes
                </button>
              </div>
              
              <div className="bulk-modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowBulkUpdateModal(false)}
                  disabled={processingBulk}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleBulkUpdateSubmit}
                  disabled={processingBulk}
                >
                  {processingBulk ? (
                    <div className="btn-loading-content">
                      <div className="bulk-spinner"></div>
                      <span>Updating...</span>
                    </div>
                  ) : (
                    `Update ${bulkUpdates.filter(u => u.quantity !== u.currentQuantity).length} Items`
                  )}
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Export Modal */}
      {showExportModal && (
        <Modal
          title="Export Inventory Data"
          onClose={() => setShowExportModal(false)}
          size="medium"
        >
          <div className="export-modal-content">
            <div className="export-info">
              <h4 className="export-summary-title">Export Summary</h4>
              <p className="export-summary-text">
                Exporting <strong>{filteredItems.length} items</strong> from 
                <strong> {filter.charAt(0).toUpperCase() + filter.slice(1)}</strong> filter
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
                    checked={exportOptions.includeDeletedProducts}
                    onChange={(e) => setExportOptions(prev => ({ 
                      ...prev, 
                      includeDeletedProducts: e.target.checked 
                    }))}
                    className="export-checkbox-input"
                  />
                  <span className="export-checkbox-checkmark"></span>
                  <span className="export-checkbox-text">Include deleted/old products</span>
                </label>

                <label className="export-checkbox-label">
                  <input
                    type="checkbox"
                    checked={exportOptions.groupByCategory}
                    onChange={(e) => setExportOptions(prev => ({ 
                      ...prev, 
                      groupByCategory: e.target.checked 
                    }))}
                    className="export-checkbox-input"
                  />
                  <span className="export-checkbox-checkmark"></span>
                  <span className="export-checkbox-text">Group by product category</span>
                </label>

                <label className="export-checkbox-label">
                  <input
                    type="checkbox"
                    checked={exportOptions.includeImages}
                    onChange={(e) => setExportOptions(prev => ({ 
                      ...prev, 
                      includeImages: e.target.checked 
                    }))}
                    className="export-checkbox-input"
                  />
                  <span className="export-checkbox-checkmark"></span>
                  <span className="export-checkbox-text">Include product image URLs</span>
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
                    <span className="export-preview-value">{exportPreview.itemCount} inventory items</span>
                  </div>
                  {exportPreview.columns && (
                    <div className="export-preview-item">
                      <span className="export-preview-label">Columns:</span>
                      <span className="export-preview-value">{exportPreview.columns.length} data fields</span>
                    </div>
                  )}
                  {exportPreview.features && exportPreview.features.length > 0 && (
                    <div className="export-preview-item">
                      <span className="export-preview-label">Features:</span>
                      <span className="export-preview-value">{exportPreview.features.slice(0, 3).join(', ')}</span>
                    </div>
                  )}
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
                disabled={filteredItems.length === 0 || exportLoading}
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