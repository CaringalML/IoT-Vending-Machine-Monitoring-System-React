/**
 * PDF Export Component - Mobile Compatible
 * Generates and exports sales data as a PDF using browser print functionality
 * Enhanced for mobile compatibility and better user experience
 */
// eslint-disable-next-line no-unused-vars
class PDFExport {
  /**
   * Export sales data as PDF with enhanced mobile support
   * @param {Object}

export default PDFExport; config - Export configuration
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

    // Check if we're on mobile
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                    window.innerWidth <= 768;

    if (isMobile) {
      this.exportMobilePDF({
        salesData,
        stats,
        dateRange,
        formatCurrency,
        getProductName,
        title,
        options
      });
    } else {
      this.exportDesktopPDF({
        salesData,
        stats,
        dateRange,
        formatCurrency,
        getProductName,
        title,
        options
      });
    }
  }

  /**
   * Mobile-specific PDF export using a new tab approach
   */
  static exportMobilePDF({
    salesData,
    stats,
    dateRange,
    formatCurrency,
    getProductName,
    title,
    options
  }) {
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

    const htmlContent = this.buildCompleteHTML({
      title,
      startDateFormatted,
      endDateFormatted,
      currentDate,
      stats,
      salesData: processedData,
      formatCurrency,
      getProductName,
      options,
      isMobile: true
    });

    // Create a blob with the HTML content
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);

    // Create a temporary link to open in new tab
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.download = `${title.replace(/\s+/g, '-')}-${startDateFormatted}.html`;
    
    // Add the link to the document briefly
    document.body.appendChild(link);
    
    // For mobile, we'll open in a new tab and provide instructions
    try {
      const newWindow = window.open(url, '_blank');
      
      if (newWindow) {
        // Window opened successfully
        setTimeout(() => {
          // Show mobile-friendly instructions
          this.showMobileInstructions();
          // Clean up
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        }, 1000);
      } else {
        // Popup blocked, fallback to download
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        alert('Your browser blocked the popup. The report has been downloaded as an HTML file instead. Open it in your browser and use your browser\'s print function to save as PDF.');
      }
    } catch (error) {
      // Fallback to download
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      alert('Opening in new tab failed. The report has been downloaded as an HTML file. Open it in your browser and use your browser\'s print function to save as PDF.');
    }
  }

  /**
   * Desktop PDF export using popup window
   */
  static exportDesktopPDF({
    salesData,
    stats,
    dateRange,
    formatCurrency,
    getProductName,
    title,
    options
  }) {
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

    const htmlContent = this.buildCompleteHTML({
      title,
      startDateFormatted,
      endDateFormatted,
      currentDate,
      stats,
      salesData: processedData,
      formatCurrency,
      getProductName,
      options,
      isMobile: false
    });

    const printWindow = window.open('', '_blank', 'width=800,height=600');
    
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      
      // Wait for content to load, then trigger print dialog
      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
        
        // Close the window after a delay
        setTimeout(() => {
          printWindow.close();
        }, 100);
      }, 500);
    } else {
      alert('Popup window was blocked. Please allow popups for this site to export PDF reports.');
    }
  }

  /**
   * Show mobile-friendly instructions overlay
   */
  static showMobileInstructions() {
    // Create overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      box-sizing: border-box;
    `;

    const modal = document.createElement('div');
    modal.style.cssText = `
      background: white;
      border-radius: 12px;
      padding: 24px;
      max-width: 400px;
      width: 100%;
      text-align: center;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
    `;

    modal.innerHTML = `
      <div style="font-size: 48px; margin-bottom: 16px;">📱</div>
      <h3 style="margin: 0 0 12px 0; color: #1a202c; font-size: 18px;">Mobile PDF Export</h3>
      <p style="margin: 0 0 20px 0; color: #4a5568; font-size: 14px; line-height: 1.4;">
        Your report has opened in a new tab. To save as PDF:
      </p>
      <ol style="text-align: left; color: #4a5568; font-size: 14px; margin: 0 0 24px 0; padding-left: 20px;">
        <li style="margin-bottom: 8px;">Open your browser's menu (⋮ or ≡)</li>
        <li style="margin-bottom: 8px;">Select "Print" or "Share" → "Print"</li>
        <li style="margin-bottom: 8px;">Choose "Save as PDF" as destination</li>
        <li>Tap "Save" or "Print"</li>
      </ol>
      <button id="mobileInstructionsClose" style="
        background: #667eea;
        color: white;
        border: none;
        padding: 12px 24px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        width: 100%;
      ">Got it!</button>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // Close button handler
    const closeBtn = modal.querySelector('#mobileInstructionsClose');
    closeBtn.onclick = () => {
      document.body.removeChild(overlay);
    };

    // Click outside to close
    overlay.onclick = (e) => {
      if (e.target === overlay) {
        document.body.removeChild(overlay);
      }
    };

    // Auto-close after 10 seconds
    setTimeout(() => {
      if (document.body.contains(overlay)) {
        document.body.removeChild(overlay);
      }
    }, 10000);
  }

  /**
   * Build complete HTML document
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
    options,
    isMobile
  }) {
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
          ${isMobile ? this.getMobileScripts() : ''}
        </head>
        <body>
          ${isMobile ? this.getMobileHeader() : ''}
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

  /**
   * Get mobile-specific header with print button
   */
  static getMobileHeader() {
    return `
      <div class="mobile-header">
        <button onclick="window.print()" class="mobile-print-btn">
          📄 Print / Save as PDF
        </button>
        <button onclick="window.close()" class="mobile-close-btn">
          ✕ Close
        </button>
      </div>
    `;
  }

  /**
   * Get mobile-specific scripts
   */
  static getMobileScripts() {
    return `
      <script>
        // Mobile-specific functionality
        document.addEventListener('DOMContentLoaded', function() {
          // Auto-hide mobile header when printing
          window.addEventListener('beforeprint', function() {
            const mobileHeader = document.querySelector('.mobile-header');
            if (mobileHeader) {
              mobileHeader.style.display = 'none';
            }
          });
          
          window.addEventListener('afterprint', function() {
            const mobileHeader = document.querySelector('.mobile-header');
            if (mobileHeader) {
              mobileHeader.style.display = 'flex';
            }
          });
        });
      </script>
    `;
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

  static getStyles(isMobile = false) {
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
        padding: ${isMobile ? '0' : '15px'};
        background: white;
      }

      .mobile-header {
        display: ${isMobile ? 'flex' : 'none'};
        justify-content: space-between;
        align-items: center;
        padding: 12px 16px;
        background: #667eea;
        color: white;
        position: sticky;
        top: 0;
        z-index: 1000;
        gap: 12px;
      }

      .mobile-print-btn, .mobile-close-btn {
        background: rgba(255, 255, 255, 0.2);
        color: white;
        border: 1px solid rgba(255, 255, 255, 0.3);
        padding: 8px 16px;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: background 0.2s ease;
        flex: 1;
        max-width: 150px;
      }

      .mobile-print-btn:hover, .mobile-close-btn:hover {
        background: rgba(255, 255, 255, 0.3);
      }

      .mobile-print-btn:active, .mobile-close-btn:active {
        background: rgba(255, 255, 255, 0.4);
      }

      .content-wrapper {
        padding: ${isMobile ? '16px' : '0'};
      }
      
      .header {
        text-align: center;
        margin-bottom: ${isMobile ? '16px' : '20px'};
        border-bottom: 2px solid #667eea;
        padding-bottom: ${isMobile ? '12px' : '10px'};
      }
      
      .header h1 {
        font-size: ${isMobile ? '22px' : '20px'};
        color: #1a202c;
        margin-bottom: 4px;
        font-weight: 700;
      }
      
      .header .subtitle {
        color: #718096;
        font-size: ${isMobile ? '13px' : '12px'};
        margin-bottom: 2px;
      }

      .export-config {
        background: #f7fafc;
        padding: ${isMobile ? '12px' : '10px'};
        border-radius: 8px;
        margin-bottom: ${isMobile ? '16px' : '15px'};
        border: 1px solid #e2e8f0;
      }

      .export-config h3 {
        font-size: ${isMobile ? '14px' : '12px'};
        color: #2d3748;
        margin-bottom: 8px;
        font-weight: 600;
      }

      .config-grid {
        display: grid;
        grid-template-columns: ${isMobile ? '1fr' : 'repeat(3, 1fr)'};
        gap: ${isMobile ? '8px' : '6px'};
        font-size: ${isMobile ? '11px' : '9px'};
      }

      .config-item {
        display: flex;
        justify-content: space-between;
        padding: ${isMobile ? '4px 0' : '2px 0'};
        border-bottom: ${isMobile ? '1px solid #e2e8f0' : 'none'};
      }

      .config-item:last-child {
        border-bottom: none;
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
        grid-template-columns: ${isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)'};
        gap: ${isMobile ? '12px' : '10px'};
        margin-bottom: ${isMobile ? '16px' : '15px'};
        background: #f7fafc;
        padding: ${isMobile ? '12px' : '10px'};
        border-radius: 8px;
        border: 1px solid #e2e8f0;
      }
      
      .summary-item {
        text-align: center;
        padding: ${isMobile ? '8px' : '6px'};
      }
      
      .summary-item .value {
        font-size: ${isMobile ? '16px' : '14px'};
        font-weight: bold;
        color: #1a202c;
        margin-bottom: 4px;
        word-break: break-word;
        line-height: 1.1;
      }
      
      .summary-item .label {
        font-size: ${isMobile ? '10px' : '9px'};
        color: #718096;
        text-transform: uppercase;
        letter-spacing: 0.3px;
        font-weight: 500;
      }
      
      .table-section {
        margin-bottom: ${isMobile ? '16px' : '15px'};
      }
      
      .table-title {
        font-size: ${isMobile ? '16px' : '14px'};
        font-weight: 600;
        color: #2d3748;
        margin-bottom: ${isMobile ? '8px' : '6px'};
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .grouped-info {
        background: #fff3cd;
        color: #856404;
        padding: ${isMobile ? '8px 10px' : '6px 8px'};
        border-radius: 4px;
        font-size: ${isMobile ? '11px' : '9px'};
        margin-bottom: ${isMobile ? '8px' : '6px'};
        border: 1px solid #ffeaa7;
        line-height: 1.3;
      }
      
      .table-container {
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
      }
      
      .table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: ${isMobile ? '12px' : '10px'};
        border: 1px solid #e2e8f0;
        font-size: ${isMobile ? '10px' : '9px'};
        min-width: ${isMobile ? '600px' : 'auto'};
      }
      
      .table th {
        background: #667eea;
        color: white;
        padding: ${isMobile ? '8px 6px' : '6px 4px'};
        text-align: left;
        font-weight: 600;
        font-size: ${isMobile ? '10px' : '9px'};
        text-transform: uppercase;
        letter-spacing: 0.3px;
        border-bottom: 1px solid #5a67d8;
        position: sticky;
        top: ${isMobile ? '60px' : '0'};
        z-index: 10;
      }
      
      .table td {
        padding: ${isMobile ? '6px 4px' : '4px 3px'};
        border-bottom: 1px solid #e2e8f0;
        font-size: ${isMobile ? '10px' : '9px'};
        vertical-align: top;
        line-height: 1.2;
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
        margin-bottom: 2px;
        font-size: ${isMobile ? '10px' : '9px'};
      }
      
      .table-time {
        color: #718096;
        font-size: ${isMobile ? '9px' : '8px'};
      }
      
      .table-product {
        font-weight: 500;
        color: #2d3748;
        max-width: ${isMobile ? '150px' : '120px'};
        word-break: break-word;
        font-size: ${isMobile ? '10px' : '9px'};
      }

      .table-product.grouped {
        color: #c53030;
        font-weight: 600;
      }
      
      .table-price {
        font-weight: 600;
        color: #38a169;
        font-size: ${isMobile ? '10px' : '9px'};
      }

      .table-price.grouped {
        color: #c53030;
        font-size: ${isMobile ? '11px' : '10px'};
      }
      
      .table-slot {
        background: #667eea;
        color: white;
        padding: ${isMobile ? '2px 4px' : '1px 3px'};
        border-radius: 3px;
        font-size: ${isMobile ? '9px' : '8px'};
        font-weight: 600;
        display: inline-block;
        max-width: ${isMobile ? '80px' : '60px'};
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
        padding: ${isMobile ? '2px 5px' : '1px 4px'};
        border-radius: 8px;
        font-size: ${isMobile ? '9px' : '8px'};
        font-weight: 500;
        text-transform: capitalize;
        display: inline-block;
        max-width: ${isMobile ? '80px' : '60px'};
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
        padding: ${isMobile ? '2px 4px' : '1px 3px'};
        border-radius: 3px;
        font-size: ${isMobile ? '8px' : '7px'};
        font-weight: 600;
        margin-left: 4px;
      }
      
      .footer {
        margin-top: ${isMobile ? '20px' : '15px'};
        text-align: center;
        color: #718096;
        font-size: ${isMobile ? '10px' : '8px'};
        border-top: 1px solid #e2e8f0;
        padding-top: ${isMobile ? '12px' : '8px'};
        page-break-inside: avoid;
      }
      
      .footer p {
        margin-bottom: 3px;
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
        .mobile-header {
          display: none !important;
        }

        body { 
          padding: 10px;
          font-size: 9px;
        }

        .content-wrapper {
          padding: 0;
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

        .table th {
          position: static;
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
      
      /* Mobile-specific styles */
      @media (max-width: 768px) {
        .summary {
          grid-template-columns: 1fr;
          gap: 8px;
        }

        .config-grid {
          grid-template-columns: 1fr;
        }
        
        .table {
          font-size: 9px;
          min-width: 500px;
        }
        
        .table th, .table td {
          padding: 4px 3px;
        }

        .table-product {
          max-width: 120px;
        }
      }

      /* Very small screens */
      @media (max-width: 480px) {
        .table {
          min-width: 400px;
          font-size: 8px;
        }

        .table th, .table td {
          padding: 3px 2px;
        }

        .table-product {
          max-width: 100px;
        }
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
    const isGrouped = options.groupByProduct || options.groupByDate;
    const groupType = options.groupByProduct ? 'Product' : options.groupByDate ? 'Date' : 'None';

    return `
      <div class="content-wrapper">
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
                ${salesData.slice(0, isMobile ? 50 : 100).map(sale => {
                  const saleDate = new Date(sale.timestamp?.seconds * 1000);
                  const isGroupedRow = sale.isGrouped;
                  
                  return `
                    <tr${isGroupedRow ? ' class="grouped-row"' : ''}>
                      <td>
                        <div class="table-date">
                          ${saleDate.toLocaleDateString('en-NZ', { 
                            month: 'short', 
                            day: 'numeric', 
                            year: isMobile ? '2-digit' : 'numeric' 
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
                          <div style="font-size: ${isMobile ? '9px' : '10px'};">
                            ${saleDate.toLocaleDateString('en-US', { weekday: 'short' })} / ${saleDate.getHours()}h
                          </div>
                        </td>
                      ` : ''}
                      ${options.includeProductDetails ? `
                        <td style="font-size: ${isMobile ? '9px' : '10px'}; color: #718096;">
                          ${sale.productId || 'N/A'}
                        </td>
                      ` : ''}
                    </tr>
                  `;
                }).join('')}
                ${salesData.length > (isMobile ? 50 : 100) ? `
                  <tr>
                    <td colspan="${4 + (options.includeTimestamps ? 1 : 0) + (options.includeProductDetails ? 1 : 0)}" style="text-align: center; font-style: italic; color: #718096; padding: 12px;">
                      ... and ${salesData.length - (isMobile ? 50 : 100)} more transactions (truncated for ${isMobile ? 'mobile' : 'print'} display)
                    </td>
                  </tr>
                ` : ''}
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
                    <td style="font-size: ${isMobile ? '9px' : '10px'};">${this.getPaymentAnalysis(salesData)}</td>
                  </tr>
                  <tr>
                    <td><strong>Peak Activity</strong></td>
                    <td>${this.getBusiestHour(salesData)}</td>
                    <td style="font-size: ${isMobile ? '9px' : '10px'};">Optimize stock during peak hours</td>
                  </tr>
                  <tr>
                    <td><strong>Weekly Pattern</strong></td>
                    <td>
                      Weekdays: ${this.getWeekdaySales(salesData)} | 
                      Weekends: ${this.getWeekendSales(salesData)}
                    </td>
                    <td style="font-size: ${isMobile ? '9px' : '10px'};">${this.getWeeklyAnalysis(salesData)}</td>
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
          ${isMobile ? '<p><em>Mobile-optimized version - some data may be truncated for display</em></p>' : ''}
        </div>
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
   * Export product performance data as PDF (mobile compatible)
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

    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                    window.innerWidth <= 768;

    const currentDate = new Date().toLocaleDateString('en-NZ');
    const startDateFormatted = dateRange.startDate ? new Date(dateRange.startDate).toLocaleDateString('en-NZ') : 'N/A';
    const endDateFormatted = dateRange.endDate ? new Date(dateRange.endDate).toLocaleDateString('en-NZ') : 'N/A';

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${title} - ${startDateFormatted} to ${endDateFormatted}</title>
          <style>${this.getStyles(isMobile)}</style>
          ${isMobile ? this.getMobileScripts() : ''}
        </head>
        <body>
          ${isMobile ? this.getMobileHeader() : ''}
          <div class="content-wrapper">
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
                      <th>Sales</th>
                      <th>Revenue</th>
                      <th>Avg. Price</th>
                      <th>Share %</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${productData.slice(0, isMobile ? 25 : 50).map((product, index) => {
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
                    ${productData.length > (isMobile ? 25 : 50) ? `
                      <tr>
                        <td colspan="6" style="text-align: center; font-style: italic; color: #718096; padding: 12px;">
                          ... and ${productData.length - (isMobile ? 25 : 50)} more products (truncated for ${isMobile ? 'mobile' : 'print'} display)
                        </td>
                      </tr>
                    ` : ''}
                  </tbody>
                </table>
              </div>
            </div>
            
            <div class="footer">
              <p>This report contains <strong>${productData.length}</strong> products</p>
              <p class="company-logo">🏪 Vending Machine Sales Analytics System</p>
              <p>Report generated automatically on ${currentDate}</p>
              ${isMobile ? '<p><em>Mobile-optimized version - some data may be truncated for display</em></p>' : ''}
            </div>
          </div>
        </body>
      </html>
    `;

    if (isMobile) {
      // Use the same mobile approach as sales PDF
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.target = '_blank';
      link.download = `${title.replace(/\s+/g, '-')}-${startDateFormatted}.html`;
      
      document.body.appendChild(link);
      
      try {
        const newWindow = window.open(url, '_blank');
        if (newWindow) {
          setTimeout(() => {
            this.showMobileInstructions();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
          }, 1000);
        } else {
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          alert('Your browser blocked the popup. The report has been downloaded as an HTML file instead.');
        }
      } catch (error) {
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        alert('Opening in new tab failed. The report has been downloaded as an HTML file.');
      }
    } else {
      // Desktop approach
      const printWindow = window.open('', '_blank', 'width=800,height=600');
      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        setTimeout(() => {
          printWindow.focus();
          printWindow.print();
          setTimeout(() => printWindow.close(), 100);
        }, 500);
      } else {
        alert('Popup window was blocked. Please allow popups for this site to export PDF reports.');
      }
    }
  }
}