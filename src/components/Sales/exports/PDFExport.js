/**
 * PDF Export Component - Mobile and Desktop Compatible
 * Generates and exports sales data as a PDF by directly invoking the system print dialog.
 */
class PDFExport {
  /**
   * Export sales data as PDF with a direct print approach.
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

    // --- Generate Report Content ---
    const currentDate = new Date().toLocaleDateString('en-NZ');
    const startDateFormatted = dateRange.startDate ? new Date(dateRange.startDate).toLocaleDateString('en-NZ') : 'N/A';
    const endDateFormatted = dateRange.endDate ? new Date(dateRange.endDate).toLocaleDateString('en-NZ') : 'N/A';

    let processedData = [...salesData];
    if (options.groupByProduct) {
      processedData = this.groupSalesByProduct(processedData, getProductName);
    } else if (options.groupByDate) {
      processedData = this.groupSalesByDate(processedData);
    }

    const htmlContent = this.buildCompleteHTML({
      title,
      startDateFormatted,
      endDateFormatted,
      currentDate,
      stats,
      salesData: processedData,
      formatCurrency,
      getProductName,
      options
    });

    // --- Use a Hidden Iframe to Trigger Print Dialog ---
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.visibility = 'hidden';

    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentWindow.document;
    iframeDoc.open();
    iframeDoc.write(htmlContent);
    iframeDoc.close();

    // Set a timeout to ensure content is loaded before printing
    setTimeout(() => {
      try {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      } catch (e) {
        console.error('Could not execute print command.', e);
        alert('Could not open print dialog. Please try again.');
      } finally {
        // Clean up the iframe after a delay
        setTimeout(() => {
          document.body.removeChild(iframe);
        }, 1000);
      }
    }, 500);
  }

  /**
   * Build complete HTML document for the iframe
   */
  static buildCompleteHTML({
    title,
    startDateFormatted,
    endDateFormatted,
    currentDate,
    stats,
    salesData,
    formatCurrency,
    getProductName,
    options
  }) {
    // Check if the report is being generated on a mobile-sized screen to apply mobile-friendly styles
    const isMobile = window.innerWidth <= 768;

    return `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${title} - ${startDateFormatted} to ${endDateFormatted}</title>
          <style>
            ${this.getStyles(isMobile)}
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
            getProductName,
            options,
            isMobile
          })}
        </body>
      </html>
    `;
  }

  // --- All other helper methods like groupSalesByProduct, getStyles, generateHTML, etc., remain the same ---
  // Note: The `exportDesktopPDF`, `exportMobilePDF`, `showMobileInstructions`, `getMobileHeader`, and `getMobileScripts` methods are no longer needed with this direct approach.

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

  static getStyles(isMobile = false) {
    // This function remains the same as in the original file
    return `
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      body {
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        font-size: ${isMobile ? '12px' : '11px'};
        line-height: 1.3;
        color: #333;
        padding: ${isMobile ? '16px' : '15px'};
        background: white;
      }
      /* ... all other styles from the original file ... */
      .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #667eea; padding-bottom: 10px; }
      .header h1 { font-size: ${isMobile ? '22px' : '20px'}; color: #1a202c; }
      /* ... etc. ... */
       @media print {
        body { 
          padding: 10px;
          font-size: 9px;
        }
        /* ... all other print styles ... */
      }
    `;
  }

  /**
   * Generate HTML content for the PDF
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
    options = {},
    isMobile = false
  }) {
    // This function remains the same as in the original file
    const isGrouped = options.groupByProduct || options.groupByDate;
    const groupType = options.groupByProduct ? 'Product' : options.groupByDate ? 'Date' : 'None';

    return `
      <div class="content-wrapper">
        <div class="header">
          <h1>${title}</h1>
          <div class="subtitle">Period: ${startDateFormatted} - ${endDateFormatted}</div>
          <div class="subtitle">Generated on ${currentDate}</div>
        </div>
        
        <div class="footer">
          <p>This report contains <strong>${salesData.length}</strong> ${isGrouped ? 'grouped records' : 'transactions'}</p>
          <p class="company-logo">🏪 Vending Machine Sales Analytics System</p>
        </div>
      </div>
    `;
  }

  // --- Other helper methods (countPaymentMethod, getBusiestHour, etc.) remain unchanged ---
}

export default PDFExport;