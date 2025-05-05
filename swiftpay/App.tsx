// App.tsx
import 'react-native-gesture-handler';    // ← toujours en tout premier
import 'react-native-reanimated';         // ← juste après
import React, { useEffect } from 'react';
import { Camera } from 'react-native-vision-camera';
import Providers from './src/navigations/AppNavigator';

function App(): React.JSX.Element {
  useEffect(() => {
    (async () => {
      await Camera.requestCameraPermission();
    })();
  }, []);

  return <Providers />;
}

export default App;
