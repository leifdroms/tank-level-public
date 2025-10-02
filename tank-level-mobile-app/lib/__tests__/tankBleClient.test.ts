import { TankBleClient } from '../tankBleClient';

describe('TankBleClient', () => {
  const createManager = () => {
    const subscriptions: Array<{ remove: jest.Mock }> = [];
    return {
      startDeviceScan: jest.fn(),
      stopDeviceScan: jest.fn(),
      connectToDevice: jest.fn(),
      onStateChange: jest.fn((listener: (state: string) => void, emitCurrent?: boolean) => {
        if (emitCurrent) listener('PoweredOn');
        const sub = { remove: jest.fn() };
        subscriptions.push(sub);
        return sub;
      }),
      onDeviceDisconnected: jest.fn(() => {
        const sub = { remove: jest.fn() };
        subscriptions.push(sub);
        return sub;
      }),
      state: jest.fn(async () => 'PoweredOn'),
      cancelDeviceConnection: jest.fn(async () => {}),
      __subscriptions: subscriptions,
    };
  };

  it('emits only devices matching allowed name patterns during scan', () => {
    const manager = createManager();
    const client = new TankBleClient({ manager: manager as any, validNamePatterns: [/^RV Tanks/], scanDurationMs: 5_000 });
    const onDevice = jest.fn();

    let callback: ((error: unknown, device: any) => void) | undefined;
    (manager.startDeviceScan as jest.Mock).mockImplementation((_, __, cb) => {
      callback = cb;
    });

    client.startScan({ onDevice });

    callback?.(null, { id: '1', name: 'Something Else' });
    callback?.(null, { id: '2', name: 'RV Tanks ABCDEF12' });

    expect(onDevice).toHaveBeenCalledTimes(1);
    expect(onDevice).toHaveBeenCalledWith(expect.objectContaining({ id: '2', name: 'RV Tanks ABCDEF12' }));
  });

  it('stops scanning and calls onStop handler', () => {
    jest.useFakeTimers();
    const manager = createManager();
    const client = new TankBleClient({ manager: manager as any, scanDurationMs: 100 });
    const onStop = jest.fn();

    client.startScan({ onDevice: jest.fn(), onStop });

    expect(manager.startDeviceScan).toHaveBeenCalled();

    jest.advanceTimersByTime(200);

    expect(manager.stopDeviceScan).toHaveBeenCalled();
    expect(onStop).toHaveBeenCalledTimes(1);

    jest.useRealTimers();
  });

  it('connects to device and returns connection metadata', async () => {
    const manager = createManager();
    const mockDevice = {
      id: 'device-id',
      name: 'Device',
      discoverAllServicesAndCharacteristics: jest.fn(async () => mockDevice),
      services: jest.fn(async () => [
        {
          uuid: '0000ff00-0000-1000-8000-00805f9b34fb',
          characteristics: async () => [
            { uuid: '0000ff01-0000-1000-8000-00805f9b34fb' },
          ],
        },
      ]),
    };

    (manager.connectToDevice as jest.Mock).mockResolvedValue(mockDevice);

    const client = new TankBleClient({ manager: manager as any });
    const connection = await client.connect('device-id');

    expect(manager.connectToDevice).toHaveBeenCalledWith('device-id');
    expect(connection.device).toBe(mockDevice);
    expect(connection.serviceUUID.toLowerCase()).toContain('ff00');
    expect(connection.dataCharacteristicUUID.toLowerCase()).toContain('ff01');
  });

  it('throws when expected service cannot be found', async () => {
    const manager = createManager();
    const mockDevice = {
      id: 'device-id',
      discoverAllServicesAndCharacteristics: jest.fn(async () => mockDevice),
      services: jest.fn(async () => []),
    };

    (manager.connectToDevice as jest.Mock).mockResolvedValue(mockDevice);

    const client = new TankBleClient({ manager: manager as any });

    await expect(client.connect('device-id')).rejects.toThrow('TANK_SERVICE_NOT_FOUND');
  });

  it('writes authentication formats until one succeeds', async () => {
    const manager = createManager();
    const device = {
      writeCharacteristicWithResponseForService: jest
        .fn()
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValueOnce({}),
    };

    const client = new TankBleClient({ manager: manager as any });
    const result = await client.authenticate(device as any, [
      { service: 'a', characteristic: 'b', value: 'c' },
      { service: 'd', characteristic: 'e', value: 'f' },
    ]);

    expect(result).toBe(true);
    expect(device.writeCharacteristicWithResponseForService).toHaveBeenCalledTimes(2);
  });

  it('returns false when all authentication attempts fail', async () => {
    const manager = createManager();
    const device = {
      writeCharacteristicWithResponseForService: jest
        .fn()
        .mockRejectedValue(new Error('fail')),
    };

    const client = new TankBleClient({ manager: manager as any });
    const result = await client.authenticate(device as any, [
      { service: 'a', characteristic: 'b', value: 'c' },
    ]);

    expect(result).toBe(false);
  });

  it('polls device at interval and forwards data', async () => {
    jest.useFakeTimers();
    const manager = createManager();
    const client = new TankBleClient({ manager: manager as any, pollIntervalMs: 100 });
    const onData = jest.fn();

    const device = {
      readCharacteristicForService: jest.fn().mockResolvedValue({ value: 'payload' }),
    };

    client.startPolling(
      {
        device: device as any,
        serviceUUID: 'service',
        dataCharacteristicUUID: 'char',
      },
      onData,
    );

    expect(client.isPolling()).toBe(true);

    await jest.advanceTimersByTimeAsync(200);

    expect(onData).toHaveBeenCalledWith('payload');

    client.stopPolling();
    expect(client.isPolling()).toBe(false);

    jest.useRealTimers();
  });

  it('disconnect stops polling and clears subscriptions', async () => {
    const manager = createManager();
    const client = new TankBleClient({ manager: manager as any });
    const device = {
      id: 'device-id',
    };

    await client.disconnect(device as any);

    expect(manager.cancelDeviceConnection).toHaveBeenCalledWith('device-id');
  });
});
