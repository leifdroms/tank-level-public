import { act, renderHook } from '@testing-library/react-native';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

import { useTankNotifications } from '../useTankNotifications';

const flushMicrotasks = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('useTankNotifications', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('configures notification handler on mount', async () => {
    renderHook(() => useTankNotifications());

    await flushMicrotasks();

    expect(Notifications.setNotificationHandler).toHaveBeenCalled();
    expect(Notifications.getPermissionsAsync).toHaveBeenCalled();
  });

  it('sends notification via expo API', async () => {
    const originalDescriptor = Object.getOwnPropertyDescriptor(Platform, 'OS');
    Object.defineProperty(Platform, 'OS', { value: 'android', configurable: true });

    const { result } = renderHook(() => useTankNotifications());

    await act(async () => {
      await result.current.sendNotification('Title', 'Body');
    });

    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.objectContaining({ title: 'Title', body: 'Body' }),
        channelId: 'tank-alerts',
      })
    );

    if (originalDescriptor) {
      Object.defineProperty(Platform, 'OS', originalDescriptor);
    }
  });

  it('clears badge count', async () => {
    const { result } = renderHook(() => useTankNotifications());

    await act(async () => {
      await result.current.clearBadge();
    });

    expect(Notifications.setBadgeCountAsync).toHaveBeenCalledWith(0);
  });
});
