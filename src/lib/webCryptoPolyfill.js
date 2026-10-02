import * as ExpoCrypto from 'expo-crypto';

const cryptoObject = globalThis.crypto || {};

if (typeof cryptoObject.getRandomValues !== 'function') {
  cryptoObject.getRandomValues = ExpoCrypto.getRandomValues;
}

if (!cryptoObject.subtle) {
  cryptoObject.subtle = {};
}

if (typeof cryptoObject.subtle.digest !== 'function') {
  const subtle = cryptoObject.subtle;
  subtle.digest = (algorithm, data) => {
    if (algorithm !== ExpoCrypto.CryptoDigestAlgorithm.SHA256) {
      throw new Error(`Unsupported WebCrypto digest algorithm: ${algorithm}`);
    }
    return ExpoCrypto.digest(ExpoCrypto.CryptoDigestAlgorithm.SHA256, data);
  };
}

if (!globalThis.crypto) {
  globalThis.crypto = cryptoObject;
}
