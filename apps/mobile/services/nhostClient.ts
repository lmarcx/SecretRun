import { NhostClient } from '@nhost/nhost-js';

const subdomain = process.env.EXPO_PUBLIC_NHOST_SUBDOMAIN;
const region = process.env.EXPO_PUBLIC_NHOST_REGION;

if (!subdomain || !region) {
  throw new Error('Missing EXPO_PUBLIC_NHOST_SUBDOMAIN or EXPO_PUBLIC_NHOST_REGION');
}

export const nhost = new NhostClient({
  subdomain,
  region,
});
