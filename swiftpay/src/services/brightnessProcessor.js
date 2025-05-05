// services/brightnessProcessor.js
import { runOnJS } from 'react-native-vision-camera';

export function brightnessProcessor(frame) {
  'worklet';
  // compute average luminance: simple approximation reading first pixel channels 
  // (in real use, replace with native utility for performance)
  let sum = 0;
  const data = frame.getBytes(); // assume accessible in worklet
  for (let i = 0; i < data.length; i += 4) {
    // data in RGBA
    sum += (0.299 * data[i] + 0.587 * data[i+1] + 0.114 * data[i+2]);
  }
  const lum = sum / (frame.width * frame.height);
  if (lum < 40)       runOnJS(frame.hintSetter)('Plus de lumière…');
  else if (lum > 215) runOnJS(frame.hintSetter)('Trop de lumière, tamisez…');
  else                runOnJS(frame.hintSetter)(null);
}
