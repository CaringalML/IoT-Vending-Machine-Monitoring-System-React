/**
 * PDF Export Component
 * Generates and exports sales data as a PDF using browser print functionality
 */
class PDFExport {
  /**
   * Export sales data as PDF with enhanced options support
   * @param {Object} config - Export configuration
   * @param {Array} config.salesData - Array of sales transactions
   * @param {Object} config.stats - Sales statistics object
   * @param {Object} config.dateRange - Date range object with startDate and endDate
   * @param {Function} config.formatCurrency - Currency formatting function
   * @param {Function} config.getProductName - Function to get product name by ID
   * @param {string} config.title - Optional custom title for the report
   * @param {Object} config.options - Export options from modal
   */
  static exportSalesPDF({
    salesData = [],
    stats = {},
    dateRange = {},
    formatCurrency,
    getProductName,
    title = 'Sales Report',
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

    const currentDate = new Date().toLocaleDateString('en-NZ');
    const startDateFormatted = dateRange.startDate ? new Date(dateRange.startDate).toLocaleDateString('en-NZ') : 'N/A';
    const endDateFormatted = dateRange.endDate ? new Date(dateRange.endDate).toLocaleDateString('en-NZ') : 'N/A';

    // Process data based on options
    let processedData = [...salesData];
    if (options.groupByProduct) {
      processedData = this.groupSalesByProduct(processedData, getProductName);
    } else if (options.groupByDate) {
      processedData = this.groupSalesByDate(processedData);
    }

    const printWindow = window.open('', '_blank');
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title} - ${startDateFormatted} to ${endDateFormatted}</title>
          <style>
            ${this.getStyles()}
          </style>
        </head>
        <body>
          ${this.generateHTML({
            title,
            startDateFormatted,
            endDateFormatted,
            currentDate,
            stats,
            salesData: processedData,
            formatCurrency,
            getProductName,
            options
          })}
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    
    // Wait for content to load, then trigger print dialog
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
      // Close the window after printing (user can cancel)
      setTimeout(() => {
        printWindow.close();
      }, 100);
    }, 500);
  }

  /**
   * Group sales by product for PDF export
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

    // Convert to array format for PDF
    return Object.values(grouped).map(group => ({
      id: group.id,
      timestamp: group.lastSale,
      productId: group.productId,
      slot: Array.from(group.slots).join(', '),
      price: group.totalRevenue,
      paymentMethod: Array.from(group.paymentMethods).join(', '),
      count: group.count,
      isGrouped: true,
      groupType: 'product'
    }));
  }

  /**
   * Group sales by date for PDF export
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

    // Convert to array format for PDF
    return Object.values(grouped).map(group => ({
      id: group.id,
      timestamp: group.timestamp,
      productId: `${group.products.size} unique products`,
      slot: Array.from(group.slots).join(', '),
      price: group.totalRevenue,
      paymentMethod: `${group.count} transactions`,
      count: group.count,
      isGrouped: true,
      groupType: 'date'
    }));
  }

  static getStyles() {
    return `
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      
      body {
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        font-size: 11px;
        line-height: 1.2;
        color: #333;
        padding: 15px;
        background: white;
      }
      
      .header {
        text-align: center;
        margin-bottom: 20px;
        border-bottom: 1px solid #667eea;
        padding-bottom: 10px;
      }
      
      .header h1 {
        font-size: 20px;
        color: #1a202c;
        margin-bottom: 3px;
        font-weight: 700;
      }
      
      .header .subtitle {
        color: #718096;
        font-size: 12px;
        margin-bottom: 2px;
      }

      .export-config {
        background: #f7fafc;
        padding: 10px;
        border-radius: 6px;
        margin-bottom: 15px;
        border: 1px solid #e2e8f0;
      }

      .export-config h3 {
        font-size: 12px;
        color: #2d3748;
        margin-bottom: 6px;
        font-weight: 600;
      }

      .config-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 6px;
        font-size: 9px;
      }

      .config-item {
        display: flex;
        justify-content: space-between;
        padding: 2px 0;
      }

      .config-label {
        color: #4a5568;
        font-weight: 500;
      }

      .config-value {
        color: #2d3748;
        font-weight: 600;
      }
      
      .summary {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 10px;
        margin-bottom: 15px;
        background: #f7fafc;
        padding: 10px;
        border-radius: 6px;
        border: 1px solid #e2e8f0;
      }
      
      .summary-item {
        text-align: center;
        padding: 6px;
      }
      
      .summary-item .value {
        font-size: 14px;
        font-weight: bold;
        color: #1a202c;
        margin-bottom: 3px;
        word-break: break-word;
      }
      
      .summary-item .label {
        font-size: 9px;
        color: #718096;
        text-transform: uppercase;
        letter-spacing: 0.3px;
        font-weight: 500;
      }
      
      .table-section {
        margin-bottom: 15px;
      }
      
      .table-title {
        font-size: 14px;
        font-weight: 600;
        color: #2d3748;
        margin-bottom: 6px;
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .grouped-info {
        background: #fff3cd;
        color: #856404;
        padding: 6px 8px;
        border-radius: 3px;
        font-size: 9px;
        margin-bottom: 6px;
        border: 1px solid #ffeaa7;
      }
      
      .table-container {
        overflow-x: auto;
      }
      
      .table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 10px;
        border: 1px solid #e2e8f0;
        font-size: 9px;
      }
      
      .table th {
        background: #667eea;
        color: white;
        padding: 6px 4px;
        text-align: left;
        font-weight: 600;
        font-size: 9px;
        text-transform: uppercase;
        letter-spacing: 0.3px;
        border-bottom: 1px solid #5a67d8;
      }
      
      .table td {
        padding: 4px 3px;
        border-bottom: 1px solid #e2e8f0;
        font-size: 9px;
        vertical-align: top;
        line-height: 1.1;
      }
      
      .table tbody tr:nth-child(even) {
        background: #f7fafc;
      }
      
      .table tbody tr:hover {
        background: #edf2f7;
      }

      .table tbody tr.grouped-row {
        background: #fff5f5;
        border-left: 3px solid #f56565;
      }

      .table tbody tr.grouped-row:nth-child(even) {
        background: #fed7d7;
      }
      
      .table-date {
        font-weight: 500;
        color: #2d3748;
        margin-bottom: 1px;
        font-size: 9px;
      }
      
      .table-time {
        color: #718096;
        font-size: 8px;
      }
      
      .table-product {
        font-weight: 500;
        color: #2d3748;
        max-width: 120px;
        word-break: break-word;
        font-size: 9px;
      }

      .table-product.grouped {
        color: #c53030;
        font-weight: 600;
      }
      
      .table-price {
        font-weight: 600;
        color: #38a169;
        font-size: 9px;
      }

      .table-price.grouped {
        color: #c53030;
        font-size: 10px;
      }
      
      .table-slot {
        background: #667eea;
        color: white;
        padding: 1px 3px;
        border-radius: 2px;
        font-size: 8px;
        font-weight: 600;
        display: inline-block;
        max-width: 60px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .table-slot.grouped {
        background: #f56565;
      }
      
      .payment-method {
        background: #e2e8f0;
        color: #4a5568;
        padding: 1px 4px;
        border-radius: 6px;
        font-size: 8px;
        font-weight: 500;
        text-transform: capitalize;
        display: inline-block;
        max-width: 60px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .payment-method.grouped {
        background: #fed7d7;
        color: #c53030;
      }

      .grouped-badge {
        background: #f56565;
        color: white;
        padding: 1px 3px;
        border-radius: 2px;
        font-size: 7px;
        font-weight: 600;
        margin-left: 3px;
      }
      
      .footer {
        margin-top: 15px;
        text-align: center;
        color: #718096;
        font-size: 8px;
        border-top: 1px solid #e2e8f0;
        padding-top: 8px;
        page-break-inside: avoid;
      }
      
      .footer p {
        margin-bottom: 2px;
      }
      
      .company-logo {
        color: #667eea;
        font-weight: 600;
      }
      
      /* Page break controls */
      .page-break {
        page-break-before: always;
      }
      
      .no-break {
        page-break-inside: avoid;
      }
      
      /* Print-specific styles */
      @media print {
        body { 
          padding: 10px;
          font-size: 9px;
        }
        
        .header h1 { 
          font-size: 18px; 
        }
        
        .header .subtitle {
          font-size: 10px;
        }

        .export-config {
          margin-bottom: 10px;
          padding: 6px;
        }

        .config-grid {
          grid-template-columns: repeat(2, 1fr);
          font-size: 8px;
          gap: 4px;
        }
        
        .summary { 
          grid-template-columns: repeat(2, 1fr);
          margin-bottom: 12px;
          padding: 8px;
          gap: 8px;
        }
        
        .summary-item {
          padding: 4px;
        }
        
        .summary-item .value {
          font-size: 12px;
        }
        
        .table th, .table td { 
          padding: 3px 2px; 
          font-size: 8px; 
        }
        
        .table-product {
          max-width: 100px;
        }

        .table-slot, .payment-method {
          max-width: 50px;
        }
        
        .footer {
          margin-top: 10px;
          font-size: 7px;
        }
        
        /* Ensure table headers repeat on each page */
        .table thead {
          display: table-header-group;
        }
        
        /* Avoid breaking table rows across pages */
        .table tbody tr {
          page-break-inside: avoid;
        }
      }
      
      /* Alternative print styles for different paper sizes */
      @media print and (max-width: 8.5in) {
        .summary {
          grid-template-columns: 1fr;
          gap: 6px;
        }

        .config-grid {
          grid-template-columns: 1fr;
        }
        
        .table {
          font-size: 7px;
        }
        
        .table th, .table td {
          padding: 2px 1px;
        }
      }
    `;
  }

  /**
   * Generate HTML content for the PDF
   * @param {Object} data - Data for generating HTML
   * @returns {string} HTML content
   */
  static generateHTML({
    title,
    startDateFormatted,
    endDateFormatted,
    currentDate,
    stats,
    salesData,
    formatCurrency,
    getProductName,
    options = {}
  }) {
    const isGrouped = options.groupByProduct || options.groupByDate;
    const groupType = options.groupByProduct ? 'Product' : options.groupByDate ? 'Date' : 'None';

    return `
      <div class="header">
        <h1>${title}</h1>
        <div class="subtitle">Period: ${startDateFormatted} - ${endDateFormatted}</div>
        <div class="subtitle">Generated on ${currentDate}</div>
      </div>

      <div class="export-config no-break">
        <h3>📋 Export Configuration</h3>
        <div class="config-grid">
          <div class="config-item">
            <span class="config-label">Data Grouping:</span>
            <span class="config-value">${groupType}</span>
          </div>
          <div class="config-item">
            <span class="config-label">Product Details:</span>
            <span class="config-value">${options.includeProductDetails ? 'Included' : 'Excluded'}</span>
          </div>
          <div class="config-item">
            <span class="config-label">Timestamps:</span>
            <span class="config-value">${options.includeTimestamps ? 'Included' : 'Excluded'}</span>
          </div>
          <div class="config-item">
            <span class="config-label">Payment Methods:</span>
            <span class="config-value">${options.includePaymentMethods ? 'Included' : 'Excluded'}</span>
          </div>
          <div class="config-item">
            <span class="config-label">Summary Stats:</span>
            <span class="config-value">${options.includeSummaryStats ? 'Included' : 'Excluded'}</span>
          </div>
          <div class="config-item">
            <span class="config-label">Records:</span>
            <span class="config-value">${salesData.length} ${isGrouped ? 'grouped' : 'individual'}</span>
          </div>
        </div>
      </div>
      
      <div class="summary no-break">
        <div class="summary-item">
          <div class="value">${stats.totalSales || 0}</div>
          <div class="label">Total Sales</div>
        </div>
        <div class="summary-item">
          <div class="value">${formatCurrency(stats.totalRevenue || 0)}</div>
          <div class="label">Total Revenue</div>
        </div>
        <div class="summary-item">
          <div class="value">${formatCurrency(stats.averageTransaction || 0)}</div>
          <div class="label">Avg Transaction</div>
        </div>
        <div class="summary-item">
          <div class="value">${stats.topProduct?.name || 'No Data'}</div>
          <div class="label">Top Product</div>
        </div>
      </div>
      
      <div class="table-section">
        <div class="table-title">📊 ${isGrouped ? 'Grouped' : 'Transaction'} Details</div>
        ${isGrouped ? `
          <div class="grouped-info">
            ⚠️ Data has been grouped by ${groupType.toLowerCase()}. Individual transaction details are aggregated.
          </div>
        ` : ''}
        <div class="table-container">
          <table class="table">
            <thead>
              <tr>
                <th>Date & Time</th>
                <th>Product${isGrouped ? '/Summary' : ''}</th>
                <th>Slot${isGrouped ? 's' : ''}</th>
                <th>Price${isGrouped ? '/Total' : ''}</th>
                <th>Payment${isGrouped ? 's' : ''}</th>
                ${options.includeTimestamps ? '<th>Day/Hour</th>' : ''}
                ${options.includeProductDetails ? '<th>Product ID</th>' : ''}
              </tr>
            </thead>
            <tbody>
              ${salesData.map(sale => {
                const saleDate = new Date(sale.timestamp?.seconds * 1000);
                const isGroupedRow = sale.isGrouped;
                
                return `
                  <tr${isGroupedRow ? ' class="grouped-row"' : ''}>
                    <td>
                      <div class="table-date">
                        ${saleDate.toLocaleDateString('en-NZ', { 
                          month: 'short', 
                          day: 'numeric', 
                          year: 'numeric' 
                        })}
                      </div>
                      <div class="table-time">${saleDate.toLocaleTimeString('en-NZ', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}</div>
                    </td>
                    <td>
                      <span class="table-product${isGroupedRow ? ' grouped' : ''}">
                        ${getProductName(sale.productId)}
                      </span>
                      ${isGroupedRow ? `<span class="grouped-badge">${sale.count}x</span>` : ''}
                    </td>
                    <td>
                      <span class="table-slot${isGroupedRow ? ' grouped' : ''}">${sale.slot}</span>
                    </td>
                    <td>
                      <span class="table-price${isGroupedRow ? ' grouped' : ''}">${formatCurrency(sale.price)}</span>
                    </td>
                    <td>
                      <span class="payment-method${isGroupedRow ? ' grouped' : ''}">${sale.paymentMethod || 'cash'}</span>
                    </td>
                    ${options.includeTimestamps ? `
                      <td>
                        <div style="font-size: 10px;">
                          ${saleDate.toLocaleDateString('en-US', { weekday: 'short' })} / ${saleDate.getHours()}h
                        </div>
                      </td>
                    ` : ''}
                    ${options.includeProductDetails ? `
                      <td style="font-size: 10px; color: #718096;">
                        ${sale.productId || 'N/A'}
                      </td>
                    ` : ''}
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>

      ${options.includeSummaryStats ? `
        <div class="table-section">
          <div class="table-title">📈 Performance Analysis</div>
          <div class="table-container">
            <table class="table">
              <thead>
                <tr>
                  <th>Metric</th>
                  <th>Value</th>
                  <th>Analysis</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Payment Methods</strong></td>
                  <td>
                    Cash: ${this.countPaymentMethod(salesData, 'cash')} | 
                    Card: ${this.countPaymentMethod(salesData, 'card')}
                  </td>
                  <td style="font-size: 10px;">${this.getPaymentAnalysis(salesData)}</td>
                </tr>
                <tr>
                  <td><strong>Peak Activity</strong></td>
                  <td>${this.getBusiestHour(salesData)}</td>
                  <td style="font-size: 10px;">Optimize stock during peak hours</td>
                </tr>
                <tr>
                  <td><strong>Weekly Pattern</strong></td>
                  <td>
                    Weekdays: ${this.getWeekdaySales(salesData)} | 
                    Weekends: ${this.getWeekendSales(salesData)}
                  </td>
                  <td style="font-size: 10px;">${this.getWeeklyAnalysis(salesData)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      ` : ''}
      
      <div class="footer">
        <p>This report contains <strong>${salesData.length}</strong> ${isGrouped ? 'grouped records' : 'transactions'}</p>
        <p class="company-logo">🏪 Vending Machine Sales Analytics System</p>
        <p>Report generated automatically on ${currentDate}</p>
        ${isGrouped ? '<p><em>Note: This report shows aggregated data grouped by ' + groupType.toLowerCase() + '</em></p>' : ''}
      </div>
    `;
  }

  // Helper methods for analysis
  static countPaymentMethod(salesData, method) {
    return salesData.filter(sale => (sale.paymentMethod || 'cash').includes(method)).length;
  }

  static getBusiestHour(salesData) {
    if (!salesData || salesData.length === 0) return 'N/A';
    const hourCounts = {};
    salesData.forEach(sale => {
      if (sale.isGrouped) return; // Skip grouped data for time analysis
      const hour = new Date(sale.timestamp?.seconds * 1000).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });
    
    if (Object.keys(hourCounts).length === 0) return 'N/A';
    
    const busiestHour = Object.keys(hourCounts).reduce((a, b) => 
      hourCounts[a] > hourCounts[b] ? a : b
    );
    
    return `${busiestHour}:00 (${hourCounts[busiestHour]} sales)`;
  }

  static getWeekendSales(salesData) {
    return salesData.filter(sale => {
      if (sale.isGrouped) return false; // Skip grouped data
      const day = new Date(sale.timestamp?.seconds * 1000).getDay();
      return day === 0 || day === 6; // Sunday or Saturday
    }).length;
  }

  static getWeekdaySales(salesData) {
    return salesData.filter(sale => {
      if (sale.isGrouped) return false; // Skip grouped data
      const day = new Date(sale.timestamp?.seconds * 1000).getDay();
      return day >= 1 && day <= 5; // Monday to Friday
    }).length;
  }

  static getPaymentAnalysis(salesData) {
    const cash = this.countPaymentMethod(salesData, 'cash');
    const card = this.countPaymentMethod(salesData, 'card');
    const total = cash + card;
    
    if (total === 0) return 'No payment data available';
    
    const cashPercentage = (cash / total * 100).toFixed(0);
    
    if (cashPercentage > 70) {
      return 'High cash usage - ensure change availability';
    } else if (cashPercentage < 30) {
      return 'Strong digital adoption - consider contactless';
    }
    
    return 'Balanced payment mix - good customer options';
  }

  static getWeeklyAnalysis(salesData) {
    const weekday = this.getWeekdaySales(salesData);
    const weekend = this.getWeekendSales(salesData);
    const total = weekday + weekend;
    
    if (total === 0) return 'No temporal data available';
    
    const weekdayPercentage = (weekday / total * 100).toFixed(0);
    
    if (weekdayPercentage > 80) {
      return 'Business hours focused - office location pattern';
    } else if (weekdayPercentage < 50) {
      return 'Weekend heavy - leisure location pattern';
    }
    
    return 'Consistent weekly distribution';
  }

  /**
   * Export product performance data as PDF
   * @param {Object} config - Export configuration for product data
   */
  static exportProductPerformancePDF({
    productData = [],
    dateRange = {},
    formatCurrency,
    title = 'Product Performance Report',
    options = {}
  }) {
    if (!productData || productData.length === 0) {
      alert('No product data to export.');
      return;
    }

    if (!formatCurrency) {
      console.error('formatCurrency function is required');
      return;
    }

    const currentDate = new Date().toLocaleDateString('en-NZ');
    const startDateFormatted = dateRange.startDate ? new Date(dateRange.startDate).toLocaleDateString('en-NZ') : 'N/A';
    const endDateFormatted = dateRange.endDate ? new Date(dateRange.endDate).toLocaleDateString('en-NZ') : 'N/A';

    const printWindow = window.open('', '_blank');
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title} - ${startDateFormatted} to ${endDateFormatted}</title>
          <style>${this.getStyles()}</style>
        </head>
        <body>
          <div class="header">
            <h1>${title}</h1>
            <div class="subtitle">Period: ${startDateFormatted} - ${endDateFormatted}</div>
            <div class="subtitle">Generated on ${currentDate}</div>
          </div>
          
          <div class="table-section">
            <div class="table-title">📈 Product Rankings</div>
            <div class="table-container">
              <table class="table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Product Name</th>
                    <th>Sales Count</th>
                    <th>Revenue</th>
                    <th>Avg. Price</th>
                    <th>Market Share</th>
                  </tr>
                </thead>
                <tbody>
                  ${productData.map((product, index) => {
                    const avgPrice = product.revenue / product.count;
                    const totalSales = productData.reduce((sum, p) => sum + p.count, 0);
                    const marketShare = totalSales > 0 ? (product.count / totalSales * 100).toFixed(1) : '0.0';
                    
                    return `
                      <tr>
                        <td><strong>#${index + 1}</strong></td>
                        <td class="table-product">${product.productName}</td>
                        <td>${product.count}</td>
                        <td class="table-price">${formatCurrency(product.revenue)}</td>
                        <td>${formatCurrency(avgPrice)}</td>
                        <td>${marketShare}%</td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          </div>
          
          <div class="footer">
            <p>This report contains <strong>${productData.length}</strong> products</p>
            <p class="company-logo">🏪 Vending Machine Sales Analytics System</p>
            <p>Report generated automatically on ${currentDate}</p>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
      setTimeout(() => {
        printWindow.close();
      }, 100);
    }, 500);
  }
}

export default PDFExport;