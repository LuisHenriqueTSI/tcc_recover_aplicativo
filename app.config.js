module.exports = ({ config }) => ({
  ...config,
  extra: {
    ...config.extra,
    EXPO_PUBLIC_GEMINI_API_KEY: process.env.EXPO_PUBLIC_GEMINI_API_KEY || '',
    EXPO_PUBLIC_GEMINI_MODEL: process.env.EXPO_PUBLIC_GEMINI_MODEL || 'gemini-2.0-flash',
  },
});
