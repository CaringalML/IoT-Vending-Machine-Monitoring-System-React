import * as XLSX from 'xlsx';
import { downloadCSV } from '../../../utils/helpers';

/**
 * Excel Export functionality for inventory data
 */
export class ExcelExport {
  constructor(data, options = {}) {
    this.data = data;
    this.options = {
      includeImages: false,
      includeDeletedProducts: true,
      groupByCategory: false,
      includeSummary: true,
      ...options
    };
  }

  /**
   * Transform inventory data for Excel export
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

    // Transform data for Excel
    return exportData.map((item, index) => {
      const baseData = {
        '#': index + 1,
        'Slot': item.slot,
        'Product Name': item.product?.name || 'Unknown Product',
        'Category': item.product?.category || 'Other',
        'SKU': item.product?.sku || 'N/A',
        'Current Stock': item.quantity,
        'Max Capacity': item.maxCapacity || 20,
        'Stock %': item.isDeleted ? 'N/A' : item.stockPercentage,
        'Status': item.statusLabel,
        'Unit Price': item.product?.price || 0,
        'Total Value': item.quantity * (item.product?.price || 0),
        'Low Stock Threshold': item.lowStockThreshold || 5,
        'Last Refilled': item.lastRefilledFormatted || 'Never',
        'Product Active': item.isDeleted ? 'No' : (item.product?.active ? 'Yes' : 'No'),
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
   * Create summary data for Excel
   */
  createSummaryData() {
    const totalItems = this.data.length;
    const activeItems = this.data.filter(item => !item.isDeleted);
    const lowStockItems = activeItems.filter(item => 
      item.quantity > 0 && item.stockPercentage <= 25
    );
    const outOfStockItems = activeItems.filter(item => item.quantity === 0);
    const deletedItems = this.data.filter(item => item.isDeleted);
    
    const totalValue = activeItems.reduce((sum, item) => 
      sum + (item.quantity * (item.product?.price || 0)), 0
    );
    
    const averageStock = activeItems.length > 0 
      ? activeItems.reduce((sum, item) => sum + item.stockPercentage, 0) / activeItems.length
      : 0;

    return [
      ['Metric', 'Value'],
      ['Total Slots', totalItems],
      ['Active Products', activeItems.length],
      ['Low Stock Items', lowStockItems.length],
      ['Out of Stock Items', outOfStockItems.length],
      ['Old Products', deletedItems.length],
      ['Total Inventory Value', `$${totalValue.toFixed(2)}`],
      ['Average Stock Level', `${Math.round(averageStock)}%`],
      ['Generated', new Date().toLocaleString('en-NZ')]
    ];
  }

  /**
   * Calculate optimal column widths
   */
  calculateColumnWidths(data) {
    if (!data || data.length === 0) return [];
    
    const headers = Object.keys(data[0]);
    return headers.map(header => {
      const maxLength = Math.max(
        header.length,
        ...data.map(row => String(row[header] || '').length)
      );
      return { width: Math.min(Math.max(maxLength + 2, 10), 50) };
    });
  }

  /**
   * Apply Excel styling
   */
  applyStyles(worksheet, range) {
    // Style headers
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
      if (!worksheet[cellAddress]) continue;
      
      worksheet[cellAddress].s = {
        font: { bold: true, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "667EEA" } },
        alignment: { horizontal: "center" },
        border: {
          top: { style: "thin", color: { rgb: "000000" } },
          bottom: { style: "thin", color: { rgb: "000000" } },
          left: { style: "thin", color: { rgb: "000000" } },
          right: { style: "thin", color: { rgb: "000000" } }
        }
      };
    }

    // Style data rows with alternating colors
    for (let row = range.s.r + 1; row <= range.e.r; row++) {
      const isEvenRow = row % 2 === 0;
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
        if (!worksheet[cellAddress]) continue;
        
        worksheet[cellAddress].s = {
          fill: { fgColor: { rgb: isEvenRow ? "F8F9FA" : "FFFFFF" } },
          border: {
            top: { style: "thin", color: { rgb: "E2E8F0" } },
            bottom: { style: "thin", color: { rgb: "E2E8F0" } },
            left: { style: "thin", color: { rgb: "E2E8F0" } },
            right: { style: "thin", color: { rgb: "E2E8F0" } }
          }
        };
        
        // Format currency columns
        const header = Object.keys(this.transformData()[0] || {})[col];
        if (header === 'Unit Price' || header === 'Total Value') {
          worksheet[cellAddress].z = '"$"#,##0.00';
        }
        
        // Format percentage columns
        if (header === 'Stock %' && typeof worksheet[cellAddress].v === 'number') {
          worksheet[cellAddress].z = '0"%"';
        }
      }
    }
  }

  /**
   * Export data as Excel file
   */
  async export(filename) {
    try {
      // Check if XLSX is available
      if (typeof XLSX === 'undefined') {
        throw new Error('XLSX library not found');
      }

      const exportData = this.transformData();
      
      if (exportData.length === 0) {
        throw new Error('No data to export');
      }

      // Ensure filename has correct extension
      if (!filename.toLowerCase().endsWith('.xlsx')) {
        filename = filename.replace(/\.[^/.]+$/, '') + '.xlsx';
      }

      // Create workbook
      const workbook = XLSX.utils.book_new();
      
      // Create main data worksheet
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      
      // Calculate and set column widths
      const colWidths = this.calculateColumnWidths(exportData);
      worksheet['!cols'] = colWidths;
      
      // Apply styling
      const range = XLSX.utils.decode_range(worksheet['!ref']);
      this.applyStyles(worksheet, range);
      
      // Add freeze panes (freeze header row)
      worksheet['!freeze'] = { xSplit: 0, ySplit: 1 };
      
      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventory Data');
      
      // Add summary worksheet if requested
      if (this.options.includeSummary) {
        const summaryData = this.createSummaryData();
        const summaryWorksheet = XLSX.utils.aoa_to_sheet(summaryData);
        
        // Style summary worksheet
        summaryWorksheet['!cols'] = [{ width: 25 }, { width: 20 }];
        
        // Style summary headers
        if (summaryWorksheet['A1']) {
          summaryWorksheet['A1'].s = {
            font: { bold: true },
            fill: { fgColor: { rgb: "667EEA" } }
          };
        }
        if (summaryWorksheet['B1']) {
          summaryWorksheet['B1'].s = {
            font: { bold: true },
            fill: { fgColor: { rgb: "667EEA" } }
          };
        }
        
        XLSX.utils.book_append_sheet(workbook, summaryWorksheet, 'Summary');
      }
      
      // Write file with explicit options
      const writeOptions = {
        bookType: 'xlsx',
        type: 'binary'
      };
      
      try {
        XLSX.writeFile(workbook, filename, writeOptions);
        console.log('Excel file exported successfully:', filename);
        return { success: true, message: 'Excel file exported successfully' };
      } catch (writeError) {
        console.error('XLSX writeFile error:', writeError);
        throw new Error(`Failed to write Excel file: ${writeError.message}`);
      }
      
    } catch (error) {
      console.error('Excel export error:', error);
      
      // Fallback to CSV if Excel export fails
      console.log('Falling back to CSV export...');
      const csvData = this.transformData().map(row => {
        const csvRow = { ...row };
        // Convert numeric values back to formatted strings for CSV
        if (typeof csvRow['Unit Price'] === 'number') {
          csvRow['Unit Price'] = `${csvRow['Unit Price'].toFixed(2)}`;
        }
        if (typeof csvRow['Total Value'] === 'number') {
          csvRow['Total Value'] = `${csvRow['Total Value'].toFixed(2)}`;
        }
        if (typeof csvRow['Stock %'] === 'number') {
          csvRow['Stock %'] = `${csvRow['Stock %']}%`;
        }
        return csvRow;
      });
      
      const csvFilename = filename.replace('.xlsx', '.csv');
      downloadCSV(csvData, csvFilename);
      
      return { 
        success: false, 
        error: `Excel export failed: ${error.message}. Downloaded as CSV instead.`
      };
    }
  }

  /**
   * Get preview data for the export
   */
  getPreview() {
    const transformedData = this.transformData();
    return {
      format: 'Excel (.xlsx)',
      itemCount: transformedData.length,
      worksheets: this.options.includeSummary ? ['Inventory Data', 'Summary'] : ['Inventory Data'],
      columns: transformedData.length > 0 ? Object.keys(transformedData[0]) : [],
      features: [
        'Formatted headers with styling',
        'Alternating row colors',
        'Frozen header row',
        'Auto-sized columns',
        'Currency and percentage formatting',
        ...(this.options.includeSummary ? ['Summary worksheet with statistics'] : [])
      ]
    };
  }
}

/**
 * Utility function to create and export Excel file
 */
export const exportToExcel = async (data, options = {}, filename = 'inventory.xlsx') => {
  const excelExporter = new ExcelExport(data, options);
  return await excelExporter.export(filename);
};

/**
 * Get Excel export preview
 */
export const getExcelPreview = (data, options = {}) => {
  const excelExporter = new ExcelExport(data, options);
  return excelExporter.getPreview();
};