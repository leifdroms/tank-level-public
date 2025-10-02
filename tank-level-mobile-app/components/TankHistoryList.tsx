import React from 'react';
import { Text, View } from 'react-native';

import TankData from '@/types/TankData';
import styles from '../app/styles/main';

interface TankHistoryListProps {
  history: TankData[];
}

export const TankHistoryList: React.FC<TankHistoryListProps> = ({ history }) => {
  if (history.length === 0) {
    return null;
  }

  const latestEntries = [...history].slice(-10).reverse();

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Recent History</Text>
      {latestEntries.map((entry, index) => (
        <Text key={index} style={styles.infoText}>
          {`${entry.timestamp.toLocaleString()}: Grey ${
            entry.greyEnabled ? `${entry.greyLevel}/3` : 'Disabled'
          }, Black ${entry.blackEnabled ? `${entry.blackLevel}/3` : 'Disabled'}`}
        </Text>
      ))}
    </View>
  );
};
