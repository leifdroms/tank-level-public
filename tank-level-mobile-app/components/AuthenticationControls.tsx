import React, { useEffect, useMemo, useState } from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';

import styles from '../app/styles/main';
import { PIN_LENGTH } from '../lib/pin';
import { AuthenticationResult, ChangePinResult } from '@/types/Auth';

interface AuthenticationControlsProps {
  pin: string;
  onPinChange: (value: string) => void;
  onAuthenticate: () => Promise<AuthenticationResult>;
  onDeauthenticate?: () => void;
  onChangePin?: (value: string) => Promise<ChangePinResult>;
  disabled?: boolean;
  authenticated: boolean;
}

export const AuthenticationControls: React.FC<AuthenticationControlsProps> = ({
  pin,
  onPinChange,
  onAuthenticate,
  onDeauthenticate,
  onChangePin,
  disabled = false,
  authenticated,
}) => {
  const [authStatus, setAuthStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );
  const [changePinStatus, setChangePinStatus] = useState<
    { type: 'success' | 'error'; message: string } | null
  >(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isUpdatingPin, setIsUpdatingPin] = useState(false);
  const [showChangePin, setShowChangePin] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');

  useEffect(() => {
    if (!authenticated) {
      setShowChangePin(false);
      setChangePinStatus(null);
      setNewPin('');
      setConfirmPin('');
    } else {
      setAuthStatus(null);
    }
  }, [authenticated]);

  const authDisabled = useMemo(
    () => disabled || pin.length !== PIN_LENGTH || isAuthenticating,
    [disabled, isAuthenticating, pin.length]
  );

  const changeDisabled = useMemo(() => {
    if (!showChangePin) return true;
    if (isUpdatingPin) return true;
    if (newPin.length !== PIN_LENGTH) return true;
    if (confirmPin.length !== PIN_LENGTH) return true;
    return newPin !== confirmPin;
  }, [confirmPin, isUpdatingPin, newPin, showChangePin]);

  const pinsMismatch = useMemo(
    () =>
      showChangePin &&
      newPin.length === PIN_LENGTH &&
      confirmPin.length === PIN_LENGTH &&
      newPin !== confirmPin,
    [confirmPin, newPin, showChangePin]
  );

  const handleAuthenticatePress = async () => {
    if (authDisabled) return;

    setAuthStatus(null);
    setIsAuthenticating(true);
    try {
      const result = await onAuthenticate();
      if (result.status === 'success') {
        setAuthStatus({ type: 'success', message: 'Authenticated successfully.' });
      } else if (result.status === 'invalid-pin') {
        setAuthStatus({ type: 'error', message: 'Invalid PIN. Please try again.' });
      } else {
        setAuthStatus({
          type: 'error',
          message: result.message ?? 'Authentication failed. Please try again.',
        });
      }
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleChangePinPress = async () => {
    if (!onChangePin || changeDisabled) return;

    if (newPin !== confirmPin) {
      setChangePinStatus({ type: 'error', message: 'PINs do not match.' });
      return;
    }

    setChangePinStatus(null);
    setIsUpdatingPin(true);
    try {
      const result = await onChangePin(newPin);
      if (result.status === 'success') {
        setChangePinStatus({
          type: 'success',
          message: result.message ?? 'PIN updated successfully.',
        });
        setNewPin('');
        setConfirmPin('');
      } else {
        setChangePinStatus({ type: 'error', message: result.message });
      }
    } finally {
      setIsUpdatingPin(false);
    }
  };

  const handleCloseChangePin = () => {
    setShowChangePin(false);
    setNewPin('');
    setConfirmPin('');
    setChangePinStatus(null);
  };

  const renderStatus = (status: { type: 'success' | 'error'; message: string } | null) => {
    if (!status) return null;
    const style = status.type === 'error' ? styles.warningText : styles.infoText;
    return <Text style={style}>{status.message}</Text>;
  };

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Authentication</Text>
      {!authenticated ? (
        <>
          <Text style={styles.infoText}>
            Default PIN: 000000 (Hold ESP32 BOOT button for 10s to reset)
          </Text>
          <TextInput
            style={styles.input}
            placeholder={`Enter ${PIN_LENGTH}-digit PIN`}
            value={pin}
            onChangeText={onPinChange}
            keyboardType="numeric"
            maxLength={PIN_LENGTH}
            secureTextEntry
          />
          {renderStatus(authStatus)}
          <TouchableOpacity
            style={styles.button}
            onPress={handleAuthenticatePress}
            disabled={authDisabled}
          >
            <Text style={styles.buttonText}>
              {isAuthenticating ? 'Authenticating…' : 'Authenticate'}
            </Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          {renderStatus(authStatus)}
          <TouchableOpacity
            style={styles.button}
            onPress={() =>
              setShowChangePin((open) => {
                const next = !open;
                if (!next) {
                  setNewPin('');
                  setConfirmPin('');
                  setChangePinStatus(null);
                }
                return next;
              })
            }
          >
            <Text style={styles.buttonText}>{showChangePin ? 'Hide Change PIN' : 'Change PIN'}</Text>
          </TouchableOpacity>

          {showChangePin && (
            <View>
              <TextInput
                style={styles.input}
                placeholder={`New ${PIN_LENGTH}-digit PIN`}
                value={newPin}
                onChangeText={setNewPin}
                keyboardType="numeric"
                maxLength={PIN_LENGTH}
                secureTextEntry
              />
              <TextInput
                style={styles.input}
                placeholder={`Confirm new ${PIN_LENGTH}-digit PIN`}
                value={confirmPin}
                onChangeText={setConfirmPin}
                keyboardType="numeric"
                maxLength={PIN_LENGTH}
                secureTextEntry
              />
              {pinsMismatch && <Text style={styles.warningText}>PINs do not match.</Text>}
              {renderStatus(changePinStatus)}
              <TouchableOpacity
                style={styles.button}
                onPress={handleChangePinPress}
                disabled={changeDisabled || !onChangePin}
              >
                <Text style={styles.buttonText}>
                  {isUpdatingPin ? 'Updating…' : 'Save New PIN'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.disconnectButton]}
                onPress={handleCloseChangePin}
              >
                <Text style={styles.buttonText}>Close</Text>
              </TouchableOpacity>
            </View>
          )}

          {onDeauthenticate && (
            <TouchableOpacity
              style={[styles.button, styles.disconnectButton]}
              onPress={() => {
                handleCloseChangePin();
                onDeauthenticate();
              }}
            >
              <Text style={styles.buttonText}>Sign Out</Text>
            </TouchableOpacity>
          )}
        </>
      )}
    </View>
  );
};
