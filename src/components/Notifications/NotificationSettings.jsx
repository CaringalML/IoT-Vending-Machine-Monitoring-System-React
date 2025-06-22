// src/components/Notifications/NotificationSettings.jsx - Improved UI Version
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
  XCircle,
  Play,
  Download
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
    unlockAudio,
    testSound,
    setVolume,
    preloadSounds
  } = useNotifications();

  const [settings, setSettings] = useState({
    enabled: true,
    sound: true,
    volume: 0.7,
    soundType: 'files',
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
  const [soundsPreloaded, setSoundsPreloaded] = useState(false);
  const [testingSound, setTestingSound] = useState(null);

  // Load settings on component mount
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

  // Preload sounds when audio is enabled
  useEffect(() => {
    if (settings.sound && settings.enabled && localPermissionStatus === 'granted' && preloadSounds && !soundsPreloaded) {
      preloadSounds().then(() => {
        setSoundsPreloaded(true);
        console.log('Notification sounds preloaded');
      });
    }
  }, [settings.sound, settings.enabled, localPermissionStatus, preloadSounds, soundsPreloaded]);

  const handleEnablePushNotifications = async () => {
    if (unlockAudio) unlockAudio();
    const newPermission = await requestNotificationPermission();
    setLocalPermissionStatus(newPermission);
    if (newPermission === 'granted') {
      handleToggle('enabled', true);
      if (preloadSounds) {
        preloadSounds().then(() => setSoundsPreloaded(true));
      }
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

  const handleVolumeChange = (value) => {
    const volume = parseFloat(value);
    setSettings(prev => ({ ...prev, volume }));
    if (setVolume) {
      setVolume(volume);
    }
  };

  const handleTestSound = async (soundType) => {
    if (!testSound) return;
    
    setTestingSound(soundType);
    try {
      // First unlock audio if needed
      if (unlockAudio) unlockAudio();
      
      // Wait a moment for audio context to unlock
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Test the specific sound type
      await testSound(soundType);
      
      // Auto-clear the testing state after a delay
      setTimeout(() => setTestingSound(null), 1500);
    } catch (error) {
      console.error('Error testing sound:', error);
      setTestingSound(null);
    }
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

  // Sound test configurations with better icons and descriptions
  const soundTests = [
    { 
      key: 'sale', 
      label: 'Sale Complete', 
      icon: '💰', 
      description: 'Cash register chime when items are sold',
      color: '#38a169'
    },
    { 
      key: 'low_stock', 
      label: 'Low Stock Warning', 
      icon: '📦', 
      description: 'Alert beep when inventory runs low',
      color: '#ed8936'
    },
    { 
      key: 'out_of_stock', 
      label: 'Out of Stock Alert', 
      icon: '⚠️', 
      description: 'Urgent tone when slots are empty',
      color: '#f56565'
    },
    { 
      key: 'stock_replenished', 
      label: 'Stock Replenished', 
      icon: '✅', 
      description: 'Success sound when items are restocked',
      color: '#38a169'
    },
    { 
      key: 'medium', 
      label: 'General Notification', 
      icon: '🔔', 
      description: 'Standard notification chime',
      color: '#667eea'
    }
  ];

  const notificationTypes = [
    { key: 'lowStock', label: 'Low Stock Alerts', icon: Package, color: '#ed8936' },
    { key: 'outOfStock', label: 'Out of Stock Alerts', icon: AlertTriangle, color: '#f56565' },
    { key: 'sales', label: 'Sales Notifications', icon: DollarSign, color: '#38a169' },
    { key: 'systemUpdates', label: 'System Updates', icon: Settings, color: '#667eea' }
  ];

  const renderSettingsContent = () => (
    <div className="notification-settings">
      {/* Push Notifications Section */}
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
              <Download size={16} />
              Enable Notifications
            </button>
          )}
        </div>
      </div>

      {/* General Settings */}
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
            <input 
              type="checkbox" 
              checked={settings.enabled} 
              onChange={() => handleToggle('enabled')} 
            />
            <span className="toggle-slider"></span>
          </label>
        </div>
      </div>

      {/* Enhanced Sound Settings */}
      <div className="settings-section">
        <div className="settings-section-header">
          <Volume2 size={20} />
          <h3>Sound Settings</h3>
        </div>
        
        <div className="setting-item">
          <div className="setting-info">
            <div className="setting-label">
              <Volume2 size={16} /> Sound Alerts
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
              disabled={!settings.enabled || localPermissionStatus !== 'granted'}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>

        {settings.sound && settings.enabled && (
          <>
            <div className="setting-item">
              <div className="setting-info">
                <div className="setting-label">Volume Level</div>
                <div className="setting-description">
                  Adjust notification sound volume (affects all sounds)
                </div>
              </div>
              <div className="volume-control">
                <VolumeX size={16} />
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={settings.volume || 0.7}
                  onChange={(e) => handleVolumeChange(e.target.value)}
                  className="volume-slider"
                />
                <Volume2 size={16} />
                <span className="volume-display">
                  {Math.round((settings.volume || 0.7) * 100)}%
                </span>
              </div>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <div className="setting-label">Sound Type</div>
                <div className="setting-description">
                  Choose between internet audio files or browser-generated tones
                </div>
              </div>
              <select
                value={settings.soundType}
                onChange={(e) => handleToggle('soundType', e.target.value)}
                className="form-select"
              >
                <option value="files">Internet Audio Files (Recommended)</option>
                <option value="synthetic">Synthetic Browser Tones</option>
              </select>
            </div>
          </>
        )}
      </div>

      {/* IMPROVED Sound Test Section */}
      {settings.sound && settings.enabled && (
        <div className="settings-section">
          <div className="settings-section-header">
            <Play size={20} />
            <h3>Test Notification Sounds</h3>
          </div>
          <div className="setting-info" style={{ marginBottom: '20px' }}>
            <div className="setting-description">
              Preview different notification sounds at current volume level
              {!soundsPreloaded && settings.soundType === 'files' && (
                <span className="preload-status"> • Loading sounds...</span>
              )}
            </div>
          </div>
          
          <div className="sound-test-grid-improved">
            {soundTests.map(sound => (
              <div
                key={sound.key}
                className={`sound-test-card ${testingSound === sound.key ? 'testing' : ''}`}
                style={{ '--accent-color': sound.color }}
              >
                <div className="sound-card-header">
                  <div className="sound-card-icon">
                    {sound.icon}
                  </div>
                  <div className="sound-card-title">
                    {sound.label}
                  </div>
                </div>
                
                <div className="sound-card-description">
                  {sound.description}
                </div>
                
                <button
                  type="button"
                  className={`sound-test-button ${testingSound === sound.key ? 'testing' : ''}`}
                  onClick={() => handleTestSound(sound.key)}
                  disabled={!settings.enabled || localPermissionStatus !== 'granted' || testingSound === sound.key}
                >
                  {testingSound === sound.key ? (
                    <>
                      <div className="sound-playing-indicator">
                        <div className="sound-wave-dot"></div>
                        <div className="sound-wave-dot"></div>
                        <div className="sound-wave-dot"></div>
                      </div>
                      Playing...
                    </>
                  ) : (
                    <>
                      <Play size={16} />
                      Test Sound
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

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
              Mute notifications during specified hours
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

      {/* Test Section */}
      <div className="settings-section">
        <div className="settings-section-header">
          <Check size={20} />
          <h3>Test Notifications</h3>
        </div>
        <div className="setting-item">
          <div className="setting-info">
            <div className="setting-label">Send Test Notification</div>
            <div className="setting-description">
              Send a complete test notification with sound to verify your settings
            </div>
          </div>
          <button 
            type="button" 
            className="btn btn-secondary" 
            onClick={sendTest} 
            disabled={!settings.enabled || testNotification || localPermissionStatus !== 'granted'}
          >
            {testNotification ? (
              <>
                <div className="loading-spinner small"></div>
                Sending...
              </>
            ) : (
              <>
                <Bell size={16} />
                Send Test
              </>
            )}
          </button>
        </div>
      </div>

      {/* Save Actions */}
      <div className="settings-actions">
        {!embedded && (
          <button 
            type="button" 
            className="btn btn-secondary" 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onClose();
            }} 
            disabled={saving}
          >
            Cancel
          </button>
        )}
        <button 
          type="button" 
          className="btn btn-primary" 
          onClick={handleSave} 
          disabled={saving} 
          style={{ width: embedded ? '100%' : 'auto' }}
        >
          {saving ? (
            <>
              <div className="loading-spinner small"></div>
              Saving...
            </>
          ) : (
            <>
              <Check size={16} />
              Save Settings
            </>
          )}
        </button>
      </div>
    </div>
  );

  if (!isOpen && !embedded) return null;
  if (embedded) return renderSettingsContent();
  
  return (
    <Modal title="Notification Settings" onClose={onClose} size="medium">
      {renderSettingsContent()}
    </Modal>
  );
};

export default NotificationSettings;