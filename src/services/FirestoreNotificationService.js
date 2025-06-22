// src/services/FirestoreNotificationService.js
// COMPLETE FINAL FIXED VERSION with CORRECT SOUND MAPPING
// Uses local files from public/assets/sounds/ directory
// PART 1 of 3 - FINAL FIXED

import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  writeBatch,
  getDocs
} from 'firebase/firestore';
import { db } from './firebase';

class FirestoreNotificationService {
  constructor() {
    this.notifications = [];
    this.listeners = [];
    this.settings = this.loadSettings();
    this.unsubscribeNotifications = null;
    this.unsubscribeInventory = null;
    this.unsubscribeProducts = null;
    this.unsubscribeSales = null;
    this.currentUserId = null;
    this.inventory = [];
    this.products = [];
    this.previousInventory = [];
    this.previousSales = [];
    this.isInitialized = false;

    // Audio management
    this.audioContext = null;
    this.isAudioUnlocked = false;
    this.audioFiles = {};
    this.soundsPreloaded = false;
    this.audioLoadAttempts = {};

    // Initialize audio files
    this.loadAudioFiles();
  }

  // ===============================
  // FIXED AUDIO SYSTEM WITH CORRECT SOUND MAPPING
  // ===============================

  // FIXED - Load audio files from local public/assets/sounds/ directory with CORRECT MAPPING
  loadAudioFiles() {
    console.log('🎵 Loading notification sounds from local files...');

    // FIXED: Map notification types to your actual sound files with CORRECT GENERAL NOTIFICATION MAPPING
    const soundFiles = {
      // Specific notification types to actual files
      sale: '/assets/sounds/sales.mp3',
      low_stock: '/assets/sounds/low-stock.mp3',
      out_of_stock: '/assets/sounds/out-of-stock.mp3',
      stock_replenished: '/assets/sounds/restocked.mp3',
      
      // FIXED: General notifications should use notification.mp3, not low-stock
      high: '/assets/sounds/notification.mp3',
      medium: '/assets/sounds/notification.mp3',
      low: '/assets/sounds/notification.mp3',  // FIXED: was low-stock.mp3
      success: '/assets/sounds/restocked.mp3',
      warning: '/assets/sounds/out-of-stock.mp3',
      system: '/assets/sounds/notification.mp3'
    };

    // Base64 encoded backup sounds - DIFFERENT for each type (fallback only)
    const backupSounds = {
      // Cash register simulation (high-low-high pattern)
      sale: this.generateBase64Sound([800, 1200, 800], [0.1, 0.1, 0.15]),

      // Warning beep (medium tone repeating)
      low_stock: this.generateBase64Sound([600, 400, 600], [0.1, 0.1, 0.1]),

      // Urgent alert (low rapid beeps)
      out_of_stock: this.generateBase64Sound([300, 200, 300, 200], [0.08, 0.08, 0.08, 0.08]),

      // Success ascending tones
      stock_replenished: this.generateBase64Sound([400, 600, 800], [0.12, 0.12, 0.2]),

      // FIXED: Priority-based patterns - all general notifications use gentle tones
      high: this.generateBase64Sound([750, 900], [0.15, 0.2]),      // Gentle but attention-getting
      medium: this.generateBase64Sound([650, 800], [0.15, 0.2]),   // Standard notification
      low: this.generateBase64Sound([550, 650], [0.2, 0.25]),      // Gentle notification
      system: this.generateBase64Sound([650, 800], [0.15, 0.2])    // Same as medium
    };

    // Load sounds with enhanced fallback strategy
    Object.entries(soundFiles).forEach(([key, src]) => {
      this.loadAudioFileWithBackup(key, src, backupSounds[key]);
    });
  }

  // Generate unique base64 sounds for each notification type (fallback only)
  generateBase64Sound(frequencies, durations) {
    // Create a unique identifier for different sound patterns
    const patternId = frequencies.join('-') + durations.join('-');

    // Return a unique data URL that will be handled by synthetic sounds
    return `data:audio/synthetic;pattern=${patternId}`;
  }

  // FIXED - Enhanced audio file loading with better local file handling
  loadAudioFileWithBackup(key, primarySrc, syntheticPattern = null) {
    try {
      console.log(`🔊 Loading local sound: ${key} from ${primarySrc}`);

      const audio = new Audio();
      audio.preload = 'auto';
      audio.volume = this.settings?.volume || 0.7;
      
      // Set loading timeout
      const loadTimeout = setTimeout(() => {
        console.warn(`⏰ Loading timeout for ${key}, using fallback`);
        this.handleAudioLoadFailure(key, syntheticPattern);
      }, 10000);

      // Success handler
      const handleSuccess = () => {
        clearTimeout(loadTimeout);
        console.log(`✅ Successfully loaded local file: ${key}`);
        audio.removeEventListener('canplaythrough', handleSuccess);
        audio.removeEventListener('error', handleError);
        audio.removeEventListener('loadeddata', handleSuccess);
      };

      // FIXED - Error handler (no audio context dependency)
      const handleError = (e) => {
        clearTimeout(loadTimeout);
        console.warn(`❌ Failed to load local file ${key}:`, e);
        console.warn(`   File path: ${primarySrc}`);
        audio.removeEventListener('canplaythrough', handleSuccess);
        audio.removeEventListener('error', handleError);
        audio.removeEventListener('loadeddata', handleSuccess);
        
        // Don't try to create audio context here - just mark as failed
        this.handleAudioLoadFailure(key, syntheticPattern);
      };

      // Listen for both events to ensure we catch successful loads
      audio.addEventListener('canplaythrough', handleSuccess, { once: true });
      audio.addEventListener('loadeddata', handleSuccess, { once: true });
      audio.addEventListener('error', handleError, { once: true });

      // Set the source to trigger loading
      audio.src = primarySrc;
      this.audioFiles[key] = audio;

      // Track load attempts
      this.audioLoadAttempts[key] = (this.audioLoadAttempts[key] || 0) + 1;

    } catch (error) {
      console.error(`💥 Exception loading local file ${key}:`, error);
      this.handleAudioLoadFailure(key, syntheticPattern);
    }
  }

  // FIXED - Handle audio loading failures with synthetic fallback
  handleAudioLoadFailure(key, syntheticPattern) {
    console.log(`🎛️ Using synthetic sound for: ${key} (local file failed to load)`);

    // Mark as synthetic sound type - Don't try to create audio context here
    this.audioFiles[key] = {
      type: 'synthetic',
      key: key,
      pattern: syntheticPattern,
      play: () => this.playSyntheticSoundForKey(key)
    };
  }

  // FIXED - Play synthetic sound for specific key
  playSyntheticSoundForKey(key) {
    // Check if audio context is available, if not just return resolved promise
    if (!this.isAudioUnlocked || !this.audioContext) {
      console.log('🔒 Audio context not available for synthetic sound - skipping playback');
      return Promise.resolve(); // Return resolved promise instead of rejected
    }

    return new Promise((resolve, reject) => {
      try {
        console.log(`🎛️ Playing synthetic sound: ${key}`);

        const audioCtx = this.audioContext;

        // DIFFERENT frequency patterns for each notification type
        const syntheticPatterns = {
          'sale': {
            frequencies: [800, 1200, 800, 600],
            durations: [0.1, 0.1, 0.1, 0.15],
            waveType: 'square',
            description: 'Cash register pattern'
          },
          'low_stock': {
            frequencies: [600, 400, 600],
            durations: [0.12, 0.08, 0.12],
            waveType: 'sawtooth',
            description: 'Warning pattern'
          },
          'out_of_stock': {
            frequencies: [300, 200, 300, 200, 300],
            durations: [0.08, 0.06, 0.08, 0.06, 0.1],
            waveType: 'square',
            description: 'Urgent pattern'
          },
          'stock_replenished': {
            frequencies: [400, 500, 650, 800],
            durations: [0.1, 0.1, 0.1, 0.2],
            waveType: 'sine',
            description: 'Success pattern'
          },
          // FIXED: Gentle patterns for general notifications
          'high': {
            frequencies: [750, 900],
            durations: [0.15, 0.2],
            waveType: 'sine',
            description: 'Gentle attention pattern'
          },
          'medium': {
            frequencies: [650, 800],
            durations: [0.15, 0.2],
            waveType: 'sine',
            description: 'Standard notification pattern'
          },
          'low': {
            frequencies: [550, 650],
            durations: [0.2, 0.25],
            waveType: 'sine',
            description: 'Gentle notification pattern'
          },
          'system': {
            frequencies: [650, 800],
            durations: [0.15, 0.2],
            waveType: 'sine',
            description: 'System notification pattern'
          }
        };

        const pattern = syntheticPatterns[key] || syntheticPatterns.medium;
        const volume = (this.settings?.volume || 0.7) * 0.3;

        console.log(`🎵 Synthetic pattern for ${key}:`, pattern);

        // Create audio nodes
        const gainNode = audioCtx.createGain();
        gainNode.connect(audioCtx.destination);
        gainNode.gain.setValueAtTime(0, audioCtx.currentTime);

        const oscillator = audioCtx.createOscillator();
        oscillator.connect(gainNode);
        oscillator.type = pattern.waveType;

        // Schedule frequency changes
        let currentTime = audioCtx.currentTime;
        pattern.frequencies.forEach((freq, index) => {
          oscillator.frequency.setValueAtTime(freq, currentTime);

          // Volume envelope for each tone
          gainNode.gain.setValueAtTime(0, currentTime);
          gainNode.gain.linearRampToValueAtTime(volume, currentTime + 0.01);
          gainNode.gain.exponentialRampToValueAtTime(0.001,
            currentTime + pattern.durations[index] - 0.01);

          currentTime += pattern.durations[index];
        });

        oscillator.start(audioCtx.currentTime);
        oscillator.stop(currentTime);

        oscillator.onended = () => {
          console.log(`✅ Synthetic sound completed: ${key}`);
          resolve();
        };

      } catch (error) {
        console.error(`💥 Error in synthetic sound for ${key}:`, error);
        resolve(); // Resolve instead of reject to prevent cascading errors
      }
    });
  }

  // FIXED - Add method to safely initialize audio context only when needed
  initializeAudioContextSafely() {
    if (this.audioContext) {
      return true; // Already initialized
    }

    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      console.log(`🎧 AudioContext created safely, state: ${this.audioContext.state}`);

      if (this.audioContext.state === 'suspended') {
        // Don't try to resume immediately - wait for user interaction
        console.log('🔒 AudioContext created but suspended - user interaction required');
        return false;
      } else {
        this.isAudioUnlocked = true;
        console.log('✅ Audio context created and ready');
        return true;
      }
    } catch (e) {
      console.error('❌ Could not create AudioContext:', e);
      return false;
    }
  }

  // FIXED - Enhanced audio context unlocking
  unlockAudio() {
    console.log('🔓 Unlocking audio context...');

    // Try to initialize audio context safely first
    if (!this.audioContext && !this.initializeAudioContextSafely()) {
      console.log('🔒 Audio context initialization failed');
      return;
    }

    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume().then(() => {
        this.isAudioUnlocked = true;
        console.log('✅ Audio context resumed and unlocked');
      }).catch(error => {
        console.error('❌ Failed to resume audio context:', error);
      });
    } else {
      this.isAudioUnlocked = true;
      console.log('✅ Audio context already unlocked');
    }
  }

  // FIXED - Enhanced notification sound playing with better error handling
  playNotificationSound(notification) {
    if (!this.settings.sound || !this.canPlaySound()) {
      console.log('🔇 Sound disabled or in quiet hours, skipping playback');
      return;
    }

    console.log('🎵 Playing notification sound for:', {
      type: notification.type,
      priority: notification.priority,
      title: notification.title
    });

    // Ensure audio is unlocked - but don't fail if it's not
    if (!this.isAudioUnlocked) {
      console.log('🔒 Audio not unlocked, attempting to unlock...');
      this.unlockAudio();
      
      // If audio still not unlocked, just log and continue
      if (!this.isAudioUnlocked) {
        console.log('🔒 Audio unlock failed - user interaction required first');
        return;
      }
    }

    // Try to play local audio file first (unless user prefers synthetic)
    if (this.settings.soundType !== 'synthetic' && this.playAudioFile(notification)) {
      return; // Successfully played local audio file
    }

    // Fallback to synthetic sounds - but only if audio context is available
    if (this.isAudioUnlocked && this.audioContext) {
      console.log('🔄 Falling back to synthetic sound');
      this.playSyntheticSound(notification);
    } else {
      console.log('🔒 Cannot play fallback sound - audio context not available');
    }
  }

  // PART 2 of 3 - FINAL FIXED FirestoreNotificationService.js
// Audio file playback, sound selection, and settings management - WITH CORRECT SOUND MAPPING

  // FIXED - Enhanced audio file playback with better synthetic support
  playAudioFile(notification) {
    try {
      let soundKey = this.selectSoundKey(notification);
      let audio = this.audioFiles[soundKey];

      console.log(`🎯 Selected sound key: ${soundKey} for type: ${notification.type}`);

      // Try fallback sounds if primary doesn't exist
      if (!audio) {
        console.log(`⚠️ Sound ${soundKey} not available, trying fallbacks...`);
        const fallbackKeys = this.getFallbackSounds(notification);

        for (const key of fallbackKeys) {
          audio = this.audioFiles[key];
          if (audio) {
            soundKey = key;
            console.log(`✅ Using fallback sound: ${key}`);
            break;
          }
        }
      }

      if (audio) {
        console.log(`🎵 Playing sound: ${soundKey}`);

        // FIXED - Handle synthetic sounds - but only if audio context is ready
        if (audio.type === 'synthetic') {
          if (this.isAudioUnlocked && this.audioContext) {
            return audio.play().then(() => true).catch((error) => {
              console.warn('Synthetic sound playback failed:', error);
              return false;
            });
          } else {
            console.log('🔒 Synthetic sound skipped - audio context not ready');
            return false;
          }
        }

        // Handle regular audio files
        if (audio.play) {
          audio.currentTime = 0;
          audio.volume = Math.max(0, Math.min(1, this.settings?.volume || 0.7));

          const playPromise = audio.play();
          if (playPromise !== undefined) {
            playPromise
              .then(() => console.log(`✅ Local audio file played: ${soundKey}`))
              .catch(error => {
                console.warn(`❌ Local audio playback failed: ${soundKey}`, error);
                // FIXED - Only try synthetic fallback if audio context is ready
                if (this.isAudioUnlocked && this.audioContext) {
                  this.playSyntheticSoundForKey(soundKey);
                }
              });
          }
          return true;
        }
      }

      console.log(`❌ No audio available for: ${soundKey}`);
      return false;

    } catch (error) {
      console.error('💥 Exception in playAudioFile:', error);
      return false;
    }
  }

  // Enhanced sound selection with better debugging
  selectSoundKey(notification) {
    console.log(`🎯 Selecting sound for notification:`, {
      type: notification.type,
      priority: notification.priority
    });

    // Priority: notification type > priority > default
    const typeMap = {
      'sale': 'sale',
      'low_stock': 'low_stock',
      'out_of_stock': 'out_of_stock',
      'stock_replenished': 'stock_replenished',
      'system': 'system'
    };

    if (notification.type && typeMap[notification.type]) {
      const selectedKey = typeMap[notification.type];
      console.log(`✅ Selected by type: ${notification.type} -> ${selectedKey}`);
      return selectedKey;
    }

    // Fall back to priority-based selection
    const priorityMap = {
      'high': 'high',
      'medium': 'medium',
      'low': 'low'
    };

    const fallbackKey = priorityMap[notification.priority] || 'medium';
    console.log(`⚠️ Selected by priority fallback: ${notification.priority} -> ${fallbackKey}`);
    return fallbackKey;
  }

  // Enhanced fallback sound options
  getFallbackSounds(notification) {
    const fallbacks = [];

    console.log(`🔄 Getting fallback sounds for:`, {
      type: notification.type,
      priority: notification.priority
    });

    // Add priority-based fallbacks
    if (notification.priority === 'high') {
      fallbacks.push('warning', 'high', 'medium');
    } else if (notification.priority === 'low') {
      fallbacks.push('success', 'low', 'medium');
    } else {
      fallbacks.push('medium', 'low', 'high');
    }

    // Add general fallbacks
    fallbacks.push('medium', 'low', 'high');

    const uniqueFallbacks = [...new Set(fallbacks)]; // Remove duplicates
    console.log(`📋 Fallback order: ${uniqueFallbacks.join(' -> ')}`);

    return uniqueFallbacks;
  }

  // FIXED - Enhanced synthetic sound generation for fallback
  playSyntheticSound(notification) {
    if (!this.isAudioUnlocked || !this.audioContext) {
      console.log('🔒 Audio context not available for synthetic sound, skipping');
      return;
    }

    try {
      console.log(`🎛️ Playing synthetic fallback sound for: ${notification.type || notification.priority}`);

      // Get the sound key and play the specific synthetic pattern
      const soundKey = this.selectSoundKey(notification);
      this.playSyntheticSoundForKey(soundKey);

    } catch (error) {
      console.error('💥 Error playing synthetic fallback sound:', error);
    }
  }

  // ===============================
  // FIXED VOLUME AND SETTINGS MANAGEMENT (NO CIRCULAR DEPENDENCIES)
  // ===============================

  // Fixed volume control without circular dependency
  setVolume(volume) {
    const vol = Math.max(0, Math.min(1, parseFloat(volume) || 0.7)); // Clamp and validate

    console.log(`🔊 Setting volume to: ${Math.round(vol * 100)}%`);

    // Update all loaded audio files
    let updatedCount = 0;
    Object.entries(this.audioFiles).forEach(([key, audio]) => {
      if (audio && audio !== null && typeof audio.volume !== 'undefined') {
        audio.volume = vol;
        updatedCount++;
      }
    });

    console.log(`🔊 Updated volume for ${updatedCount} audio files`);

    // Save volume preference directly without calling updateSettings
    this.settings.volume = vol;
    this.saveSettingsToStorage();
  }

  // Fixed updateSettings method without calling setVolume
  updateSettings(newSettings) {
    console.log('⚙️ Updating notification settings:', newSettings);

    const oldVolume = this.settings.volume;

    // Update settings object
    this.settings = { ...this.settings, ...newSettings };

    // Save to storage
    this.saveSettingsToStorage();

    // Only update audio file volumes if volume actually changed and it's not coming from setVolume
    if (newSettings.volume !== undefined && newSettings.volume !== oldVolume) {
      this.updateAudioVolumes(newSettings.volume);
    }
  }

  // Separate method to save settings to storage
  saveSettingsToStorage() {
    try {
      localStorage.setItem('notificationSettings', JSON.stringify(this.settings));
      console.log('✅ Settings saved to localStorage');
    } catch (error) {
      console.error('❌ Failed to save settings:', error);
    }
  }

  // Separate method to update audio volumes (called only when needed)
  updateAudioVolumes(volume) {
    const vol = Math.max(0, Math.min(1, parseFloat(volume) || 0.7));

    console.log(`🔊 Updating audio volumes to: ${Math.round(vol * 100)}%`);

    let updatedCount = 0;
    Object.entries(this.audioFiles).forEach(([key, audio]) => {
      if (audio && audio !== null && typeof audio.volume !== 'undefined') {
        audio.volume = vol;
        updatedCount++;
      }
    });

    console.log(`🔊 Updated volume for ${updatedCount} audio files`);
  }

  // Load settings with comprehensive defaults
  loadSettings() {
    try {
      const saved = localStorage.getItem('notificationSettings');
      const defaultSettings = {
        enabled: true,
        sound: true,
        volume: 0.7,
        soundType: 'files', // 'files' or 'synthetic'
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
      };

      if (saved) {
        const parsedSettings = JSON.parse(saved);
        // Merge with defaults to ensure all properties exist
        return { ...defaultSettings, ...parsedSettings };
      }

      return defaultSettings;
    } catch (error) {
      console.error('Error loading notification settings:', error);
      return {
        enabled: true,
        sound: true,
        volume: 0.7,
        soundType: 'files',
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
      };
    }
  }

  getSettings() {
    return this.settings;
  }

  // ===============================
  // ENHANCED SOUND TESTING METHODS WITH CORRECT MAPPING - FIXED
  // ===============================

  // FIXED - Enhanced sound testing with comprehensive debugging for local files
  async testSound(soundType = 'medium') {
    console.log(`\n🧪 === TESTING LOCAL SOUND: ${soundType.toUpperCase()} ===`);

    // First try to unlock audio if needed
    if (!this.isAudioUnlocked) {
      console.log('🔓 Unlocking audio for test...');
      this.unlockAudio();
      // Wait a moment for audio context to unlock
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    // Check audio system status
    const audioStatus = this.getAudioStatus();
    console.log('🎧 Audio System Status:', audioStatus);

    // Create a test notification with the specific type
    const testNotification = {
      type: soundType,
      priority: soundType === 'high' || soundType === 'out_of_stock' ? 'high' :
        soundType === 'low' || soundType === 'low_stock' ? 'medium' : 'low',
      title: `Test ${soundType} Notification`,
      message: `Testing ${soundType} sound from local file`
    };

    console.log(`📋 Test notification created:`, testNotification);

    // Get the selected sound key
    const selectedKey = this.selectSoundKey(testNotification);
    console.log(`🎯 Selected sound key: ${selectedKey}`);

    // Show which file should be playing - FIXED MAPPING
    const soundMapping = {
      sale: 'sales.mp3',
      low_stock: 'low-stock.mp3',
      out_of_stock: 'out-of-stock.mp3',
      stock_replenished: 'restocked.mp3',
      high: 'notification.mp3',     // FIXED
      medium: 'notification.mp3',   // FIXED
      low: 'notification.mp3',      // FIXED: was low-stock.mp3
      system: 'notification.mp3'    // FIXED
    };
    
    console.log(`📁 Should play: /assets/sounds/${soundMapping[selectedKey] || 'notification.mp3'}`);

    // Check if the audio file exists and its status
    const audioFile = this.audioFiles[selectedKey];
    console.log(`🎧 Local audio file status for ${selectedKey}:`, {
      exists: !!audioFile,
      type: audioFile?.type || 'local audio file',
      readyState: audioFile?.readyState,
      networkState: audioFile?.networkState,
      duration: audioFile?.duration,
      volume: audioFile?.volume,
      src: audioFile?.src
    });

    // Check fallback options
    if (!audioFile || audioFile === null) {
      const fallbacks = this.getFallbackSounds(testNotification);
      console.log(`🔄 Checking fallback sounds: ${fallbacks.join(', ')}`);

      fallbacks.forEach(fallbackKey => {
        const fallbackAudio = this.audioFiles[fallbackKey];
        console.log(`  - ${fallbackKey}: ${fallbackAudio ? 'available' : 'not available'}`);
      });
    }

    // Try to play the sound
    console.log('🎵 Attempting to play local sound...');
    this.playNotificationSound(testNotification);

    console.log(`✅ Test sound request completed for: ${soundType}`);
  }

  // FIXED - Test all local sound files with correct mapping
  async testAllLocalSounds() {
    const soundTypes = ['sale', 'low_stock', 'out_of_stock', 'stock_replenished', 'medium'];

    console.log('🧪 === TESTING ALL LOCAL NOTIFICATION SOUNDS ===');
    console.log(`📋 Testing sequence: ${soundTypes.join(' -> ')}`);
    console.log('🎵 These should play your local MP3 files from /assets/sounds/');

    // Ensure audio is unlocked first
    if (!this.isAudioUnlocked) {
      console.log('🔓 Unlocking audio before testing...');
      this.unlockAudio();
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    for (let i = 0; i < soundTypes.length; i++) {
      const soundType = soundTypes[i];
      console.log(`\n🎵 Testing local sound ${i + 1}/${soundTypes.length}: ${soundType}`);
      
      // FIXED - Show which file should be playing with correct mapping
      const soundMapping = {
        sale: 'sales.mp3',
        low_stock: 'low-stock.mp3',
        out_of_stock: 'out-of-stock.mp3',
        stock_replenished: 'restocked.mp3',
        medium: 'notification.mp3'  // FIXED: general notifications use notification.mp3
      };
      
      console.log(`📁 Should play: /assets/sounds/${soundMapping[soundType]}`);
      
      await this.testSound(soundType);

      // Wait between sounds to hear the difference
      if (i < soundTypes.length - 1) {
        console.log('⏳ Waiting 2 seconds before next test...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    console.log('\n✅ All local sound tests completed!');
    console.log('📊 Final audio status:', this.getAudioStatus());
  }

  // FIXED - Check local file loading status with correct mapping
  getLocalFileStatus() {
    const status = {};
    // FIXED: Corrected expected files mapping
    const expectedFiles = {
      sale: '/assets/sounds/sales.mp3',
      low_stock: '/assets/sounds/low-stock.mp3',
      out_of_stock: '/assets/sounds/out-of-stock.mp3',
      stock_replenished: '/assets/sounds/restocked.mp3',
      
      // FIXED: All general notifications should use notification.mp3
      high: '/assets/sounds/notification.mp3',
      medium: '/assets/sounds/notification.mp3',
      low: '/assets/sounds/notification.mp3',        // FIXED: was low-stock.mp3
      system: '/assets/sounds/notification.mp3'
    };

    Object.entries(expectedFiles).forEach(([key, expectedPath]) => {
      const audio = this.audioFiles[key];
      
      if (!audio) {
        status[key] = {
          file: expectedPath,
          status: 'not_loaded',
          error: 'Audio object not created'
        };
      } else if (audio.type === 'synthetic') {
        status[key] = {
          file: expectedPath,
          status: 'synthetic_fallback',
          error: 'Local file failed, using synthetic sound'
        };
      } else {
        status[key] = {
          file: expectedPath,
          status: audio.readyState >= 2 ? 'loaded' : 'loading',
          readyState: audio.readyState,
          src: audio.src,
          canPlay: audio.readyState >= 2
        };
      }
    });

    return status;
  }

  // FIXED - Verify local files are accessible
  async verifyLocalFiles() {
    console.log('🔍 === VERIFYING LOCAL SOUND FILES ===');
    
    const fileStatus = this.getLocalFileStatus();
    
    console.log('\n📋 Expected local sound files (FIXED MAPPING):');
    Object.entries(fileStatus).forEach(([key, info]) => {
      const statusIcon = info.status === 'loaded' ? '✅' : 
                         info.status === 'loading' ? '⏳' : 
                         info.status === 'synthetic_fallback' ? '🎛️' : '❌';
      
      console.log(`   ${statusIcon} ${key}: ${info.file}`);
      if (info.error) {
        console.log(`      Error: ${info.error}`);
      }
    });

    const loadedCount = Object.values(fileStatus).filter(s => s.status === 'loaded').length;
    const totalCount = Object.keys(fileStatus).length;
    
    console.log(`\n📊 Summary: ${loadedCount}/${totalCount} local files loaded successfully`);
    
    if (loadedCount === 0) {
      console.log('\n❌ No local files loaded! Check:');
      console.log('   1. Files exist in public/assets/sounds/');
      console.log('   2. File names match exactly (case-sensitive)');
      console.log('   3. Files are accessible from the web server');
      console.log('   4. No CORS issues with local files');
      console.log('   5. Audio context unlocked (try firestoreNotificationService.unlockAudio())');
    } else if (loadedCount < totalCount) {
      console.log('\n⚠️ Some local files failed to load:');
      Object.entries(fileStatus).forEach(([key, info]) => {
        if (info.status !== 'loaded') {
          console.log(`   - ${key}: ${info.error || 'Loading failed'}`);
        }
      });
    } else {
      console.log('\n✅ All local sound files loaded successfully!');
      console.log('🎵 General notifications will now use notification.mp3 (FIXED!)');
    }
  }

  // FIXED - Force reload local audio files
  async reloadLocalAudioFiles() {
    console.log('🔄 Reloading local audio files with FIXED sound mapping...');

    // Clear existing audio files
    Object.values(this.audioFiles).forEach(audio => {
      if (audio && typeof audio.pause === 'function') {
        audio.pause();
      }
    });

    this.audioFiles = {};
    this.soundsPreloaded = false;
    this.audioLoadAttempts = {};

    // Reload audio files with fixed mapping
    this.loadAudioFiles();

    // Wait a moment then verify loading
    setTimeout(async () => {
      await this.verifyLocalFiles();
      
      if (this.settings.sound && this.settings.enabled) {
        this.preloadSounds();
      }
    }, 1000);
  }

  // PART 3 of 3 - FINAL FIXED FirestoreNotificationService.js
// Core notification system, Firebase integration, and developer utilities - WITH CORRECT SOUND MAPPING

  // FIXED - Enhanced sound preloading with progress tracking
  async preloadSounds() {
    console.log('📥 Preloading notification sounds with FIXED mapping...');

    const totalSounds = Object.keys(this.audioFiles).length;
    let loadedCount = 0;
    let failedCount = 0;

    const promises = Object.entries(this.audioFiles).map(([key, audio]) => {
      if (audio && audio !== null && audio.type !== 'synthetic') {
        return new Promise((resolve) => {
          if (audio.readyState >= 2) { // HAVE_CURRENT_DATA
            loadedCount++;
            console.log(`✅ ${key} already loaded (${loadedCount}/${totalSounds})`);
            resolve();
          } else {
            const handleLoad = () => {
              audio.removeEventListener('canplay', handleLoad);
              audio.removeEventListener('error', handleError);
              loadedCount++;
              console.log(`✅ ${key} preloaded successfully (${loadedCount}/${totalSounds})`);
              resolve();
            };

            const handleError = () => {
              audio.removeEventListener('canplay', handleLoad);
              audio.removeEventListener('error', handleError);
              failedCount++;
              console.warn(`❌ ${key} failed to preload (${failedCount} failures)`);
              resolve(); // Resolve anyway to not block other sounds
            };

            audio.addEventListener('canplay', handleLoad, { once: true });
            audio.addEventListener('error', handleError, { once: true });

            // Trigger loading if not already started
            if (audio.readyState === 0) {
              try {
                audio.load();
              } catch (error) {
                console.warn(`Failed to trigger load for ${key}:`, error);
                handleError();
              }
            }
          }
        });
      } else {
        // Synthetic sounds don't need preloading
        if (audio?.type === 'synthetic') {
          loadedCount++;
          console.log(`🎛️ ${key} uses synthetic sound (${loadedCount}/${totalSounds})`);
        } else {
          failedCount++;
        }
        return Promise.resolve();
      }
    });

    try {
      await Promise.all(promises);
      this.soundsPreloaded = true;
      console.log(`✅ Sound preloading completed: ${loadedCount} loaded, ${failedCount} failed`);

      if (failedCount > 0) {
        console.warn(`⚠️ ${failedCount} sounds failed to load. Synthetic sounds will be used as fallback.`);
      }
    } catch (error) {
      console.error('💥 Error during sound preloading:', error);
    }
  }

  // ===============================
  // CORE NOTIFICATION SYSTEM
  // ===============================

  // Initialize the service with user authentication
  async initialize(userId) {
    console.log(`🚀 Initializing notification service for user: ${userId}`);

    if (this.isInitialized && this.currentUserId === userId) {
      console.log('✅ Service already initialized for this user');
      return;
    }

    // Clean up existing listeners if switching users
    if (this.currentUserId !== userId) {
      console.log('🧹 Cleaning up previous user session');
      this.cleanup();
    }

    this.currentUserId = userId;
    this.isInitialized = true;

    this.setupRealtimeListeners();

    // Preload sounds after initialization if enabled
    if (this.settings.sound && this.settings.enabled) {
      console.log('🔊 Scheduling sound preload...');
      setTimeout(() => this.preloadSounds(), 1000);
    }

    console.log('✅ Notification service initialized successfully');
  }

  // Clean up when user logs out
  cleanup() {
    console.log('🧹 Cleaning up notification service...');

    if (this.unsubscribeNotifications) {
      this.unsubscribeNotifications();
      this.unsubscribeNotifications = null;
    }
    if (this.unsubscribeInventory) {
      this.unsubscribeInventory();
      this.unsubscribeInventory = null;
    }
    if (this.unsubscribeProducts) {
      this.unsubscribeProducts();
      this.unsubscribeProducts = null;
    }
    if (this.unsubscribeSales) {
      this.unsubscribeSales();
      this.unsubscribeSales = null;
    }

    this.notifications = [];
    this.inventory = [];
    this.products = [];
    this.previousInventory = [];
    this.previousSales = [];
    this.currentUserId = null;
    this.isInitialized = false;
    this.soundsPreloaded = false;

    console.log('✅ Cleanup completed');
  }

  setupRealtimeListeners() {
    console.log('📡 Setting up real-time listeners...');
    this.setupNotificationsListener();
    this.setupInventoryMonitoring();
    this.setupProductsListener();
    this.setupSalesListener();
  }

  setupNotificationsListener() {
    if (!this.currentUserId) {
      console.warn('⚠️ No user ID available for notifications listener');
      return;
    }

    console.log('📬 Setting up notifications listener...');

    // Try to use orderBy first, fall back to memory sorting if index missing
    const notificationsQuery = query(
      collection(db, 'notifications'),
      where('userId', '==', this.currentUserId),
      orderBy('timestamp', 'desc')
    );

    this.unsubscribeNotifications = onSnapshot(notificationsQuery, (snapshot) => {
      const firestoreNotifications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      const newNotifications = this.isInitialized ?
        firestoreNotifications.filter(notification =>
          !this.notifications.find(existing => existing.id === notification.id)
        ) : [];

      this.notifications = firestoreNotifications;

      // Only show notifications for new items after initialization
      if (this.isInitialized && newNotifications.length > 0) {
        console.log(`🔔 ${newNotifications.length} new notification(s) received`);
        newNotifications.forEach(notification => {
          this.showBrowserNotification(notification);
          this.playNotificationSound(notification);
        });
      }

      this.notifyListeners();
    }, (error) => {
      console.error('❌ Error in notifications listener:', error);

      // Fallback to query without orderBy if index missing
      if (error.code === 'failed-precondition') {
        console.log('🔄 Falling back to unordered query...');
        this.setupFallbackNotificationsListener();
      }
    });
  }

  // Fallback listener without orderBy for when composite index is missing
  setupFallbackNotificationsListener() {
    if (!this.currentUserId) return;

    const fallbackQuery = query(
      collection(db, 'notifications'),
      where('userId', '==', this.currentUserId)
    );

    this.unsubscribeNotifications = onSnapshot(fallbackQuery, (snapshot) => {
      const firestoreNotifications = snapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        .sort((a, b) => {
          const aTime = a.timestamp?.seconds || 0;
          const bTime = b.timestamp?.seconds || 0;
          return bTime - aTime; // Descending order (newest first)
        });

      const newNotifications = this.isInitialized ?
        firestoreNotifications.filter(notification =>
          !this.notifications.find(existing => existing.id === notification.id)
        ) : [];

      this.notifications = firestoreNotifications;

      if (this.isInitialized && newNotifications.length > 0) {
        console.log(`🔔 ${newNotifications.length} new notification(s) received (fallback)`);
        newNotifications.forEach(notification => {
          this.showBrowserNotification(notification);
          this.playNotificationSound(notification);
        });
      }

      this.notifyListeners();
    }, (error) => {
      console.error('❌ Error in fallback notifications listener:', error);
    });
  }

  setupInventoryMonitoring() {
    console.log('📦 Setting up inventory monitoring...');

    const inventoryQuery = query(collection(db, 'inventory'), orderBy('slot'));

    this.unsubscribeInventory = onSnapshot(inventoryQuery, (snapshot) => {
      this.previousInventory = [...this.inventory];
      this.inventory = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Only check for alerts after the initial load
      if (this.previousInventory.length > 0) {
        this.checkInventoryAlerts();
      }
    }, (error) => {
      console.error('❌ Error in inventory listener:', error);
    });
  }

  setupProductsListener() {
    console.log('🛍️ Setting up products listener...');

    const productsQuery = query(collection(db, 'products'), orderBy('name'));

    this.unsubscribeProducts = onSnapshot(productsQuery, (snapshot) => {
      this.products = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      console.log(`📊 ${this.products.length} products loaded`);
    }, (error) => {
      console.error('❌ Error in products listener:', error);
    });
  }

  setupSalesListener() {
    console.log('💰 Setting up sales listener...');

    const salesQuery = query(
      collection(db, 'sales'),
      orderBy('timestamp', 'desc')
    );

    this.unsubscribeSales = onSnapshot(salesQuery, (snapshot) => {
      const sales = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Only process new sales after initial load
      if (this.previousSales.length > 0) {
        const newSales = sales.filter(sale =>
          !this.previousSales.find(prev => prev.id === sale.id)
        );

        if (this.settings.sales && this.settings.enabled && newSales.length > 0) {
          console.log(`💰 ${newSales.length} new sale(s) detected`);
          newSales.forEach(sale => this.createSaleNotification(sale));
        }
      }

      this.previousSales = sales;
    }, (error) => {
      console.error('❌ Error in sales listener:', error);
    });
  }

  async checkInventoryAlerts() {
    if (!this.settings.enabled || !this.isInitialized) return;

    const productLookup = this.products.reduce((acc, product) => {
      acc[product.id] = product;
      return acc;
    }, {});

    for (const item of this.inventory) {
      if (!item.productId && !item.deletedProductName) continue;

      const product = item.productId ?
        productLookup[item.productId] :
        { name: item.deletedProductName };

      if (!product) continue;

      const previousItem = this.previousInventory.find(prev => prev.slot === item.slot);
      const threshold = item.lowStockThreshold || this.settings.lowStockThreshold || 5;

      // Out of stock alert
      if (item.quantity === 0 &&
        this.settings.outOfStock &&
        (!previousItem || previousItem.quantity > 0)) {
        console.log(`⚠️ Out of stock alert: ${product.name} in ${item.slot}`);
        await this.createNotification({
          type: 'out_of_stock',
          title: 'Out of Stock Alert',
          message: `${product.name} is now empty`,
          priority: 'high',
          slot: item.slot
        });
      }
      // Low stock alert
      else if (item.quantity <= threshold &&
        item.quantity > 0 &&
        this.settings.lowStock &&
        (!previousItem || previousItem.quantity > threshold)) {
        console.log(`📦 Low stock alert: ${product.name} in ${item.slot} (${item.quantity} left)`);
        await this.createNotification({
          type: 'low_stock',
          title: 'Low Stock Alert',
          message: `${product.name} is running low (${item.quantity} left)`,
          priority: 'medium',
          slot: item.slot,
          quantity: item.quantity
        });
      }
      // Stock replenished alert
      else if (item.quantity > threshold &&
        previousItem &&
        previousItem.quantity <= threshold) {
        console.log(`✅ Stock replenished: ${product.name} in ${item.slot}`);
        await this.createNotification({
          type: 'stock_replenished',
          title: 'Stock Replenished',
          message: `${product.name} has been restocked`,
          priority: 'low',
          slot: item.slot,
          quantity: item.quantity
        });
      }
    }
  }

  async createSaleNotification(sale) {
    const product = this.products.find(p => p.id === sale.productId);
    if (!product) return;

    console.log(`💰 Creating sale notification: ${product.name} - ${this.formatCurrency(sale.price)}`);

    await this.createNotification({
      type: 'sale',
      title: 'Sale Completed',
      message: `${product.name} sold for ${this.formatCurrency(sale.price)}`,
      priority: 'low',
      slot: sale.slot,
      productName: product.name,
      price: sale.price
    });
  }

  async createNotification(notificationData) {
    if (!this.currentUserId) {
      console.warn('⚠️ Cannot create notification: no user ID');
      return;
    }

    try {
      console.log('📝 Creating notification:', notificationData.title);

      await addDoc(collection(db, 'notifications'), {
        ...notificationData,
        userId: this.currentUserId,
        timestamp: serverTimestamp(),
        read: false
      });

      console.log('✅ Notification created successfully');
    } catch (error) {
      console.error('❌ Error creating notification:', error);
    }
  }

  async markAsRead(notificationId) {
    try {
      await updateDoc(doc(db, 'notifications', notificationId), {
        read: true,
        readAt: serverTimestamp()
      });

      // Update local state immediately for better UX
      const notification = this.notifications.find(n => n.id === notificationId);
      if (notification) {
        notification.read = true;
        this.notifyListeners();
      }
    } catch (error) {
      console.error('❌ Error marking notification as read:', error);
    }
  }

  async markAllAsRead() {
    const unreadNotifications = this.notifications.filter(n => !n.read);
    if (unreadNotifications.length === 0) return;

    try {
      console.log(`📖 Marking ${unreadNotifications.length} notifications as read...`);

      const batch = writeBatch(db);
      unreadNotifications.forEach(notification => {
        batch.update(doc(db, 'notifications', notification.id), {
          read: true,
          readAt: serverTimestamp()
        });
      });
      await batch.commit();

      // Update local state immediately
      unreadNotifications.forEach(notification => {
        notification.read = true;
      });
      this.notifyListeners();

      console.log('✅ All notifications marked as read');
    } catch (error) {
      console.error('❌ Error marking all as read:', error);
    }
  }

  async removeNotification(notificationId) {
    try {
      await deleteDoc(doc(db, 'notifications', notificationId));

      // Update local state immediately
      this.notifications = this.notifications.filter(n => n.id !== notificationId);
      this.notifyListeners();

      console.log('🗑️ Notification removed successfully');
    } catch (error) {
      console.error('❌ Error removing notification:', error);
    }
  }

  async clearAllNotifications() {
    if (this.notifications.length === 0) return;

    try {
      console.log(`🗑️ Clearing ${this.notifications.length} notifications...`);

      const batch = writeBatch(db);
      const q = query(
        collection(db, 'notifications'),
        where('userId', '==', this.currentUserId)
      );
      const snapshot = await getDocs(q);

      snapshot.forEach(doc => {
        batch.delete(doc.ref);
      });

      await batch.commit();

      // Update local state immediately
      this.notifications = [];
      this.notifyListeners();

      console.log('✅ All notifications cleared');
    } catch (error) {
      console.error('❌ Error clearing all notifications:', error);
    }
  }

  // ===============================
  // BROWSER INTEGRATION
  // ===============================

  showBrowserNotification(notification) {
    if (!this.settings.desktop || !this.canShowNotification()) return;

    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        console.log('🖥️ Showing browser notification:', notification.title);

        const browserNotification = new Notification(notification.title, {
          body: notification.message,
          icon: '/favicon.ico',
          tag: notification.id,
          requireInteraction: notification.priority === 'high'
        });

        browserNotification.onclick = () => {
          window.focus();
          this.markAsRead(notification.id);
          browserNotification.close();
        };

        // Auto-close after 5 seconds for low priority notifications
        if (notification.priority !== 'high') {
          setTimeout(() => browserNotification.close(), 5000);
        }
      } catch (error) {
        console.error('❌ Error showing browser notification:', error);
      }
    }
  }

  canShowNotification() {
    return this.settings.enabled && !this.isQuietHours();
  }

  canPlaySound() {
    return this.settings.sound && this.canShowNotification();
  }

  isQuietHours() {
    if (!this.settings.quietHours?.enabled) return false;

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    const [startHour, startMin] = this.settings.quietHours.start.split(':').map(Number);
    const [endHour, endMin] = this.settings.quietHours.end.split(':').map(Number);
    const startTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;

    // Handle overnight quiet hours (e.g., 22:00 to 08:00)
    if (startTime > endTime) {
      return currentTime >= startTime || currentTime <= endTime;
    } else {
      return currentTime >= startTime && currentTime <= endTime;
    }
  }

  async requestNotificationPermission() {
    if ('Notification' in window) {
      console.log('🔔 Requesting notification permission...');

      const permission = await Notification.requestPermission();
      this.settings.desktop = permission === 'granted';
      this.updateSettings(this.settings);

      console.log(`${permission === 'granted' ? '✅' : '❌'} Notification permission: ${permission}`);
      return permission;
    }
    return 'denied';
  }

  get permissionStatus() {
    if ('Notification' in window) {
      return Notification.permission;
    }
    return 'denied';
  }

  // ===============================
  // PUBLIC API METHODS
  // ===============================

  getNotifications() {
    return this.notifications;
  }

  getUnreadCount() {
    return this.notifications.filter(n => !n.read).length;
  }

  addListener(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  notifyListeners() {
    this.listeners.forEach(cb => {
      try {
        cb(this.notifications, this.getUnreadCount());
      } catch (error) {
        console.error('❌ Error in notification listener callback:', error);
      }
    });
  }

  async sendTestNotification() {
    console.log('🧪 Sending test notification...');

    await this.createNotification({
      type: 'system',
      title: '🧪 Test Notification',
      message: 'Your notifications are working perfectly!',
      priority: 'medium'
    });
  }

  formatCurrency(amount) {
    return new Intl.NumberFormat('en-NZ', {
      style: 'currency',
      currency: 'NZD'
    }).format(amount);
  }

  // ===============================
  // DEBUGGING AND UTILITIES - FINAL FIXED VERSION
  // ===============================

  // Enhanced audio system status for debugging
  getAudioStatus() {
    return {
      // Audio Context
      audioContext: !!this.audioContext,
      audioContextState: this.audioContext?.state,
      isAudioUnlocked: this.isAudioUnlocked,

      // Sound Loading
      soundsPreloaded: this.soundsPreloaded,
      totalSounds: Object.keys(this.audioFiles).length,
      loadedSounds: Object.keys(this.audioFiles).filter(key =>
        this.audioFiles[key] && this.audioFiles[key] !== null
      ),
      syntheticSounds: Object.keys(this.audioFiles).filter(key =>
        this.audioFiles[key]?.type === 'synthetic'
      ),
      failedSounds: Object.keys(this.audioFiles).filter(key =>
        this.audioFiles[key] === null
      ),

      // Settings
      settings: {
        sound: this.settings.sound,
        volume: this.settings.volume,
        soundType: this.settings.soundType,
        enabled: this.settings.enabled
      },

      // Load Attempts
      loadAttempts: this.audioLoadAttempts
    };
  }

  // FIXED - Quick test for developers with correct sound mapping
  async runQuickSoundTest() {
    console.log('\n🎵 === QUICK LOCAL SOUND TEST (FIXED MAPPING) ===');
    console.log('Testing local MP3 files from /assets/sounds/...\n');

    // Unlock audio first
    if (!this.isAudioUnlocked) {
      console.log('🔓 Unlocking audio...');
      this.unlockAudio();
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Test the most different sounds with FIXED mapping
    console.log('🛒 1/4: Playing SALE sound (sales.mp3)...');
    await this.testSound('sale');

    await new Promise(resolve => setTimeout(resolve, 1500));

    console.log('🚨 2/4: Playing OUT_OF_STOCK sound (out-of-stock.mp3)...');
    await this.testSound('out_of_stock');

    await new Promise(resolve => setTimeout(resolve, 1500));

    console.log('✅ 3/4: Playing STOCK_REPLENISHED sound (restocked.mp3)...');
    await this.testSound('stock_replenished');

    await new Promise(resolve => setTimeout(resolve, 1500));

    console.log('🔔 4/4: Playing GENERAL NOTIFICATION sound (notification.mp3) - FIXED!...');
    await this.testSound('medium');

    console.log('\n✅ Quick test completed!');
    console.log('💡 Did you hear your local MP3 files playing?');
    console.log('🎵 General notifications should now use notification.mp3 (FIXED!)');
  }

  // FIXED - Emergency reset for when things go wrong
  emergencyReset() {
    console.log('🚨 === EMERGENCY RESET ===');
    console.log('Resetting all audio and clearing caches...');

    // Stop any playing audio
    Object.values(this.audioFiles).forEach(audio => {
      if (audio && typeof audio.pause === 'function') {
        try {
          audio.pause();
          audio.currentTime = 0;
        } catch (e) {
          // Ignore errors during emergency reset
        }
      }
    });

    // Clear audio context
    if (this.audioContext) {
      try {
        this.audioContext.close();
      } catch (e) {
        // Ignore errors during emergency reset
      }
    }

    // Reset all audio state
    this.audioContext = null;
    this.isAudioUnlocked = false;
    this.audioFiles = {};
    this.soundsPreloaded = false;
    this.audioLoadAttempts = {};

    // Reload everything with fixed mapping
    this.loadAudioFiles();

    console.log('✅ Emergency reset completed with FIXED sound mapping.');
    console.log('💡 Use: firestoreNotificationService.unlockAudio() then test sounds');
  }

  // FIXED - Developer-friendly status check
  getSystemHealth() {
    const health = {
      status: 'healthy',
      issues: [],
      recommendations: []
    };

    // Check audio context
    if (!this.audioContext) {
      health.issues.push('No audio context created');
      health.recommendations.push('Click "Enable Notifications" or run firestoreNotificationService.unlockAudio()');
    } else if (this.audioContext.state === 'suspended') {
      health.issues.push('Audio context suspended');
      health.recommendations.push('Interact with the page or run firestoreNotificationService.unlockAudio()');
    }

    // Check sound loading
    const totalSounds = Object.keys(this.audioFiles).length;
    const loadedSounds = Object.values(this.audioFiles).filter(audio =>
      audio && (audio.readyState >= 2 || audio.type === 'synthetic')
    ).length;

    if (loadedSounds === 0) {
      health.status = 'critical';
      health.issues.push('No sounds loaded successfully');
      health.recommendations.push('Check that files exist in /assets/sounds/ and try firestoreNotificationService.reloadLocalAudioFiles()');
    } else if (loadedSounds < totalSounds) {
      health.status = 'warning';
      health.issues.push(`Only ${loadedSounds}/${totalSounds} sounds loaded`);
      health.recommendations.push('Some sounds will fall back to synthetic generation');
    }

    // Check settings
    if (!this.settings.enabled) {
      health.issues.push('Notifications disabled');
      health.recommendations.push('Enable notifications in settings');
    }

    if (!this.settings.sound) {
      health.issues.push('Sound disabled');
      health.recommendations.push('Enable sound in settings');
    }

    return health;
  }

  // FIXED - Developer summary with correct mapping info
  printSystemSummary() {
    console.log('\n🔍 === NOTIFICATION SYSTEM SUMMARY (FINAL FIXED) ===');

    const health = this.getSystemHealth();
    console.log(`📊 System Status: ${health.status.toUpperCase()}`);

    if (health.issues.length > 0) {
      console.log('\n⚠️ Issues Found:');
      health.issues.forEach((issue, i) => console.log(`   ${i + 1}. ${issue}`));
    }

    if (health.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      health.recommendations.forEach((rec, i) => console.log(`   ${i + 1}. ${rec}`));
    }

    console.log('\n🎵 Available Test Commands (FIXED MAPPING):');
    console.log('   • firestoreNotificationService.unlockAudio() - Enable audio first!');
    console.log('   • firestoreNotificationService.runQuickSoundTest() - Test with FIXED mapping');
    console.log('   • firestoreNotificationService.testAllLocalSounds()');
    console.log('   • firestoreNotificationService.verifyLocalFiles()');
    console.log('   • firestoreNotificationService.reloadLocalAudioFiles()');
    console.log('   • firestoreNotificationService.emergencyReset()');

    console.log('\n📈 Current Status:');
    const status = this.getAudioStatus();
    console.log(`   Audio Context: ${status.audioContext ? '✅' : '❌'}`);
    console.log(`   Audio Unlocked: ${status.isAudioUnlocked ? '✅' : '❌'}`);
    console.log(`   Local Sounds Loaded: ${status.loadedSounds.length}/${status.totalSounds}`);
    console.log(`   Synthetic Fallbacks: ${status.syntheticSounds.length}`);
    console.log(`   Sound Enabled: ${status.settings.sound ? '✅' : '❌'}`);
    console.log(`   Volume: ${Math.round(status.settings.volume * 100)}%`);

    console.log('\n🔧 FIXED SOUND MAPPING:');
    console.log('   General Notifications → notification.mp3 ✅ (FIXED!)');
    console.log('   Low Stock Alerts → low-stock.mp3 ✅');
    console.log('   Sales → sales.mp3 ✅');
    console.log('   Out of Stock → out-of-stock.mp3 ✅');
    console.log('   Restocked → restocked.mp3 ✅');

    if (!status.isAudioUnlocked) {
      console.log('\n🔓 IMPORTANT: Audio is not unlocked! Run:');
      console.log('   firestoreNotificationService.unlockAudio()');
    }
  }
}

// ===============================
// EXPORT SINGLETON INSTANCE WITH GLOBAL ACCESS
// ===============================

const firestoreNotificationService = new FirestoreNotificationService();

// Make it globally available for debugging with enhanced developer tools
if (typeof window !== 'undefined') {
  window.firestoreNotificationService = firestoreNotificationService;
  console.log('🌍 FirestoreNotificationService available globally for debugging');

  // Auto-run system summary after a brief delay
  setTimeout(() => {
    console.log('\n🚀 Notification System Ready with FIXED Local Sound Mapping! 🎉');
    firestoreNotificationService.printSystemSummary();
  }, 2000);
}

export default firestoreNotificationService;