// Polyfills for React Native compatibility with Supabase
import 'react-native-url-polyfill/auto';

// Fix for URL protocol issue in React Native
if (typeof global.URL === 'undefined') {
  require('react-native-url-polyfill/auto');
}

// Additional polyfills for fetch and other web APIs
if (typeof global.fetch === 'undefined') {
  require('whatwg-fetch');
}

// Fix for TextEncoder/TextDecoder
if (typeof global.TextEncoder === 'undefined') {
  const { TextEncoder, TextDecoder } = require('text-encoding');
  global.TextEncoder = TextEncoder;
  global.TextDecoder = TextDecoder;
}
