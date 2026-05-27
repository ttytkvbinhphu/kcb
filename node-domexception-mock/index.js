// Export native DOMException to prevent npm deprecation warnings.
module.exports = globalThis.DOMException || Error;
