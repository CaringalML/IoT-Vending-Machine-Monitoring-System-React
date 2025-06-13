import { downloadCSV } from '../../../utils/helpers';

/**
 * CSV Export functionality for inventory data
 */
export class CSVExport {
  constructor(data, options = {}) {
    this.data = data;
    this.options = {
      includeImages: false,
      includeDeletedProducts: true,
      groupByCategory: false,
      ...options
    };
  }

  /**
   * Transform inventory data for CSV export
   */
  transformData() {
    let exportData = [...this.data];

    // Filter out deleted products if not included
    if (!this.options.includeDeletedProducts) {
      exportData = exportData.filter(item => !item.isDeleted);
    }

    // Group by category if requested
    if (this.options.groupByCategory) {
      exportData.sort((a, b) => {
        const categoryA = a.product?.category || 'Other';
        const categoryB = b.product?.category || 'Other';
        return categoryA.localeCompare(categoryB);
      });
    }

    // Transform data for CSV
    return exportData.map((item, index) => {
      const baseData = {
        '#': index + 1,
        'Slot': item.slot,
        'Product Name': item.product?.name || 'Unknown Product',
        'Category': item.product?.category || 'Other',
        'SKU': item.product?.sku || 'N/A',
        'Current Stock': item.quantity,
        'Max Capacity': item.maxCapacity || 20,
        'Stock %': item.isDeleted ? 'N/A' : `${item.stockPercentage}%`,
        'Status': item.statusLabel,
        'Unit Price': item.product?.price ? `$${item.product.price.toFixed(2)}` : '$0.00',
        'Total Value': `$${(item.quantity * (item.product?.price || 0)).toFixed(2)}`,
        'Low Stock Threshold': item.lowStockThreshold || 5,
        'Last Refilled': item.lastRefilledFormatted || 'Never',
        'Product Active': item.isDeleted ? 'No' : (item.product?.active ? 'Yes' : 'No'),
      };

      // Add optional fields
      if (this.options.includeImages && item.product?.image) {
        baseData['Image URL'] = item.product.image;
      }

      if (item.isDeleted && item.deletedAtFormatted) {
        baseData['Deleted Date'] = item.deletedAtFormatted;
      }

      return baseData;
    });
  }

  /**
   * Export data as CSV
   */
  export(filename) {
    try {
      const exportData = this.transformData();
      
      if (exportData.length === 0) {
        throw new Error('No data to export');
      }

      downloadCSV(exportData, filename);
      return { success: true, message: 'CSV exported successfully' };
    } catch (error) {
      console.error('CSV export error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get preview data for the export
   */
  getPreview() {
    const transformedData = this.transformData();
    return {
      format: 'CSV',
      itemCount: transformedData.length,
      columns: transformedData.length > 0 ? Object.keys(transformedData[0]) : [],
      sampleData: transformedData.slice(0, 3),
      features: [
        'Universal spreadsheet compatibility',
        'Lightweight file format',
        'Easy to import and manipulate',
        'Compatible with Excel, Google Sheets',
        'Plain text format for maximum portability'
      ]
    };
  }

  /**
   * Validate CSV export options
   */
  validateOptions() {
    const errors = [];
    
    // Validate data
    if (!this.data || !Array.isArray(this.data)) {
      errors.push('Invalid data provided for CSV export');
    }
    
    if (this.data.length === 0) {
      errors.push('No data available for export');
    }
    
    // Validate options
    if (typeof this.options.includeDeletedProducts !== 'boolean') {
      this.options.includeDeletedProducts = true;
    }
    
    if (typeof this.options.groupByCategory !== 'boolean') {
      this.options.groupByCategory = false;
    }
    
    if (typeof this.options.includeImages !== 'boolean') {
      this.options.includeImages = false;
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      options: this.options
    };
  }

  /**
   * Get export statistics
   */
  getExportStats() {
    const transformedData = this.transformData();
    const activeItems = transformedData.filter(item => !item.isDeleted);
    const deletedItems = transformedData.filter(item => item.isDeleted);
    
    // Calculate category distribution
    const categoryStats = {};
    transformedData.forEach(item => {
      const category = item.product?.category || 'Other';
      categoryStats[category] = (categoryStats[category] || 0) + 1;
    });
    
    // Calculate stock statistics
    const stockStats = {
      totalItems: transformedData.length,
      activeItems: activeItems.length,
      deletedItems: deletedItems.length,
      outOfStock: activeItems.filter(item => item.quantity === 0).length,
      lowStock: activeItems.filter(item => {
        const percentage = parseInt(item['Stock %']) || 0;
        return percentage > 0 && percentage <= 25;
      }).length,
      categories: Object.keys(categoryStats).length,
      categoryDistribution: categoryStats
    };
    
    return stockStats;
  }

  /**
   * Generate CSV content preview (first few rows as string)
   */
  generatePreviewContent() {
    const transformedData = this.transformData();
    
    if (transformedData.length === 0) {
      return 'No data available for preview';
    }
    
    const headers = Object.keys(transformedData[0]);
    const previewRows = transformedData.slice(0, 3);
    
    // Create CSV header row
    let csvContent = headers.map(header => `"${header}"`).join(',') + '\n';
    
    // Add preview data rows
    previewRows.forEach(row => {
      const csvRow = headers.map(header => {
        const value = row[header] || '';
        // Escape quotes and wrap in quotes if necessary
        const escapedValue = String(value).replace(/"/g, '""');
        return `"${escapedValue}"`;
      }).join(',');
      csvContent += csvRow + '\n';
    });
    
    // Add indication if there are more rows
    if (transformedData.length > 3) {
      csvContent += `... and ${transformedData.length - 3} more rows\n`;
    }
    
    return csvContent;
  }

  /**
   * Get detailed column information
   */
  getColumnInfo() {
    const transformedData = this.transformData();
    
    if (transformedData.length === 0) {
      return [];
    }
    
    const headers = Object.keys(transformedData[0]);
    
    return headers.map(header => {
      // Analyze column data
      const values = transformedData.map(row => row[header]).filter(val => val !== null && val !== undefined);
      const uniqueValues = [...new Set(values)];
      const hasNumbers = values.some(val => !isNaN(parseFloat(val)));
      const hasText = values.some(val => isNaN(parseFloat(val)));
      
      let dataType = 'Mixed';
      if (hasNumbers && !hasText) {
        dataType = 'Numeric';
      } else if (!hasNumbers && hasText) {
        dataType = 'Text';
      }
      
      return {
        name: header,
        dataType,
        sampleValues: uniqueValues.slice(0, 3),
        totalValues: values.length,
        uniqueValues: uniqueValues.length,
        description: this.getColumnDescription(header)
      };
    });
  }

  /**
   * Get description for specific columns
   */
  getColumnDescription(columnName) {
    const descriptions = {
      '#': 'Sequential row number for easy reference',
      'Slot': 'Physical slot identifier in the vending machine',
      'Product Name': 'Name of the product in this slot',
      'Category': 'Product category for organization',
      'SKU': 'Stock Keeping Unit identifier',
      'Current Stock': 'Number of items currently in the slot',
      'Max Capacity': 'Maximum number of items the slot can hold',
      'Stock %': 'Current stock as percentage of maximum capacity',
      'Status': 'Current stock status (Good, Low, Out of Stock)',
      'Unit Price': 'Price per individual item',
      'Total Value': 'Total monetary value of items in slot',
      'Low Stock Threshold': 'Quantity threshold for low stock alerts',
      'Last Refilled': 'Date and time of last stock refill',
      'Product Active': 'Whether the product is currently active',
      'Image URL': 'URL to product image (if included)',
      'Deleted Date': 'Date when product was deleted (for old products)'
    };
    
    return descriptions[columnName] || 'Data field from inventory system';
  }
}

/**
 * Utility function to create and export CSV
 */
export const exportToCSV = (data, options = {}, filename = 'inventory.csv') => {
  const csvExporter = new CSVExport(data, options);
  return csvExporter.export(filename);
};

/**
 * Get CSV export preview
 */
export const getCSVPreview = (data, options = {}) => {
  const csvExporter = new CSVExport(data, options);
  return csvExporter.getPreview();
};

/**
 * Get detailed CSV export information
 */
export const getCSVExportInfo = (data, options = {}) => {
  const csvExporter = new CSVExport(data, options);
  
  return {
    preview: csvExporter.getPreview(),
    stats: csvExporter.getExportStats(),
    columns: csvExporter.getColumnInfo(),
    previewContent: csvExporter.generatePreviewContent(),
    validation: csvExporter.validateOptions()
  };
};

/**
 * Export CSV with validation
 */
export const exportCSVWithValidation = (data, options = {}, filename = 'inventory.csv') => {
  const csvExporter = new CSVExport(data, options);
  
  // Validate before export
  const validation = csvExporter.validateOptions();
  
  if (!validation.isValid) {
    return {
      success: false,
      error: `Validation failed: ${validation.errors.join(', ')}`
    };
  }
  
  return csvExporter.export(filename);
};