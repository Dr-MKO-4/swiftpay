// src/services/faceAuthService.js
import API from './api';
const FaceAuthService = {
  verifyLiveness: images => API.post('/verify_face', { images }).then(res => res.data),
};
export default FaceAuthService;
