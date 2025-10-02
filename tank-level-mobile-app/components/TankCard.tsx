import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

import styles from '../app/styles/main';

export interface TankCardProps {
  title: string;
  level: number;
  stable: boolean;
  enabled?: boolean;
  showAcknowledge?: boolean;
  onAcknowledge?: () => void;
}

const getLevelText = (level: number): string => {
  switch (level) {
    case 0:
      return 'Empty';
    case 1:
      return '1/3';
    case 2:
      return '2/3';
    case 3:
      return 'Full';
    default:
      return 'Unknown';
  }
};

const getLevelColor = (level: number): string => {
  switch (level) {
    case 0:
      return '#4CAF50';
    case 1:
      return '#8BC34A';
    case 2:
      return '#FFC107';
    case 3:
      return '#F44336';
    default:
      return '#9E9E9E';
  }
};

export const TankCard: React.FC<TankCardProps> = ({
  title,
  level,
  stable,
  enabled = true,
  showAcknowledge = false,
  onAcknowledge,
}) => (
  <View style={styles.tankCard}>
    <Text style={styles.tankTitle}>{title}</Text>
    {enabled ? (
      <>
        <View
          style={[
            styles.levelIndicator,
            { backgroundColor: getLevelColor(level) },
          ]}
        >
          <Text style={styles.levelText}>{getLevelText(level)}</Text>
        </View>
        <Text style={styles.stabilityText}>
          {stable ? 'Stable Reading' : 'Stabilizing...'}
        </Text>
      </>
    ) : (
      <Text style={styles.warningText}>Sensor disabled in Settings</Text>
    )}
    {enabled && showAcknowledge && onAcknowledge && (
      <TouchableOpacity style={styles.ackButton} onPress={onAcknowledge}>
        <Text style={styles.ackButtonText}>Acknowledge Alert</Text>
      </TouchableOpacity>
    )}
  </View>
);
