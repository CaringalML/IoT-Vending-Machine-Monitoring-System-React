import { exportToCSV, getCSVPreview } from './CSV_Export';
import { exportToExcel, getExcelPreview } from './Excel_Export';
import { exportToPDF, getPDFPreview, generatePDFPreviewHTML } from './PDF_Export';

/**
 * Main export utility class that coordinates all export formats
 */
export class ExportManager {
  constructor(inventory, products, stats) {
    this.inventory = inventory;
    this.products = products;
    this.stats = stats;
  }

  /**
   * Transform raw inventory data for export
   */
  transformInventoryData(filteredItems, searchTerm = '', filter = 'all') {
    return filteredItems.map(item => {
      const isDeleted = this.isDeletedProduct(item);
      const product = this.getProductInfo(item.productId, item);
      
      return {
        ...item,
        isDeleted,
        product,
        stockPercentage: isDeleted ? 0 : this.getStockPercentage(item.quantity, item.maxCapacity || 20),
        statusLabel: isDeleted ? 'Deleted Product' : this.getStockStatusLabel(item.quantity, item.maxCapacity || 20),
        lastRefilledFormatted: this.formatDate(item.lastRefilled),
        deletedAtFormatted: this.formatDate(item.deletedAt)
      };
    });
  }

  /**
   * Helper function to check if item is deleted product
   */
  isDeletedProduct(item) {
    return !item.productId && item.deletedProductName;
  }

  /**
   * Helper function to get product info
   */
  getProductInfo(productId, inventoryItem = null) {
    if (inventoryItem && this.isDeletedProduct(inventoryItem)) {
      return {
        name: inventoryItem.deletedProductName || 'Deleted Product',
        price: 0,
        sku: inventoryItem.deletedProductSKU || null,
        category: 'Deleted Products',
        active: false
      };
    }
    
    return this.products.find(p => p.id === productId) || { 
      name: 'Unknown Product', 
      price: 0,
      category: 'Unknown',
      active: false
    };
  }

  /**
   * Helper function to get stock percentage
   */
  getStockPercentage(quantity, maxCapacity) {
    if (maxCapacity === 0) return 0;
    return Math.round((quantity / maxCapacity) * 100);
  }

  /**
   * Helper function to get stock status label
   */
  getStockStatusLabel(quantity, maxCapacity) {
    if (quantity === 0) return 'Out of Stock';
    
    const percentage = this.getStockPercentage(quantity, maxCapacity);
    
    if (percentage <= 25) return `Low Stock (${percentage}%)`;
    if (percentage <= 50) return `Medium Stock (${percentage}%)`;
    return `Good Stock (${percentage}%)`;
  }

  /**
   * Helper function to format dates
   */
  formatDate(timestamp) {
    if (!timestamp) return null;
    
    const date = new Date(timestamp.seconds * 1000);
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
  }

  /**
   * Generate filename with a detailed date and time stamp.
   */
  generateFilename(format, filter = 'all', searchTerm = '') {
    // Generates a clean timestamp string like '2025-06-14T22-05-30'
    const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
    const filterSuffix = filter !== 'all' ? `-${filter}` : '';
    const searchSuffix = searchTerm ? '-search' : '';
    
    return `inventory${filterSuffix}${searchSuffix}-${timestamp}.${format}`;
  }

  /**
   * Export data in specified format
   */
  async exportData(format, filteredItems, options = {}, metadata = {}) {
    const { filter = 'all', searchTerm = '' } = metadata;
    
    // Transform data for export
    const transformedData = this.transformInventoryData(filteredItems, searchTerm, filter);
    
    // Generate filename
    const filename = this.generateFilename(format, filter, searchTerm); //
    
    // Add metadata to options
    const exportOptions = {
      ...options,
      filter: filter.charAt(0).toUpperCase() + filter.slice(1),
      searchTerm,
      title: `Inventory Report${filter !== 'all' ? ` - ${filter.charAt(0).toUpperCase() + filter.slice(1)}` : ''}`
    };

    try {
      switch (format.toLowerCase()) {
        case 'csv':
          return await exportToCSV(transformedData, exportOptions, filename); //
          
        case 'excel':
        case 'xlsx':
          return await exportToExcel(transformedData, exportOptions, filename); //
          
        case 'pdf':
          return await exportToPDF(transformedData, exportOptions, this.stats, filename); //
          
        default:
          throw new Error(`Unsupported export format: ${format}`);
      }
    } catch (error) {
      console.error(`Export error (${format}):`, error);
      return {
        success: false,
        error: `Failed to export ${format.toUpperCase()}: ${error.message}`
      };
    }
  }

  /**
   * Get preview information for export
   */
  getExportPreview(format, filteredItems, options = {}) {
    const transformedData = this.transformInventoryData(filteredItems);
    
    switch (format.toLowerCase()) {
      case 'csv':
        return getCSVPreview(transformedData, options); //
        
      case 'excel':
      case 'xlsx':
        return getExcelPreview(transformedData, options); //
        
      case 'pdf':
        return getPDFPreview(transformedData, options, this.stats); //
        
      default:
        return {
          format: format.toUpperCase(),
          itemCount: transformedData.length,
          error: `Unsupported format: ${format}`
        };
    }
  }

  /**
   * Get all available export formats
   */
  getAvailableFormats() {
    return [
      {
        id: 'csv',
        name: 'CSV',
        description: 'Excel, Sheets compatible',
        icon: 'FileText',
        features: ['Lightweight', 'Universal compatibility', 'Easy to import']
      },
      {
        id: 'excel',
        name: 'Excel',
        description: '.xlsx format',
        icon: 'FileSpreadsheet',
        features: ['Rich formatting', 'Multiple worksheets', 'Advanced styling']
      },
      {
        id: 'pdf',
        name: 'PDF',
        description: 'Print-ready report',
        icon: 'FileImage',
        features: ['Professional layout', 'Print optimized', 'Summary statistics']
      }
    ];
  }

  /**
   * Validate export options
   */
  validateExportOptions(format, options) {
    const errors = [];
    
    // Common validations
    if (typeof options.includeDeletedProducts !== 'boolean') {
      options.includeDeletedProducts = true;
    }
    
    if (typeof options.groupByCategory !== 'boolean') {
      options.groupByCategory = false;
    }
    
    if (typeof options.includeImages !== 'boolean') {
      options.includeImages = false;
    }

    // Format-specific validations
    switch (format.toLowerCase()) {
      case 'excel':
      case 'xlsx':
        if (typeof options.includeSummary !== 'boolean') {
          options.includeSummary = true;
        }
        break;
        
      case 'pdf':
        if (typeof options.includeSummary !== 'boolean') {
          options.includeSummary = true;
        }
        if (!options.title || typeof options.title !== 'string') {
          options.title = 'Inventory Report';
        }
        break;
        
      case 'csv':
      default:
        // CSV format doesn't need additional validations
        // Default case handles any other formats gracefully
        break;
    }

    return { isValid: errors.length === 0, errors, options };
  }
}

/**
 * Utility functions for direct use
 */

/**
 * Create export manager instance
 */
export const createExportManager = (inventory, products, stats) => {
  return new ExportManager(inventory, products, stats);
};

/**
 * Quick export function
 */
export const quickExport = async (format, inventory, products, stats, filteredItems, options = {}, metadata = {}) => {
  const manager = new ExportManager(inventory, products, stats);
  return await manager.exportData(format, filteredItems, options, metadata);
};

/**
 * Get export preview
 */
export const getQuickPreview = (format, inventory, products, stats, filteredItems, options = {}) => {
  const manager = new ExportManager(inventory, products, stats);
  return manager.getExportPreview(format, filteredItems, options);
};

/**
 * Generate PDF preview HTML for modal display
 */
export const generatePreviewHTML = (inventory, products, stats, filteredItems, options = {}) => {
  const manager = new ExportManager(inventory, products, stats);
  const transformedData = manager.transformInventoryData(filteredItems);
  return generatePDFPreviewHTML(transformedData, options, stats); //
};

export default ExportManager;