/**
 * Export utilities index file
 * Central export point for all sales export functionality
 */

import CSVExport from './CSVExport';
import ExcelExport from './ExcelExport';
import PDFExport from './PDFExport';

// Export individual classes
export { CSVExport, ExcelExport, PDFExport };

// Export default object with all exporters
const ExportUtilities = {
  CSV: CSVExport,
  Excel: ExcelExport,
  PDF: PDFExport
};

export default ExportUtilities;

/**
 * Utility function to get available export formats
 * @returns {Array} Array of available export format objects
 */
export const getAvailableFormats = () => [
  {
    key: 'csv',
    name: 'CSV',
    description: 'Excel, Sheets compatible',
    icon: 'FileText',
    features: [
      'Universal spreadsheet compatibility',
      'Lightweight file format',
      'Easy to import and manipulate',
      'Compatible with Excel, Google Sheets'
    ]
  },
  {
    key: 'excel',
    name: 'Excel (.xlsx)',
    description: '.xlsx format',
    icon: 'FileSpreadsheet',
    features: [
      'Formatted headers with styling',
      'Multiple worksheets',
      'Advanced formulas and charts',
      'Currency and date formatting',
      'Summary statistics sheet'
    ]
  },
  {
    key: 'pdf',
    name: 'PDF',
    description: 'Print-ready report',
    icon: 'FileImage',
    features: [
      'Professional formatting',
      'Print-optimized layout',
      'Executive summary',
      'Charts and visualizations',
      'Company branding',
      'Mobile-compatible export'
    ]
  }
];

/**
 * Utility function to validate export data
 * @param {Array} data - Data to validate
 * @param {string} format - Export format
 * @returns {Object} Validation result
 */
export const validateExportData = (data, format) => {
  const errors = [];
  
  if (!data || !Array.isArray(data) || data.length === 0) {
    errors.push('No data available to export');
  }
  
  if (!['csv', 'excel', 'pdf'].includes(format)) {
    errors.push(`Unsupported export format: ${format}`);
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Utility function to get export file extension
 * @param {string} format - Export format
 * @returns {string} File extension
 */
export const getFileExtension = (format) => {
  const extensions = {
    csv: '.csv',
    excel: '.xlsx',
    pdf: '.pdf'
  };
  
  return extensions[format] || '.txt';
};

/**
 * Utility function to estimate file size
 * @param {Array} data - Data array
 * @param {string} format - Export format
 * @returns {string} Estimated file size
 */
export const estimateFileSize = (data, format) => {
  if (!data || data.length === 0) return '0 KB';
  
  const baseSizePerRow = {
    csv: 0.1, // KB per row
    excel: 0.2,
    pdf: 0.3
  };
  
  const estimatedSize = data.length * (baseSizePerRow[format] || 0.1);
  
  if (estimatedSize < 1) {
    return `${Math.max(0.1, estimatedSize).toFixed(1)} KB`;
  } else if (estimatedSize < 1000) {
    return `${estimatedSize.toFixed(1)} KB`;
  } else {
    return `${(estimatedSize / 1000).toFixed(1)} MB`;
  }
};

/**
 * Main export function that delegates to appropriate exporter
 * @param {Object} config - Export configuration
 * @param {string} config.format - Export format (csv, excel, pdf)
 * @param {Array} config.data - Data to export
 * @param {Object} config.options - Export options
 * @returns {Promise} Export promise
 */
export const exportData = async (config) => {
  const { format, ...restConfig } = config;
  
  const validation = validateExportData(config.data, format);
  if (!validation.isValid) {
    throw new Error(validation.errors.join(', '));
  }
  
  try {
    switch (format) {
      case 'csv':
        return CSVExport.exportSalesCSV(restConfig);
      case 'excel':
        return ExcelExport.exportSalesExcel(restConfig);
      case 'pdf':
        return PDFExport.exportSalesPDF(restConfig);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  } catch (error) {
    console.error(`Export error (${format}):`, error);
    throw error;
  }
};

/**
 * Export product performance data
 * @param {Object} config - Export configuration
 * @returns {Promise} Export promise
 */
export const exportProductPerformance = async (config) => {
  const { format, ...restConfig } = config;
  
  try {
    switch (format) {
      case 'csv':
        return CSVExport.exportProductPerformanceCSV(restConfig);
      case 'pdf':
        return PDFExport.exportProductPerformancePDF(restConfig);
      default:
        throw new Error(`Product performance export not supported for format: ${format}`);
    }
  } catch (error) {
    console.error(`Product performance export error (${format}):`, error);
    throw error;
  }
};

/**
 * Export inventory data
 * @param {Object} config - Export configuration
 * @returns {Promise} Export promise
 */
export const exportInventory = async (config) => {
  const { format, ...restConfig } = config;
  
  try {
    switch (format) {
      case 'csv':
        return CSVExport.exportInventoryCSV(restConfig);
      case 'excel':
        return ExcelExport.exportInventoryExcel(restConfig);
      default:
        throw new Error(`Inventory export not supported for format: ${format}`);
    }
  } catch (error) {
    console.error(`Inventory export error (${format}):`, error);
    throw error;
  }
};

/**
 * Mobile device detection utility
 * @returns {boolean} True if mobile device detected
 */
export const isMobileDevice = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
         window.innerWidth <= 768;
};

/**
 * Get export recommendations based on device and data size
 * @param {Array} data - Data to export
 * @param {boolean} mobile - Is mobile device
 * @returns {Object} Export recommendations
 */
export const getExportRecommendations = (data, mobile = false) => {
  const dataSize = data?.length || 0;
  
  if (mobile) {
    if (dataSize > 1000) {
      return {
        recommended: 'csv',
        reason: 'CSV format is most reliable on mobile for large datasets',
        alternatives: ['pdf']
      };
    } else {
      return {
        recommended: 'pdf',
        reason: 'PDF format works well on mobile for viewing and sharing',
        alternatives: ['csv', 'excel']
      };
    }
  } else {
    if (dataSize > 5000) {
      return {
        recommended: 'csv',
        reason: 'CSV format handles large datasets efficiently',
        alternatives: ['excel']
      };
    } else {
      return {
        recommended: 'excel',
        reason: 'Excel format provides rich formatting and multiple sheets',
        alternatives: ['pdf', 'csv']
      };
    }
  }
};

/**
 * Format export statistics for display
 * @param {Object} stats - Export statistics
 * @returns {Object} Formatted statistics
 */
export const formatExportStats = (stats) => {
  return {
    ...stats,
    formattedSize: formatFileSize(stats.sizeBytes || 0),
    formattedDuration: formatDuration(stats.durationMs || 0),
    successRate: stats.successful && stats.total ? 
      ((stats.successful / stats.total) * 100).toFixed(1) + '%' : 'N/A'
  };
};

/**
 * Format file size for display
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted file size
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Format duration for display
 * @param {number} ms - Duration in milliseconds
 * @returns {string} Formatted duration
 */
export const formatDuration = (ms) => {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
};

/**
 * Export configuration presets for common use cases
 */
export const EXPORT_PRESETS = {
  BASIC: {
    includeProductDetails: false,
    includeTimestamps: false,
    includePaymentMethods: true,
    includeSummaryStats: false,
    groupByProduct: false,
    groupByDate: false
  },
  DETAILED: {
    includeProductDetails: true,
    includeTimestamps: true,
    includePaymentMethods: true,
    includeSummaryStats: true,
    groupByProduct: false,
    groupByDate: false
  },
  SUMMARY: {
    includeProductDetails: false,
    includeTimestamps: false,
    includePaymentMethods: false,
    includeSummaryStats: true,
    groupByProduct: true,
    groupByDate: false
  },
  ANALYSIS: {
    includeProductDetails: true,
    includeTimestamps: true,
    includePaymentMethods: true,
    includeSummaryStats: true,
    groupByProduct: false,
    groupByDate: true
  }
};

/**
 * Get preset configuration by name
 * @param {string} presetName - Name of the preset
 * @returns {Object} Export configuration
 */
export const getExportPreset = (presetName) => {
  return EXPORT_PRESETS[presetName.toUpperCase()] || EXPORT_PRESETS.BASIC;
};