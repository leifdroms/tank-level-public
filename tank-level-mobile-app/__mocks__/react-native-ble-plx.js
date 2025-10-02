class MockSubscription {
  remove() {}
}

class MockDevice {
  constructor({ id = 'mock-device', name = 'Mock Device' } = {}) {
    this.id = id;
    this.name = name;
  }

  async discoverAllServicesAndCharacteristics() {
    return this;
  }

  async services() {
    return [];
  }

  async characteristics() {
    return [];
  }

  async readCharacteristicForService() {
    return { value: null };
  }

  async writeCharacteristicWithResponseForService() {
    return {};
  }
}

class MockBleManager {
  constructor() {
    this.startDeviceScan = jest.fn();
    this.stopDeviceScan = jest.fn();
    this.onStateChange = jest.fn(() => new MockSubscription());
    this.state = jest.fn(async () => 'PoweredOn');
    this.connectToDevice = jest.fn(async () => new MockDevice());
    this.cancelDeviceConnection = jest.fn(async () => {});
    this.onDeviceDisconnected = jest.fn(() => new MockSubscription());
  }
}

module.exports = {
  BleManager: MockBleManager,
  Device: MockDevice,
  State: { PoweredOn: 'PoweredOn' },
  BleError: class MockBleError extends Error {},
  Subscription: MockSubscription,
};
