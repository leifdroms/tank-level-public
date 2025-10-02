import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import { TankCard } from '../TankCard';

describe('TankCard', () => {
  it('renders level and stability text', () => {
    const { getByText } = render(
      <TankCard title="Grey" level={2} stable={false} />
    );

    expect(getByText('Grey')).toBeTruthy();
    expect(getByText('2/3')).toBeTruthy();
    expect(getByText('Stabilizing...')).toBeTruthy();
  });

  it('renders acknowledgement button when enabled', () => {
    const onAcknowledge = jest.fn();
    const { getByText } = render(
      <TankCard
        title="Black"
        level={3}
        stable
        showAcknowledge
        onAcknowledge={onAcknowledge}
      />
    );

    fireEvent.press(getByText('Acknowledge Alert'));
    expect(onAcknowledge).toHaveBeenCalled();
  });
});
