module.exports = ({ config }) => {
  const googleMapsApiKey =
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ||
    process.env.GOOGLE_MAPS_API_KEY ||
    config.android?.config?.googleMaps?.apiKey ||
    '';

  return {
    ...config,
    plugins: [...(config.plugins || []), 'expo-web-browser'],
    android: {
      ...config.android,
      config: {
        ...config.android?.config,
        googleMaps: {
          apiKey: googleMapsApiKey,
        },
      },
    },
    extra: {
      ...config.extra,
      EXPO_PUBLIC_SUPABASE_URL:
        process.env.EXPO_PUBLIC_SUPABASE_URL ||
        config.extra?.EXPO_PUBLIC_SUPABASE_URL ||
        '',
      EXPO_PUBLIC_SUPABASE_ANON_KEY:
        process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
        config.extra?.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
        '',
      EXPO_PUBLIC_GEMINI_API_KEY: process.env.EXPO_PUBLIC_GEMINI_API_KEY || '',
      EXPO_PUBLIC_GEMINI_MODEL: process.env.EXPO_PUBLIC_GEMINI_MODEL || 'gemini-2.0-flash',
      EXPO_PUBLIC_GOOGLE_MAPS_API_KEY: googleMapsApiKey,
      EXPO_PUBLIC_CLARITY_PROJECT_ID:
        process.env.EXPO_PUBLIC_CLARITY_PROJECT_ID ||
        config.extra?.EXPO_PUBLIC_CLARITY_PROJECT_ID ||
        'ypdmkoaywd',
    },
  };
};
