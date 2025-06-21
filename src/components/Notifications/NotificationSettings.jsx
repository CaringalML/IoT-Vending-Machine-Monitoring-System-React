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
  VolumeX,
  CheckCircle,
  XCircle
} from 'lucide-react';
import Modal from '../Common/Modal';
import { useNotifications } from '../../context/NotificationContext';
import './NotificationSettings.css';

const NotificationSettings = ({ isOpen, onClose, embedded = false }) => {
  const {
    getSettings,
    updateSettings,
    sendTestNotification,
    requestNotificationPermission,
    permissionStatus,
    unlockAudio, // Get the new function to unlock audio
  } = useNotifications();

  const [settings, setSettings] = useState({
    enabled: true,
    sound: true,
    // The 'desktop' key is now managed by the browser permission status,
    // so we can simplify the state here.
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
  const [localPermissionStatus, setLocalPermissionStatus] = useState(permissionStatus);

  const loadSettings = useCallback(() => {
    try {
      const currentSettings = getSettings();
      setSettings(currentSettings);
      setLocalPermissionStatus(permissionStatus);
    } catch (error) {
      console.error('Error loading notification settings:', error);
    }
  }, [getSettings, permissionStatus]);

  useEffect(() => {
    if (isOpen || embedded) {
      loadSettings();
    }
  }, [isOpen, embedded, loadSettings]);
  
  // --- NEW: Function to handle enabling notifications ---
  // This function is called by the new button. It requests browser
  // permission and unlocks the audio context in one user gesture.
  const handleEnablePushNotifications = async () => {
    // First, unlock the audio context. This MUST be in the same user-initiated event.
    if(unlockAudio) unlockAudio();

    // Then, request notification permission.
    const newPermission = await requestNotificationPermission();
    setLocalPermissionStatus(newPermission);

    // Also, update the main 'enabled' setting
    if (newPermission === 'granted') {
        handleToggle('enabled', true);
    }
  };

  const handleToggle = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value !== undefined ? value : !prev[key]
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
      updateSettings(settings);
      await new Promise(resolve => setTimeout(resolve, 1000));
      if (embedded) {
        alert('Settings saved successfully!');
      } else {
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
      setTimeout(() => setTestNotification(false), 2000);
    } catch (error) {
      console.error('Error sending test notification:', error);
      setTestNotification(false);
    }
  };
  
  const notificationTypes = [
    { key: 'lowStock', label: 'Low Stock Alerts', icon: Package, color: '#ed8936' },
    { key: 'outOfStock', label: 'Out of Stock Alerts', icon: AlertTriangle, color: '#f56565' },
    { key: 'sales', label: 'Sales Notifications', icon: DollarSign, color: '#38a169' },
    { key: 'systemUpdates', label: 'System Updates', icon: Settings, color: '#667eea' }
  ];

  const renderSettingsContent = () => (
    <div className="notification-settings">
      {/* --- NEW: Centralized Permissions Section --- */}
      <div className="settings-section">
        <div className="settings-section-header">
          <Bell size={20} />
          <h3>Push Notifications</h3>
        </div>
        <div className="setting-item permission-control">
          <div className="setting-info">
            <div className="setting-label">
                Browser Push Notifications & Sound
            </div>
            <div className="setting-description">
              {localPermissionStatus === 'granted' && "You will receive push notifications and sound alerts from your browser."}
              {localPermissionStatus === 'denied' && "Permissions are blocked. You must enable them in your browser settings."}
              {localPermissionStatus !== 'granted' && localPermissionStatus !== 'denied' && "Click to allow notifications from this site."}
            </div>
          </div>
          {localPermissionStatus === 'granted' ? (
            <div className="permission-status granted">
              <CheckCircle size={20} />
              <span>Enabled</span>
            </div>
          ) : localPermissionStatus === 'denied' ? (
            <div className="permission-status denied">
              <XCircle size={20} />
              <span>Blocked</span>
            </div>
          ) : (
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleEnablePushNotifications}
            >
              Enable
            </button>
          )}
        </div>
      </div>

      <div className="settings-section">
        <div className="settings-section-header">
          <Settings size={20} />
          <h3>General Settings</h3>
        </div>
        <div className="setting-item">
          <div className="setting-info">
            <div className="setting-label">Master Notification Toggle</div>
            <div className="setting-description">Turn on/off all alert generation</div>
          </div>
          <label className="toggle-switch">
            <input type="checkbox" checked={settings.enabled} onChange={() => handleToggle('enabled')} />
            <span className="toggle-slider"></span>
          </label>
        </div>
        <div className="setting-item">
          <div className="setting-info">
            <div className="setting-label"><Volume2 size={16} /> Sound Alerts</div>
            <div className="setting-description">Play sound when notifications arrive</div>
          </div>
          <label className="toggle-switch">
            <input type="checkbox" checked={settings.sound && settings.enabled} onChange={() => handleToggle('sound')} disabled={!settings.enabled || localPermissionStatus !== 'granted'}/>
            <span className="toggle-slider"></span>
          </label>
        </div>
      </div>

      <div className="settings-section">
        <div className="settings-section-header"><AlertTriangle size={20} /><h3>Notification Types</h3></div>
        {notificationTypes.map(type => (
          <div key={type.key} className="setting-item">
            <div className="setting-info">
              <div className="setting-label"><type.icon size={16} style={{ color: type.color }} />{type.label}</div>
            </div>
            <label className="toggle-switch">
              <input type="checkbox" checked={settings[type.key] && settings.enabled} onChange={() => handleToggle(type.key)} disabled={!settings.enabled}/>
              <span className="toggle-slider"></span>
            </label>
          </div>
        ))}
      </div>

      <div className="settings-section">
        <div className="settings-section-header"><VolumeX size={20} /><h3>Quiet Hours</h3></div>
        <div className="setting-item">
          <div className="setting-info">
            <div className="setting-label">Enable Quiet Hours</div>
            <div className="setting-description">Mute notifications during specified hours</div>
          </div>
          <label className="toggle-switch">
            <input type="checkbox" checked={settings.quietHours.enabled && settings.enabled} onChange={() => handleNestedToggle('quietHours', 'enabled')} disabled={!settings.enabled}/>
            <span className="toggle-slider"></span>
          </label>
        </div>
        {settings.quietHours.enabled && settings.enabled && (
          <div className="quiet-hours-config">
            <div className="time-input-group">
              <div className="time-input-item"><label>Start</label><input type="time" className="form-input" value={settings.quietHours.start} onChange={(e) => handleNestedInputChange('quietHours', 'start', e.target.value)}/></div>
              <div className="time-input-item"><label>End</label><input type="time" className="form-input" value={settings.quietHours.end} onChange={(e) => handleNestedInputChange('quietHours', 'end', e.target.value)}/></div>
            </div>
          </div>
        )}
      </div>

      <div className="settings-section">
        <div className="settings-section-header"><Check size={20} /><h3>Test</h3></div>
        <div className="setting-item">
          <div className="setting-info">
            <div className="setting-label">Send Test Notification</div>
            <div className="setting-description">Verify your settings by sending a test alert.</div>
          </div>
          <button type="button" className="btn btn-secondary" onClick={sendTest} disabled={!settings.enabled || testNotification || localPermissionStatus !== 'granted'}>
            {testNotification ? 'Sending...' : 'Send Test'}
          </button>
        </div>
      </div>

      <div className="settings-actions">
        {!embedded && <button type="button" className="btn btn-secondary" onClick={handleCancel} disabled={saving}>Cancel</button>}
        <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving} style={{ width: embedded ? '100%' : 'auto' }}>
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );

  if (!isOpen && !embedded) return null;
  if (embedded) return renderSettingsContent();
  return <Modal title="Notification Settings" onClose={onClose} size="medium">{renderSettingsContent()}</Modal>;
};

export default NotificationSettings;
