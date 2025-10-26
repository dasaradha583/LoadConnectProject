/**
 * Custom entry point to fix React DevTools initialization conflicts
 * This fixes the "ExceptionsManager should be set up after React DevTools" error
 */

// Import Expo's default entry first
import 'expo-router/entry';

// Custom initialization to prevent React DevTools conflicts
if (__DEV__) {
  // Ensure proper initialization order
  try {
    // Reset any existing DevTools dispatcher to prevent conflicts
    if (global.__FUSEBOX_REACT_DEVTOOLS_DISPATCHER__) {
      delete global.__FUSEBOX_REACT_DEVTOOLS_DISPATCHER__;
    }
    
    // Clear any existing React DevTools hooks
    if (global.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
      global.__REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE = () => {};
    }
  } catch (error) {
    // Silently handle any DevTools initialization errors
    console.warn('DevTools initialization handled:', error.message);
  }
}
