const aiUrl = process.env.EXPO_PUBLIC_AI_URL || '';
const localHttp = aiUrl.startsWith('http://');

module.exports = {
  expo: {
    name: 'Conversation Companion',
    slug: 'conversation-companion',
    version: '0.1.0',
    scheme: 'conversationcompanion',
    icon: './assets/icon.png',
    orientation: 'default',
    userInterfaceStyle: 'light',
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'app.conversationcompanion.notebook',
      infoPlist: {
        NSLocalNetworkUsageDescription: 'Connect to your chosen notes service on the local network.',
        NSAppTransportSecurity: { NSAllowsLocalNetworking: true },
      },
    },
    android: { package: 'app.conversationcompanion.notebook' },
    plugins: [
      'expo-dev-client', 'expo-sqlite',
      ['expo-speech-recognition', {
        microphonePermission: 'Allow Conversation Companion to hear speech during sessions you start.',
        speechRecognitionPermission: 'Allow Conversation Companion to turn speech into live captions.',
      }],
      ['expo-build-properties', { android: { usesCleartextTraffic: localHttp } }],
    ],
  },
};
