import React, { useCallback } from 'react';
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  SafeAreaView,
  ScrollView,
  Switch,
  Text,
  TouchableWithoutFeedback,
  Platform,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import alertsStyles from '../styles/main';
import settingsStyles from '../styles/settings';
import { useTankContext } from '../../context/TankContext';
import Alerts from '../types/Alerts';
import { AuthenticationControls } from '../../components/AuthenticationControls';
import { AuthenticationResult, ChangePinResult } from '../types/Auth';

const Settings: React.FC = () => {
  const { state, actions, dispatch, refs } = useTankContext();
  const { hardwareApi } = refs;
  const { alerts, tankData, connected, authenticated, pin, connectedDevice } = state;
  const insets = useSafeAreaInsets();

  const handleAlertToggle = useCallback(
    (key: keyof Alerts) => (value: boolean) => {
      actions.updateAlert(key, value);
    },
    [actions]
  );

  const handleSensorToggle = useCallback(
    (key: 'greyEnabled' | 'blackEnabled') => async (value: boolean) => {
      if (!connected) {
        Alert.alert('Not connected', 'Connect to a device before changing sensor settings.');
        return;
      }

      if (!authenticated) {
        Alert.alert('Authentication required', 'Authenticate with your device first.');
        return;
      }

      const updateFn = hardwareApi.current.updateSensorConfig;
      if (!updateFn) {
        Alert.alert('Unavailable', 'Sensor controls are currently unavailable. Try reconnecting.');
        return;
      }

      const previous = {
        greyEnabled: tankData.greyEnabled,
        blackEnabled: tankData.blackEnabled,
      };

      const nextFlags = {
        ...previous,
        [key]: value,
      } as { greyEnabled: boolean; blackEnabled: boolean };

      if (previous[key] === value) {
        return;
      }

      actions.setSensorFlags(nextFlags);

      try {
        await updateFn(nextFlags);
      } catch (error) {
        console.error('Error updating sensor config', error);
        actions.setSensorFlags(previous);
        Alert.alert('Update failed', 'Could not update sensor configuration. Please try again.');
      }
    },
    [actions, authenticated, connected, hardwareApi, tankData.blackEnabled, tankData.greyEnabled]
  );

  const handleAuthenticate = useCallback(async (): Promise<AuthenticationResult> => {
    const authenticateFn = hardwareApi.current.authenticateWithPin;
    if (!connectedDevice) {
      return { status: 'error', message: 'Connect to a device before authenticating.' };
    }

    if (!authenticateFn) {
      return { status: 'error', message: 'Authentication is not available. Try reconnecting.' };
    }

    return authenticateFn(connectedDevice, pin);
  }, [connectedDevice, pin, hardwareApi]);

  const handleDeauthenticate = useCallback(() => {
    dispatch({ type: 'RESET_AUTH' });
    dispatch({ type: 'SET_PIN', payload: '' });
  }, [dispatch]);

  const handleChangePin = useCallback(
    async (nextPin: string): Promise<ChangePinResult> => {
      const changeFn = hardwareApi.current.changePinOnDevice;
      if (!connected) {
        return { status: 'error', message: 'Connect to a device before changing the PIN.' };
      }
      if (!authenticated) {
        return {
          status: 'error',
          message: 'Authenticate with the device before changing the PIN.',
        };
      }
      if (!changeFn) {
        return { status: 'error', message: 'Changing the PIN is unavailable. Try reconnecting.' };
      }

      return changeFn(nextPin);
    },
    [authenticated, connected, hardwareApi]
  );

  return (
    <SafeAreaView style={settingsStyles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'position' : 'height'}
        enabled
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <ScrollView
            contentInsetAdjustmentBehavior="automatic"
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: insets.bottom + 96 }}
          >
        <Text style={settingsStyles.sectionTitle}>Sensor Controls</Text>

        <View style={settingsStyles.cardRow}>
          <View style={settingsStyles.card}>
            <Text style={settingsStyles.cardHeading}>Tank Sensors</Text>

            <View style={alertsStyles.alertRow}>
              <Text>Grey Tank Sensor</Text>
              <Switch
                value={tankData.greyEnabled}
                disabled={!connected || !authenticated}
                onValueChange={handleSensorToggle('greyEnabled')}
              />
            </View>

            <View style={[alertsStyles.alertRow, settingsStyles.lastRow]}>
              <Text>Black Tank Sensor</Text>
              <Switch
                value={tankData.blackEnabled}
                disabled={!connected || !authenticated}
                onValueChange={handleSensorToggle('blackEnabled')}
              />
            </View>

            {(!connected || !authenticated) && (
              <Text style={alertsStyles.infoText}>
                Connect and authenticate to change sensor availability.
              </Text>
            )}
          </View>
        </View>

        <Text style={settingsStyles.sectionTitle}>Alert Settings</Text>

        <View style={settingsStyles.cardRow}>
          <View style={settingsStyles.card}>
            <Text style={settingsStyles.cardHeading}>Grey Tank</Text>

            <View style={alertsStyles.alertRow}>
              <Text>1/3 Full</Text>
              <Switch
                testID="alert-grey13-switch"
                value={alerts.grey13}
                disabled={!tankData.greyEnabled}
                onValueChange={handleAlertToggle('grey13')}
              />
            </View>

            <View style={alertsStyles.alertRow}>
              <Text>2/3 Full</Text>
              <Switch
                testID="alert-grey23-switch"
                value={alerts.grey23}
                disabled={!tankData.greyEnabled}
                onValueChange={handleAlertToggle('grey23')}
              />
            </View>

            <View style={[alertsStyles.alertRow, settingsStyles.lastRow]}>
              <Text>Full</Text>
              <Switch
                testID="alert-greyFull-switch"
                value={alerts.greyFull}
                disabled={!tankData.greyEnabled}
                onValueChange={handleAlertToggle('greyFull')}
              />
            </View>

            {!tankData.greyEnabled && (
              <Text style={alertsStyles.infoText}>
                Enable the grey tank sensor to configure alerts.
              </Text>
            )}
          </View>

          <View style={settingsStyles.card}>
            <Text style={settingsStyles.cardHeading}>Black Tank</Text>

            <View style={alertsStyles.alertRow}>
              <Text>1/3 Full</Text>
              <Switch
                testID="alert-black13-switch"
                value={alerts.black13}
                disabled={!tankData.blackEnabled}
                onValueChange={handleAlertToggle('black13')}
              />
            </View>

            <View style={alertsStyles.alertRow}>
              <Text>2/3 Full</Text>
              <Switch
                testID="alert-black23-switch"
                value={alerts.black23}
                disabled={!tankData.blackEnabled}
                onValueChange={handleAlertToggle('black23')}
              />
            </View>

            <View style={[alertsStyles.alertRow, settingsStyles.lastRow]}>
              <Text>Full</Text>
              <Switch
                testID="alert-blackFull-switch"
                value={alerts.blackFull}
                disabled={!tankData.blackEnabled}
                onValueChange={handleAlertToggle('blackFull')}
              />
            </View>

            {!tankData.blackEnabled && (
              <Text style={alertsStyles.infoText}>
                Enable the black tank sensor to configure alerts.
              </Text>
            )}
          </View>
        </View>

        <AuthenticationControls
          pin={pin}
          onPinChange={(value) => dispatch({ type: 'SET_PIN', payload: value })}
          onAuthenticate={handleAuthenticate}
          onDeauthenticate={authenticated ? handleDeauthenticate : undefined}
          onChangePin={authenticated ? handleChangePin : undefined}
          disabled={!connected}
          authenticated={authenticated}
        />
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default Settings;
