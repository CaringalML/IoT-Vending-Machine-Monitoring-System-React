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

// Get custom domain from environment variables
const CUSTOM_DOMAIN = process.env.REACT_APP_CUSTOM_DOMAIN || 'https://artisantiling.co.nz';

export const loginUser = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    // Provide user-friendly error messages
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
      default:
        throw new Error('Login failed. Please check your credentials');
    }
  }
};

export const logoutUser = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Logout error:', error);
    throw new Error('Failed to logout. Please try again');
  }
};

export const createAdminUser = async (email, password, displayName = 'Admin User') => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Update profile with display name
    await updateProfile(user, {
      displayName: displayName
    });
    
    return user;
  } catch (error) {
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

// Password reset functionality with custom domain from env
export const resetPassword = async (email) => {
  try {
    // Use custom domain from environment variable
    const actionCodeSettings = {
      url: `${CUSTOM_DOMAIN}/login?message=password-reset-sent`,
      handleCodeInApp: false, // Let Firebase handle the reset page
    };
    
    await sendPasswordResetEmail(auth, email, actionCodeSettings);
  } catch (error) {
    switch (error.code) {
      case 'auth/user-not-found':
        throw new Error('No account found with this email address');
      case 'auth/invalid-email':
        throw new Error('Invalid email address');
      default:
        throw new Error('Failed to send password reset email');
    }
  }
};

// Verify password reset code
export const verifyResetCode = async (code) => {
  try {
    const email = await verifyPasswordResetCode(auth, code);
    return email;
  } catch (error) {
    throw error;
  }
};

// Confirm password reset
export const confirmReset = async (code, newPassword) => {
  try {
    await confirmPasswordReset(auth, code, newPassword);
  } catch (error) {
    throw error;
  }
};

// Check if user is authenticated
export const isAuthenticated = () => {
  return !!auth.currentUser;
};