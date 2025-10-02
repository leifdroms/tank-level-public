import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import { DeviceList } from '../DeviceList';

const makeDevice = (overrides: Partial<{ id: string; name: string }> = {}) => ({
  id: overrides.id ?? 'device-id',
  name: overrides.name ?? 'Tank Device',
});

describe('DeviceList', () => {
  it('shows scanning indicator when searching', () => {
    const { getByText } = render(
      <DeviceList
        scanning
        devices={[] as any}
        onScan={jest.fn()}
        onConnect={jest.fn()}
      />
    );

    expect(getByText('Scanning...')).toBeTruthy();
  });

  it('renders devices and invokes connect handler', () => {
    const onConnect = jest.fn();
    const device = makeDevice();

    const { getByText } = render(
      <DeviceList
        scanning={false}
        devices={[device] as any}
        onScan={jest.fn()}
        onConnect={onConnect}
      />
    );

    fireEvent.press(getByText('Tank Device'));
    expect(onConnect).toHaveBeenCalledWith(device);
  });
});
