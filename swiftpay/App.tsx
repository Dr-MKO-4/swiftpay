// App.tsx
import 'react-native-gesture-handler';    // ← toujours en tout premier
import 'react-native-reanimated';         // ← juste après
import React, { useEffect } from 'react';
import { Camera } from 'react-native-vision-camera';
import { ThemeProvider } from './src/contexts/ThemeContext';
import Providers from './src/navigations/AppNavigator';
import pushNotificationService from './src/services/pushNotificationService';

function App(): React.JSX.Element {
  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    // Request camera permission
    try {
      await Camera.requestCameraPermission();
    } catch (error) {
      console.error('Camera permission error:', error);
    }

    // Initialize push notifications
    try {
      const token = await pushNotificationService.initializePushNotifications(
        (notification) => {
          console.log('Notification received:', notification);
        }
      );
      if (token) {
        console.log('Push notification token:', token);
      }
    } catch (error) {
      console.error('Push notification initialization error:', error);
    }

    // Cleanup on app close
    return () => {
      pushNotificationService.cleanup();
    };
  };

  return (
    <ThemeProvider>
      <Providers />
    </ThemeProvider>
  );
}

export default App;
