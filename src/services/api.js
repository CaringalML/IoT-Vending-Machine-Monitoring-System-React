// API service for external integrations and utilities
import { httpsCallable } from 'firebase/functions';

// Base API configuration
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001';

// HTTP request helper
const apiRequest = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(url, config);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
};

// ESP32 communication functions
export const sendCommandToESP32 = async (machineId, command, payload = {}) => {
  try {
    return await apiRequest('/esp32/command', {
      method: 'POST',
      body: JSON.stringify({
        machineId,
        command,
        payload,
        timestamp: new Date().toISOString()
      })
    });
  } catch (error) {
    console.error('Failed to send command to ESP32:', error);
    throw error;
  }
};

// Analytics and reporting functions
export const generateSalesReport = async (startDate, endDate, format = 'json') => {
  try {
    return await apiRequest('/reports/sales', {
      method: 'POST',
      body: JSON.stringify({
        startDate,
        endDate,
        format
      })
    });
  } catch (error) {
    console.error('Failed to generate sales report:', error);
    throw error;
  }
};

// Inventory management functions
export const checkInventoryLevels = async (machineId) => {
  try {
    return await apiRequest(`/inventory/check/${machineId}`);
  } catch (error) {
    console.error('Failed to check inventory levels:', error);
    throw error;
  }
};

// Payment processing functions
export const processPayment = async (paymentData) => {
  try {
    return await apiRequest('/payments/process', {
      method: 'POST',
      body: JSON.stringify(paymentData)
    });
  } catch (error) {
    console.error('Payment processing failed:', error);
    throw error;
  }
};

// Machine health monitoring
export const getMachineHealth = async (machineId) => {
  try {
    return await apiRequest(`/machines/${machineId}/health`);
  } catch (error) {
    console.error('Failed to get machine health:', error);
    throw error;
  }
};

// Notification services
export const sendNotification = async (type, message, recipients = []) => {
  try {
    return await apiRequest('/notifications/send', {
      method: 'POST',
      body: JSON.stringify({
        type,
        message,
        recipients,
        timestamp: new Date().toISOString()
      })
    });
  } catch (error) {
    console.error('Failed to send notification:', error);
    throw error;
  }
};

// Data export functions
export const exportData = async (dataType, filters = {}) => {
  try {
    return await apiRequest('/export', {
      method: 'POST',
      body: JSON.stringify({
        dataType,
        filters,
        format: 'csv'
      })
    });
  } catch (error) {
    console.error('Data export failed:', error);
    throw error;
  }
};

// Utility functions
export const validateESP32Connection = async (machineId) => {
  try {
    return await apiRequest(`/esp32/ping/${machineId}`);
  } catch (error) {
    console.error('ESP32 connection validation failed:', error);
    return { connected: false, error: error.message };
  }
};

// Default export with all functions
const api = {
  sendCommandToESP32,
  generateSalesReport,
  checkInventoryLevels,
  processPayment,
  getMachineHealth,
  sendNotification,
  exportData,
  validateESP32Connection
};

export default api;