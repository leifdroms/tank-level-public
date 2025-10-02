import { useCallback, useEffect } from 'react';
import { Alert, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { requestPermissionsAsync } from 'expo-notifications';

export interface TankNotificationApi {
  sendNotification: (title: string, body: string) => Promise<void>;
  clearBadge: () => Promise<void>;
}

export const useTankNotifications = (): TankNotificationApi => {
  useEffect(() => {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });

    const initialize = async () => {
      try {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
          const { status } = await requestPermissionsAsync();
          finalStatus = status;
        }

        if (finalStatus !== 'granted') {
          Alert.alert('Permission needed', 'Please enable notifications for tank alerts');
          return;
        }

        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('tank-alerts', {
            name: 'Tank Alerts',
            importance: Notifications.AndroidImportance.HIGH,
            vibrationPattern: [0, 250, 250, 250],
            sound: 'default',
            lightColor: '#FF231F7C',
          });
        }

        await Notifications.setBadgeCountAsync(0);
      } catch (error) {
        console.error('Failed to initialize notifications:', error);
      }
    };

    initialize();
  }, []);

  const sendNotification = useCallback(async (title: string, body: string) => {
    try {
      const notificationRequest: Notifications.NotificationRequestInput & { channelId?: string } = {
        content: {
          title,
          body,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
          data: { type: 'tank-alert' },
        },
        trigger: null,
      };

      if (Platform.OS === 'android') {
        notificationRequest.channelId = 'tank-alerts';
      }

      await Notifications.scheduleNotificationAsync(notificationRequest);
    } catch (error) {
      console.error('Failed to send notification:', error);
    }
  }, []);

  const clearBadge = useCallback(async () => {
    try {
      await Notifications.setBadgeCountAsync(0);
    } catch (error) {
      console.error('Failed to clear notification badge:', error);
    }
  }, []);

  return { sendNotification, clearBadge };
};
