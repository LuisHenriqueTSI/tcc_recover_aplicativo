module.exports = ({ config }) => {
  const googleMapsApiKey =
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ||
    process.env.GOOGLE_MAPS_API_KEY ||
    config.android?.config?.googleMaps?.apiKey ||
    '';

  return {
    ...config,
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
        'https://youlbpxrvzgjzvhbisbn.supabase.co',
      EXPO_PUBLIC_SUPABASE_ANON_KEY:
        process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
        config.extra?.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlvdWxicHhydnpnanp2aGJpc2JuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5NDUwMDksImV4cCI6MjA5OTUyMTAwOX0.YrgjNo8Fdt1GMkOtx2gJ1-UVzdILyXdCRhseDS-fkIs',
      EXPO_PUBLIC_GEMINI_API_KEY: process.env.EXPO_PUBLIC_GEMINI_API_KEY || '',
      EXPO_PUBLIC_GEMINI_MODEL: process.env.EXPO_PUBLIC_GEMINI_MODEL || 'gemini-2.0-flash',
      EXPO_PUBLIC_GOOGLE_MAPS_API_KEY: googleMapsApiKey,
    },
  };
};
