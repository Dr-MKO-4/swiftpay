// services/CredentialService.js
import { fetchServices } from './fetchServices';
import { captureFrameToBase64, verifyFaceLiveness } from './FaceAuthService.mjs';

const BASE = '/credentials';

export const CredentialService = {
  fetchAll: () => fetchServices(BASE),

  create: (payload) =>
    fetchServices(BASE, { method: 'POST', body: JSON.stringify(payload) }),

  update: (id, payload) =>
    fetchServices(`${BASE}/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),

  remove: (id) => fetchServices(`${BASE}/${id}`, { method: 'DELETE' }),

  verifyFaceAuth: async (cameraRef) => {
    const image = await captureFrameToBase64(cameraRef);
    const ok = await verifyFaceLiveness(image);
    if (!ok) throw new Error('Vérification faciale échouée');
    return true;
  },
};
