# RV Tank Level Monitor

ESP32-based RV holding tank monitoring system with Bluetooth LE and React Native companion app.

## Hardware Requirements

### Components
- ESP32-WROOM-32 development board
- 6x XKC-Y25-V Non-Contact Liquid Level Sensors (5V)
- 6x Logic level shifters (5V to 3.3V)
- Power supply (5V for sensors, 3.3V from ESP32 regulator)
- Connecting wires

### Pin Connections

#### Sensor Inputs (3.3V after level shifting)
- GPIO 32: Grey Tank 1/3 Level
- GPIO 33: Grey Tank 2/3 Level  
- GPIO 25: Grey Tank Full Level
- GPIO 26: Black Tank 1/3 Level
- GPIO 27: Black Tank 2/3 Level
- GPIO 14: Black Tank Full Level

#### Reset Button
- GPIO 0: Uses built-in BOOT button for PIN reset
- No external components required

### Wiring Diagram

```
XKC-Y25-V Sensor -> Logic Level Shifter -> ESP32
    VCC (Brown) -> 5V
    GND (Blue)  -> GND
    OUT (Yellow) -> HV Input -> LV Output -> ESP32 GPIO Pins
    MODE (Black) -> GND


### Connect MODE (Black) with GND (Blue) as the system relies on pull-up resistors and this toggles the output of the sensor.

Reset Circuit:
    Built-in BOOT button - no external wiring required
```

### Logic Level Shifter Setup
Each sensor requires a bi-directional logic level shifter:
- HV (High Voltage) side: Connect to 5V and sensor output
- LV (Low Voltage) side: Connect to 3.3V and ESP32 GPIO
- GND: Common ground between both sides

## ESP32 Firmware

### Building with ESP-IDF

1. Install ESP-IDF (v5.0 or later)
2. Navigate to esp32 directory
3. Configure: `idf.py menuconfig`
4. Build: `idf.py build`
5. Flash: `idf.py -p /dev/ttyUSB0 flash`
6. Monitor: `idf.py -p /dev/ttyUSB0 monitor`

## React Native App

### Installation

```bash
cd tank-level-mobile-app
npm install

# iOS
cd ios && pod install
npx expo run:ios

# Android  
npx expo run:android

### Note: To use Bluetooth on iOS, the app must run on an actual device, and use the --device flag, e.g. "npx expo run:ios --device"
```

### Features

- Real-time tank level monitoring
- PIN-based authentication (Admin role)
- Configurable alerts for tank levels
- Stable reading detection (90 seconds)
- Multi-device support via BLE

## System Operation

### Initial Setup
1. Power on ESP32
2. Open mobile app and scan for "RV Tanks"
3. Connect to device

### Factory Reset
Hold the BOOT button for 10 seconds to clear all settings and PINs.

### Tank Level States
- **Empty**: No sensors triggered
- **1/3**: Lower sensor triggered
- **2/3**: Middle sensor triggered  
- **Full**: Upper sensor triggered

### Stability Detection
System waits 90 seconds after level change before marking reading as "stable" to avoid false alerts from liquid sloshing during vehicle movement.

## BLE Service Structure

### Service UUID: 0x00FF

#### Characteristics:
- **Tank Data (0xFF01)** – Read / Notify
  - Byte 0: Grey 1/3 sensor (0/1)
  - Byte 1: Grey 2/3 sensor (0/1)
  - Byte 2: Grey full sensor (0/1)
  - Byte 3: Black 1/3 sensor (0/1)
  - Byte 4: Black 2/3 sensor (0/1)
  - Byte 5: Black full sensor (0/1)
  - Byte 6: Grey sensor enabled flag (0/1)
  - Byte 7: Black sensor enabled flag (0/1)
  - Byte 8: System stable flag (0 = stabilizing, 1 = stable)

- **Auth (0xFF02)** – Write (6-byte PIN, must match the stored PIN)

- **Config (0xFF03)** – Write (2 bytes: [greyEnabled, blackEnabled], each 0 or 1)

- **PIN Change (0xFF04)** – Write (6-byte replacement PIN, requires prior authentication)

## Troubleshooting

### Sensors not reading correctly
- Verify 5V power to sensors
- Check logic level shifter connections
- Ensure proper grounding
- Test sensors individually with multimeter

### BLE connection issues
- Ensure location services enabled (Android)
- Grant all required permissions
- Reset ESP32 if needed
- Check for interference from other BLE devices

### Reset not working
- Ensure you're pressing the BOOT button (usually labeled on ESP32 board)
- Hold for full 10 seconds
- Monitor serial output during reset attempt