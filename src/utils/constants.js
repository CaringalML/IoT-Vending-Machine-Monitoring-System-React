// Constants for the vending machine admin system

// Application configuration
export const APP_CONFIG = {
  NAME: 'Vending Machine Admin',
  VERSION: '1.0.0',
  DESCRIPTION: 'IoT Vending Machine Management System',
  AUTHOR: 'Your Company',
  SUPPORT_EMAIL: 'support@yourcompany.com'
};

// Machine configuration
export const MACHINE_CONFIG = {
  DEFAULT_MACHINE_ID: process.env.REACT_APP_MACHINE_ID || 'ESP32_001',
  MAX_MACHINES: 10,
  HEARTBEAT_INTERVAL: 30000, // 30 seconds
  CONNECTION_TIMEOUT: 5000, // 5 seconds
  RETRY_ATTEMPTS: 3
};

// Product categories
export const PRODUCT_CATEGORIES = [
  { value: 'beverages', label: 'Beverages', icon: '🥤' },
  { value: 'snacks', label: 'Snacks', icon: '🍿' },
  { value: 'candy', label: 'Candy', icon: '🍭' },
  { value: 'healthy', label: 'Healthy', icon: '🥗' },
  { value: 'frozen', label: 'Frozen', icon: '🧊' },
  { value: 'hot_drinks', label: 'Hot Drinks', icon: '☕' },
  { value: 'other', label: 'Other', icon: '📦' }
];

// Available slot positions
export const SLOT_POSITIONS = [
  'A1', 'A2', 'A3', 'A4',
  'B1', 'B2', 'B3', 'B4', 
  'C1', 'C2', 'C3', 'C4',
  'D1', 'D2', 'D3', 'D4'
];

// Inventory thresholds
export const INVENTORY_THRESHOLDS = {
  OUT_OF_STOCK: 0,
  LOW_STOCK: 5,
  MEDIUM_STOCK: 10,
  GOOD_STOCK: 15,
  MAX_CAPACITY: 20
};

// Status types
export const STATUS_TYPES = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  LOW: 'low',
  OUT: 'out',
  GOOD: 'good',
  WARNING: 'warning',
  ERROR: 'error',
  SUCCESS: 'success',
  INFO: 'info'
};

// Payment methods
export const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash', icon: '💵' },
  { value: 'card', label: 'Credit/Debit Card', icon: '💳' },
  { value: 'contactless', label: 'Contactless', icon: '📱' },
  { value: 'mobile', label: 'Mobile Payment', icon: '📲' },
  { value: 'voucher', label: 'Voucher', icon: '🎫' }
];

// Currency settings
export const CURRENCY_CONFIG = {
  CODE: 'NZD',
  SYMBOL: '$',
  LOCALE: 'en-NZ',
  DECIMAL_PLACES: 2,
  MIN_PRICE: 0.50,
  MAX_PRICE: 50.00
};

// Date and time formats
export const DATE_FORMATS = {
  SHORT: 'DD/MM/YYYY',
  LONG: 'DD MMMM YYYY',
  WITH_TIME: 'DD/MM/YYYY HH:mm',
  TIME_ONLY: 'HH:mm',
  ISO: 'YYYY-MM-DD',
  DISPLAY: 'MMM DD, YYYY'
};

// Chart colors
export const CHART_COLORS = {
  PRIMARY: '#667eea',
  SECONDARY: '#764ba2',
  SUCCESS: '#48bb78',
  WARNING: '#ed8936',
  DANGER: '#f56565',
  INFO: '#3182ce',
  LIGHT: '#f7fafc',
  DARK: '#2d3748',
  GRADIENT_BLUE: ['#667eea', '#764ba2'],
  GRADIENT_GREEN: ['#11998e', '#38ef7d'],
  GRADIENT_ORANGE: ['#fdbb2d', '#22c1c3'],
  GRADIENT_PINK: ['#f093fb', '#f5576c'],
  GRADIENT_PURPLE: ['#4facfe', '#00f2fe']
};

// Navigation menu items
export const MENU_ITEMS = [
  {
    path: '/dashboard',
    label: 'Dashboard',
    icon: 'LayoutDashboard',
    description: 'Overview and analytics'
  },
  {
    path: '/inventory',
    label: 'Inventory',
    icon: 'Package',
    description: 'Manage stock levels'
  },
  {
    path: '/products',
    label: 'Products',
    icon: 'Coffee',
    description: 'Product catalog'
  },
  {
    path: '/sales',
    label: 'Sales',
    icon: 'BarChart3',
    description: 'Sales analytics'
  }
];

// User roles
export const USER_ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  OPERATOR: 'operator',
  VIEWER: 'viewer'
};

// Permission levels
export const PERMISSIONS = {
  READ: 'read',
  WRITE: 'write',
  DELETE: 'delete',
  ADMIN: 'admin'
};

// API endpoints (if using external API)
export const API_ENDPOINTS = {
  BASE_URL: process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001',
  AUTH: '/auth',
  PRODUCTS: '/products',
  INVENTORY: '/inventory',
  SALES: '/sales',
  MACHINES: '/machines',
  REPORTS: '/reports',
  NOTIFICATIONS: '/notifications'
};

// Error messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network connection error. Please check your internet connection.',
  AUTH_FAILED: 'Authentication failed. Please check your credentials.',
  PERMISSION_DENIED: 'You do not have permission to perform this action.',
  INVALID_INPUT: 'Please check your input and try again.',
  SERVER_ERROR: 'Server error. Please try again later.',
  NOT_FOUND: 'The requested resource was not found.',
  TIMEOUT: 'Request timeout. Please try again.',
  UNKNOWN_ERROR: 'An unexpected error occurred.'
};

// Success messages
export const SUCCESS_MESSAGES = {
  LOGIN_SUCCESS: 'Successfully logged in!',
  LOGOUT_SUCCESS: 'Successfully logged out!',
  PRODUCT_ADDED: 'Product added successfully!',
  PRODUCT_UPDATED: 'Product updated successfully!',
  PRODUCT_DELETED: 'Product deleted successfully!',
  INVENTORY_UPDATED: 'Inventory updated successfully!',
  SETTINGS_SAVED: 'Settings saved successfully!',
  DATA_EXPORTED: 'Data exported successfully!'
};

// Validation rules
export const VALIDATION_RULES = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE: /^[\+]?[0-9\s\-\(\)]{10,}$/,
  PRICE: /^\d+(\.\d{1,2})?$/,
  SLOT: /^[A-Z][0-9]$/,
  PASSWORD_MIN_LENGTH: 6,
  PRODUCT_NAME_MAX_LENGTH: 50,
  DESCRIPTION_MAX_LENGTH: 500
};

// Local storage keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'vending_auth_token',
  USER_PREFERENCES: 'vending_user_prefs',
  THEME: 'vending_theme',
  LANGUAGE: 'vending_language',
  LAST_LOGIN: 'vending_last_login',
  CART: 'vending_cart',
  FILTERS: 'vending_filters'
};

// Theme configuration
export const THEME_CONFIG = {
  LIGHT: 'light',
  DARK: 'dark',
  AUTO: 'auto',
  COLORS: {
    LIGHT: {
      PRIMARY: '#667eea',
      BACKGROUND: '#ffffff',
      SURFACE: '#f7fafc',
      TEXT: '#2d3748'
    },
    DARK: {
      PRIMARY: '#667eea',
      BACKGROUND: '#1a202c',
      SURFACE: '#2d3748',
      TEXT: '#e2e8f0'
    }
  }
};

// Animation durations (in milliseconds)
export const ANIMATION_DURATIONS = {
  FAST: 150,
  NORMAL: 300,
  SLOW: 500,
  VERY_SLOW: 1000
};

// Breakpoints for responsive design
export const BREAKPOINTS = {
  XS: '480px',
  SM: '640px',
  MD: '768px',
  LG: '1024px',
  XL: '1280px',
  XXL: '1536px'
};

// File upload configuration
export const UPLOAD_CONFIG = {
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  ALLOWED_DOCUMENT_TYPES: ['application/pdf', 'text/csv', 'application/vnd.ms-excel'],
  MAX_FILES: 10
};

// Notification types
export const NOTIFICATION_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info',
  LOW_STOCK: 'low_stock',
  OUT_OF_STOCK: 'out_of_stock',
  MACHINE_OFFLINE: 'machine_offline',
  PAYMENT_FAILED: 'payment_failed'
};

// Export all constants as default
const constants = {
  APP_CONFIG,
  MACHINE_CONFIG,
  PRODUCT_CATEGORIES,
  SLOT_POSITIONS,
  INVENTORY_THRESHOLDS,
  STATUS_TYPES,
  PAYMENT_METHODS,
  CURRENCY_CONFIG,
  DATE_FORMATS,
  CHART_COLORS,
  MENU_ITEMS,
  USER_ROLES,
  PERMISSIONS,
  API_ENDPOINTS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  VALIDATION_RULES,
  STORAGE_KEYS,
  THEME_CONFIG,
  ANIMATION_DURATIONS,
  BREAKPOINTS,
  UPLOAD_CONFIG,
  NOTIFICATION_TYPES
};

export default constants;