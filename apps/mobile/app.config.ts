import type { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'Secret Run',
  slug: 'secret-run',
  scheme: 'secretrun',
  version: '1.0.0',
  orientation: 'portrait',
  userInterfaceStyle: 'light',
  plugins: ['expo-router', 'expo-location', 'expo-notifications', 'expo-font'],
  android: {
    config: {
      googleMaps: {
        apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? '',
      },
    },
  },
  web: {
    bundler: 'metro',
    output: 'single',
  },
  experiments: {
    typedRoutes: true,
  },
  extra: {
    nhostSubdomain: process.env.EXPO_PUBLIC_NHOST_SUBDOMAIN,
    nhostRegion: process.env.EXPO_PUBLIC_NHOST_REGION,
    nhostGraphqlUrl: process.env.EXPO_PUBLIC_HASURA_GRAPHQL_URL,
  },
};

export default config;
