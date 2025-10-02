import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';

import { AuthenticationControls } from '../AuthenticationControls';

describe('AuthenticationControls', () => {
  it('disables authenticate button when pin invalid', () => {
    const onAuthenticate = jest.fn().mockResolvedValue({ status: 'success' as const });
    const { getByText } = render(
      <AuthenticationControls
        pin="123"
        onPinChange={jest.fn()}
        onAuthenticate={onAuthenticate}
        disabled={false}
        authenticated={false}
      />
    );

    const button = getByText('Authenticate');
    fireEvent.press(button);
    expect(onAuthenticate).not.toHaveBeenCalled();
  });

  it('authenticates when pin valid', async () => {
    const onAuthenticate = jest.fn().mockResolvedValue({ status: 'success' as const });
    const { getByText } = render(
      <AuthenticationControls
        pin="123456"
        onPinChange={jest.fn()}
        onAuthenticate={onAuthenticate}
        disabled={false}
        authenticated={false}
      />
    );

    await act(async () => {
      fireEvent.press(getByText('Authenticate'));
    });
    expect(onAuthenticate).toHaveBeenCalled();
  });

  it('shows sign out control when authenticated and handles press', () => {
    const onAuthenticate = jest.fn().mockResolvedValue({ status: 'success' as const });
    const onDeauthenticate = jest.fn();
    const { getByText } = render(
      <AuthenticationControls
        pin="123456"
        onPinChange={jest.fn()}
        onAuthenticate={onAuthenticate}
        onDeauthenticate={onDeauthenticate}
        onChangePin={jest.fn().mockResolvedValue({ status: 'success' as const })}
        disabled={false}
        authenticated
      />
    );

    fireEvent.press(getByText('Change PIN'));
    fireEvent.press(getByText('Close'));
    fireEvent.press(getByText('Sign Out'));
    expect(onDeauthenticate).toHaveBeenCalled();
  });

  it('allows changing pin when authenticated', async () => {
    const onAuthenticate = jest.fn().mockResolvedValue({ status: 'success' as const });
    const onChangePin = jest.fn().mockResolvedValue({ status: 'success' as const });
    const { getByText, getByPlaceholderText } = render(
      <AuthenticationControls
        pin="123456"
        onPinChange={jest.fn()}
        onAuthenticate={onAuthenticate}
        onChangePin={onChangePin}
        disabled={false}
        authenticated
      />
    );

    fireEvent.press(getByText('Change PIN'));
    const input = getByPlaceholderText('New 6-digit PIN');
    const confirmInput = getByPlaceholderText('Confirm new 6-digit PIN');
    fireEvent.changeText(input, '654321');
    fireEvent.changeText(confirmInput, '654321');

    await act(async () => {
      fireEvent.press(getByText('Save New PIN'));
    });
    expect(onChangePin).toHaveBeenCalledWith('654321');
  });

  it('prevents saving mismatched pins', async () => {
    const onAuthenticate = jest.fn().mockResolvedValue({ status: 'success' as const });
    const onChangePin = jest.fn().mockResolvedValue({ status: 'success' as const });
    const { getByText, getByPlaceholderText } = render(
      <AuthenticationControls
        pin="123456"
        onPinChange={jest.fn()}
        onAuthenticate={onAuthenticate}
        onChangePin={onChangePin}
        disabled={false}
        authenticated
      />
    );

    fireEvent.press(getByText('Change PIN'));
    const input = getByPlaceholderText('New 6-digit PIN');
    const confirmInput = getByPlaceholderText('Confirm new 6-digit PIN');
    fireEvent.changeText(input, '654321');
    fireEvent.changeText(confirmInput, '123456');

    expect(getByText('PINs do not match.')).toBeTruthy();

    await act(async () => {
      fireEvent.press(getByText('Save New PIN'));
    });

    expect(onChangePin).not.toHaveBeenCalled();
  });
});
