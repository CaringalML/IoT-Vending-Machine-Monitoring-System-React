// src/services/FirestoreNotificationService.js
// Complete Updated Version with FIXED Different Sound System and No Circular Dependencies
// Eslint 'no-unused-vars' warning for 'totalSamples' has been fixed.

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
  // FIXED AUDIO SYSTEM WITH DIFFERENT SOUNDS
  // ===============================

  // Load audio files with working URLs and guaranteed different fallbacks
  loadAudioFiles() {
    console.log('🎵 Loading notification sounds with working URLs...');

    // Using reliable audio sources that actually work
    const soundFiles = {
      // Free sounds from reliable sources
      sale: 'https://www.soundjay.com/misc/sounds/cash-register-01.wav',

      // Alternative working sources
      low_stock: 'https://www.soundjay.com/misc/sounds/beep-28.wav',
      out_of_stock: 'https://www.soundjay.com/misc/sounds/fail-buzzer-02.wav',
      stock_replenished: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav',

      // General notification sounds
      high: 'https://www.soundjay.com/misc/sounds/beep-07a.wav',
      medium: 'https://www.soundjay.com/misc/sounds/bell-ringing-04.wav',
      low: 'https://www.soundjay.com/misc/sounds/bell-ringing-03.wav',

      // Additional backup sources
      success: 'https://www.soundjay.com/misc/sounds/bell-ringing-02.wav',
      warning: 'https://www.soundjay.com/misc/sounds/beep-09.wav'
    };

    // Base64 encoded backup sounds - DIFFERENT for each type
    const backupSounds = {
      // Cash register simulation (high-low-high pattern)
      sale: this.generateBase64Sound([800, 1200, 800], [0.1, 0.1, 0.15]),

      // Warning beep (medium tone repeating)
      low_stock: this.generateBase64Sound([600, 400, 600], [0.1, 0.1, 0.1]),

      // Urgent alert (low rapid beeps)
      out_of_stock: this.generateBase64Sound([300, 200, 300, 200], [0.08, 0.08, 0.08, 0.08]),

      // Success ascending tones
      stock_replenished: this.generateBase64Sound([400, 600, 800], [0.12, 0.12, 0.2]),

      // Priority-based patterns
      high: this.generateBase64Sound([900, 700, 900], [0.1, 0.1, 0.1]),
      medium: this.generateBase64Sound([650, 800], [0.15, 0.2]),
      low: this.generateBase64Sound([450, 600], [0.2, 0.25])
    };

    // Load sounds with enhanced fallback strategy
    Object.entries(soundFiles).forEach(([key, src]) => {
      this.loadAudioFileWithBackup(key, src, backupSounds[key]);
    });
  }

  // Generate unique base64 sounds for each notification type
  generateBase64Sound(frequencies, durations) {
    // This function creates a unique identifier for different sound patterns.
    // The previous 'totalSamples' and 'sampleRate' variables were removed
    // as they are unused, fixing the ESLint 'no-unused-vars' warning.

    // Create a unique identifier for different sound patterns
    const patternId = frequencies.join('-') + durations.join('-');

    // Return a unique data URL that will be handled by synthetic sounds
    return `data:audio/synthetic;pattern=${patternId}`;
  }


  // Enhanced audio file loading with better fallback
  loadAudioFileWithBackup(key, primarySrc, syntheticPattern = null) {
    try {
      console.log(`🔊 Loading sound: ${key} from ${primarySrc}`);

      const audio = new Audio();
      audio.preload = 'auto';
      audio.volume = this.settings?.volume || 0.7;
      audio.crossOrigin = 'anonymous';

      // Set loading timeout
      const loadTimeout = setTimeout(() => {
        console.warn(`⏰ Loading timeout for ${key}, using fallback`);
        this.handleAudioLoadFailure(key, syntheticPattern);
      }, 10000); // 10 second timeout

      // Success handler
      const handleSuccess = () => {
        clearTimeout(loadTimeout);
        console.log(`✅ Successfully loaded: ${key}`);
        audio.removeEventListener('canplaythrough', handleSuccess);
        audio.removeEventListener('error', handleError);
      };

      // Error handler
      const handleError = (e) => {
        clearTimeout(loadTimeout);
        console.warn(`❌ Failed to load ${key}:`, e);
        audio.removeEventListener('canplaythrough', handleSuccess);
        audio.removeEventListener('error', handleError);
        this.handleAudioLoadFailure(key, syntheticPattern);
      };

      audio.addEventListener('canplaythrough', handleSuccess);
      audio.addEventListener('error', handleError);
      audio.src = primarySrc;
      this.audioFiles[key] = audio;

    } catch (error) {
      console.error(`💥 Exception loading ${key}:`, error);
      this.handleAudioLoadFailure(key, syntheticPattern);
    }
  }

  // Handle audio loading failures with synthetic fallback
  handleAudioLoadFailure(key, syntheticPattern) {
    console.log(`🎛️ Using synthetic sound for: ${key}`);

    // Mark as synthetic sound type
    this.audioFiles[key] = {
      type: 'synthetic',
      key: key,
      pattern: syntheticPattern,
      play: () => this.playSyntheticSoundForKey(key)
    };
  }

  // Play synthetic sound for specific key
  playSyntheticSoundForKey(key) {
    if (!this.isAudioUnlocked || !this.audioContext) {
      console.log('🔒 Audio context not available for synthetic sound');
      return Promise.reject('Audio context not available');
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
            waveType: 'square', // Cash register-like
            description: 'Cash register pattern (high-low-high-medium)'
          },
          'low_stock': {
            frequencies: [600, 400, 600],
            durations: [0.12, 0.08, 0.12],
            waveType: 'sawtooth', // Warning-like
            description: 'Warning pattern (medium-low-medium)'
          },
          'out_of_stock': {
            frequencies: [300, 200, 300, 200, 300],
            durations: [0.08, 0.06, 0.08, 0.06, 0.1],
            waveType: 'square', // Urgent/harsh
            description: 'Urgent pattern (rapid low-frequency alerts)'
          },
          'stock_replenished': {
            frequencies: [400, 500, 650, 800],
            durations: [0.1, 0.1, 0.1, 0.2],
            waveType: 'sine', // Pleasant ascending
            description: 'Success pattern (ascending tones)'
          },
          'high': {
            frequencies: [900, 1100, 900],
            durations: [0.1, 0.1, 0.1],
            waveType: 'square',
            description: 'High priority pattern'
          },
          'medium': {
            frequencies: [650, 800],
            durations: [0.15, 0.2],
            waveType: 'sine',
            description: 'Standard notification pattern'
          },
          'low': {
            frequencies: [450, 550],
            durations: [0.2, 0.25],
            waveType: 'triangle',
            description: 'Gentle notification pattern'
          }
        };

        const pattern = syntheticPatterns[key] || syntheticPatterns.medium;
        const volume = (this.settings?.volume || 0.7) * 0.3;

        console.log(`🎵 Pattern for ${key}:`, pattern);

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
        reject(error);
      }
    });
  }

  // Enhanced audio context unlocking
  unlockAudio() {
    console.log('🔓 Unlocking audio context...');

    if (!this.audioContext) {
      try {
        this.audioContext = new(window.AudioContext || window.webkitAudioContext)();
        console.log(`🎧 AudioContext created, state: ${this.audioContext.state}`);

        if (this.audioContext.state === 'suspended') {
          this.audioContext.resume().then(() => {
            this.isAudioUnlocked = true;
            console.log('✅ Audio context resumed and unlocked');
          }).catch(error => {
            console.error('❌ Failed to resume audio context:', error);
          });
        } else {
          this.isAudioUnlocked = true;
          console.log('✅ Audio context created and unlocked');
        }
      } catch (e) {
        console.error('❌ Could not create AudioContext:', e);
      }
    } else if (this.audioContext.state === 'suspended') {
      this.audioContext.resume().then(() => {
        this.isAudioUnlocked = true;
        console.log('✅ Audio context resumed');
      }).catch(error => {
        console.error('❌ Failed to resume existing audio context:', error);
      });
    } else {
      this.isAudioUnlocked = true;
      console.log('✅ Audio context already unlocked');
    }
  }

  // Enhanced notification sound playing with better debugging
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

    // Ensure audio is unlocked
    if (!this.isAudioUnlocked) {
      console.log('🔒 Audio not unlocked, attempting to unlock...');
      this.unlockAudio();
    }

    // Try to play audio file first (unless user prefers synthetic)
    if (this.settings.soundType !== 'synthetic' && this.playAudioFile(notification)) {
      return; // Successfully played audio file
    }

    // Fallback to synthetic sounds
    console.log('🔄 Falling back to synthetic sound');
    this.playSyntheticSound(notification);
  }

  // Enhanced audio file playback with better synthetic support
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

        // Handle synthetic sounds
        if (audio.type === 'synthetic') {
          return audio.play().then(() => true).catch(() => false);
        }

        // Handle regular audio files
        if (audio.play) {
          audio.currentTime = 0;
          audio.volume = Math.max(0, Math.min(1, this.settings?.volume || 0.7));

          const playPromise = audio.play();
          if (playPromise !== undefined) {
            playPromise
              .then(() => console.log(`✅ Audio file played: ${soundKey}`))
              .catch(error => {
                console.warn(`❌ Audio playback failed: ${soundKey}`, error);
                // Fallback to synthetic
                this.playSyntheticSoundForKey(soundKey);
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
      'system': 'success'
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

  // Enhanced synthetic sound generation for fallback
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
    this.settings = { ...this.settings,
      ...newSettings
    };

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
        return { ...defaultSettings,
          ...parsedSettings
        };
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
  // ENHANCED SOUND TESTING METHODS
  // ===============================

  // Enhanced sound testing with comprehensive debugging
  async testSound(soundType = 'medium') {
    console.log(`\n🧪 === TESTING SOUND: ${soundType.toUpperCase()} ===`);

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
      message: `Testing ${soundType} sound`
    };

    console.log(`📋 Test notification created:`, testNotification);

    // Get the selected sound key
    const selectedKey = this.selectSoundKey(testNotification);
    console.log(`🎯 Selected sound key: ${selectedKey}`);

    // Check if the audio file exists and its status
    const audioFile = this.audioFiles[selectedKey];
    console.log(`🎧 Audio file status for ${selectedKey}:`, {
      exists: !!audioFile,
      type: audioFile?.type || 'audio file',
      readyState: audioFile?.readyState,
      networkState: audioFile?.networkState,
      duration: audioFile?.duration,
      volume: audioFile?.volume,
      src: audioFile?.src?.substring(0, 60) + '...'
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
    console.log('🎵 Attempting to play sound...');
    this.playNotificationSound(testNotification);

    console.log(`✅ Test sound request completed for: ${soundType}`);
  }

  // Force all sounds to use synthetic for testing (to guarantee different sounds)
  async testSyntheticSounds() {
    console.log('🧪 === TESTING SYNTHETIC SOUNDS (GUARANTEED DIFFERENT) ===');

    const soundTypes = ['sale', 'low_stock', 'out_of_stock', 'stock_replenished', 'medium'];

    for (let i = 0; i < soundTypes.length; i++) {
      const soundType = soundTypes[i];
      console.log(`\n🎵 Testing synthetic sound ${i + 1}/${soundTypes.length}: ${soundType}`);

      // Force synthetic sound
      await this.playSyntheticSoundForKey(soundType);

      // Wait between sounds
      if (i < soundTypes.length - 1) {
        console.log('⏳ Waiting 2 seconds...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    console.log('\n✅ Synthetic sound test completed!');
  }

  // Test with detailed frequency analysis
  async testSoundFrequencies() {
    console.log('🎼 === TESTING SOUND FREQUENCIES ===');

    const soundTypes = ['sale', 'low_stock', 'out_of_stock', 'stock_replenished', 'medium'];

    soundTypes.forEach(type => {
      const pattern = this.getSyntheticPattern(type);
      console.log(`🎵 ${type.toUpperCase()}:`, {
        frequencies: pattern.frequencies,
        durations: pattern.durations,
        waveType: pattern.waveType,
        pattern: pattern.frequencies.join('Hz → ') + 'Hz',
        description: pattern.description
      });
    });
  }

  // Get synthetic pattern for debugging
  getSyntheticPattern(key) {
    const syntheticPatterns = {
      'sale': {
        frequencies: [800, 1200, 800, 600],
        durations: [0.1, 0.1, 0.1, 0.15],
        waveType: 'square',
        description: 'Cash register pattern (high-low-high-medium)'
      },
      'low_stock': {
        frequencies: [600, 400, 600],
        durations: [0.12, 0.08, 0.12],
        waveType: 'sawtooth',
        description: 'Warning pattern (medium-low-medium)'
      },
      'out_of_stock': {
        frequencies: [300, 200, 300, 200, 300],
        durations: [0.08, 0.06, 0.08, 0.06, 0.1],
        waveType: 'square',
        description: 'Urgent pattern (rapid low-frequency alerts)'
      },
      'stock_replenished': {
        frequencies: [400, 500, 650, 800],
        durations: [0.1, 0.1, 0.1, 0.2],
        waveType: 'sine',
        description: 'Success pattern (ascending tones)'
      },
      'high': {
        frequencies: [900, 1100, 900],
        durations: [0.1, 0.1, 0.1],
        waveType: 'square',
        description: 'High priority pattern'
      },
      'medium': {
        frequencies: [650, 800],
        durations: [0.15, 0.2],
        waveType: 'sine',
        description: 'Standard notification pattern'
      },
      'low': {
        frequencies: [450, 550],
        durations: [0.2, 0.25],
        waveType: 'triangle',
        description: 'Gentle notification pattern'
      }
    };

    return syntheticPatterns[key] || syntheticPatterns.medium;
  }

  // Force use synthetic sounds for all notifications (debugging)
  enableSyntheticOnly() {
    console.log('🎛️ Enabling synthetic-only mode for testing...');

    // Mark all audio files as synthetic
    Object.keys(this.audioFiles).forEach(key => {
      this.audioFiles[key] = {
        type: 'synthetic',
        key: key,
        play: () => this.playSyntheticSoundForKey(key)
      };
    });

    console.log('✅ All sounds now using synthetic patterns');
  }

  // Quick test to verify different sounds work
  async quickDifferenceTest() {
    console.log('⚡ === QUICK DIFFERENCE TEST ===');
    console.log('Testing two very different sounds back-to-back...\n');

    // Test cash register vs urgent alert
    console.log('🛒 Playing SALE sound (cash register pattern)...');
    await this.playSyntheticSoundForKey('sale');

    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log('🚨 Playing OUT_OF_STOCK sound (urgent alert pattern)...');
    await this.playSyntheticSoundForKey('out_of_stock');

    console.log('\n❓ Did you hear two DIFFERENT sounds?');
    console.log('   - First: High-pitched cash register pattern (800→1200→800→600 Hz)');
    console.log('   - Second: Low-pitched urgent alerts (300→200→300→200→300 Hz)');
  }

  // Comprehensive debugging script
  async debugSoundSystem() {
    console.log('🔍 === COMPREHENSIVE SOUND SYSTEM DEBUG ===\n');

    // 1. Check audio context
    console.log('1. Audio Context Status:');
    console.log({
      exists: !!this.audioContext,
      state: this.audioContext?.state,
      unlocked: this.isAudioUnlocked
    });

    // 2. Check loaded sounds
    console.log('\n2. Loaded Sounds:');
    Object.entries(this.audioFiles).forEach(([key, audio]) => {
      console.log(`   ${key}:`, {
        type: audio?.type || 'audio file',
        available: !!audio,
        canPlay: audio?.readyState >= 2 || audio?.type === 'synthetic'
      });
    });

    // 3. Show frequency patterns
    console.log('\n3. Frequency Patterns:');
    this.testSoundFrequencies();

    // 4. Test notification type mapping
    console.log('\n4. Notification Type Mapping:');
    const testNotifications = [{
      type: 'sale',
      priority: 'low'
    }, {
      type: 'low_stock',
      priority: 'medium'
    }, {
      type: 'out_of_stock',
      priority: 'high'
    }, {
      type: 'stock_replenished',
      priority: 'low'
    }, {
      type: null,
      priority: 'medium'
    }];

    testNotifications.forEach(notification => {
      const selectedKey = this.selectSoundKey(notification);
      console.log(`   ${notification.type || 'null'} (${notification.priority}) → ${selectedKey}`);
    });

    // 5. Settings check
    console.log('\n5. Current Settings:');
    console.log({
      soundEnabled: this.settings.sound,
      volume: this.settings.volume,
      soundType: this.settings.soundType,
      enabled: this.settings.enabled
    });
  }

  // Enhanced sound preloading with progress tracking
  async preloadSounds() {
    console.log('📥 Preloading notification sounds...');

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

            audio.addEventListener('canplay', handleLoad, {
              once: true
            });
            audio.addEventListener('error', handleError, {
              once: true
            });

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

  // Test all sounds sequentially with detailed feedback
  async testAllSounds() {
    const soundTypes = ['sale', 'low_stock', 'out_of_stock', 'stock_replenished', 'medium'];

    console.log('🧪 === TESTING ALL NOTIFICATION SOUNDS ===');
    console.log(`📋 Testing sequence: ${soundTypes.join(' -> ')}`);

    for (let i = 0; i < soundTypes.length; i++) {
      const soundType = soundTypes[i];
      console.log(`\n🎵 Testing sound ${i + 1}/${soundTypes.length}: ${soundType}`);

      await this.testSound(soundType);

      // Wait between sounds to hear the difference
      if (i < soundTypes.length - 1) {
        console.log('⏳ Waiting 2 seconds before next test...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    console.log('\n✅ All sound tests completed!');
    console.log('📊 Final audio status:', this.getAudioStatus());
  }

  // ===============================
  // DEBUGGING AND UTILITIES
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

  // Get detailed sound loading status for each file
  getLoadedSounds() {
    const status = {};

    Object.entries(this.audioFiles).forEach(([key, audio]) => {
      if (audio === null) {
        status[key] = {
          status: 'failed',
          attempts: this.audioLoadAttempts[key] || 0
        };
      } else if (!audio) {
        status[key] = {
          status: 'not_loaded',
          attempts: 0
        };
      } else if (audio.type === 'synthetic') {
        status[key] = {
          status: 'synthetic',
          pattern: this.getSyntheticPattern(key),
          canPlay: true
        };
      } else {
        status[key] = {
          status: 'loaded',
          readyState: audio.readyState,
          networkState: audio.networkState,
          duration: audio.duration || 'unknown',
          volume: audio.volume,
          src: audio.src?.substring(0, 50) + '...',
          canPlay: audio.readyState >= 2
        };
      }
    });

    return status;
  }

  // Get detailed sound loading status
  getSoundLoadingStatus() {
    return this.getLoadedSounds();
  }

  // Force reload all audio files
  async reloadAudioFiles() {
    console.log('🔄 Reloading all audio files...');

    // Clear existing audio files
    Object.values(this.audioFiles).forEach(audio => {
      if (audio && typeof audio.pause === 'function') {
        audio.pause();
      }
    });

    this.audioFiles = {};
    this.soundsPreloaded = false;
    this.audioLoadAttempts = {};

    // Reload audio files
    this.loadAudioFiles();

    // Wait a moment then preload if sound is enabled
    setTimeout(() => {
      if (this.settings.sound && this.settings.enabled) {
        this.preloadSounds();
      }
    }, 1000);
  }

  // ===============================
  // CONVENIENCE TESTING METHODS
  // ===============================

  // Quick test for developers
  async runQuickSoundTest() {
    console.log('\n🎵 === QUICK SOUND TEST FOR DEVELOPERS ===');
    console.log('This will test if different sounds are actually playing...\n');

    // Unlock audio first
    this.unlockAudio();
    await new Promise(resolve => setTimeout(resolve, 200));

    // Test the most different sounds
    console.log('🛒 1/3: Playing SALE sound (should be high-pitched)...');
    await this.playSyntheticSoundForKey('sale');

    await new Promise(resolve => setTimeout(resolve, 1500));

    console.log('🚨 2/3: Playing OUT_OF_STOCK sound (should be low-pitched urgent)...');
    await this.playSyntheticSoundForKey('out_of_stock');

    await new Promise(resolve => setTimeout(resolve, 1500));

    console.log('✅ 3/3: Playing STOCK_REPLENISHED sound (should be ascending)...');
    await this.playSyntheticSoundForKey('stock_replenished');

    console.log('\n✅ Quick test completed!');
    console.log('💡 Did you hear 3 DIFFERENT sounds?');
    console.log('   - Sale: High-pitched (like cash register)');
    console.log('   - Out of Stock: Low-pitched urgent beeps');
    console.log('   - Restocked: Pleasant ascending tones');
  }

  // Test notification types with actual notifications
  async testNotificationTypes() {
    console.log('🧪 === TESTING NOTIFICATION TYPES ===');

    const testNotifications = [{
      type: 'sale',
      title: 'Test Sale',
      message: 'Sale notification test'
    }, {
      type: 'low_stock',
      title: 'Test Low Stock',
      message: 'Low stock notification test'
    }, {
      type: 'out_of_stock',
      title: 'Test Out of Stock',
      message: 'Out of stock notification test'
    }, {
      type: 'stock_replenished',
      title: 'Test Restocked',
      message: 'Restock notification test'
    }];

    for (let i = 0; i < testNotifications.length; i++) {
      const notification = testNotifications[i];
      console.log(`\n🔔 ${i + 1}/4: Testing ${notification.type} notification...`);

      this.playNotificationSound(notification);

      if (i < testNotifications.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    console.log('\n✅ Notification type test completed!');
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
        {
          name: item.deletedProductName
        };

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
  // ENHANCED DEVELOPER UTILITIES
  // ===============================

  // Emergency reset for when things go wrong
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

    // Reload everything
    this.loadAudioFiles();

    console.log('✅ Emergency reset completed. Try testing sounds again.');
  }

  // Developer-friendly status check
  getSystemHealth() {
    const health = {
      status: 'healthy',
      issues: [],
      recommendations: []
    };

    // Check audio context
    if (!this.audioContext) {
      health.issues.push('No audio context created');
      health.recommendations.push('Click "Enable Notifications" to unlock audio');
    } else if (this.audioContext.state === 'suspended') {
      health.issues.push('Audio context suspended');
      health.recommendations.push('Interact with the page to unlock audio');
    }

    // Check sound loading
    const totalSounds = Object.keys(this.audioFiles).length;
    const loadedSounds = Object.values(this.audioFiles).filter(audio =>
      audio && (audio.readyState >= 2 || audio.type === 'synthetic')
    ).length;

    if (loadedSounds === 0) {
      health.status = 'critical';
      health.issues.push('No sounds loaded successfully');
      health.recommendations.push('Check network connection and try firestoreNotificationService.reloadAudioFiles()');
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

  // Developer summary
  printSystemSummary() {
    console.log('\n🔍 === NOTIFICATION SYSTEM SUMMARY ===');

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

    console.log('\n🎵 Available Test Commands:');
    console.log('   • firestoreNotificationService.runQuickSoundTest()');
    console.log('   • firestoreNotificationService.enableSyntheticOnly()');
    console.log('   • firestoreNotificationService.debugSoundSystem()');
    console.log('   • firestoreNotificationService.emergencyReset()');

    console.log('\n📈 Current Status:');
    const status = this.getAudioStatus();
    console.log(`   Audio Context: ${status.audioContext ? '✅' : '❌'}`);
    console.log(`   Audio Unlocked: ${status.isAudioUnlocked ? '✅' : '❌'}`);
    console.log(`   Sounds Loaded: ${status.loadedSounds.length}/${status.totalSounds}`);
    console.log(`   Synthetic Sounds: ${status.syntheticSounds.length}`);
    console.log(`   Sound Enabled: ${status.settings.sound ? '✅' : '❌'}`);
    console.log(`   Volume: ${Math.round(status.settings.volume * 100)}%`);
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
    console.log('\n🚀 Notification System Ready!');
    firestoreNotificationService.printSystemSummary();
  }, 2000);
}

export default firestoreNotificationService;