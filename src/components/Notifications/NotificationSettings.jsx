// src/components/Notifications/NotificationSettings.jsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  Bell,
  Check,
  AlertTriangle,
  Package,
  DollarSign,
  Settings,
  Volume2,
  VolumeX
} from 'lucide-react';
import Modal from '../Common/Modal';
import { useNotifications } from '../../context/NotificationContext';
import './NotificationSettings.css'; // Changed from './Notifications.css'

const NotificationSettings = ({ isOpen, onClose, embedded = false }) => {
  const {
    getSettings,
    updateSettings,
    sendTestNotification,
    requestNotificationPermission,
    permissionStatus
  } = useNotifications();

  const [settings, setSettings] = useState({
    enabled: true,
    sound: true,
    desktop: true,
    lowStock: true,
    outOfStock: true,
    sales: false,
    systemUpdates: true,
    lowStockThreshold: 5,
    quietHours: {
      enabled: false,
      start: '22:00',
      end: '08:00'
    }
  });

  const [saving, setSaving] = useState(false);
  const [testNotification, setTestNotification] = useState(false);

  // Wrap loadSettings in useCallback to prevent unnecessary re-renders
  const loadSettings = useCallback(() => {
    try {
      const currentSettings = getSettings();
      setSettings(currentSettings);
    } catch (error) {
      console.error('Error loading notification settings:', error);
    }
  }, [getSettings]);

  useEffect(() => {
    if (isOpen || embedded) {
      loadSettings();
    }
  }, [isOpen, embedded, loadSettings]);

  const handleToggle = (key) => {
    setSettings(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleNestedToggle = (parent, key) => {
    setSettings(prev => ({
      ...prev,
      [parent]: {
        ...prev[parent],
        [key]: !prev[parent][key]
      }
    }));
  };

  const handleInputChange = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleNestedInputChange = (parent, key, value) => {
    setSettings(prev => ({
      ...prev,
      [parent]: {
        ...prev[parent],
        [key]: value
      }
    }));
  };

  const handleCancel = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onClose();
  };

  const handleSave = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    setSaving(true);
    try {
      // Update notification service settings
      updateSettings(settings);

      // Request browser notification permission if desktop notifications are enabled
      if (settings.desktop && settings.enabled && permissionStatus !== 'granted') {
        await requestNotificationPermission();
      }

      await new Promise(resolve => setTimeout(resolve, 1000));

      if (embedded) {
        // Mobile: Show success message and stay on tab
        alert('Settings saved successfully!');
      } else {
        // Desktop: Close modal
        onClose();
      }
    } catch (error) {
      console.error('Error saving notification settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const sendTest = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    setTestNotification(true);

    try {
      await sendTestNotification();

      setTimeout(() => {
        setTestNotification(false);
      }, 2000);
    } catch (error) {
      console.error('Error sending test notification:', error);
      setTestNotification(false);
    }
  };

  const notificationTypes = [
    {
      key: 'lowStock',
      label: 'Low Stock Alerts',
      description: 'When items are running low',
      icon: Package,
      color: '#ed8936'
    },
    {
      key: 'outOfStock',
      label: 'Out of Stock Alerts',
      description: 'When items are completely out',
      icon: AlertTriangle,
      color: '#f56565'
    },
    {
      key: 'sales',
      label: 'Sales Notifications',
      description: 'When purchases are made',
      icon: DollarSign,
      color: '#38a169'
    },
    {
      key: 'systemUpdates',
      label: 'System Updates',
      description: 'System status and updates',
      icon: Settings,
      color: '#667eea'
    }
  ];

  const renderSettingsContent = () => (
    <div className="notification-settings">
      {/* Master Toggle */}
      <div className="settings-section">
        <div className="settings-section-header">
          <Bell size={20} />
          <h3>Notifications</h3>
        </div>

        <div className="setting-item">
          <div className="setting-info">
            <div className="setting-label">Enable Notifications</div>
            <div className="setting-description">
              Turn on/off all notifications
            </div>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={settings.enabled}
              onChange={() => handleToggle('enabled')}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>
      </div>

      {/* Delivery Methods */}
      <div className="settings-section">
        <div className="settings-section-header">
          <Bell size={20} />
          <h3>Delivery Methods</h3>
        </div>

        <div className="setting-item">
          <div className="setting-info">
            <div className="setting-label">
              <Volume2 size={16} />
              Sound Notifications
            </div>
            <div className="setting-description">
              Play sound when notifications arrive
            </div>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={settings.sound && settings.enabled}
              onChange={() => handleToggle('sound')}
              disabled={!settings.enabled}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>

        <div className="setting-item">
          <div className="setting-info">
            <div className="setting-label">
              <Bell size={16} />
              Desktop Notifications
            </div>
            <div className="setting-description">
              Show browser notifications
              {permissionStatus === 'denied' && (
                <span style={{ color: '#f56565', fontSize: '12px', display: 'block' }}>
                  Browser notifications are blocked. Please enable them in your browser settings.
                </span>
              )}
            </div>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={settings.desktop && settings.enabled}
              onChange={() => handleToggle('desktop')}
              disabled={!settings.enabled}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>
      </div>

      {/* Notification Types */}
      <div className="settings-section">
        <div className="settings-section-header">
          <AlertTriangle size={20} />
          <h3>Notification Types</h3>
        </div>

        {notificationTypes.map(type => (
          <div key={type.key} className="setting-item">
            <div className="setting-info">
              <div className="setting-label">
                <type.icon size={16} style={{ color: type.color }} />
                {type.label}
              </div>
              <div className="setting-description">
                {type.description}
              </div>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={settings[type.key] && settings.enabled}
                onChange={() => handleToggle(type.key)}
                disabled={!settings.enabled}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
        ))}
      </div>

      {/* Thresholds */}
      <div className="settings-section">
        <div className="settings-section-header">
          <Settings size={20} />
          <h3>Thresholds</h3>
        </div>

        <div className="setting-item">
          <div className="setting-info">
            <div className="setting-label">Low Stock Threshold</div>
            <div className="setting-description">
              Alert when stock falls below this number
            </div>
          </div>
          <input
            type="number"
            className="form-input"
            style={{ width: '80px' }}
            min="1"
            max="20"
            value={settings.lowStockThreshold}
            onChange={(e) => handleInputChange('lowStockThreshold', parseInt(e.target.value) || 5)}
            disabled={!settings.enabled || !settings.lowStock}
          />
        </div>
      </div>

      {/* Quiet Hours */}
      <div className="settings-section">
        <div className="settings-section-header">
          <VolumeX size={20} />
          <h3>Quiet Hours</h3>
        </div>

        <div className="setting-item">
          <div className="setting-info">
            <div className="setting-label">Enable Quiet Hours</div>
            <div className="setting-description">
              Disable sound notifications during specified hours
            </div>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={settings.quietHours.enabled && settings.enabled}
              onChange={() => handleNestedToggle('quietHours', 'enabled')}
              disabled={!settings.enabled}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>

        {settings.quietHours.enabled && settings.enabled && (
          <div className="quiet-hours-config">
            <div className="time-input-group">
              <div className="time-input-item">
                <label>Start Time</label>
                <input
                  type="time"
                  className="form-input"
                  value={settings.quietHours.start}
                  onChange={(e) => handleNestedInputChange('quietHours', 'start', e.target.value)}
                />
              </div>
              <div className="time-input-item">
                <label>End Time</label>
                <input
                  type="time"
                  className="form-input"
                  value={settings.quietHours.end}
                  onChange={(e) => handleNestedInputChange('quietHours', 'end', e.target.value)}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Test Notification */}
      <div className="settings-section">
        <div className="settings-section-header">
          <Check size={20} />
          <h3>Test</h3>
        </div>

        <div className="setting-item">
          <div className="setting-info">
            <div className="setting-label">Test Notification</div>
            <div className="setting-description">
              Send a test notification to verify your settings
            </div>
          </div>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={sendTest}
            disabled={!settings.enabled || testNotification}
          >
            {testNotification ? (
              <>
                <div className="loading-spinner small"></div>
                Sending...
              </>
            ) : (
              'Send Test'
            )}
          </button>
        </div>
      </div>

      {/* Actions */}
      <div className="settings-actions">
        {!embedded && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleCancel}
            disabled={saving}
            style={{ cursor: 'pointer' }}
          >
            Cancel
          </button>
        )}
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleSave}
          disabled={saving}
          style={{ cursor: 'pointer', width: embedded ? '100%' : 'auto' }}
        >
          {saving ? (
            <>
              <div className="loading-spinner small"></div>
              Saving...
            </>
          ) : (
            'Save Settings'
          )}
        </button>
      </div>
    </div>
  );

  if (!isOpen && !embedded) return null;

  // If embedded (mobile tab), return content directly
  if (embedded) {
    return renderSettingsContent();
  }

  // Otherwise, return content wrapped in modal (desktop)
  return (
    <Modal
      title="Notification Settings"
      onClose={onClose}
      size="medium"
    >
      {renderSettingsContent()}
    </Modal>
  );
};

export default NotificationSettings;