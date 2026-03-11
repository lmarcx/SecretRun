import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { getFunctionsBaseUrl, nhost } from './nhostClient';

export interface NotificationCapability {
  key: 'route_reveal' | 'event_start' | 'results_available';
  label: string;
  status: 'supported' | 'not_ready';
  description: string;
}

export interface NotificationRegistrationState {
  kind: 'unsupported' | 'signed_out' | 'ready' | 'registered' | 'error';
  message: string;
  pushToken: string | null;
}

export type NotificationRoute = '/leaderboard' | '/feed' | `/events/${string}`;

export const notificationCapabilities: NotificationCapability[] = [
  {
    key: 'route_reveal',
    label: 'Route reveal',
    status: 'supported',
    description: 'Backend notification jobs already exist for revealed routes once this device is registered.',
  },
  {
    key: 'event_start',
    label: 'Event start',
    status: 'not_ready',
    description: 'Event start notifications are not scheduled by the current backend yet.',
  },
  {
    key: 'results_available',
    label: 'Results available',
    status: 'not_ready',
    description: 'Result-ready notifications are not scheduled by the current backend yet.',
  },
];

let notificationHandlerConfigured = false;

export function configureNotificationHandling() {
  if (notificationHandlerConfigured || Platform.OS === 'web') {
    return;
  }

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });

  notificationHandlerConfigured = true;
}

export async function getNotificationRegistrationState(): Promise<NotificationRegistrationState> {
  if (Platform.OS === 'web') {
    return {
      kind: 'unsupported',
      message: 'Push notifications are only supported on mobile devices. Web stays in a limited fallback.',
      pushToken: null,
    };
  }

  if (!nhost.auth.getUser()) {
    return {
      kind: 'signed_out',
      message: 'Notifications require a signed-in profile. DEV runner mode does not register push devices.',
      pushToken: null,
    };
  }

  const permissions = await Notifications.getPermissionsAsync();
  return {
    kind: 'ready',
    message:
      permissions.granted || permissions.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
        ? 'This device can register for route reveal notifications.'
        : 'Notification permission is not granted yet.',
    pushToken: null,
  };
}

export async function enablePushNotifications(): Promise<NotificationRegistrationState> {
  if (Platform.OS === 'web') {
    return {
      kind: 'unsupported',
      message: 'Push notifications are only supported on mobile devices. Web stays in a limited fallback.',
      pushToken: null,
    };
  }

  const user = nhost.auth.getUser();
  if (!user) {
    return {
      kind: 'signed_out',
      message: 'Notifications require a signed-in profile. DEV runner mode does not register push devices.',
      pushToken: null,
    };
  }

  const currentPermissions = await Notifications.getPermissionsAsync();
  const permissionResult = currentPermissions.granted ? currentPermissions : await Notifications.requestPermissionsAsync();

  if (!permissionResult.granted && permissionResult.ios?.status !== Notifications.IosAuthorizationStatus.PROVISIONAL) {
    return {
      kind: 'error',
      message: 'Notification permission was not granted on this device.',
      pushToken: null,
    };
  }

  try {
    const extra = (Constants.expoConfig?.extra ?? {}) as { eas?: { projectId?: string } };
    const projectId = Constants.easConfig?.projectId ?? extra.eas?.projectId ?? process.env.EXPO_PUBLIC_EXPO_PROJECT_ID ?? undefined;
    const pushToken = (await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : {})).data;

    await registerDeviceToken(user.id, pushToken);

    return {
      kind: 'registered',
      message: 'Push notifications are enabled for route reveal updates on this device.',
      pushToken,
    };
  } catch (error) {
    return {
      kind: 'error',
      message: error instanceof Error ? error.message : 'Notification setup failed.',
      pushToken: null,
    };
  }
}

export function getRouteFromNotificationData(data: unknown): NotificationRoute | null {
  if (!data || typeof data !== 'object') {
    return null;
  }

  const payload = data as { type?: unknown; event_id?: unknown; activity_id?: unknown };
  const type = typeof payload.type === 'string' ? payload.type : null;
  const eventId = typeof payload.event_id === 'string' ? payload.event_id : null;

  if ((type === 'event_reveal' || type === 'event_start') && eventId) {
    return `/events/${eventId}`;
  }

  if (type === 'results_available') {
    return '/leaderboard';
  }

  if (type === 'activity_comment' && typeof payload.activity_id === 'string') {
    return '/feed';
  }

  return null;
}

async function registerDeviceToken(userId: string, pushToken: string) {
  const accessToken = nhost.auth.getAccessToken();
  const response = await fetch(`${getFunctionsBaseUrl()}/register-device`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify({
      user_id: userId,
      push_token: pushToken,
      platform: Platform.OS,
    }),
  });

  const payload = (await response.json().catch(() => null)) as { success?: boolean; error?: string } | null;
  if (!response.ok || !payload?.success) {
    throw new Error(payload?.error ?? `Device registration failed with status ${response.status}.`);
  }
}
