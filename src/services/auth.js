import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail,
  confirmPasswordReset,
  verifyPasswordResetCode
} from 'firebase/auth';
import { auth } from './firebase';

// Get custom domain from environment variables or use default firebase domain
const CUSTOM_DOMAIN = process.env.REACT_APP_CUSTOM_DOMAIN;

// Helper function to check if error is network related
const isNetworkError = (error) => {
  const networkErrorCodes = [
    'auth/network-request-failed',
    'auth/timeout',
    'unavailable',
    'permission-denied'
  ];
  
  const networkErrorMessages = [
    'network error',
    'fetch failed',
    'failed to fetch',
    'connection error',
    'network request failed',
    'timeout',
    'unavailable',
    'internal error'
  ];
  
  if (networkErrorCodes.includes(error.code)) {
    return true;
  }
  
  const errorMessage = error.message.toLowerCase();
  return networkErrorMessages.some(msg => errorMessage.includes(msg));
};

// Helper function to check if user is offline
const isOffline = () => {
  return !navigator.onLine;
};

export const loginUser = async (email, password) => {
  try {
    // Check if user is offline first
    if (isOffline()) {
      throw new Error('No internet connection. Please check your network and try again.');
    }

    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    console.error('Login error:', error);
    
    // Check for network-related errors first
    if (isNetworkError(error)) {
      throw new Error('Network connection error. Please check your internet connection and try again.');
    }
    
    // Check if user is offline
    if (isOffline()) {
      throw new Error('No internet connection. Please check your network and try again.');
    }
    
    // Provide user-friendly error messages for specific auth errors
    switch (error.code) {
      case 'auth/user-not-found':
        throw new Error('No account found with this email address');
      case 'auth/wrong-password':
        throw new Error('Incorrect password');
      case 'auth/invalid-email':
        throw new Error('Invalid email address');
      case 'auth/user-disabled':
        throw new Error('This account has been disabled');
      case 'auth/too-many-requests':
        throw new Error('Too many failed attempts. Please try again later');
      case 'auth/invalid-credential':
        throw new Error('Invalid email or password. Please check your credentials.');
      case 'auth/network-request-failed':
        throw new Error('Network connection error. Please check your internet connection and try again.');
      default:
        // If it's still a network-related error that wasn't caught above
        if (error.message && (
          error.message.includes('fetch') || 
          error.message.includes('network') || 
          error.message.includes('connection') ||
          error.message.includes('timeout')
        )) {
          throw new Error('Network connection error. Please check your internet connection and try again.');
        }
        throw new Error('Login failed. Please check your credentials and try again.');
    }
  }
};

export const logoutUser = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Logout error:', error);
    
    if (isNetworkError(error) || isOffline()) {
      throw new Error('Network error during logout. You may need to check your connection.');
    }
    
    throw new Error('Failed to logout. Please try again');
  }
};

export const createAdminUser = async (email, password, displayName = 'Admin User') => {
  try {
    if (isOffline()) {
      throw new Error('No internet connection. Please check your network and try again.');
    }

    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Update profile with display name
    await updateProfile(user, {
      displayName: displayName
    });
    
    return user;
  } catch (error) {
    console.error('Create user error:', error);
    
    if (isNetworkError(error) || isOffline()) {
      throw new Error('Network connection error. Please check your internet connection and try again.');
    }
    
    switch (error.code) {
      case 'auth/email-already-in-use':
        throw new Error('An account with this email already exists');
      case 'auth/invalid-email':
        throw new Error('Invalid email address');
      case 'auth/weak-password':
        throw new Error('Password is too weak. Use at least 6 characters');
      default:
        throw new Error('Failed to create account. Please try again');
    }
  }
};

export const getCurrentUser = () => {
  return auth.currentUser;
};

export const onAuthStateChange = (callback) => {
  return onAuthStateChanged(auth, callback);
};

// Get user info for display
export const getUserInfo = () => {
  const user = auth.currentUser;
  if (user) {
    return {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || user.email?.split('@')[0] || 'Admin',
      photoURL: user.photoURL,
      emailVerified: user.emailVerified,
      lastSignIn: user.metadata.lastSignInTime,
      createdAt: user.metadata.creationTime
    };
  }
  return null;
};

// Password reset with proper custom domain configuration
export const resetPassword = async (email) => {
  try {
    if (isOffline()) {
      throw new Error('No internet connection. Please check your network and try again.');
    }

    // Configure action code settings for custom domain
    const actionCodeSettings = {
      // This URL will be where users land after the password reset process
      url: `${CUSTOM_DOMAIN}/login?message=password-reset-sent`,
      handleCodeInApp: false, // Let Firebase handle the reset via the email link
    };
    
    await sendPasswordResetEmail(auth, email, actionCodeSettings);
  } catch (error) {
    console.error('Password reset error:', error);
    
    if (isNetworkError(error) || isOffline()) {
      throw new Error('Network connection error. Please check your internet connection and try again.');
    }
    
    switch (error.code) {
      case 'auth/user-not-found':
        throw new Error('No account found with this email address');
      case 'auth/invalid-email':
        throw new Error('Invalid email address');
      case 'auth/too-many-requests':
        throw new Error('Too many requests. Please try again later');
      case 'auth/unauthorized-continue-url':
        throw new Error('Domain not authorized. Please contact support.');
      default:
        throw new Error('Failed to send password reset email. Please try again.');
    }
  }
};

// Verify password reset code
export const verifyResetCode = async (code) => {
  try {
    if (isOffline()) {
      throw new Error('No internet connection. Please check your network and try again.');
    }

    const email = await verifyPasswordResetCode(auth, code);
    return email;
  } catch (error) {
    console.error('Verify reset code error:', error);
    
    if (isNetworkError(error) || isOffline()) {
      throw new Error('Network connection error. Please check your internet connection and try again.');
    }
    
    throw error;
  }
};

// Confirm password reset
export const confirmReset = async (code, newPassword) => {
  try {
    if (isOffline()) {
      throw new Error('No internet connection. Please check your network and try again.');
    }

    await confirmPasswordReset(auth, code, newPassword);
  } catch (error) {
    console.error('Confirm reset error:', error);
    
    if (isNetworkError(error) || isOffline()) {
      throw new Error('Network connection error. Please check your internet connection and try again.');
    }
    
    throw error;
  }
};

// Check if user is authenticated
export const isAuthenticated = () => {
  return !!auth.currentUser;
};