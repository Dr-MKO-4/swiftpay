// src/services/nfcService.js
/**
 * Centralise gestion NFC : init, stop, lecture/écriture NDEF, APDU, événements.
 */
import NfcManager, { NfcTech, Ndef, NfcEvents } from 'react-native-nfc-manager';

const NFCService = {
  init: async () => { await NfcManager.start(); },
  stop: async () => {
    try { await NfcManager.unregisterTagEvent(); } catch {}
    await NfcManager.stop();
  },
  writeNdef: async payload => {
    await NFCService.init();
    try {
      await NfcManager.requestTechnology([NfcTech.Ndef]);
      await NfcManager.writeNdefMessage([Ndef.textRecord(JSON.stringify(payload))]);
      return true;
    } finally {
      await NfcManager.cancelTechnologyRequest();
      await NFCService.stop();
    }
  },
  readNdef: async () => {
    await NFCService.init();
    try {
      await NfcManager.requestTechnology([NfcTech.Ndef]);
      const tag = await NfcManager.getTag();
      return JSON.parse(Ndef.text.decodePayload(tag.ndefMessage[0].payload));
    } finally {
      await NfcManager.cancelTechnologyRequest();
      await NFCService.stop();
    }
  },
  setApduHandler: payload => {
    const msg = Ndef.encodeMessage([Ndef.textRecord(JSON.stringify(payload))]);
    NfcManager.setHostApduServiceHandler({
      processCommandApdu: () => msg,
      onDeactivated: _ => {},
    });
  },
  onTagDiscovered: callback => {
    NfcManager.setEventListener(NfcEvents.DiscoverTag, tag => {
      try {
        callback(JSON.parse(Ndef.text.decodePayload(tag.ndefMessage[0].payload)));
      } catch {
        callback(null);
      }
    });
  },
};
export default NFCService;
