import React from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { Device } from 'react-native-ble-plx';

import styles from '../app/styles/main';

interface DeviceListProps {
  scanning: boolean;
  devices: Device[];
  onScan: () => void;
  onConnect: (device: Device) => void;
}

export const DeviceList: React.FC<DeviceListProps> = ({
  scanning,
  devices,
  onScan,
  onConnect,
}) => (
  <View style={styles.section}>
    <TouchableOpacity
      style={styles.button}
      onPress={onScan}
      disabled={scanning}
    >
      {scanning ? (
        <View style={styles.scanningContainer}>
          <ActivityIndicator color="white" />
          <Text style={styles.buttonText}>Scanning...</Text>
        </View>
      ) : (
        <Text style={styles.buttonText}>Scan for Devices</Text>
      )}
    </TouchableOpacity>

    {devices.map((device) => (
      <TouchableOpacity
        key={device.id}
        style={styles.deviceItem}
        onPress={() => onConnect(device)}
      >
        <Text style={styles.deviceName}>{device.name}</Text>
        <Text style={styles.deviceId}>UUID: {device.id}</Text>
        <Text style={styles.deviceInfo}>Tap to connect</Text>
      </TouchableOpacity>
    ))}
  </View>
);
