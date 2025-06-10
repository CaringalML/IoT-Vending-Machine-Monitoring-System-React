/**
 * CSV Export Component
 * Generates and exports data as CSV files with proper formatting and error handling
 */
class CSVExport {
  /**
   * Export sales data as CSV
   * @param {Object} options - Export configuration
   * @param {Array} options.salesData - Array of sales transactions
   * @param {Object} options.dateRange - Date range object with startDate and endDate
   * @param {Function} options.getProductName - Function to get product name by ID
   * @param {string} options.filename - Optional custom filename
   * @param {Object} options.stats - Optional sales statistics to include
   */
  static exportSalesCSV({
    salesData = [],
    dateRange = {},
    getProductName,
    filename = null,
    stats = null
  }) {
    if (!salesData || salesData.length === 0) {
      alert('No sales data to export for the selected date range.');
      return;
    }

    if (!getProductName) {
      console.error('getProductName function is required');
      return;
    }

    // Generate filename if not provided
    const defaultFilename = this.generateFilename('sales-report', dateRange);
    const finalFilename = filename || defaultFilename;

    // Define headers
    const headers = [
      'Transaction ID',
      'Date',
      'Time',
      'Product Name',
      'Product ID',
      'Slot',
      'Price (NZD)',
      'Payment Method',
      'Timestamp'
    ];

    // Generate data rows
    const dataRows = salesData.map(sale => {
      const saleDate = new Date(sale.timestamp?.seconds * 1000);
      return [
        sale.id || '',
        saleDate.toLocaleDateString('en-NZ'),
        saleDate.toLocaleTimeString('en-NZ'),
        this.escapeCSVField(getProductName(sale.productId)),
        sale.productId || '',
        sale.slot || '',
        sale.price || 0,
        sale.paymentMethod || 'cash',
        sale.timestamp?.seconds || ''
      ];
    });

    // Add summary section if stats provided
    let summaryRows = [];
    if (stats) {
      summaryRows = [
        [], // Empty row for separation
        ['=== SUMMARY ==='],
        ['Total Transactions', `=${salesData.length}`], // Force Excel to treat as number formula
        ['Total Revenue (NZD)', stats.totalRevenue || 0],
        ['Average Transaction (NZD)', stats.averageTransaction || 0],
        ['Top Product', stats.topProduct?.name || 'No Data'],
        ['Date Range', `${dateRange.startDate || 'N/A'} to ${dateRange.endDate || 'N/A'}`],
        ['Export Date', new Date().toLocaleDateString('en-NZ')],
        ['Export Time', new Date().toLocaleTimeString('en-NZ')]
      ];
    }

    // Combine all data
    const csvData = [headers, ...dataRows, ...summaryRows];
    
    // Generate and download CSV
    this.downloadCSV(csvData, finalFilename);
  }

  /**
   * Export product performance data as CSV
   * @param {Object} options - Export configuration
   * @param {Array} options.productData - Array of product performance data
   * @param {Object} options.dateRange - Date range object
   * @param {Function} options.formatCurrency - Currency formatting function
   * @param {string} options.filename - Optional custom filename
   */
  static exportProductPerformanceCSV({
    productData = [],
    dateRange = {},
    formatCurrency,
    filename = null
  }) {
    if (!productData || productData.length === 0) {
      alert('No product data to export.');
      return;
    }

    if (!formatCurrency) {
      console.error('formatCurrency function is required');
      return;
    }

    const defaultFilename = this.generateFilename('product-performance', dateRange);
    const finalFilename = filename || defaultFilename;

    // Define headers
    const headers = [
      'Rank',
      'Product ID',
      'Product Name',
      'Sales Count',
      'Total Revenue (NZD)',
      'Revenue (Raw)',
      'Average Price (NZD)',
      'Average Price (Raw)',
      'Market Share (%)'
    ];

    // Calculate totals for market share
    const totalSales = productData.reduce((sum, product) => sum + product.count, 0);
    const totalRevenue = productData.reduce((sum, product) => sum + product.revenue, 0);

    // Generate data rows
    const dataRows = productData.map((product, index) => {
      const avgPrice = product.revenue / product.count;
      const marketShareBySales = totalSales > 0 ? (product.count / totalSales * 100) : 0;
      const marketShareByRevenue = totalRevenue > 0 ? (product.revenue / totalRevenue * 100) : 0;

      return [
        index + 1,
        product.productId || '',
        this.escapeCSVField(product.productName),
        product.count,
        formatCurrency(product.revenue),
        product.revenue,
        formatCurrency(avgPrice),
        avgPrice.toFixed(2),
        `${marketShareBySales.toFixed(1)} (sales) / ${marketShareByRevenue.toFixed(1)} (revenue)`
      ];
    });

    // Add summary section
    const summaryRows = [
      [], // Empty row for separation
      ['=== SUMMARY ==='],
      ['Total Products', `=${productData.length}`],
      ['Total Sales Transactions', `=${totalSales}`],
      ['Total Revenue (NZD)', formatCurrency(totalRevenue)],
      ['Total Revenue (Raw)', totalRevenue],
      ['Date Range', `${dateRange.startDate || 'N/A'} to ${dateRange.endDate || 'N/A'}`],
      ['Export Date', new Date().toLocaleDateString('en-NZ')],
      ['Export Time', new Date().toLocaleTimeString('en-NZ')]
    ];

    // Combine all data
    const csvData = [headers, ...dataRows, ...summaryRows];
    
    // Generate and download CSV
    this.downloadCSV(csvData, finalFilename);
  }

  /**
   * Export inventory data as CSV
   * @param {Object} options - Export configuration
   * @param {Array} options.inventoryData - Array of inventory items
   * @param {string} options.filename - Optional custom filename
   */
  static exportInventoryCSV({
    inventoryData = [],
    filename = null
  }) {
    if (!inventoryData || inventoryData.length === 0) {
      alert('No inventory data to export.');
      return;
    }

    const defaultFilename = this.generateFilename('inventory-report');
    const finalFilename = filename || defaultFilename;

    // Define headers
    const headers = [
      'Product ID',
      'Product Name',
      'SKU',
      'Category',
      'Current Stock',
      'Price (NZD)',
      'Status',
      'Last Updated',
      'Supplier',
      'Description'
    ];

    // Generate data rows
    const dataRows = inventoryData.map(item => [
      item.id || '',
      this.escapeCSVField(item.name),
      item.sku || '',
      item.category || '',
      item.stock || 0,
      item.price || 0,
      item.status || 'active',
      item.lastUpdated ? new Date(item.lastUpdated.seconds * 1000).toLocaleDateString('en-NZ') : '',
      this.escapeCSVField(item.supplier || ''),
      this.escapeCSVField(item.description || '')
    ]);

    // Add summary section
    const totalItems = inventoryData.length;
    const totalStock = inventoryData.reduce((sum, item) => sum + (item.stock || 0), 0);
    const lowStockItems = inventoryData.filter(item => (item.stock || 0) < 10).length;

    const summaryRows = [
      [], // Empty row for separation
      ['=== INVENTORY SUMMARY ==='],
      ['Total Products', totalItems],
      ['Total Stock Units', totalStock],
      ['Low Stock Items (< 10)', lowStockItems],
      ['Export Date', new Date().toLocaleDateString('en-NZ')],
      ['Export Time', new Date().toLocaleTimeString('en-NZ')]
    ];

    // Combine all data
    const csvData = [headers, ...dataRows, ...summaryRows];
    
    // Generate and download CSV
    this.downloadCSV(csvData, finalFilename);
  }

  /**
   * Export custom data as CSV with flexible structure
   * @param {Object} options - Export configuration
   * @param {Array} options.headers - Array of column headers
   * @param {Array} options.data - Array of data rows
   * @param {string} options.filename - Filename for the export
   * @param {Object} options.metadata - Optional metadata to include
   */
  static exportCustomCSV({
    headers = [],
    data = [],
    filename = 'export',
    metadata = null
  }) {
    if (!headers || headers.length === 0) {
      console.error('Headers are required for CSV export');
      return;
    }

    if (!data || data.length === 0) {
      alert('No data to export.');
      return;
    }

    // Ensure filename has .csv extension
    const finalFilename = filename.endsWith('.csv') ? filename : `${filename}.csv`;

    // Escape data fields
    const escapedData = data.map(row => 
      row.map(field => this.escapeCSVField(field))
    );

    // Add metadata if provided
    let metadataRows = [];
    if (metadata) {
      metadataRows = [
        [], // Empty row for separation
        ['=== METADATA ==='],
        ...Object.entries(metadata).map(([key, value]) => [key, value]),
        ['Export Date', new Date().toLocaleDateString('en-NZ')],
        ['Export Time', new Date().toLocaleTimeString('en-NZ')]
      ];
    }

    // Combine all data
    const csvData = [headers, ...escapedData, ...metadataRows];
    
    // Generate and download CSV
    this.downloadCSV(csvData, finalFilename);
  }

  /**
   * Generate a filename based on type and date range
   * @param {string} type - Type of export (e.g., 'sales-report', 'inventory')
   * @param {Object} dateRange - Optional date range object
   * @returns {string} Generated filename
   */
  static generateFilename(type, dateRange = {}) {
    const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    
    if (dateRange.startDate && dateRange.endDate) {
      return `${type}-${dateRange.startDate}-to-${dateRange.endDate}.csv`;
    }
    
    return `${type}-${timestamp}.csv`;
  }

  /**
   * Escape CSV fields to handle commas, quotes, and newlines
   * @param {any} field - Field value to escape
   * @returns {string} Escaped field value
   */
  static escapeCSVField(field) {
    if (field == null) return '';
    
    const stringField = String(field);
    
    // If field contains comma, quote, or newline, wrap in quotes and escape internal quotes
    if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n') || stringField.includes('\r')) {
      return `"${stringField.replace(/"/g, '""')}"`;
    }
    
    return stringField;
  }

  /**
   * Convert 2D array to CSV string
   * @param {Array} data - 2D array of data
   * @returns {string} CSV formatted string
   */
  static arrayToCSV(data) {
    return data.map(row => 
      row.map(field => this.escapeCSVField(field)).join(',')
    ).join('\n');
  }

  /**
   * Download CSV data as a file
   * @param {Array} data - 2D array of CSV data
   * @param {string} filename - Name of the file to download
   */
  static downloadCSV(data, filename) {
    try {
      const csvContent = this.arrayToCSV(data);
      
      // Create blob with UTF-8 BOM for proper Excel compatibility
      const BOM = '\uFEFF';
      const blob = new Blob([BOM + csvContent], { 
        type: 'text/csv;charset=utf-8;' 
      });
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      console.log(`CSV exported successfully: ${filename}`);
    } catch (error) {
      console.error('Error exporting CSV:', error);
      alert('Error exporting CSV file. Please try again.');
    }
  }

  /**
   * Validate CSV export parameters
   * @param {Object} options - Export options to validate
   * @returns {Object} Validation result with isValid and errors
   */
  static validateExportOptions(options) {
    const errors = [];
    
    if (!options) {
      errors.push('Export options are required');
      return { isValid: false, errors };
    }

    if (!options.data || !Array.isArray(options.data) || options.data.length === 0) {
      errors.push('Data array is required and must not be empty');
    }

    if (options.headers && (!Array.isArray(options.headers) || options.headers.length === 0)) {
      errors.push('Headers must be a non-empty array if provided');
    }

    if (options.filename && typeof options.filename !== 'string') {
      errors.push('Filename must be a string if provided');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Get CSV export statistics
   * @param {Array} data - Data array to analyze
   * @returns {Object} Statistics about the data
   */
  static getExportStats(data) {
    if (!data || !Array.isArray(data)) {
      return { rows: 0, columns: 0, size: 0 };
    }

    const rows = data.length;
    const columns = rows > 0 ? Math.max(...data.map(row => row.length)) : 0;
    const csvString = this.arrayToCSV(data);
    const size = new Blob([csvString]).size;

    return {
      rows,
      columns,
      size: `${(size / 1024).toFixed(2)} KB`,
      sizeBytes: size
    };
  }
}

export default CSVExport;