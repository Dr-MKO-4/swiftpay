import RNFS from 'react-native-fs';

/**
 * Prend une photo via Vision-Camera et renvoie la donnée Base64.
 * Tente d'abord l'option enableBase64, puis fallback sur lecture du fichier si nécessaire.
 * @param {{ current: import('react-native-vision-camera').Camera }} cameraRef
 * @returns {Promise<string>} base64 de l'image
 */
export async function captureFrameToBase64(cameraRef) {
  if (!cameraRef?.current) {
    throw new Error('Caméra non prête');
  }

   // ── 1 appel unique à takePhoto() pour obtenir à la fois .base64 et .path ──
  let photo;
  try {
    photo = await cameraRef.current.takePhoto({
      qualityPrioritization: 'speed',
      skipMetadata: true,
      enableBase64: true,
    });
    console.log('captureFrameToBase64: takePhoto →', { base64: !!photo.base64, path: photo.path });
  } catch (err) {
    console.error('captureFrameToBase64: takePhoto a échoué', err);
    throw new Error('Échec de la capture photo');
  }

  // ── Si on a déjà le base64, on le retourne directement ──
  if (photo.base64) {
    return photo.base64;
  }

  // ── Sinon, fallback : lire le fichier via RNFS ──
  if (!photo.path) {
    console.error('captureFrameToBase64: pas de chemin de fichier dans photo', photo);
    throw new Error('Chemin du fichier photo introuvable');
  }

  try {
    const base64 = await RNFS.readFile(photo.path, 'base64');
    console.log('captureFrameToBase64: conversion FS réussie');
    return base64;
  } catch (err) {
    console.error('captureFrameToBase64: lecture FS a échoué', err);
    throw new Error('Impossible de convertir la photo en Base64');
  }
}
