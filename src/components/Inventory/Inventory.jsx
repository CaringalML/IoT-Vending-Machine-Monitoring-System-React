import React, { useState, useEffect, useCallback } from 'react';
import { Package, AlertTriangle, RefreshCw, Trash2, Archive, Download, Upload, Zap, Search, X, FileText, FileSpreadsheet, FileImage } from 'lucide-react';
import * as XLSX from 'xlsx';
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
import { formatCurrency, downloadCSV } from '../../utils/helpers';
import './Inventory.css';

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

  // Helper function for checking if item is deleted product
  const isDeletedProduct = useCallback((item) => {
    return !item.productId && item.deletedProductName;
  }, []);

  // Helper function for getting stock percentage
  const getStockPercentage = useCallback((quantity, maxCapacity) => {
    if (maxCapacity === 0) return 0;
    return Math.round((quantity / maxCapacity) * 100);
  }, []);

  // Helper function for getting product info (moved here to fix useCallback dependencies)
  const getProductInfo = useCallback((productId, inventoryItem = null) => {
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

    // Calculate total inventory value
    const totalValue = hasProductItems.reduce((sum, item) => {
      if (isDeletedProduct(item)) return sum;
      const product = getProductInfo(item.productId, item);
      return sum + (item.quantity * (product.price || 0));
    }, 0);

    // Calculate average stock percentage
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
      
      // Search in multiple fields
      const searchFields = [
        item.slot,                           // Slot number (A1, B2, etc.)
        product.name,                        // Product name
        product.sku,                         // Product SKU
        isDeleted ? 'deleted' : 'active',    // Status
        isDeleted ? item.deletedProductName : '', // Deleted product name
      ].filter(Boolean).map(field => field.toString().toLowerCase());

      return searchFields.some(field => field.includes(searchLower));
    });

    setSearchResults(results);
  }, [inventory, getProductInfo, isDeletedProduct]);

  // Debounced search effect
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
      
      // Only show items that have a product or are deleted products
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

  const handleExportInventory = () => {
    setShowExportModal(true);
  };

  const generateExportData = () => {
    let dataToExport = [...filteredItems];

    // Filter out deleted products if not included
    if (!exportOptions.includeDeletedProducts) {
      dataToExport = dataToExport.filter(item => !isDeletedProduct(item));
    }

    // Group by category if requested
    if (exportOptions.groupByCategory) {
      dataToExport.sort((a, b) => {
        const productA = getProductInfo(a.productId, a);
        const productB = getProductInfo(b.productId, b);
        const categoryA = productA.category || 'other';
        const categoryB = productB.category || 'other';
        return categoryA.localeCompare(categoryB);
      });
    }

    // Transform data for export
    const exportData = dataToExport.map((item, index) => {
      const product = getProductInfo(item.productId, item);
      const isDeleted = isDeletedProduct(item);
      
      const baseData = {
        '#': index + 1,
        'Slot': item.slot,
        'Product Name': product.name,
        'Category': product.category || 'Other',
        'SKU': product.sku || 'N/A',
        'Current Stock': item.quantity,
        'Max Capacity': item.maxCapacity || 20,
        'Stock %': isDeleted ? 'N/A' : `${getStockPercentage(item.quantity, item.maxCapacity || 20)}%`,
        'Status': isDeleted ? 'Deleted Product' : getStockStatusLabel(item.quantity, item.maxCapacity || 20),
        'Unit Price': product.price ? `$${product.price.toFixed(2)}` : '$0.00',
        'Total Value': `$${(item.quantity * (product.price || 0)).toFixed(2)}`,
        'Low Stock Threshold': item.lowStockThreshold || 5,
        'Last Refilled': item.lastRefilled ? (() => {
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
        })() : 'Never',
        'Product Active': isDeleted ? 'No' : (product.active ? 'Yes' : 'No'),
      };

      // Add additional fields based on options
      if (exportOptions.includeImages && product.image) {
        baseData['Image URL'] = product.image;
      }

      if (isDeleted) {
        baseData['Deleted Date'] = item.deletedAt ? (() => {
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
        })() : 'Unknown';
      }

      return baseData;
    });

    return exportData;
  };

  const performExport = async () => {
    const exportData = generateExportData();
    const fileName = `inventory-${filter}${searchTerm ? '-search' : ''}-${new Date().toISOString().split('T')[0]}`;

    try {
      if (exportFormat === 'csv') {
        downloadCSV(exportData, `${fileName}.csv`);
      } else if (exportFormat === 'excel') {
        await downloadExcel(exportData, `${fileName}.xlsx`);
      } else if (exportFormat === 'pdf') {
        await downloadPDF(exportData, `${fileName}.pdf`);
      }
      
      setShowExportModal(false);
    } catch (error) {
      console.error('Export error:', error);
      alert('Error exporting data. Please try again.');
    }
  };

  const downloadExcel = async (data, filename) => {
    try {
      // Check if XLSX is available
      if (typeof XLSX === 'undefined') {
        throw new Error('XLSX library not found');
      }

      // Create a new workbook
      const workbook = XLSX.utils.book_new();
      
      // Convert data to worksheet
      const worksheet = XLSX.utils.json_to_sheet(data);
      
      // Calculate column widths based on content
      const colWidths = [];
      const headers = Object.keys(data[0] || {});
      
      headers.forEach((header, index) => {
        const maxLength = Math.max(
          header.length,
          ...data.map(row => String(row[header] || '').length)
        );
        colWidths[index] = { width: Math.min(Math.max(maxLength + 2, 10), 50) };
      });
      
      worksheet['!cols'] = colWidths;
      
      // Add some styling to headers
      const range = XLSX.utils.decode_range(worksheet['!ref']);
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
        if (!worksheet[cellAddress]) continue;
        worksheet[cellAddress].s = {
          font: { bold: true },
          fill: { fgColor: { rgb: "EEEEEE" } }
        };
      }
      
      // Add the worksheet to workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventory');
      
      // Create Excel file and download
      XLSX.writeFile(workbook, filename);
      console.log('Excel file downloaded successfully:', filename);
    } catch (error) {
      console.error('Excel export error:', error);
      alert(`Excel export failed: ${error.message}. Falling back to CSV.`);
      downloadCSV(data, filename.replace('.xlsx', '.csv'));
    }
  };

  const downloadPDF = async (data, filename) => {
    try {
      // Calculate total value for summary
      const totalValue = data.reduce((sum, item) => {
        const value = parseFloat(item['Total Value'].replace('$', ''));
        return sum + value;
      }, 0);

      // Create HTML content for PDF
const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Inventory Report</title>
  <style>
    body { font-family: 'Open Sans', sans-serif; margin: 20px; background-color: #ffffff; color: #333; }
    .pdf-container { max-width: 1000px; margin: auto; padding: 20px; }
    .pdf-header { text-align: center; border-bottom: 4px solid #4f46e5; padding-bottom: 20px; margin-bottom: 30px; }
    .pdf-header h1 { font-size: 32px; color: #4f46e5; margin: 0; }
    .pdf-header p { font-size: 14px; color: #555; margin: 4px 0; }
    .pdf-summary { background: #f3f4f6; padding: 20px; border-radius: 10px; margin-bottom: 30px; }
    .pdf-summary h3 { margin-top: 0; color: #4f46e5; font-size: 20px; }
    .pdf-summary-stats { display: flex; gap: 20px; justify-content: space-around; flex-wrap: wrap; }
    .pdf-stat-item { background: white; padding: 15px; border-radius: 8px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.1); flex: 1 1 150px; }
    .pdf-stat-value { font-size: 22px; font-weight: bold; color: #4f46e5; }
    .pdf-stat-label { font-size: 12px; color: #666; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 20px; }
    th { background: #4f46e5; color: white; padding: 8px; text-align: left; }
    td { border: 1px solid #ddd; padding: 6px; }
    tr:nth-child(even) { background: #f9fafb; }
    .status-good { color: #38a169; font-weight: bold; }
    .status-medium { color: #ed8936; font-weight: bold; }
    .status-low, .status-out { color: #e53e3e; font-weight: bold; }
    .status-deleted { color: #718096; font-weight: bold; }
    .pdf-footer { text-align: center; font-size: 10px; color: #666; border-top: 1px solid #ddd; padding-top: 10px; margin-top: 30px; }
    @media print {
      * {
        print-color-adjust: exact !important; /* Updated CSS property */
        -webkit-print-color-adjust: exact !important; /* Webkit fallback */
      }
      body { margin: 0; }
      .pdf-container { max-width: none; margin: 0; padding: 10px; }
    }
  </style>
</head>
<body>
  <div class="pdf-container">
    <div class="pdf-header">
      <h1>📦 Inventory Report</h1>
      <p><strong>Generated:</strong> ${new Date().toLocaleString('en-NZ')}</p>
      <p><strong>Filter:</strong> ${filter.charAt(0).toUpperCase() + filter.slice(1)}${searchTerm ? ` | Search: "${searchTerm}"` : ''}</p>
    </div>

    <div class="pdf-summary">
      <h3>📊 Summary</h3>
      <div class="pdf-summary-stats">
        <div class="pdf-stat-item">
          <div class="pdf-stat-value">${data.length}</div>
          <div class="pdf-stat-label">Total Items</div>
        </div>
        <div class="pdf-stat-item">
          <div class="pdf-stat-value">${totalValue.toFixed(2)}</div>
          <div class="pdf-stat-label">Total Value</div>
        </div>
        <div class="pdf-stat-item">
          <div class="pdf-stat-value">${stats.low}</div>
          <div class="pdf-stat-label">Low Stock</div>
        </div>
        <div class="pdf-stat-item">
          <div class="pdf-stat-value">${stats.out}</div>
          <div class="pdf-stat-label">Out of Stock</div>
        </div>
      </div>
    </div>

    <table>
      <thead>
        <tr>${Object.keys(data[0] || {}).map(header => `<th>${header}</th>`).join('')}</tr>
      </thead>
      <tbody>
        ${data.map(row => {
          const statusClass = row.Status?.toLowerCase().includes('good') ? 'status-good' :
                             row.Status?.toLowerCase().includes('medium') ? 'status-medium' :
                             row.Status?.toLowerCase().includes('low') ? 'status-low' :
                             row.Status?.toLowerCase().includes('out') ? 'status-out' :
                             row.Status?.toLowerCase().includes('deleted') ? 'status-deleted' : '';
          return `<tr>${Object.entries(row).map(([key, value]) =>
            `<td class="${key === 'Status' ? statusClass : ''}">${value || ''}</td>`
          ).join('')}</tr>`;
        }).join('')}
      </tbody>
    </table>

    <div class="pdf-footer">
      <p><strong>🏪 Vending Machine Admin System</strong> - Inventory Management Report</p>
      <p>Generated on ${new Date().toLocaleDateString('en-NZ')}</p>
    </div>
  </div>
</body>
</html>`;

      // Create a blob with the HTML content
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      
      // Create a temporary iframe to load the content
      const iframe = document.createElement('iframe');
      iframe.style.position = 'absolute';
      iframe.style.left = '-9999px';
      iframe.style.width = '0';
      iframe.style.height = '0';
      document.body.appendChild(iframe);
      
      // Load the HTML content
      iframe.src = url;
      
      // Wait for the iframe to load, then trigger print
      iframe.onload = () => {
        setTimeout(() => {
          try {
            // Try to access the iframe's window and trigger print
            const iframeWindow = iframe.contentWindow;
            
            // Set up the print settings to save as PDF
            if (iframeWindow) {
              // Focus the iframe window
              iframeWindow.focus();
              
              // Trigger print dialog (user can choose "Save as PDF")
              iframeWindow.print();
              
              // Clean up after a delay
              setTimeout(() => {
                document.body.removeChild(iframe);
                URL.revokeObjectURL(url);
              }, 1000);
            }
          } catch (error) {
            console.error('Print error:', error);
            // Fallback: open in new window
            const newWindow = window.open(url, '_blank');
            if (newWindow) {
              newWindow.addEventListener('load', () => {
                setTimeout(() => {
                  newWindow.print();
                  newWindow.close();
                }, 500);
              });
            }
            
            // Clean up
            setTimeout(() => {
              if (iframe.parentNode) {
                document.body.removeChild(iframe);
              }
              URL.revokeObjectURL(url);
            }, 2000);
          }
        }, 500);
      };
      
      // Fallback if iframe fails to load
      iframe.onerror = () => {
        console.log('Iframe failed, falling back to new window');
        const newWindow = window.open('', '_blank');
        if (newWindow) {
          newWindow.document.write(htmlContent);
          newWindow.document.close();
          setTimeout(() => {
            newWindow.print();
          }, 500);
        }
        
        // Clean up
        if (iframe.parentNode) {
          document.body.removeChild(iframe);
        }
        URL.revokeObjectURL(url);
      };
      
    } catch (error) {
      console.error('PDF export error:', error);
      alert('Error generating PDF. Please try again or use a different format.');
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
      <div className="advanced-actions" style={{ 
        margin: '24px 0', 
        padding: '16px', 
        background: '#f7fafc', 
        borderRadius: '12px',
        display: 'flex',
        gap: '12px',
        flexWrap: 'wrap'
      }}>
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
      <div className="search-and-filters" style={{ marginBottom: '24px' }}>
        {/* Search Input */}
        <div className="search-container" style={{ 
          position: 'relative', 
          marginBottom: '16px',
          maxWidth: '400px'
        }}>
          <div className="search-input-wrapper" style={{ position: 'relative' }}>
            <Search 
              size={20} 
              style={{ 
                position: 'absolute', 
                left: '12px', 
                top: '50%', 
                transform: 'translateY(-50%)',
                color: '#718096',
                pointerEvents: 'none'
              }} 
            />
            <input
              type="text"
              placeholder="Search by slot, product name, SKU..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="form-input"
              style={{ 
                paddingLeft: '40px',
                paddingRight: searchTerm ? '40px' : '12px'
              }}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={clearSearch}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#718096',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'color 0.2s ease'
                }}
                onMouseEnter={(e) => e.target.style.color = '#4a5568'}
                onMouseLeave={(e) => e.target.style.color = '#718096'}
                title="Clear search"
              >
                <X size={16} />
              </button>
            )}
          </div>
          {searchTerm && (
            <div className="search-info" style={{ 
              fontSize: '12px', 
              color: '#718096', 
              marginTop: '4px',
              paddingLeft: '40px'
            }}>
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
              className="btn btn-secondary" 
              onClick={clearSearch}
              style={{ marginTop: '16px' }}
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

      {/* Bulk Update Modal */}
      {showBulkUpdateModal && (
        <Modal
          title="Bulk Refill Inventory"
          onClose={() => setShowBulkUpdateModal(false)}
          size="large"
        >
          <div className="bulk-update-content">
            <p style={{ marginBottom: '20px', color: '#718096' }}>
              Update quantities for multiple slots at once. Only changed values will be updated.
            </p>
            
            <div className="bulk-update-list" style={{ 
              maxHeight: '400px', 
              overflowY: 'auto',
              border: '1px solid #e2e8f0',
              borderRadius: '8px'
            }}>
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
                            className="form-input"
                            min="0"
                            max={item?.maxCapacity || 20}
                            style={{ width: '80px' }}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="bulk-actions" style={{ 
              display: 'flex', 
              gap: '12px', 
              justifyContent: 'space-between',
              marginTop: '20px',
              paddingTop: '20px',
              borderTop: '1px solid #e2e8f0'
            }}>
              <div style={{ display: 'flex', gap: '12px' }}>
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
              
              <div style={{ display: 'flex', gap: '12px' }}>
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
                      <div className="spinner small" style={{ 
                        width: '16px', 
                        height: '16px', 
                        border: '2px solid rgba(255,255,255,0.3)', 
                        borderTop: '2px solid white',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                        marginRight: '8px'
                      }}></div>
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
            <div className="export-info" style={{ 
              background: '#f7fafc', 
              padding: '16px', 
              borderRadius: '8px', 
              marginBottom: '24px' 
            }}>
              <h4 style={{ margin: '0 0 8px 0', color: '#2d3748' }}>Export Summary</h4>
              <p style={{ margin: '0', color: '#4a5568', fontSize: '14px' }}>
                Exporting <strong>{filteredItems.length} items</strong> from 
                <strong> {filter.charAt(0).toUpperCase() + filter.slice(1)}</strong> filter
                {searchTerm && <span> matching "<strong>{searchTerm}</strong>"</span>}
              </p>
            </div>

            {/* File Format Selection */}
            <div className="form-group">
              <label className="form-label">Export Format</label>
              <div className="format-options" style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(3, 1fr)', 
                gap: '12px' 
              }}>
                <label className={`format-option ${exportFormat === 'csv' ? 'active' : ''}`} style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  padding: '16px',
                  border: `2px solid ${exportFormat === 'csv' ? '#667eea' : '#e2e8f0'}`,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  background: exportFormat === 'csv' ? '#f7fafc' : 'white'
                }}>
                  <input
                    type="radio"
                    name="exportFormat"
                    value="csv"
                    checked={exportFormat === 'csv'}
                    onChange={(e) => setExportFormat(e.target.value)}
                    style={{ display: 'none' }}
                  />
                  <FileText size={24} color={exportFormat === 'csv' ? '#667eea' : '#718096'} />
                  <span style={{ marginTop: '8px', fontWeight: '500', fontSize: '14px' }}>CSV</span>
                  <span style={{ fontSize: '12px', color: '#718096', textAlign: 'center' }}>
                    Excel, Sheets
                  </span>
                </label>

                <label className={`format-option ${exportFormat === 'excel' ? 'active' : ''}`} style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  padding: '16px',
                  border: `2px solid ${exportFormat === 'excel' ? '#667eea' : '#e2e8f0'}`,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  background: exportFormat === 'excel' ? '#f7fafc' : 'white'
                }}>
                  <input
                    type="radio"
                    name="exportFormat"
                    value="excel"
                    checked={exportFormat === 'excel'}
                    onChange={(e) => setExportFormat(e.target.value)}
                    style={{ display: 'none' }}
                  />
                  <FileSpreadsheet size={24} color={exportFormat === 'excel' ? '#667eea' : '#718096'} />
                  <span style={{ marginTop: '8px', fontWeight: '500', fontSize: '14px' }}>Excel</span>
                  <span style={{ fontSize: '12px', color: '#718096', textAlign: 'center' }}>
                    .xlsx format
                  </span>
                </label>

                <label className={`format-option ${exportFormat === 'pdf' ? 'active' : ''}`} style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  padding: '16px',
                  border: `2px solid ${exportFormat === 'pdf' ? '#667eea' : '#e2e8f0'}`,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  background: exportFormat === 'pdf' ? '#f7fafc' : 'white'
                }}>
                  <input
                    type="radio"
                    name="exportFormat"
                    value="pdf"
                    checked={exportFormat === 'pdf'}
                    onChange={(e) => setExportFormat(e.target.value)}
                    style={{ display: 'none' }}
                  />
                  <FileImage size={24} color={exportFormat === 'pdf' ? '#667eea' : '#718096'} />
                  <span style={{ marginTop: '8px', fontWeight: '500', fontSize: '14px' }}>PDF</span>
                  <span style={{ fontSize: '12px', color: '#718096', textAlign: 'center' }}>
                    Print-ready
                  </span>
                </label>
              </div>
            </div>

            {/* Export Options */}
            <div className="form-group">
              <label className="form-label">Export Options</label>
              <div className="export-options" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={exportOptions.includeDeletedProducts}
                    onChange={(e) => setExportOptions(prev => ({ 
                      ...prev, 
                      includeDeletedProducts: e.target.checked 
                    }))}
                  />
                  <span className="checkmark"></span>
                  Include deleted/old products
                </label>

                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={exportOptions.groupByCategory}
                    onChange={(e) => setExportOptions(prev => ({ 
                      ...prev, 
                      groupByCategory: e.target.checked 
                    }))}
                  />
                  <span className="checkmark"></span>
                  Group by product category
                </label>

                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={exportOptions.includeImages}
                    onChange={(e) => setExportOptions(prev => ({ 
                      ...prev, 
                      includeImages: e.target.checked 
                    }))}
                  />
                  <span className="checkmark"></span>
                  Include product image URLs
                </label>
              </div>
            </div>

            {/* Preview */}
            <div className="export-preview" style={{
              background: '#f7fafc',
              padding: '16px',
              borderRadius: '8px',
              marginTop: '20px'
            }}>
              <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#2d3748' }}>
                Export Preview
              </h4>
              <div style={{ fontSize: '12px', color: '#718096' }}>
                <p>• <strong>Format:</strong> {exportFormat.toUpperCase()}</p>
                <p>• <strong>Items:</strong> {filteredItems.length} inventory items</p>
                <p>• <strong>Columns:</strong> Slot, Product, Stock, Value, Status, Timestamps</p>
                {exportOptions.groupByCategory && <p>• <strong>Grouped by:</strong> Product categories</p>}
                {exportOptions.includeImages && <p>• <strong>Includes:</strong> Product image URLs</p>}
                {!exportOptions.includeDeletedProducts && <p>• <strong>Excludes:</strong> Deleted products</p>}
              </div>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowExportModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={performExport}
                disabled={filteredItems.length === 0}
              >
                <Download size={16} />
                Export {exportFormat.toUpperCase()}
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