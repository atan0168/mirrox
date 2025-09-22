import * as TaskManager from 'expo-task-manager';
import * as BackgroundTask from 'expo-background-task';
import { runNotificationRules } from './NotificationOrchestrator';

const TASK_NAME = 'notification-background-fetch';
const MIN_INTERVAL_MINUTES = 15; // 15 minutes

if (!TaskManager.isTaskDefined(TASK_NAME)) {
  TaskManager.defineTask(TASK_NAME, async () => {
    try {
      await runNotificationRules();
      return BackgroundTask.BackgroundTaskResult.Success;
    } catch (error) {
      console.warn('[NotificationBackgroundService] Task error', error);
      return BackgroundTask.BackgroundTaskResult.Failed;
    }
  });
}

export async function ensureNotificationBackgroundTaskRegistered(): Promise<void> {
  try {
    const status = await BackgroundTask.getStatusAsync();
    if (status !== BackgroundTask.BackgroundTaskStatus.Available) {
      console.warn(
        '[NotificationBackgroundService] Background tasks unavailable with current system permissions.'
      );
      return;
    }
    const alreadyRegistered =
      await TaskManager.isTaskRegisteredAsync(TASK_NAME);
    if (!alreadyRegistered) {
      await BackgroundTask.registerTaskAsync(TASK_NAME, {
        minimumInterval: MIN_INTERVAL_MINUTES,
      });
    }
  } catch (error) {
    console.warn('[NotificationBackgroundService] Registration failed', error);
  }
}

export async function runNotificationsNowForDebug(): Promise<void> {
  await runNotificationRules();
}
