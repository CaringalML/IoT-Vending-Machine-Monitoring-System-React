/**
 * PDF Export functionality for inventory data
 */
export class PDFExport {
  constructor(data, options = {}, stats = {}) {
    this.data = data;
    this.stats = stats;
    this.options = {
      includeImages: false,
      includeDeletedProducts: true,
      groupByCategory: false,
      includeSummary: true,
      title: 'Inventory Report',
      ...options
    };
  }

  /**
   * Transform inventory data for PDF export
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
        'Last Refilled': item.lastRefilledFormatted || 'Never',
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
   * Calculate total value for summary
   */
  calculateTotalValue() {
    return this.data
      .filter(item => !item.isDeleted)
      .reduce((sum, item) => sum + (item.quantity * (item.product?.price || 0)), 0);
  }

  /**
   * Generate CSS styles for PDF
   */
  generateStyles() {
    return `
      body { 
        font-family: 'Open Sans', 'Segoe UI', sans-serif; 
        margin: 20px; 
        background-color: #ffffff; 
        color: #333; 
        line-height: 1.4;
      }
      .pdf-container { 
        max-width: 1000px; 
        margin: auto; 
        padding: 20px; 
      }
      .pdf-header { 
        text-align: center; 
        border-bottom: 4px solid #4f46e5; 
        padding-bottom: 20px; 
        margin-bottom: 30px; 
      }
      .pdf-header h1 { 
        font-size: 32px; 
        color: #4f46e5; 
        margin: 0; 
        font-weight: 700;
      }
      .pdf-header p { 
        font-size: 14px; 
        color: #555; 
        margin: 4px 0; 
      }
      .pdf-summary { 
        background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%); 
        padding: 20px; 
        border-radius: 10px; 
        margin-bottom: 30px; 
        border-left: 5px solid #4f46e5;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      }
      .pdf-summary h3 { 
        margin-top: 0; 
        color: #4f46e5; 
        font-size: 20px; 
        font-weight: 600;
      }
      .pdf-summary-stats { 
        display: grid; 
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); 
        gap: 20px; 
        margin-top: 15px;
      }
      .pdf-stat-item { 
        background: white; 
        padding: 15px; 
        border-radius: 8px; 
        text-align: center; 
        box-shadow: 0 1px 3px rgba(0,0,0,0.1); 
        border: 1px solid #e5e7eb;
      }
      .pdf-stat-value { 
        font-size: 22px; 
        font-weight: bold; 
        color: #4f46e5; 
        display: block;
        margin-bottom: 5px;
      }
      .pdf-stat-label { 
        font-size: 12px; 
        color: #666; 
        text-transform: uppercase;
        letter-spacing: 0.5px;
        font-weight: 500;
      }
      .pdf-table-container {
        overflow-x: auto;
        margin-bottom: 20px;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      }
      table { 
        width: 100%; 
        border-collapse: collapse; 
        font-size: 11px; 
        background: white;
      }
      th { 
        background: #4f46e5; 
        color: white; 
        padding: 12px 8px; 
        text-align: left; 
        font-weight: bold;
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      td { 
        border: 1px solid #e5e7eb; 
        padding: 8px; 
        vertical-align: top;
      }
      tr:nth-child(even) { 
        background: #f9fafb; 
      }
      tr:hover { 
        background: #e3f2fd; 
      }
      .status-good { 
        color: #059669; 
        font-weight: bold; 
      }
      .status-medium { 
        color: #d97706; 
        font-weight: bold; 
      }
      .status-low, .status-out { 
        color: #dc2626; 
        font-weight: bold; 
      }
      .status-deleted { 
        color: #6b7280; 
        font-weight: bold; 
      }
      .pdf-footer { 
        text-align: center; 
        font-size: 10px; 
        color: #666; 
        border-top: 1px solid #ddd; 
        padding-top: 15px; 
        margin-top: 30px; 
      }
      
      @media print {
        * {
          print-color-adjust: exact !important;
          -webkit-print-color-adjust: exact !important;
        }
        body { 
          margin: 0; 
        }
        .pdf-container { 
          max-width: none; 
          margin: 0; 
          padding: 10px; 
        }
        table {
          font-size: 9px;
        }
        th, td {
          padding: 6px 4px;
        }
        .pdf-header h1 {
          font-size: 24px;
        }
        .pdf-stat-value {
          font-size: 18px;
        }
        @page {
          margin: 0.5in;
          size: A4;
        }
      }
    `;
  }

  /**
   * Generate summary statistics HTML
   */
  generateSummaryHTML() {
    if (!this.options.includeSummary) return '';

    const totalValue = this.calculateTotalValue();
    
    return `
      <div class="pdf-summary">
        <h3>📊 Summary Statistics</h3>
        <div class="pdf-summary-stats">
          <div class="pdf-stat-item">
            <span class="pdf-stat-value">${this.data.length}</span>
            <div class="pdf-stat-label">Total Items</div>
          </div>
          <div class="pdf-stat-item">
            <span class="pdf-stat-value">$${totalValue.toFixed(2)}</span>
            <div class="pdf-stat-label">Total Value</div>
          </div>
          <div class="pdf-stat-item">
            <span class="pdf-stat-value">${this.stats.low || 0}</span>
            <div class="pdf-stat-label">Low Stock</div>
          </div>
          <div class="pdf-stat-item">
            <span class="pdf-stat-value">${this.stats.out || 0}</span>
            <div class="pdf-stat-label">Out of Stock</div>
          </div>
          <div class="pdf-stat-item">
            <span class="pdf-stat-value">${this.stats.deleted || 0}</span>
            <div class="pdf-stat-label">Old Products</div>
          </div>
          <div class="pdf-stat-item">
            <span class="pdf-stat-value">${this.stats.averageStock || 0}%</span>
            <div class="pdf-stat-label">Avg Stock Level</div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Generate table HTML
   */
  generateTableHTML(data) {
    if (data.length === 0) {
      return '<p>No data to display.</p>';
    }

    const headers = Object.keys(data[0]);
    
    const headerRow = headers.map(header => `<th>${header}</th>`).join('');
    
    const dataRows = data.map(row => {
      const statusClass = this.getStatusClass(row.Status);
      return `<tr>${headers.map(header => {
        const cellClass = header === 'Status' ? statusClass : '';
        const value = row[header] || '';
        return `<td class="${cellClass}">${value}</td>`;
      }).join('')}</tr>`;
    }).join('');

    return `
      <div class="pdf-table-container">
        <table>
          <thead>
            <tr>${headerRow}</tr>
          </thead>
          <tbody>
            ${dataRows}
          </tbody>
        </table>
      </div>
    `;
  }

  /**
   * Get CSS class for status styling
   */
  getStatusClass(status) {
    if (!status) return '';
    
    const statusLower = status.toLowerCase();
    if (statusLower.includes('good')) return 'status-good';
    if (statusLower.includes('medium')) return 'status-medium';
    if (statusLower.includes('low') || statusLower.includes('out')) return 'status-low';
    if (statusLower.includes('deleted')) return 'status-deleted';
    return '';
  }

  /**
   * Generate complete HTML content
   */
  generateHTML() {
    const exportData = this.transformData();
    const currentDate = new Date().toLocaleString('en-NZ');
    const styles = this.generateStyles();
    const summaryHTML = this.generateSummaryHTML();
    const tableHTML = this.generateTableHTML(exportData);

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.options.title}</title>
  <style>${styles}</style>
</head>
<body>
  <div class="pdf-container">
    <div class="pdf-header">
      <h1>📦 ${this.options.title}</h1>
      <p><strong>Generated:</strong> ${currentDate}</p>
      <p><strong>Total Items:</strong> ${exportData.length} inventory items</p>
      ${this.options.filter ? `<p><strong>Filter:</strong> ${this.options.filter}</p>` : ''}
      ${this.options.searchTerm ? `<p><strong>Search:</strong> "${this.options.searchTerm}"</p>` : ''}
    </div>

    ${summaryHTML}

    <div class="pdf-content">
      <h3>📋 Inventory Details</h3>
      ${tableHTML}
    </div>

    <div class="pdf-footer">
      <p><strong>🏪 Vending Machine Admin System</strong> - Inventory Management Report</p>
      <p>Generated on ${new Date().toLocaleDateString('en-NZ')} at ${new Date().toLocaleTimeString('en-NZ')}</p>
      <p>This report contains ${exportData.length} inventory items</p>
    </div>
  </div>
</body>
</html>`;
  }

  /**
   * Create and trigger PDF download
   */
  async export(filename) {
    try {
      const htmlContent = this.generateHTML();
      
      // Create blob with HTML content
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      
      // Create temporary iframe for printing
      const iframe = document.createElement('iframe');
      iframe.style.position = 'absolute';
      iframe.style.left = '-9999px';
      iframe.style.width = '0';
      iframe.style.height = '0';
      document.body.appendChild(iframe);
      
      // Promise to handle iframe loading
      return new Promise((resolve, reject) => {
        const cleanup = () => {
          setTimeout(() => {
            if (iframe.parentNode) {
              document.body.removeChild(iframe);
            }
            URL.revokeObjectURL(url);
          }, 1000);
        };

        iframe.onload = () => {
          setTimeout(() => {
            try {
              const iframeWindow = iframe.contentWindow;
              
              if (iframeWindow) {
                iframeWindow.focus();
                iframeWindow.print();
                cleanup();
                resolve({ 
                  success: true, 
                  message: 'PDF export initiated. Please save the file when prompted.' 
                });
              } else {
                throw new Error('Could not access iframe window');
              }
            } catch (error) {
              console.error('Print error:', error);
              // Fallback: open in new window
              const newWindow = window.open(url, '_blank');
              if (newWindow) {
                newWindow.addEventListener('load', () => {
                  setTimeout(() => {
                    newWindow.print();
                    newWindow.close();
                  }, 500);
                });
                cleanup();
                resolve({ 
                  success: true, 
                  message: 'PDF opened in new window. Please save using browser print.' 
                });
              } else {
                cleanup();
                reject(new Error('Could not open print dialog'));
              }
            }
          }, 500);
        };
        
        iframe.onerror = () => {
          console.log('Iframe failed, falling back to new window');
          const newWindow = window.open('', '_blank');
          if (newWindow) {
            newWindow.document.write(htmlContent);
            newWindow.document.close();
            setTimeout(() => {
              newWindow.print();
            }, 500);
            cleanup();
            resolve({ 
              success: true, 
              message: 'PDF opened in new window. Please save using browser print.' 
            });
          } else {
            cleanup();
            reject(new Error('Could not open new window for PDF export'));
          }
        };
        
        // Load the HTML content
        iframe.src = url;
      });
      
    } catch (error) {
      console.error('PDF export error:', error);
      return { 
        success: false, 
        error: `PDF export failed: ${error.message}` 
      };
    }
  }

  /**
   * Get preview data for the export
   */
  getPreview() {
    const transformedData = this.transformData();
    return {
      format: 'PDF',
      itemCount: transformedData.length,
      pages: Math.ceil(transformedData.length / 25), // Estimate pages
      columns: transformedData.length > 0 ? Object.keys(transformedData[0]) : [],
      features: [
        'Professional formatting with company branding',
        'Summary statistics section',
        'Color-coded status indicators',
        'Print-optimized layout',
        'Automatic page breaks',
        ...(this.options.includeSummary ? ['Summary statistics'] : []),
        ...(this.options.groupByCategory ? ['Grouped by category'] : [])
      ]
    };
  }

  /**
   * Generate preview HTML (smaller version for preview)
   */
  generatePreviewHTML() {
    const exportData = this.transformData().slice(0, 5); // Only first 5 items for preview
    const styles = this.generateStyles();
    const summaryHTML = this.generateSummaryHTML();
    const tableHTML = this.generateTableHTML(exportData);

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PDF Preview - ${this.options.title}</title>
  <style>
    ${styles}
    .preview-note {
      background: #fef3c7;
      border: 1px solid #f59e0b;
      padding: 10px;
      border-radius: 5px;
      margin: 20px 0;
      text-align: center;
      color: #92400e;
      font-weight: 500;
    }
  </style>
</head>
<body>
  <div class="pdf-container">
    <div class="preview-note">
      📄 PDF Preview - Showing first 5 items only
    </div>
    
    <div class="pdf-header">
      <h1>📦 ${this.options.title}</h1>
      <p><strong>Generated:</strong> ${new Date().toLocaleString('en-NZ')}</p>
      <p><strong>Total Items:</strong> ${this.data.length} inventory items</p>
    </div>

    ${summaryHTML}

    <div class="pdf-content">
      <h3>📋 Inventory Details (Preview)</h3>
      ${tableHTML}
      ${this.data.length > 5 ? `<p style="text-align: center; color: #666; font-style: italic;">... and ${this.data.length - 5} more items</p>` : ''}
    </div>

    <div class="pdf-footer">
      <p><strong>🏪 Vending Machine Admin System</strong> - Inventory Management Report</p>
      <p>This is a preview. Full report will contain all ${this.data.length} items.</p>
    </div>
  </div>
</body>
</html>`;
  }
}

/**
 * Utility function to create and export PDF
 */
export const exportToPDF = async (data, options = {}, stats = {}, filename = 'inventory.pdf') => {
  const pdfExporter = new PDFExport(data, options, stats);
  return await pdfExporter.export(filename);
};

/**
 * Get PDF export preview
 */
export const getPDFPreview = (data, options = {}, stats = {}) => {
  const pdfExporter = new PDFExport(data, options, stats);
  return pdfExporter.getPreview();
};

/**
 * Generate PDF preview HTML
 */
export const generatePDFPreviewHTML = (data, options = {}, stats = {}) => {
  const pdfExporter = new PDFExport(data, options, stats);
  return pdfExporter.generatePreviewHTML();
};