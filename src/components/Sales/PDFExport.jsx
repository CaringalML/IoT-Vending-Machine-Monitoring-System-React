/**
 * PDF Export Component
 * Generates and exports sales data as a PDF using browser print functionality
 */
class PDFExport {
  /**
   * Export sales data as PDF
   * @param {Object} options - Export configuration
   * @param {Array} options.salesData - Array of sales transactions
   * @param {Object} options.stats - Sales statistics object
   * @param {Object} options.dateRange - Date range object with startDate and endDate
   * @param {Function} options.formatCurrency - Currency formatting function
   * @param {Function} options.getProductName - Function to get product name by ID
   * @param {string} options.title - Optional custom title for the report
   */
  static exportSalesPDF({
    salesData = [],
    stats = {},
    dateRange = {},
    formatCurrency,
    getProductName,
    title = 'Sales Report'
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
            salesData,
            formatCurrency,
            getProductName
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
   * Get CSS styles for the PDF
   * @returns {string} CSS styles
   */
  static getStyles() {
    return `
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      
      body {
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        font-size: 12px;
        line-height: 1.4;
        color: #333;
        padding: 20px;
        background: white;
      }
      
      .header {
        text-align: center;
        margin-bottom: 30px;
        border-bottom: 2px solid #667eea;
        padding-bottom: 15px;
      }
      
      .header h1 {
        font-size: 24px;
        color: #1a202c;
        margin-bottom: 5px;
        font-weight: 700;
      }
      
      .header .subtitle {
        color: #718096;
        font-size: 14px;
        margin-bottom: 3px;
      }
      
      .summary {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 15px;
        margin-bottom: 25px;
        background: #f7fafc;
        padding: 15px;
        border-radius: 8px;
        border: 1px solid #e2e8f0;
      }
      
      .summary-item {
        text-align: center;
        padding: 10px;
      }
      
      .summary-item .value {
        font-size: 16px;
        font-weight: bold;
        color: #1a202c;
        margin-bottom: 5px;
        word-break: break-word;
      }
      
      .summary-item .label {
        font-size: 11px;
        color: #718096;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        font-weight: 500;
      }
      
      .table-section {
        margin-bottom: 20px;
      }
      
      .table-title {
        font-size: 16px;
        font-weight: 600;
        color: #2d3748;
        margin-bottom: 10px;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      
      .table-container {
        overflow-x: auto;
      }
      
      .table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 15px;
        border: 1px solid #e2e8f0;
      }
      
      .table th {
        background: #667eea;
        color: white;
        padding: 12px 8px;
        text-align: left;
        font-weight: 600;
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        border-bottom: 2px solid #5a67d8;
      }
      
      .table td {
        padding: 10px 8px;
        border-bottom: 1px solid #e2e8f0;
        font-size: 11px;
        vertical-align: top;
      }
      
      .table tbody tr:nth-child(even) {
        background: #f7fafc;
      }
      
      .table tbody tr:hover {
        background: #edf2f7;
      }
      
      .table-date {
        font-weight: 500;
        color: #2d3748;
        margin-bottom: 2px;
      }
      
      .table-time {
        color: #718096;
        font-size: 10px;
      }
      
      .table-product {
        font-weight: 500;
        color: #2d3748;
        max-width: 200px;
        word-break: break-word;
      }
      
      .table-price {
        font-weight: 600;
        color: #38a169;
      }
      
      .table-slot {
        background: #667eea;
        color: white;
        padding: 3px 6px;
        border-radius: 3px;
        font-size: 10px;
        font-weight: 600;
        display: inline-block;
      }
      
      .payment-method {
        background: #e2e8f0;
        color: #4a5568;
        padding: 3px 8px;
        border-radius: 10px;
        font-size: 10px;
        font-weight: 500;
        text-transform: capitalize;
        display: inline-block;
      }
      
      .footer {
        margin-top: 30px;
        text-align: center;
        color: #718096;
        font-size: 10px;
        border-top: 1px solid #e2e8f0;
        padding-top: 15px;
        page-break-inside: avoid;
      }
      
      .footer p {
        margin-bottom: 5px;
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
          padding: 15px;
          font-size: 11px;
        }
        
        .header h1 { 
          font-size: 20px; 
        }
        
        .header .subtitle {
          font-size: 12px;
        }
        
        .summary { 
          grid-template-columns: repeat(2, 1fr);
          margin-bottom: 20px;
          padding: 12px;
        }
        
        .summary-item {
          padding: 8px;
        }
        
        .summary-item .value {
          font-size: 14px;
        }
        
        .table th, .table td { 
          padding: 6px 4px; 
          font-size: 10px; 
        }
        
        .table-product {
          max-width: 150px;
        }
        
        .footer {
          margin-top: 20px;
          font-size: 9px;
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
          gap: 10px;
        }
        
        .table {
          font-size: 9px;
        }
        
        .table th, .table td {
          padding: 4px 3px;
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
    getProductName
  }) {
    return `
      <div class="header">
        <h1>${title}</h1>
        <div class="subtitle">Period: ${startDateFormatted} - ${endDateFormatted}</div>
        <div class="subtitle">Generated on ${currentDate}</div>
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
        <div class="table-title">📊 Transaction Details</div>
        <div class="table-container">
          <table class="table">
            <thead>
              <tr>
                <th>Date & Time</th>
                <th>Product</th>
                <th>Slot</th>
                <th>Price</th>
                <th>Payment</th>
              </tr>
            </thead>
            <tbody>
              ${salesData.map(sale => {
                const saleDate = new Date(sale.timestamp?.seconds * 1000);
                return `
                  <tr>
                    <td>
                      <div class="table-date">${saleDate.toLocaleDateString('en-NZ', { 
                        month: 'short', 
                        day: 'numeric', 
                        year: 'numeric' 
                      })}</div>
                      <div class="table-time">${saleDate.toLocaleTimeString('en-NZ', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}</div>
                    </td>
                    <td class="table-product">${getProductName(sale.productId)}</td>
                    <td><span class="table-slot">${sale.slot}</span></td>
                    <td class="table-price">${formatCurrency(sale.price)}</td>
                    <td><span class="payment-method">${sale.paymentMethod || 'cash'}</span></td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
      
      <div class="footer">
        <p>This report contains <strong>${salesData.length}</strong> transactions</p>
        <p class="company-logo">🏪 Vending Machine Sales Analytics System</p>
        <p>Report generated automatically on ${currentDate}</p>
      </div>
    `;
  }

  /**
   * Export product performance data as PDF
   * @param {Object} options - Export configuration for product data
   */
  static exportProductPerformancePDF({
    productData = [],
    dateRange = {},
    formatCurrency,
    title = 'Product Performance Report'
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
                  </tr>
                </thead>
                <tbody>
                  ${productData.map((product, index) => `
                    <tr>
                      <td><strong>#${index + 1}</strong></td>
                      <td class="table-product">${product.productName}</td>
                      <td>${product.count}</td>
                      <td class="table-price">${formatCurrency(product.revenue)}</td>
                      <td>${formatCurrency(product.revenue / product.count)}</td>
                    </tr>
                  `).join('')}
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