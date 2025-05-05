// src/services/otpService.js
import speakeasy from 'speakeasy';

const OtpService = {
  generateSecret: () => speakeasy.generateSecret({ length: 20 }),
  generateOTP: secret => speakeasy.totp({ secret: secret.base32, encoding: 'base32' }),
  verifyOTP: (secret, token) =>
    speakeasy.totp.verify({ secret: secret.base32, encoding: 'base32', token, window: 1 }),
};

export default OtpService;
