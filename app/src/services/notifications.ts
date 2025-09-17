import { Platform } from 'react-native';
import { navigate } from '../navigation/navigationRef';

// Lazy import to avoid hard crashing if expo-notifications isn't installed yet
let Notifications: typeof import('expo-notifications') | null = null;

type AlertNotificationData = {
  alertId?: string;
};

function isAlertNotificationData(
  value: unknown
): value is AlertNotificationData {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const maybeAlertId = (value as { alertId?: unknown }).alertId;
  return maybeAlertId === undefined || typeof maybeAlertId === 'string';
}

async function getModule() {
  if (!Notifications) {
    try {
      Notifications = await import('expo-notifications');
    } catch (e) {
      console.warn('expo-notifications not available. Please install it:', e);
      return null;
    }
  }
  return Notifications;
}

let initialized = false;

export async function initNotifications() {
  if (initialized) return;
  const mod = await getModule();
  if (!mod) return;

  // Ensure alerts appear while app is in foreground
  mod.setNotificationHandler({
    handleNotification: async () => ({
      // Expo SDK 53 NotificationBehavior keys
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });

  // Android: create default channel
  if (Platform.OS === 'android') {
    await mod.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: mod.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  initialized = true;

  // Handle notification taps to route into Alerts screen
  try {
    mod.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      const alertId = isAlertNotificationData(data) ? data.alertId : undefined;
      // Route to Alerts with optional alertId so UI can highlight/show details
      navigate('Alerts', alertId ? { alertId } : undefined);
    });
  } catch {}
}

export async function requestNotificationPermissions(): Promise<boolean> {
  const mod = await getModule();
  if (!mod) return false;
  const settings = await mod.getPermissionsAsync();
  if (
    settings.granted ||
    settings.ios?.status === mod.IosAuthorizationStatus.AUTHORIZED
  ) {
    return true;
  }
  const req = await mod.requestPermissionsAsync();
  return !!(
    req.granted || req.ios?.status === mod.IosAuthorizationStatus.AUTHORIZED
  );
}

export async function presentEnergyLowNow(body?: string) {
  const mod = await getModule();
  if (!mod) return;
  await mod.scheduleNotificationAsync({
    content: {
      title: 'Energy getting low',
      body:
        body ?? 'Your energy just dropped below 30%. Consider a short rest.',
    },
    trigger: null, // show immediately
  });
}

export async function scheduleEnergyLowAt(
  date: Date,
  body?: string
): Promise<string | null> {
  const mod = await getModule();
  if (!mod) return null;
  return await mod.scheduleNotificationAsync({
    content: {
      title: 'Energy getting low',
      body: body ?? 'Your energy is predicted to drop below 30% soon.',
    },
    trigger: { type: mod.SchedulableTriggerInputTypes.DATE, date },
  });
}

export async function cancelScheduledNotification(id: string) {
  const mod = await getModule();
  if (!mod) return;
  try {
    await mod.cancelScheduledNotificationAsync(id);
  } catch (e) {
    console.warn('Failed to cancel notification', e);
  }
}

export async function cancelAllNotifications() {
  const mod = await getModule();
  if (!mod) return;
  try {
    await mod.cancelAllScheduledNotificationsAsync();
  } catch (e) {
    console.warn('Failed to cancel all notifications', e);
  }
}
