import {
  BleManager,
  BleError,
  BleErrorCode,
  State,
  Device,
  Subscription,
} from 'react-native-ble-plx';
import { PermissionsAndroid, Platform } from 'react-native';

export interface TankBleClientConfig {
  pollIntervalMs?: number;
  scanDurationMs?: number;
  validNamePatterns?: RegExp[];
  manager?: BleManager;
}

export interface TankConnection {
  device: Device;
  serviceUUID: string;
  dataCharacteristicUUID: string;
}

export interface ScanOptions {
  onDevice: (device: Device) => void;
  onError?: (error: BleError) => void;
  onStop?: () => void;
  durationMs?: number;
}

export interface AuthFormat {
  service: string;
  characteristic: string;
  value: string;
}

const DEFAULT_POLL_INTERVAL = 2000;
const DEFAULT_SCAN_DURATION = 10000;
const DEFAULT_VALID_PATTERNS = [/^RV Tanks [0-9A-Fa-f]{8}$/, /^RV_Tank_Monitor$/];

export class TankBleClient {
  private readonly manager: BleManager;
  private readonly pollIntervalMs: number;
  private readonly defaultScanDuration: number;
  private readonly validPatterns: RegExp[];

  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private stateSubscription: Subscription | null = null;
  private disconnectSubscription: Subscription | null = null;
  private scanTimeout: ReturnType<typeof setTimeout> | null = null;
  private scanStopHandler: (() => void) | undefined;

  constructor(config: TankBleClientConfig = {}) {
    this.manager = config.manager ?? new BleManager();
    this.pollIntervalMs = config.pollIntervalMs ?? DEFAULT_POLL_INTERVAL;
    this.defaultScanDuration = config.scanDurationMs ?? DEFAULT_SCAN_DURATION;
    this.validPatterns = config.validNamePatterns ?? DEFAULT_VALID_PATTERNS;
  }

  async currentState(): Promise<State> {
    return this.manager.state();
  }

  onStateChange(listener: (state: State) => void, emitCurrent = false): Subscription {
    this.stateSubscription = this.manager.onStateChange(listener, emitCurrent);
    return this.stateSubscription;
  }

  async requestPermissions(): Promise<void> {
    if (Platform.OS !== 'android') return;

    await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    ]);
  }

  startScan({ onDevice, onError, onStop, durationMs }: ScanOptions): void {
    this.stopScan();

    const scanDuration = durationMs ?? this.defaultScanDuration;
    this.scanStopHandler = onStop;

    this.manager.startDeviceScan(
      null,
      { allowDuplicates: true },
      (error, device) => {
        if (error) {
          onError?.(error);
          this.stopScan();
          return;
        }

        if (!device) return;

        const actualName = this.actualDeviceName(device);
        if (!actualName) return;

        if (!this.validPatterns.some((pattern) => pattern.test(actualName))) {
          return;
        }

        const normalized = Object.assign(Object.create(Object.getPrototypeOf(device)), device, {
          name: actualName,
        }) as Device;

        onDevice(normalized);
      }
    );

    this.scanTimeout = setTimeout(() => this.stopScan(), scanDuration);
  }

  stopScan(): void {
    this.manager.stopDeviceScan();

    if (this.scanTimeout) {
      clearTimeout(this.scanTimeout);
      this.scanTimeout = null;
    }

    if (this.scanStopHandler) {
      this.scanStopHandler();
      this.scanStopHandler = undefined;
    }
  }

  async connect(deviceId: string): Promise<TankConnection> {
    const device = await this.manager.connectToDevice(deviceId);
    await device.discoverAllServicesAndCharacteristics();

    const services = await device.services();
    const tankService = services.find((service) =>
      service.uuid.toLowerCase().includes('ff00') || service.uuid.toLowerCase().includes('00ff')
    );

    if (!tankService) {
      throw new Error('TANK_SERVICE_NOT_FOUND');
    }

    const characteristics = await tankService.characteristics();
    const dataCharacteristic = characteristics.find((char) => char.uuid.toLowerCase().includes('ff01'));

    if (!dataCharacteristic) {
      throw new Error('TANK_CHARACTERISTIC_NOT_FOUND');
    }

    return {
      device,
      serviceUUID: tankService.uuid,
      dataCharacteristicUUID: dataCharacteristic.uuid,
    };
  }

  onDisconnected(deviceId: string, handler: (error?: BleError) => void): Subscription {
    if (this.disconnectSubscription) {
      this.disconnectSubscription.remove();
    }

    this.disconnectSubscription = this.manager.onDeviceDisconnected(deviceId, (error, _device) => {
      handler(error ?? undefined);
    });
    return this.disconnectSubscription;
  }

  startPolling(connection: TankConnection, onData: (value: string) => void | Promise<void>): void {
    if (this.pollTimer) return;

    const { device, serviceUUID, dataCharacteristicUUID } = connection;

    this.pollTimer = setInterval(async () => {
      try {
        const characteristic = await device.readCharacteristicForService(serviceUUID, dataCharacteristicUUID);
        if (characteristic?.value) {
          await onData(characteristic.value);
        }
      } catch (error) {
        console.error('BLE poll error:', error);
      }
    }, this.pollIntervalMs);
  }

  stopPolling(): void {
    if (!this.pollTimer) return;

    clearInterval(this.pollTimer);
    this.pollTimer = null;
  }

  isPolling(): boolean {
    return Boolean(this.pollTimer);
  }

  async authenticate(device: Device, formats: AuthFormat[]): Promise<boolean> {
    for (const format of formats) {
      try {
        await device.writeCharacteristicWithResponseForService(
          format.service,
          format.characteristic,
          format.value
        );
        return true;
      } catch (error) {
        console.log(`Auth attempt failed for service=${format.service}`);
      }
    }

    return false;
  }

  async writeCommand(device: Device, serviceUUID: string, characteristicUUID: string, payloadBase64: string): Promise<void> {
    await device.writeCharacteristicWithResponseForService(serviceUUID, characteristicUUID, payloadBase64);
  }

  async disconnect(device: Device): Promise<void> {
    try {
      await this.manager.cancelDeviceConnection(device.id);
    } finally {
      this.disconnectSubscription?.remove();
      this.disconnectSubscription = null;
      this.stopPolling();
    }
  }

  async ensureDisconnected(deviceId: string): Promise<void> {
    try {
      const isConnected = await this.manager.isDeviceConnected(deviceId);
      if (isConnected) {
        await this.manager.cancelDeviceConnection(deviceId);
      }
    } catch (error) {
      if (error instanceof BleError) {
        if (error.errorCode === BleErrorCode.DeviceNotConnected) {
          return;
        }
      }
      console.warn('ensureDisconnected error:', error);
    }
  }

  cleanup(): void {
    this.stopScan();
    this.stopPolling();

    if (this.stateSubscription) {
      this.stateSubscription.remove();
      this.stateSubscription = null;
    }

    if (this.disconnectSubscription) {
      this.disconnectSubscription.remove();
      this.disconnectSubscription = null;
    }
  }

  private actualDeviceName(device: Device | null): string | null {
    if (!device) return null;
    return device.localName || device.name || null;
  }
}
