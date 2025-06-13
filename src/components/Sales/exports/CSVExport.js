/**
 * CSV Export Component
 * Generates and exports data as CSV files with proper formatting and error handling
 */
class CSVExport {
  /**
   * Export sales data as CSV with enhanced options support
   * @param {Object} config - Export configuration
   * @param {Array} config.salesData - Array of sales transactions
   * @param {Object} config.dateRange - Date range object with startDate and endDate
   * @param {Function} config.getProductName - Function to get product name by ID
   * @param {string} config.filename - Optional custom filename
   * @param {Object} config.stats - Optional sales statistics to include
   * @param {Object} config.options - Export options from modal
   */
  static exportSalesCSV({
    salesData = [],
    dateRange = {},
    getProductName,
    filename = null,
    stats = null,
    options = {}
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

    // Build headers based on options
    const headers = this.buildHeaders(options);

    // Generate data rows based on options
    const dataRows = this.buildDataRows(salesData, getProductName, options);

    // Add summary section if requested
    let summaryRows = [];
    if (options.includeSummaryStats && stats) {
      summaryRows = this.buildSummaryRows(stats, salesData, dateRange);
    }

    // Combine all data
    const csvData = [headers, ...dataRows, ...summaryRows];
    
    // Generate and download CSV
    this.downloadCSV(csvData, finalFilename);
  }

  /**
   * Build headers based on export options
   */
  static buildHeaders(options = {}) {
    const baseHeaders = [
      'Transaction ID',
      'Date',
      'Time',
      'Product Name',
      'Slot',
      'Price (NZD)'
    ];

    let headers = [...baseHeaders];

    if (options.includeProductDetails) {
      headers.push('Product ID', 'Category', 'SKU');
    }

    if (options.includePaymentMethods) {
      headers.push('Payment Method');
    }

    if (options.includeTimestamps) {
      headers.push('Day of Week', 'Hour', 'Unix Timestamp');
    }

    return headers;
  }

  /**
   * Build data rows based on export options
   */
  static buildDataRows(salesData, getProductName, options = {}) {
    let processedData = [...salesData];

    // Apply grouping if requested
    if (options.groupByProduct) {
      processedData = this.groupSalesByProduct(processedData, getProductName);
    } else if (options.groupByDate) {
      processedData = this.groupSalesByDate(processedData);
    }

    return processedData.map(sale => {
      const saleDate = new Date(sale.timestamp?.seconds * 1000);
      
      const baseRow = [
        sale.id || '',
        saleDate.toLocaleDateString('en-NZ'),
        saleDate.toLocaleTimeString('en-NZ'),
        this.escapeCSVField(getProductName(sale.productId)),
        sale.slot || '',
        sale.price || 0
      ];

      let row = [...baseRow];

      if (options.includeProductDetails) {
        // For grouped data, these might not be applicable
        row.push(
          sale.productId || '',
          sale.category || 'Unknown',
          sale.sku || ''
        );
      }

      if (options.includePaymentMethods) {
        row.push(sale.paymentMethod || 'cash');
      }

      if (options.includeTimestamps) {
        row.push(
          saleDate.toLocaleDateString('en-US', { weekday: 'long' }),
          saleDate.getHours(),
          sale.timestamp?.seconds || ''
        );
      }

      return row;
    });
  }

  /**
   * Build summary rows for statistics
   */
  static buildSummaryRows(stats, salesData, dateRange) {
    return [
      [], // Empty row for separation
      ['=== SALES SUMMARY ==='],
      ['Total Transactions', salesData.length],
      ['Total Revenue (NZD)', stats.totalRevenue || 0],
      ['Average Transaction (NZD)', stats.averageTransaction || 0],
      ['Top Product', stats.topProduct?.name || 'No Data'],
      ['Date Range', `${dateRange.startDate || 'N/A'} to ${dateRange.endDate || 'N/A'}`],
      ['Export Date', new Date().toLocaleDateString('en-NZ')],
      ['Export Time', new Date().toLocaleTimeString('en-NZ')],
      [],
      ['=== PAYMENT METHOD BREAKDOWN ==='],
      ['Cash Payments', this.countPaymentMethod(salesData, 'cash')],
      ['Card Payments', this.countPaymentMethod(salesData, 'card')],
      ['Other Payments', this.countPaymentMethod(salesData, 'other')],
      [],
      ['=== TIME ANALYSIS ==='],
      ['Busiest Hour', this.getBusiestHour(salesData)],
      ['Busiest Day', this.getBusiestDay(salesData)],
      ['Weekend Sales', this.getWeekendSales(salesData)],
      ['Weekday Sales', this.getWeekdaySales(salesData)]
    ];
  }

  /**
   * Group sales by product
   */
  static groupSalesByProduct(salesData, getProductName) {
    const grouped = {};
    
    salesData.forEach(sale => {
      const productName = getProductName(sale.productId);
      if (!grouped[productName]) {
        grouped[productName] = {
          id: `grouped-${sale.productId}`,
          productId: sale.productId,
          productName,
          count: 0,
          totalRevenue: 0,
          slots: new Set(),
          paymentMethods: new Set(),
          firstSale: sale.timestamp,
          lastSale: sale.timestamp
        };
      }
      
      grouped[productName].count += 1;
      grouped[productName].totalRevenue += sale.price || 0;
      grouped[productName].slots.add(sale.slot);
      grouped[productName].paymentMethods.add(sale.paymentMethod || 'cash');
      
      if (sale.timestamp?.seconds > grouped[productName].lastSale?.seconds) {
        grouped[productName].lastSale = sale.timestamp;
      }
    });

    // Convert to array format for CSV
    return Object.values(grouped).map(group => ({
      id: group.id,
      timestamp: group.lastSale,
      productId: group.productId,
      slot: Array.from(group.slots).join(', '),
      price: group.totalRevenue,
      paymentMethod: Array.from(group.paymentMethods).join(', '),
      count: group.count,
      category: 'Grouped Data',
      sku: `${group.count} transactions`
    }));
  }

  /**
   * Group sales by date
   */
  static groupSalesByDate(salesData) {
    const grouped = {};
    
    salesData.forEach(sale => {
      const date = new Date(sale.timestamp?.seconds * 1000).toISOString().split('T')[0];
      if (!grouped[date]) {
        grouped[date] = {
          id: `date-${date}`,
          date,
          count: 0,
          totalRevenue: 0,
          products: new Set(),
          slots: new Set(),
          timestamp: sale.timestamp
        };
      }
      
      grouped[date].count += 1;
      grouped[date].totalRevenue += sale.price || 0;
      grouped[date].products.add(sale.productId);
      grouped[date].slots.add(sale.slot);
    });

    // Convert to array format for CSV
    return Object.values(grouped).map(group => ({
      id: group.id,
      timestamp: group.timestamp,
      productId: `${group.products.size} unique products`,
      slot: Array.from(group.slots).join(', '),
      price: group.totalRevenue,
      paymentMethod: `${group.count} transactions`,
      count: group.count,
      category: 'Daily Summary',
      sku: group.date
    }));
  }

  /**
   * Export product performance data as CSV
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
      ['Total Products', productData.length],
      ['Total Sales Transactions', totalSales],
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

  // Helper methods for analysis
  static countPaymentMethod(salesData, method) {
    return salesData.filter(sale => (sale.paymentMethod || 'cash') === method).length;
  }

  static getBusiestHour(salesData) {
    if (!salesData || salesData.length === 0) return 'N/A';
    const hourCounts = {};
    salesData.forEach(sale => {
      const hour = new Date(sale.timestamp?.seconds * 1000).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });
    
    if (Object.keys(hourCounts).length === 0) return 'N/A';
    
    const busiestHour = Object.keys(hourCounts).reduce((a, b) => 
      hourCounts[a] > hourCounts[b] ? a : b
    );
    
    return `${busiestHour}:00 (${hourCounts[busiestHour]} sales)`;
  }

  static getBusiestDay(salesData) {
    if (!salesData || salesData.length === 0) return 'N/A';
    const dayCounts = {};
    salesData.forEach(sale => {
      const day = new Date(sale.timestamp?.seconds * 1000).toLocaleDateString('en-US', { weekday: 'long' });
      dayCounts[day] = (dayCounts[day] || 0) + 1;
    });

    if (Object.keys(dayCounts).length === 0) return 'N/A';
    
    const busiestDay = Object.keys(dayCounts).reduce((a, b) => 
      dayCounts[a] > dayCounts[b] ? a : b
    );
    
    return `${busiestDay} (${dayCounts[busiestDay]} sales)`;
  }

  static getWeekendSales(salesData) {
    return salesData.filter(sale => {
      const day = new Date(sale.timestamp?.seconds * 1000).getDay();
      return day === 0 || day === 6; // Sunday or Saturday
    }).length;
  }

  static getWeekdaySales(salesData) {
    return salesData.filter(sale => {
      const day = new Date(sale.timestamp?.seconds * 1000).getDay();
      return day >= 1 && day <= 5; // Monday to Friday
    }).length;
  }

  /**
   * Generate a filename based on type and date range
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
   */
  static arrayToCSV(data) {
    return data.map(row => 
      row.map(field => this.escapeCSVField(field)).join(',')
    ).join('\n');
  }

  /**
   * Download CSV data as a file
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
   * Get CSV export statistics
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