/**
 * PDF Export functionality for inventory data - REFACTORED
 * Uses browser print functionality with a mobile-first approach, inspired by Sales PDF export.
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
   * Main export method. Detects device and calls the appropriate export handler.
   * @param {string} filename - The desired filename for the export.
   */
  async export(filename) {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;

    const completeHTML = this.generateCompleteHTML(isMobile);

    if (isMobile) {
      return this.exportMobilePDF(completeHTML, filename);
    } else {
      return this.exportDesktopPDF(completeHTML);
    }
  }

  /**
   * Handles PDF export on mobile devices by opening the report in a new tab.
   * @param {string} htmlContent - The full HTML of the report.
   * @param {string} filename - The filename for the download.
   */
  exportMobilePDF(htmlContent, filename) {
    try {
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);

      const newWindow = window.open(url, '_blank');
      
      if (newWindow) {
        setTimeout(() => {
          this.showMobileInstructions();
          URL.revokeObjectURL(url);
        }, 1000);
        return { success: true, message: 'PDF export initiated for mobile.' };
      } else {
        throw new Error('Popup blocked. Please enable popups for this site.');
      }
    } catch (error) {
      console.error('Mobile PDF export error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Handles PDF export on desktop devices by opening a print dialog in a new window.
   * @param {string} htmlContent - The full HTML of the report.
   */
  exportDesktopPDF(htmlContent) {
    try {
      const printWindow = window.open('', '_blank', 'width=1000,height=800');
      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        setTimeout(() => {
          printWindow.focus();
          printWindow.print();
          setTimeout(() => printWindow.close(), 200);
        }, 500);
        return { success: true, message: 'PDF export initiated.' };
      } else {
        throw new Error('Popup blocked. Please enable popups for this site.');
      }
    } catch (error) {
      console.error('Desktop PDF export error:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Displays a helpful overlay with instructions for mobile users.
   */
  showMobileInstructions() {
    const overlay = document.createElement('div');
    overlay.style.cssText = `position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 10001; display: flex; align-items: center; justify-content: center; padding: 20px; box-sizing: border-box;`;
    
    const modal = document.createElement('div');
    modal.style.cssText = `background: white; border-radius: 12px; padding: 24px; max-width: 400px; width: 100%; text-align: center; box-shadow: 0 5px 15px rgba(0,0,0,0.3);`;
    
    modal.innerHTML = `
      <div style="font-size: 48px; margin-bottom: 16px;">📱</div>
      <h3 style="margin: 0 0 12px 0; color: #1a202c; font-size: 18px;">Mobile PDF Export</h3>
      <p style="margin: 0 0 20px 0; color: #4a5568; font-size: 14px; line-height: 1.4;">Your report opened in a new tab. To save as a PDF:</p>
      <ol style="text-align: left; color: #4a5568; font-size: 14px; margin: 0 0 24px 0; padding-left: 20px;">
        <li style="margin-bottom: 8px;">Tap your browser's menu (⋮ or Share icon).</li>
        <li style="margin-bottom: 8px;">Select "Print".</li>
        <li style="margin-bottom: 8px;">Choose "Save as PDF" as the destination.</li>
      </ol>
      <button id="mobileInstructionsClose" style="background: #667eea; color: white; border: none; padding: 12px 24px; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; width: 100%;">Got it!</button>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    const close = () => document.body.removeChild(overlay);
    modal.querySelector('#mobileInstructionsClose').onclick = close;
    overlay.onclick = (e) => { if (e.target === overlay) close(); };
  }

  /**
   * Builds the complete HTML document string for the report.
   * @param {boolean} isMobile - Flag indicating if the report is for a mobile device.
   */
  generateCompleteHTML(isMobile = false) {
    const exportData = this.transformData();
    const currentDate = new Date().toLocaleString('en-NZ');
    
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${this.options.title}</title>
        <style>${this.generateStyles(isMobile)}</style>
        ${isMobile ? this.getMobileScripts() : ''}
      </head>
      <body>
        ${isMobile ? this.getMobileHeader() : ''}
        <div class="pdf-container">
          <div class="pdf-header">
            <h1>📦 ${this.options.title}</h1>
            <p><strong>Generated:</strong> ${currentDate}</p>
            <p><strong>Total Items:</strong> ${exportData.length} inventory items</p>
            ${this.options.filter ? `<p><strong>Filter:</strong> ${this.options.filter}</p>` : ''}
            ${this.options.searchTerm ? `<p><strong>Search:</strong> "${this.options.searchTerm}"</p>` : ''}
          </div>
          ${this.generateSummaryHTML()}
          <div class="pdf-content">
            <h3>📋 Inventory Details</h3>
            ${this.generateTableHTML(exportData, isMobile)}
          </div>
          <div class="pdf-footer">
            <p><strong>🏪 Vending Machine Admin System</strong> - Inventory Management Report</p>
            ${isMobile ? '<p><em>Mobile-optimized version - some data may be truncated.</em></p>' : ''}
          </div>
        </div>
      </body>
      </html>
    `;
  }

  getMobileScripts() {
    return `
      <script>
        document.addEventListener('DOMContentLoaded', function() {
          window.addEventListener('beforeprint', function() {
            const header = document.querySelector('.mobile-header');
            if (header) header.style.display = 'none';
          });
          window.addEventListener('afterprint', function() {
            const header = document.querySelector('.mobile-header');
            if (header) header.style.display = 'flex';
          });
        });
      </script>
    `;
  }
  
  getMobileHeader() {
    return `
      <div class="mobile-header">
        <button onclick="window.print()" class="mobile-print-btn">📄 Print / Save PDF</button>
        <button onclick="window.close()" class="mobile-close-btn">✕ Close</button>
      </div>
    `;
  }

  /**
   * Generates the CSS for the PDF report.
   * @param {boolean} isMobile - Flag for mobile-specific styles.
   */
  generateStyles(isMobile = false) {
    return `
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #f1f1f1; color: #333; line-height: 1.4; padding: ${isMobile ? '0' : '20px'}; }
      .pdf-container { max-width: 1200px; margin: auto; padding: ${isMobile ? '20px 15px' : '20px'}; background: white; box-shadow: ${isMobile ? 'none' : '0 0 10px rgba(0,0,0,0.1)'}; }
      .pdf-header { text-align: center; border-bottom: 3px solid #667eea; padding-bottom: 20px; margin-bottom: 25px; }
      .pdf-header h1 { font-size: 28px; color: #1a202c; margin: 0 0 10px; font-weight: 700; }
      .pdf-header p { font-size: 13px; color: #718096; margin: 4px 0; }
      .pdf-summary { background: #f7fafc; padding: 20px; border-radius: 8px; margin-bottom: 25px; border-left: 4px solid #667eea; }
      .pdf-summary h3 { margin-top: 0; color: #2d3748; font-size: 18px; font-weight: 600; }
      .pdf-summary-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 15px; margin-top: 15px; }
      .pdf-stat-item { background: white; padding: 15px; border-radius: 8px; text-align: center; border: 1px solid #e2e8f0; }
      .pdf-stat-value { font-size: 24px; font-weight: bold; color: #667eea; display: block; margin-bottom: 5px; }
      .pdf-stat-label { font-size: 11px; color: #718096; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 500; }
      h3 { font-size: 18px; color: #2d3748; margin-bottom: 15px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; }
      .pdf-table-container { overflow-x: auto; }
      table { width: 100%; border-collapse: collapse; font-size: 11px; }
      th { background: #f7fafc; color: #2d3748; padding: 10px 8px; text-align: left; font-weight: 600; font-size: 11px; text-transform: uppercase; border-bottom: 2px solid #e2e8f0; }
      td { border-bottom: 1px solid #e2e8f0; padding: 8px; vertical-align: top; }
      tr:nth-child(even) { background: #fdfdff; }
      .status-Good { color: #38a169; }
      .status-Medium { color: #dd6b20; }
      .status-Low, .status-Out { color: #c53030; font-weight: 500; }
      .status-Deleted { color: #718096; font-style: italic; }
      .pdf-footer { text-align: center; font-size: 10px; color: #a0aec0; border-top: 1px solid #e2e8f0; padding-top: 15px; margin-top: 30px; }
      .mobile-header { display: flex; justify-content: space-around; padding: 10px; background: #2d3748; color: white; position: sticky; top: 0; z-index: 1001; }
      .mobile-print-btn, .mobile-close-btn { background: #4a5568; color: white; border: none; padding: 10px 15px; border-radius: 6px; font-size: 14px; cursor: pointer; }
      @media print {
        * { print-color-adjust: exact !important; -webkit-print-color-adjust: exact !important; }
        body { margin: 0; padding: 0; }
        .mobile-header { display: none !important; }
        .pdf-container { max-width: none; margin: 0; padding: 10px; box-shadow: none; }
        table { font-size: 9px; }
        th, td { padding: 6px 4px; }
        .pdf-header h1 { font-size: 24px; }
        .pdf-stat-value { font-size: 18px; }
        @page { margin: 0.5in; size: A4; }
      }
    `;
  }
  
  /**
   * Generates the summary statistics HTML block.
   */
  generateSummaryHTML() {
    if (!this.options.includeSummary) return '';
    
    return `
      <div class="pdf-summary">
        <h3>📊 Summary Statistics</h3>
        <div class="pdf-summary-stats">
          <div class="pdf-stat-item"><span class="pdf-stat-value">${this.stats.total || 0}</span><div class="pdf-stat-label">Total Slots</div></div>
          <div class="pdf-stat-item"><span class="pdf-stat-value">${this.stats.low || 0}</span><div class="pdf-stat-label">Low Stock</div></div>
          <div class="pdf-stat-item"><span class="pdf-stat-value">${this.stats.out || 0}</span><div class="pdf-stat-label">Out of Stock</div></div>
          <div class="pdf-stat-item"><span class="pdf-stat-value">${this.stats.deleted || 0}</span><div class="pdf-stat-label">Old Products</div></div>
          <div class="pdf-stat-item"><span class="pdf-stat-value">${this.stats.averageStock || 0}%</span><div class="pdf-stat-label">Avg Stock</div></div>
          <div class="pdf-stat-item"><span class="pdf-stat-value">${formatCurrency(this.stats.totalValue || 0)}</span><div class="pdf-stat-label">Total Value</div></div>
        </div>
      </div>
    `;
  }

  /**
   * Generates the main data table HTML.
   * @param {Array} data - The transformed data to display.
   * @param {boolean} isMobile - Flag for mobile-specific rendering.
   */
  generateTableHTML(data, isMobile = false) {
    if (data.length === 0) return '<p>No data to display.</p>';
    
    const itemsToDisplay = isMobile ? data.slice(0, 100) : data;
    const headers = Object.keys(itemsToDisplay[0] || {});
    
    const headerRow = headers.map(header => `<th>${header}</th>`).join('');
    const dataRows = itemsToDisplay.map(row => {
      const statusClass = this.getStatusClass(row.Status);
      return `<tr>${headers.map(header => {
        const cellClass = header === 'Status' ? `class="${statusClass}"` : '';
        return `<td ${cellClass}>${row[header] || ''}</td>`;
      }).join('')}</tr>`;
    }).join('');

    let footerNote = '';
    if (isMobile && data.length > 100) {
      footerNote = `<tr><td colspan="${headers.length}" style="text-align: center; font-style: italic; color: #718096;">... and ${data.length - 100} more items (truncated for mobile view).</td></tr>`;
    }

    return `
      <div class="pdf-table-container">
        <table>
          <thead><tr>${headerRow}</tr></thead>
          <tbody>${dataRows}${footerNote}</tbody>
        </table>
      </div>
    `;
  }

  // (This is a simplified re-implementation; the original transformData is more robust)
  transformData() {
    let exportData = [...this.data];

    if (!this.options.includeDeletedProducts) {
      exportData = exportData.filter(item => !item.isDeleted);
    }

    if (this.options.groupByCategory) {
      exportData.sort((a, b) => (a.product?.category || 'z').localeCompare(b.product?.category || 'z'));
    }

    return exportData.map(item => ({
      'Slot': item.slot,
      'Product': item.product?.name || 'N/A',
      'Category': item.product?.category || 'N/A',
      'Stock': `${item.quantity} / ${item.maxCapacity || 20}`,
      'Stock %': `${item.stockPercentage}%`,
      'Status': item.statusLabel.replace(` (${item.stockPercentage}%)`, ''),
      'Value': formatCurrency(item.quantity * (item.product?.price || 0)),
      'Last Refilled': item.lastRefilledFormatted || 'Never',
    }));
  }
  
  /**
   * Returns a simplified class name for status styling.
   * @param {string} status - The full status label.
   */
  getStatusClass(status) {
    if (!status) return '';
    const statusLower = status.toLowerCase();
    if (statusLower.includes('good')) return 'status-Good';
    if (statusLower.includes('medium')) return 'status-Medium';
    if (statusLower.includes('low')) return 'status-Low';
    if (statusLower.includes('out')) return 'status-Out';
    if (statusLower.includes('deleted')) return 'status-Deleted';
    return '';
  }

  // (This is a simplified re-implementation for context)
  getPreview() {
    const transformedData = this.transformData();
    return {
      format: 'PDF',
      itemCount: transformedData.length,
      pages: Math.ceil(transformedData.length / 25), // Estimate
      features: [
        'Professional layout',
        'Print optimized',
        'Summary statistics',
        'Mobile-friendly export'
      ]
    };
  }
}

// Helper functions that would be available in the context
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-NZ', {
    style: 'currency',
    currency: 'NZD'
  }).format(amount);
};

export const exportToPDF = async (data, options = {}, stats = {}, filename = 'inventory.pdf') => {
  const pdfExporter = new PDFExport(data, options, stats);
  return await pdfExporter.export(filename);
};

export const getPDFPreview = (data, options = {}, stats = {}) => {
  const pdfExporter = new PDFExport(data, options, stats);
  return pdfExporter.getPreview();
};

export const generatePDFPreviewHTML = (data, options = {}, stats = {}) => {
  const pdfExporter = new PDFExport(data, options, stats);
  return pdfExporter.generatePreviewHTML();
};