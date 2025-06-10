import * as XLSX from 'xlsx';

/**
 * Excel Export Component
 * Generates and exports data as Excel files with advanced formatting and multiple sheets
 */
class ExcelExport {
  /**
   * Export sales data as Excel with comprehensive formatting
   * @param {Object} options - Export configuration
   * @param {Array} options.salesData - Array of sales transactions
   * @param {Object} options.stats - Sales statistics object
   * @param {Object} options.dateRange - Date range object with startDate and endDate
   * @param {Function} options.formatCurrency - Currency formatting function
   * @param {Function} options.getProductName - Function to get product name by ID
   * @param {string} options.filename - Optional custom filename
   * @param {Array} options.productData - Optional product performance data
   */
  static exportSalesExcel({
    salesData = [],
    stats = {},
    dateRange = {},
    formatCurrency,
    getProductName,
    filename = null,
    productData = []
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

    // Create sales transactions sheet
    this.createSalesSheet(wb, salesData, stats, dateRange, formatCurrency, getProductName);

    // Create product performance sheet if data available
    if (productData && productData.length > 0) {
      this.createProductPerformanceSheet(wb, productData, dateRange, formatCurrency);
    }

    // Create summary sheet
    this.createSummarySheet(wb, salesData, stats, dateRange, formatCurrency, productData);

    // Write and download file
    XLSX.writeFile(wb, finalFilename);
    console.log(`Excel file exported successfully: ${finalFilename}`);
  }

  /**
   * Create sales transactions sheet
   */
  static createSalesSheet(wb, salesData, stats, dateRange, formatCurrency, getProductName) {
    // Prepare headers
    const headers = [
      'Transaction ID',
      'Date',
      'Time',
      'Product Name',
      'Product ID',
      'Slot',
      'Price (NZD)',
      'Payment Method',
      'Day of Week',
      'Hour',
      'Timestamp'
    ];

    // Prepare data rows
    const dataRows = salesData.map(sale => {
      const saleDate = new Date(sale.timestamp?.seconds * 1000);
      return [
        sale.id || '',
        saleDate.toLocaleDateString('en-NZ'),
        saleDate.toLocaleTimeString('en-NZ', { hour: '2-digit', minute: '2-digit' }),
        getProductName(sale.productId),
        sale.productId || '',
        sale.slot || '',
        sale.price || 0,
        sale.paymentMethod || 'cash',
        saleDate.toLocaleDateString('en-US', { weekday: 'long' }),
        saleDate.getHours(),
        sale.timestamp?.seconds || ''
      ];
    });

    // Add summary rows (Total Transactions removed)
    const summaryRows = [
      [], // Empty row
      ['=== TRANSACTION SUMMARY ==='],
      ['Total Revenue (NZD):', stats.totalRevenue || 0],
      ['Average Transaction (NZD):', stats.averageTransaction || 0],
      ['Top Product:', stats.topProduct?.name || 'No Data'],
      ['Date Range:', `${dateRange.startDate || 'N/A'} to ${dateRange.endDate || 'N/A'}`],
      ['Export Date:', new Date().toLocaleDateString('en-NZ')],
      ['Export Time:', new Date().toLocaleTimeString('en-NZ')]
    ];

    // Combine all data
    const sheetData = [headers, ...dataRows, ...summaryRows];
    const ws = XLSX.utils.aoa_to_sheet(sheetData);

    // Apply formatting
    this.formatSalesSheet(ws, headers.length, dataRows.length, summaryRows.length);

    // Add to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Sales Transactions');
  }

  /**
   * Format sales sheet with styles and column widths
   */
  static formatSalesSheet(ws, headerCount, dataRowCount, summaryRowCount) {
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

    // Set column widths
    ws['!cols'] = [
      { wch: 15 }, // Transaction ID
      { wch: 12 }, // Date
      { wch: 10 }, // Time
      { wch: 30 }, // Product Name
      { wch: 15 }, // Product ID
      { wch: 8 },  // Slot
      { wch: 15 }, // Price
      { wch: 15 }, // Payment Method
      { wch: 12 }, // Day of Week
      { wch: 8 },  // Hour
      { wch: 15 }  // Timestamp
    ];

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
          // Apply currency formatting to price column (index 6)
          if (c === 6) {
            ws[cellAddress].s = currencyStyle;
            ws[cellAddress].t = 'n';
          } else {
            ws[cellAddress].s = dataStyle;
          }
        }
      }
    }

    // Apply summary styles with corrected formatting logic
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
        // Start with a base style for the value cell
        valueCell.s = summaryValueStyle;
        const label = labelCell?.v; // Get the label string from the cell to the left

        // Apply specific number formatting based on the exact label
        if (label === 'Total Revenue (NZD):' || label === 'Average Transaction (NZD):') {
            valueCell.t = 'n'; // Set type to number
            valueCell.z = '$#,##0.00'; // Set format to currency
        }
        // Remove any potential "Total Transactions" formatting
        if (label === 'Total Transactions:') {
            // This shouldn't exist anymore, but just in case
            valueCell.v = '';
            valueCell.t = 's';
        }
      }
    }

    // Set print area and page setup
    ws['!printHeader'] = [0, 0]; // Repeat header row
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
      const performanceScore = (salesPercentage + revenuePercentage) / 2; // Combined metric

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
            ws[cellAddress].v = ws[cellAddress].v / 100; // Convert to decimal for percentage format
          } else if (c === 5 || c === 7) { // Currency columns
            style.numFmt = '$#,##0.00';
          } else if (c === 3) { // Sales count column - plain number
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
        // Format specific values in product performance summary
        if (ws[labelCell] && ws[labelCell].v) {
            const label = ws[labelCell].v;
            if (label.includes('Revenue')) {
                ws[valueCell].t = 'n';
                ws[valueCell].z = '$#,##0.00';
            } else if (label.includes('Total Products') || label.includes('Total Sales')) {
                ws[valueCell].t = 'n';
                ws[valueCell].z = '0'; // Plain number format for counts (NO CURRENCY)
            }
        }
      }
    }
  }

  /**
   * Create summary dashboard sheet
   */
  static createSummarySheet(wb, salesData, stats, dateRange, formatCurrency, productData) {
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
    ws['!cols'] = [{ wch: 30 }, { wch: 25 }];

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
            // Apply currency formatting to relevant fields
            if (label.includes('Total Revenue') || label.includes('Average Transaction Value')) {
              ws[cellB].t = 'n';
              ws[cellB].z = '$#,##0.00';
            } 
            // Apply plain number formatting to transaction and count fields (NO CURRENCY)
            else if (label.includes('Total Sales Transactions') || 
                       label.includes('Total Products') || 
                       label.includes('Payments') || 
                       label.includes('Weekend Sales') || 
                       label.includes('Weekday Sales')) {
              ws[cellB].t = 'n';
              ws[cellB].z = '0'; // Plain number format (NO CURRENCY SIGN)
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
      (item.stock || 0) * (item.price || 0), // Stock value
      this.getStockLevel(item.stock || 0) // Stock level indicator
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
      const stockCell = XLSX.utils.encode_cell({ c: 4, r }); // Stock column
      const levelCell = XLSX.utils.encode_cell({ c: 10, r }); // Stock level column
      
      if (ws[stockCell] && ws[levelCell]) {
        const stockValue = ws[stockCell].v;
        let fillColor = "FFFFFF"; // Default white
        
        if (stockValue <= 5) {
          fillColor = "FED7D7"; // Light red for low stock
        } else if (stockValue <= 20) {
          fillColor = "FEEBC8"; // Light orange for medium stock
        } else {
          fillColor = "C6F6D5"; // Light green for good stock
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