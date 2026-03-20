import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { recordNotificationDiagnostic } from './betaDiagnostics';
import { getFunctionsBaseUrl, nhost } from './nhostClient';

export interface NotificationCapability {
  key: 'route_reveal' | 'event_start' | 'results_available';
  label: string;
  status: 'supported' | 'not_ready';
  description: string;
}

export interface NotificationRegistrationState {
  kind: 'unsupported' | 'signed_out' | 'ready' | 'registered' | 'not_ready' | 'error';
  message: string;
  pushToken: string | null;
}

export type NotificationRoute = '/leaderboard' | '/feed' | `/events/${string}`;

export const notificationEventTypes = {
  eventReveal: 'event_reveal',
  eventStart: 'event_start',
  eventStartLegacy: 'event_start_reminder',
  resultsAvailable: 'results_available',
  activityComment: 'activity_comment',
} as const;

export const notificationCapabilities: NotificationCapability[] = [
  {
    key: 'route_reveal',
    label: 'Route reveal',
    status: 'supported',
    description: 'Route reveal alerts can reach this device once notifications are enabled.',
  },
  {
    key: 'event_start',
    label: 'Event start',
    status: 'not_ready',
    description: 'Event start alerts are planned for a later beta update.',
  },
  {
    key: 'results_available',
    label: 'Results available',
    status: 'not_ready',
    description: 'Results alerts are planned for a later beta update.',
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
    const state: NotificationRegistrationState = {
      kind: 'unsupported',
      message: 'Push notifications are available only on mobile devices in this beta.',
      pushToken: null,
    };
    recordNotificationDiagnostic({ state: 'unsupported', message: state.message });
    return state;
  }

  if (Constants.isDevice === false) {
    const state: NotificationRegistrationState = {
      kind: 'unsupported',
      message: 'Push notifications are available only on a physical iOS or Android device in this beta.',
      pushToken: null,
    };
    recordNotificationDiagnostic({ state: 'unsupported', message: state.message });
    return state;
  }

  if (!nhost.auth.getUser()) {
    const state: NotificationRegistrationState = {
      kind: 'signed_out',
      message: 'Sign in with a beta account before enabling notifications on this device.',
      pushToken: null,
    };
    recordNotificationDiagnostic({ state: 'idle', message: state.message });
    return state;
  }

  const projectId = getExpoProjectId();
  if (!projectId) {
    const state: NotificationRegistrationState = {
      kind: 'not_ready',
      message: 'Notification setup is not ready for this build yet.',
      pushToken: null,
    };
    recordNotificationDiagnostic({ state: 'not_ready', message: state.message });
    return state;
  }

  const permissions = await Notifications.getPermissionsAsync();
  const permissionsGranted =
    permissions.granted || permissions.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
  const state: NotificationRegistrationState = {
    kind: 'ready',
    message: permissionsGranted
      ? 'This device is ready for route reveal alerts.'
      : 'Notifications are off for this device. Enable them when you are ready.',
    pushToken: null,
  };
  recordNotificationDiagnostic({ state: 'ready', message: state.message });
  return state;
}

export async function enablePushNotifications(): Promise<NotificationRegistrationState> {
  if (Platform.OS === 'web') {
    const state: NotificationRegistrationState = {
      kind: 'unsupported',
      message: 'Push notifications are available only on mobile devices in this beta.',
      pushToken: null,
    };
    recordNotificationDiagnostic({ state: 'unsupported', message: state.message });
    return state;
  }

  if (Constants.isDevice === false) {
    const state: NotificationRegistrationState = {
      kind: 'unsupported',
      message: 'Push notifications are available only on a physical iOS or Android device in this beta.',
      pushToken: null,
    };
    recordNotificationDiagnostic({ state: 'unsupported', message: state.message });
    return state;
  }

  const user = nhost.auth.getUser();
  if (!user) {
    const state: NotificationRegistrationState = {
      kind: 'signed_out',
      message: 'Sign in with a beta account before enabling notifications on this device.',
      pushToken: null,
    };
    recordNotificationDiagnostic({ state: 'idle', message: state.message });
    return state;
  }

  const projectId = getExpoProjectId();
  if (!projectId) {
    const state: NotificationRegistrationState = {
      kind: 'not_ready',
      message: 'Notification setup is not ready for this build yet.',
      pushToken: null,
    };
    recordNotificationDiagnostic({ state: 'not_ready', message: state.message });
    return state;
  }

  const currentPermissions = await Notifications.getPermissionsAsync();
  const permissionResult = currentPermissions.granted ? currentPermissions : await Notifications.requestPermissionsAsync();

  if (!permissionResult.granted && permissionResult.ios?.status !== Notifications.IosAuthorizationStatus.PROVISIONAL) {
    const state: NotificationRegistrationState = {
      kind: 'error',
      message: 'Notifications stay off until you allow them in device settings.',
      pushToken: null,
    };
    recordNotificationDiagnostic({ state: 'failed', message: state.message });
    return state;
  }

  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    const pushToken = (await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : {})).data;

    await registerDeviceToken(pushToken);

    const state: NotificationRegistrationState = {
      kind: 'registered',
      message: 'Route reveal alerts are enabled on this device.',
      pushToken,
    };
    recordNotificationDiagnostic({ state: 'registered', message: state.message });
    return state;
  } catch (error) {
    const state: NotificationRegistrationState = {
      kind: 'error',
      message: getNotificationErrorMessage(error),
      pushToken: null,
    };
    recordNotificationDiagnostic({ state: 'failed', message: state.message });
    return state;
  }
}

export function getRouteFromNotificationData(data: unknown): NotificationRoute | null {
  if (!data || typeof data !== 'object') {
    return null;
  }

  const payload = data as { type?: unknown; event_id?: unknown; activity_id?: unknown };
  const type = typeof payload.type === 'string' ? payload.type : null;
  const eventId = typeof payload.event_id === 'string' ? payload.event_id : null;

  if (
    (type === notificationEventTypes.eventReveal ||
      type === notificationEventTypes.eventStart ||
      type === notificationEventTypes.eventStartLegacy) &&
    eventId
  ) {
    return `/events/${eventId}`;
  }

  if (type === notificationEventTypes.resultsAvailable) {
    return '/leaderboard';
  }

  if (type === notificationEventTypes.activityComment && typeof payload.activity_id === 'string') {
    return '/feed';
  }

  return null;
}

async function registerDeviceToken(pushToken: string) {
  const accessToken = nhost.auth.getAccessToken();
  const response = await fetch(`${getFunctionsBaseUrl()}/register-device`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify({
      push_token: pushToken,
      platform: Platform.OS,
    }),
  });

  const payload = (await response.json().catch(() => null)) as { success?: boolean; error?: string } | null;
  if (!response.ok || !payload?.success) {
    throw new Error(payload?.error ?? 'We could not save this device for notifications right now.');
  }
}

function getExpoProjectId(): string | null {
  const extra = (Constants.expoConfig?.extra ?? {}) as { eas?: { projectId?: string } };
  return Constants.easConfig?.projectId ?? extra.eas?.projectId ?? process.env.EXPO_PUBLIC_EXPO_PROJECT_ID ?? null;
}

function getNotificationErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    if (message.includes('must use a physical device')) {
      return 'Push notifications are available only on a physical iOS or Android device in this beta.';
    }

    if (message.includes('projectid') || message.includes('project id')) {
      return 'Notification setup is not ready for this build yet.';
    }

    if (message.includes('fetch failed') || message.includes('network request failed')) {
      return 'We could not finish notification setup right now. Try again later.';
    }

    if (message.includes('device registration failed')) {
      return 'We could not save this device for notifications right now.';
    }
  }

  return 'We could not turn on notifications right now.';
}
