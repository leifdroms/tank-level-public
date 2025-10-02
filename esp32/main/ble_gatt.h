#ifndef BLE_GATT_H
#define BLE_GATT_H

#include <stdint.h>
#include <stdbool.h>
#include "esp_gatts_api.h"
#include "esp_gap_ble_api.h"

// BLE Settings
#define PROFILE_NUM     1
#define PROFILE_APP_ID  0
#define SVC_INST_ID     0
#define CHAR_DECLARATION_SIZE   (sizeof(uint8_t))
#define MAX_CONNECTIONS 7

// Service UUIDs
#define TANK_SERVICE_UUID   0x00FF
#define TANK_DATA_CHAR_UUID 0xFF01
#define AUTH_CHAR_UUID      0xFF02
#define CONFIG_CHAR_UUID    0xFF03
#define PIN_CHANGE_CHAR_UUID 0xFF04

// Handle table indices
enum {
    IDX_SVC,
    IDX_CHAR_DATA,
    IDX_CHAR_VAL_DATA,
    IDX_CHAR_CFG_DATA,
    HRS_IDX_NB,
};

// Connection info
typedef struct {
    uint16_t conn_id;
    esp_bd_addr_t remote_bda;
    bool is_connected;
    bool notifications_enabled;
    bool is_encrypted;  // Track if connection is encrypted/authenticated
    bool is_authenticated; // Application-level PIN authentication state
} ble_conn_info_t;

// Function prototypes
void ble_gatt_init(void);
void ble_gatt_send_notification(const uint8_t *data, uint16_t len);
void ble_update_tank_data(uint8_t grey_level, uint8_t black_level, bool grey_enabled, bool black_enabled);
bool ble_is_connected(void);

#endif // BLE_GATT_H
