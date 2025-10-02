import React, { useEffect, useMemo } from "react";
import {
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Device } from "react-native-ble-plx";

import styles from "../styles/main";
import { useTankContext } from "../../context/TankContext";
import { useTankNotifications } from "../../hooks/useTankNotifications";
import { useBleTankDevice } from "../../hooks/useBleTankDevice";
import { DeviceList } from "../../components/DeviceList";
import { TankCard } from "../../components/TankCard";
import {
  useTankConnectionState,
  useTankAuthenticationState,
  useTankDataState,
  useTankAlertsState,
  useTankLastNotificationState,
} from "../../hooks/useTankSelectors";
import { useTankAlertAcknowledgement } from "../../hooks/useTankAlertAcknowledgement";

const HomeScreen: React.FC = () => {
  const { dispatch, refs } = useTankContext();
  const connection = useTankConnectionState();
  const authState = useTankAuthenticationState();
  const tankState = useTankDataState();
  const alerts = useTankAlertsState();
  const lastNotification = useTankLastNotificationState();
  const { alertsSent } = refs;

  const { sendNotification, clearBadge } = useTankNotifications();
  const notifications = useMemo(
    () => ({ sendNotification, clearBadge }),
    [sendNotification, clearBadge]
  );

  const { initializeBluetooth, scanForDevices, connectToDevice, disconnect } =
    useBleTankDevice({ notifications });

  const { tankData, tankHistory } = tankState;
  const { scanning, devices, connected, connectedDevice } = connection;
  const { authenticated } = authState;

  const { shouldShowGreyAck, shouldShowBlackAck, handleAcknowledge } =
    useTankAlertAcknowledgement({
      tankData,
      alerts,
      lastNotification,
      alertsSentRef: alertsSent,
      dispatch,
      clearBadge,
    });

  useEffect(() => {
    initializeBluetooth();
  }, [initializeBluetooth]);

  useEffect(() => {
    clearBadge();
  }, [clearBadge]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentInsetAdjustmentBehavior="automatic">
        <View style={styles.header}>
          <Text style={styles.title}>RV Tank Monitor</Text>
          {authenticated && (
            <View style={styles.adminBadge}>
              <Text style={styles.adminBadgeText}>ADMIN MODE</Text>
            </View>
          )}
        </View>

        {!connected ? (
          <DeviceList
            scanning={scanning}
            devices={devices}
            onScan={scanForDevices}
            onConnect={(device: Device) => connectToDevice(device)}
          />
        ) : (
          <>
            {connectedDevice && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Connected Device</Text>
                <Text style={styles.infoText}>{connectedDevice.name}</Text>
                <Text style={styles.infoText}>UUID: {connectedDevice.id}</Text>
              </View>
            )}

            <View style={styles.tankSection}>
              <TankCard
                title="Grey Water Tank"
                level={tankData.greyLevel}
                stable={tankData.greyStable}
                enabled={tankData.greyEnabled}
                showAcknowledge={shouldShowGreyAck}
                onAcknowledge={() => handleAcknowledge("grey")}
              />
              <TankCard
                title="Black Water Tank"
                level={tankData.blackLevel}
                stable={tankData.blackStable}
                enabled={tankData.blackEnabled}
                showAcknowledge={shouldShowBlackAck}
                onAcknowledge={() => handleAcknowledge("black")}
              />
            </View>

            {!tankData.greyEnabled && !tankData.blackEnabled && (
              <View style={styles.section}>
                <Text style={styles.infoText}>
                  Both tank sensors are disabled. Enable a sensor in Settings to
                  resume readings.
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.button, styles.disconnectButton]}
              onPress={disconnect}
            >
              <Text style={styles.buttonText}>Disconnect</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default HomeScreen;
