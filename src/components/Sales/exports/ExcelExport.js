import * as XLSX from 'xlsx';

/**
 * Excel Export Component
 * Generates and exports data as Excel files with advanced formatting and multiple sheets
 */
class ExcelExport {
  /**
   * Export sales data as Excel with comprehensive formatting and options support
   * @param {Object} config - Export configuration
   * @param {Array} config.salesData - Array of sales transactions
   * @param {Object} config.stats - Sales statistics object
   * @param {Object} config.dateRange - Date range object with startDate and endDate
   * @param {Function} config.formatCurrency - Currency formatting function
   * @param {Function} config.getProductName - Function to get product name by ID
   * @param {string} config.filename - Optional custom filename
   * @param {Array} config.productData - Optional product performance data
   * @param {Object} config.options - Export options from modal
   */
  static exportSalesExcel({
    salesData = [],
    stats = {},
    dateRange = {},
    formatCurrency,
    getProductName,
    filename = null,
    productData = [],
    options = {}
  }) {
    if (!salesData || salesData.length === 0) {
      alert('No sales data to export for the selected date range.');
      return;
    }

    if (!formatCurrency || !getProductName) {
      console.error('formatCurrency and getProductName functions are required');
      return;
    }

    const defaultFilename = this.generateFilename('Sales-Report', dateRange);
    const finalFilename = filename || defaultFilename;

    // Create workbook
    const wb = XLSX.utils.book_new();

    // Create sales transactions sheet with options
    this.createSalesSheet(wb, salesData, stats, dateRange, formatCurrency, getProductName, options);

    // Create product performance sheet if data available
    if (productData && productData.length > 0) {
      this.createProductPerformanceSheet(wb, productData, dateRange, formatCurrency);
    }

    // Create summary sheet
    this.createSummarySheet(wb, salesData, stats, dateRange, formatCurrency, productData, options);

    // Write and download file
    XLSX.writeFile(wb, finalFilename);
    console.log(`Excel file exported successfully: ${finalFilename}`);
  }

  /**
   * Create sales transactions sheet with customizable options
   */
  static createSalesSheet(wb, salesData, stats, dateRange, formatCurrency, getProductName, options = {}) {
    // Build headers based on options
    const headers = this.buildHeaders(options);

    // Process sales data based on options
    let processedData = [...salesData];
    
    if (options.groupByProduct) {
      processedData = this.groupSalesByProduct(processedData, getProductName);
    } else if (options.groupByDate) {
      processedData = this.groupSalesByDate(processedData);
    }

    // Prepare data rows
    const dataRows = processedData.map(sale => {
      const saleDate = new Date(sale.timestamp?.seconds * 1000);
      
      const baseRow = [
        sale.id || '',
        saleDate.toLocaleDateString('en-NZ'),
        saleDate.toLocaleTimeString('en-NZ', { hour: '2-digit', minute: '2-digit' }),
        getProductName(sale.productId),
        sale.slot || '',
        sale.price || 0
      ];

      let row = [...baseRow];

      if (options.includeProductDetails) {
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

    // Add summary rows if requested
    let summaryRows = [];
    if (options.includeSummaryStats) {
      summaryRows = [
        [], // Empty row
        ['=== TRANSACTION SUMMARY ==='],
        ['Total Revenue (NZD):', stats.totalRevenue || 0],
        ['Average Transaction (NZD):', stats.averageTransaction || 0],
        ['Top Product:', stats.topProduct?.name || 'No Data'],
        ['Date Range:', `${dateRange.startDate || 'N/A'} to ${dateRange.endDate || 'N/A'}`],
        ['Export Date:', new Date().toLocaleDateString('en-NZ')],
        ['Export Time:', new Date().toLocaleTimeString('en-NZ')],
        [],
        ['=== PAYMENT METHOD ANALYSIS ==='],
        ['Cash Payments:', this.countPaymentMethod(salesData, 'cash')],
        ['Card Payments:', this.countPaymentMethod(salesData, 'card')],
        ['Other Payments:', this.countPaymentMethod(salesData, 'other')],
        [],
        ['=== TIME ANALYSIS ==='],
        ['Busiest Hour:', this.getBusiestHour(salesData)],
        ['Busiest Day:', this.getBusiestDay(salesData)],
        ['Weekend Sales:', this.getWeekendSales(salesData)],
        ['Weekday Sales:', this.getWeekdaySales(salesData)]
      ];
    }

    // Combine all data
    const sheetData = [headers, ...dataRows, ...summaryRows];
    const ws = XLSX.utils.aoa_to_sheet(sheetData);

    // Apply formatting
    this.formatSalesSheet(ws, headers.length, dataRows.length, summaryRows.length, options);

    // Add to workbook
    const sheetName = options.groupByProduct ? 'Sales by Product' : 
                     options.groupByDate ? 'Sales by Date' : 'Sales Transactions';
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
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
   * Group sales by product for Excel export
   */
  static groupSalesByProduct(salesData, getProductName) {
    const grouped = {};
    
    salesData.forEach(sale => {
      const productName = getProductName(sale.productId);
      if (!grouped[productName]) {
        grouped[productName] = {
          id: `grouped-${sale.productId}`,
          productId: sale.productId,
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

    // Convert to array format
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
   * Group sales by date for Excel export
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

    // Convert to array format
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
   * Format sales sheet with styles and column widths
   */
  static formatSalesSheet(ws, headerCount, dataRowCount, summaryRowCount, options = {}) {
    // Define styles
    const headerStyle = {
      font: { bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "667EEA" } },
      alignment: { horizontal: "center", vertical: "center" },
      border: this.getBorderStyle()
    };

    const dataStyle = {
      alignment: { horizontal: "center", vertical: "center" },
      border: this.getBorderStyle('thin')
    };

    const currencyStyle = {
      ...dataStyle,
      numFmt: '$#,##0.00'
    };

    const summaryHeaderStyle = {
      font: { bold: true, color: { rgb: "2D3748" } },
      fill: { fgColor: { rgb: "F7FAFC" } },
      alignment: { horizontal: "left", vertical: "center" }
    };

    const summaryValueStyle = {
      font: { bold: true },
      alignment: { horizontal: "left", vertical: "center" }
    };

    // Set column widths based on headers
    const baseWidths = [15, 12, 10, 30, 8, 15]; // Base column widths
    let colWidths = [...baseWidths];

    if (options.includeProductDetails) {
      colWidths.push(15, 15, 15); // Product ID, Category, SKU
    }
    if (options.includePaymentMethods) {
      colWidths.push(15); // Payment Method
    }
    if (options.includeTimestamps) {
      colWidths.push(12, 8, 15); // Day of Week, Hour, Timestamp
    }

    ws['!cols'] = colWidths.map(wch => ({ wch }));

    // Apply header styles
    for (let c = 0; c < headerCount; c++) {
      const cellAddress = XLSX.utils.encode_cell({ c, r: 0 });
      if (ws[cellAddress]) {
        ws[cellAddress].s = headerStyle;
      }
    }

    // Apply data styles
    for (let r = 1; r <= dataRowCount; r++) {
      for (let c = 0; c < headerCount; c++) {
        const cellAddress = XLSX.utils.encode_cell({ c, r });
        if (ws[cellAddress]) {
          // Apply currency formatting to price column (always index 5 in base structure)
          if (c === 5) {
            ws[cellAddress].s = currencyStyle;
            ws[cellAddress].t = 'n';
          } else {
            ws[cellAddress].s = dataStyle;
          }
        }
      }
    }

    // Apply summary styles if included
    if (options.includeSummaryStats && summaryRowCount > 0) {
      const summaryStartRow = dataRowCount + 2;
      for (let r = summaryStartRow; r < summaryStartRow + summaryRowCount; r++) {
        const labelCellAddress = XLSX.utils.encode_cell({ c: 0, r });
        const valueCellAddress = XLSX.utils.encode_cell({ c: 1, r });
        const labelCell = ws[labelCellAddress];
        const valueCell = ws[valueCellAddress];

        if (labelCell) {
          if (labelCell.v && String(labelCell.v).includes('===')) {
            labelCell.s = summaryHeaderStyle;
          } else {
            labelCell.s = { font: { bold: true } };
          }
        }

        if (valueCell) {
          valueCell.s = summaryValueStyle;
          const label = labelCell?.v;

          if (label === 'Total Revenue (NZD):' || label === 'Average Transaction (NZD):') {
            valueCell.t = 'n';
            valueCell.z = '$#,##0.00';
          } else if (label && (label.includes('Payments:') || label.includes('Sales:'))) {
            valueCell.t = 'n';
            valueCell.z = '0';
          }
        }
      }
    }

    // Set print area and page setup
    ws['!printHeader'] = [0, 0];
    ws['!margins'] = { left: 0.7, right: 0.7, top: 0.75, bottom: 0.75, header: 0.3, footer: 0.3 };
  }

  /**
   * Create product performance sheet
   */
  static createProductPerformanceSheet(wb, productData, dateRange, formatCurrency) {
    // Calculate totals for percentages
    const totalSales = productData.reduce((sum, product) => sum + product.count, 0);
    const totalRevenue = productData.reduce((sum, product) => sum + product.revenue, 0);

    // Prepare headers
    const headers = [
      'Rank',
      'Product ID',
      'Product Name',
      'Sales Count',
      'Sales %',
      'Total Revenue (NZD)',
      'Revenue %',
      'Avg Price (NZD)',
      'Performance Score'
    ];

    // Prepare data rows
    const dataRows = productData.map((product, index) => {
      const avgPrice = product.count > 0 ? product.revenue / product.count : 0;
      const salesPercentage = totalSales > 0 ? (product.count / totalSales * 100) : 0;
      const revenuePercentage = totalRevenue > 0 ? (product.revenue / totalRevenue * 100) : 0;
      const performanceScore = (salesPercentage + revenuePercentage) / 2;

      return [
        index + 1,
        product.productId || '',
        product.productName,
        product.count,
        salesPercentage,
        product.revenue,
        revenuePercentage,
        avgPrice,
        performanceScore
      ];
    });

    // Add summary
    const summaryRows = [
      [],
      ['=== PRODUCT PERFORMANCE SUMMARY ==='],
      ['Total Products Analyzed:', productData.length],
      ['Total Sales Transactions:', totalSales],
      ['Total Revenue (NZD):', totalRevenue],
      ['Average Revenue per Product:', productData.length > 0 ? totalRevenue / productData.length : 0],
      ['Top Performer (Sales):', productData[0]?.productName || 'N/A'],
      ['Date Range:', `${dateRange.startDate || 'N/A'} to ${dateRange.endDate || 'N/A'}`]
    ];

    const sheetData = [headers, ...dataRows, ...summaryRows];
    const ws = XLSX.utils.aoa_to_sheet(sheetData);

    // Apply formatting
    this.formatProductSheet(ws, headers.length, dataRows.length, summaryRows.length);

    XLSX.utils.book_append_sheet(wb, ws, 'Product Performance');
  }

  /**
   * Format product performance sheet with styles and column widths
   */
  static formatProductSheet(ws, headerCount, dataRowCount, summaryRowCount) {
    const headerStyle = {
      font: { bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "38A169" } },
      alignment: { horizontal: "center", vertical: "center" },
      border: this.getBorderStyle()
    };

    // Set column widths
    ws['!cols'] = [
      { wch: 8 },  // Rank
      { wch: 15 }, // Product ID
      { wch: 30 }, // Product Name
      { wch: 12 }, // Sales Count
      { wch: 10 }, // Sales %
      { wch: 18 }, // Revenue
      { wch: 12 }, // Revenue %
      { wch: 15 }, // Avg Price
      { wch: 15 }  // Performance Score
    ];

    // Apply header styles
    for (let c = 0; c < headerCount; c++) {
      const cellAddress = XLSX.utils.encode_cell({ c, r: 0 });
      if (ws[cellAddress]) {
        ws[cellAddress].s = headerStyle;
      }
    }

    // Apply data formatting
    for (let r = 1; r <= dataRowCount; r++) {
      for (let c = 0; c < headerCount; c++) {
        const cellAddress = XLSX.utils.encode_cell({ c, r });
        if (ws[cellAddress]) {
          let style = {
            alignment: { horizontal: "center", vertical: "center" },
            border: this.getBorderStyle('thin')
          };

          // Format specific columns
          if (c === 4 || c === 6 || c === 8) { // Percentage columns
            style.numFmt = '0.0%';
            ws[cellAddress].v = ws[cellAddress].v / 100;
          } else if (c === 5 || c === 7) { // Currency columns
            style.numFmt = '$#,##0.00';
          } else if (c === 3) { // Sales count column
            style.numFmt = '0';
          }

          ws[cellAddress].s = style;
        }
      }
    }

    // Format summary section
    const summaryStartRow = dataRowCount + 2;
    for (let r = summaryStartRow; r < summaryStartRow + summaryRowCount; r++) {
      const labelCell = XLSX.utils.encode_cell({ c: 0, r });
      const valueCell = XLSX.utils.encode_cell({ c: 1, r });

      if (ws[labelCell]) {
        if (ws[labelCell].v && String(ws[labelCell].v).includes('===')) {
          ws[labelCell].s = { font: { bold: true, color: { rgb: "2D3748" } } };
        } else {
          ws[labelCell].s = { font: { bold: true } };
        }
      }

      if (ws[valueCell]) {
        ws[valueCell].s = { font: { bold: true } };
        if (ws[labelCell] && ws[labelCell].v) {
          const label = ws[labelCell].v;
          if (label.includes('Revenue')) {
            ws[valueCell].t = 'n';
            ws[valueCell].z = '$#,##0.00';
          } else if (label.includes('Total Products') || label.includes('Total Sales')) {
            ws[valueCell].t = 'n';
            ws[valueCell].z = '0';
          }
        }
      }
    }
  }

  /**
   * Create summary dashboard sheet
   */
  static createSummarySheet(wb, salesData, stats, dateRange, formatCurrency, productData, options = {}) {
    const currentDate = new Date();
    
    // Create dashboard-style summary
    const summaryData = [
      ['SALES ANALYTICS DASHBOARD'],
      [],
      ['Report Period:', `${dateRange.startDate || 'N/A'} to ${dateRange.endDate || 'N/A'}`],
      ['Generated:', currentDate.toLocaleDateString('en-NZ') + ' at ' + currentDate.toLocaleTimeString('en-NZ')],
      [],
      ['=== KEY METRICS ==='],
      ['Total Sales Transactions', stats.totalSales || 0],
      ['Total Revenue', stats.totalRevenue || 0],
      ['Average Transaction Value', stats.averageTransaction || 0],
      ['Top Selling Product', stats.topProduct?.name || 'No Data'],
      [],
      ['=== EXPORT CONFIGURATION ==='],
      ['Product Details Included', options.includeProductDetails ? 'Yes' : 'No'],
      ['Timestamps Included', options.includeTimestamps ? 'Yes' : 'No'],
      ['Payment Methods Included', options.includePaymentMethods ? 'Yes' : 'No'],
      ['Summary Statistics Included', options.includeSummaryStats ? 'Yes' : 'No'],
      ['Data Grouping', options.groupByProduct ? 'By Product' : options.groupByDate ? 'By Date' : 'None'],
      [],
      ['=== TRANSACTION BREAKDOWN ==='],
      ['Cash Payments', this.countPaymentMethod(salesData, 'cash')],
      ['Card Payments', this.countPaymentMethod(salesData, 'card')],
      ['Other Payments', this.countPaymentMethod(salesData, 'other')],
      [],
      ['=== TIME ANALYSIS ==='],
      ['Busiest Hour', this.getBusiestHour(salesData)],
      ['Busiest Day', this.getBusiestDay(salesData)],
      ['Weekend Sales', this.getWeekendSales(salesData)],
      ['Weekday Sales', this.getWeekdaySales(salesData)],
      []
    ];

    // Add product insights if available
    if (productData && productData.length > 0) {
      summaryData.push(
        ['=== PRODUCT INSIGHTS ==='],
        ['Total Products Sold', productData.length],
        ['Best Performer', productData[0]?.productName || 'N/A'],
        ['Worst Performer', productData[productData.length - 1]?.productName || 'N/A'],
        ['Products with 0 Sales', this.countZeroSalesProducts(productData)],
        []
      );
    }

    // Add recommendations
    summaryData.push(
      ['=== RECOMMENDATIONS ==='],
      ['Stock Management', this.getStockRecommendation(productData)],
      ['Revenue Optimization', this.getRevenueRecommendation(stats)],
      ['Customer Experience', this.getCustomerRecommendation(salesData)]
    );

    const ws = XLSX.utils.aoa_to_sheet(summaryData);
    
    // Format summary sheet
    this.formatSummarySheet(ws, summaryData.length);
    
    XLSX.utils.book_append_sheet(wb, ws, 'Executive Summary');
  }

  /**
   * Format summary sheet with dashboard styling
   */
  static formatSummarySheet(ws, rowCount) {
    const titleStyle = {
      font: { bold: true, size: 16, color: { rgb: "1A202C" } },
      fill: { fgColor: { rgb: "667EEA" } },
      alignment: { horizontal: "center", vertical: "center" }
    };

    const sectionHeaderStyle = {
      font: { bold: true, color: { rgb: "2D3748" } },
      fill: { fgColor: { rgb: "E2E8F0" } },
      alignment: { horizontal: "left", vertical: "center" }
    };

    const metricLabelStyle = {
      font: { bold: true },
      alignment: { horizontal: "left", vertical: "center" }
    };

    const metricValueStyle = {
      font: { bold: true, color: { rgb: "38A169" } },
      alignment: { horizontal: "left", vertical: "center" }
    };

    // Set column widths
    ws['!cols'] = [{ wch: 35 }, { wch: 30 }];

    // Apply styles
    for (let r = 0; r < rowCount; r++) {
      const cellA = XLSX.utils.encode_cell({ c: 0, r });
      const cellB = XLSX.utils.encode_cell({ c: 1, r });

      if (ws[cellA]) {
        if (r === 0) { // Title
          ws[cellA].s = titleStyle;
        } else if (ws[cellA].v && String(ws[cellA].v).includes('===')) {
          ws[cellA].s = sectionHeaderStyle;
        } else if (ws[cellB]) { // Metric rows
          ws[cellA].s = metricLabelStyle;
          ws[cellB].s = metricValueStyle;
          
          const label = ws[cellA].v;
          if (label && typeof label === 'string') {
            if (label.includes('Total Revenue') || label.includes('Average Transaction Value')) {
              ws[cellB].t = 'n';
              ws[cellB].z = '$#,##0.00';
            } else if (label.includes('Total Sales Transactions') || 
                       label.includes('Total Products') || 
                       label.includes('Payments') || 
                       label.includes('Weekend Sales') || 
                       label.includes('Weekday Sales')) {
              ws[cellB].t = 'n';
              ws[cellB].z = '0';
            }
          }
        }
      }
    }

    // Merge title cell
    ws['!merges'] = [{ s: { c: 0, r: 0 }, e: { c: 1, r: 0 } }];
  }

  /**
   * Export inventory data as Excel
   */
  static exportInventoryExcel({
    inventoryData = [],
    filename = null
  }) {
    if (!inventoryData || inventoryData.length === 0) {
      alert('No inventory data to export.');
      return;
    }

    const defaultFilename = this.generateFilename('Inventory-Report');
    const finalFilename = filename || defaultFilename;

    const wb = XLSX.utils.book_new();

    // Create inventory sheet
    this.createInventorySheet(wb, inventoryData);

    XLSX.writeFile(wb, finalFilename);
  }

  /**
   * Create inventory sheet
   */
  static createInventorySheet(wb, inventoryData) {
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
      'Stock Value',
      'Stock Level'
    ];

    const dataRows = inventoryData.map(item => [
      item.id || '',
      item.name || '',
      item.sku || '',
      item.category || '',
      item.stock || 0,
      item.price || 0,
      item.status || 'active',
      item.lastUpdated ? new Date(item.lastUpdated.seconds * 1000).toLocaleDateString('en-NZ') : '',
      item.supplier || '',
      (item.stock || 0) * (item.price || 0),
      this.getStockLevel(item.stock || 0)
    ]);

    const sheetData = [headers, ...dataRows];
    const ws = XLSX.utils.aoa_to_sheet(sheetData);

    // Format inventory sheet
    this.formatInventorySheet(ws, headers.length, dataRows.length);

    XLSX.utils.book_append_sheet(wb, ws, 'Inventory');
  }

  /**
   * Format inventory sheet
   */
  static formatInventorySheet(ws, headerCount, dataRowCount) {
    // Set column widths
    ws['!cols'] = [
      { wch: 12 }, { wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 12 },
      { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 20 }, { wch: 15 }, { wch: 12 }
    ];

    // Apply conditional formatting for stock levels
    for (let r = 1; r <= dataRowCount; r++) {
      const stockCell = XLSX.utils.encode_cell({ c: 4, r });
      const levelCell = XLSX.utils.encode_cell({ c: 10, r });
      
      if (ws[stockCell] && ws[levelCell]) {
        const stockValue = ws[stockCell].v;
        let fillColor = "FFFFFF";
        
        if (stockValue <= 5) {
          fillColor = "FED7D7";
        } else if (stockValue <= 20) {
          fillColor = "FEEBC8";
        } else {
          fillColor = "C6F6D5";
        }
        
        ws[stockCell].s = {
          fill: { fgColor: { rgb: fillColor } },
          alignment: { horizontal: "center" },
          border: this.getBorderStyle('thin')
        };
      }
    }
  }

  // Helper methods
  static generateFilename(type, dateRange = {}) {
    const timestamp = new Date().toISOString().split('T')[0];
    
    if (dateRange.startDate && dateRange.endDate) {
      return `${type}-${dateRange.startDate}-to-${dateRange.endDate}.xlsx`;
    }
    
    return `${type}-${timestamp}.xlsx`;
  }

  static getBorderStyle(weight = 'medium') {
    return {
      top: { style: weight, color: { rgb: "E2E8F0" } },
      bottom: { style: weight, color: { rgb: "E2E8F0" } },
      left: { style: weight, color: { rgb: "E2E8F0" } },
      right: { style: weight, color: { rgb: "E2E8F0" } }
    };
  }

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

  static countZeroSalesProducts(productData) {
    if (!productData) return 0;
    return productData.filter(product => product.count === 0).length;
  }

  static getStockLevel(stock) {
    if (stock <= 5) return 'Critical';
    if (stock <= 20) return 'Low';
    if (stock <= 50) return 'Medium';
    return 'Good';
  }

  static getStockRecommendation(productData) {
    if (!productData || productData.length === 0) return 'No product data available';
    
    const lowPerformers = productData.filter(p => p.count < 5).length;
    const percentage = (lowPerformers / productData.length * 100).toFixed(1);
    
    return `${percentage}% of products have low sales - consider restocking top performers`;
  }

  static getRevenueRecommendation(stats) {
    if (!stats?.averageTransaction) return 'Insufficient data for analysis';
    
    if (stats.averageTransaction < 2) {
      return 'Consider promoting higher-value items to increase average transaction';
    } else if (stats.averageTransaction > 5) {
      return 'Strong average transaction value - maintain current product mix';
    }
    
    return 'Average transaction value is healthy - monitor trends';
  }

  static getCustomerRecommendation(salesData) {
    const cashPayments = this.countPaymentMethod(salesData, 'cash');
    const cardPayments = this.countPaymentMethod(salesData, 'card');
    const total = cashPayments + cardPayments;
    
    if (total === 0) return 'No payment data available';
    
    const cashPercentage = (cashPayments / total * 100).toFixed(1);
    
    if (cashPercentage > 70) {
      return 'High cash usage - ensure adequate change availability';
    } else if (cashPercentage < 30) {
      return 'Strong card adoption - consider contactless payment options';
    }
    
    return 'Balanced payment method usage';
  }
}

export default ExcelExport;