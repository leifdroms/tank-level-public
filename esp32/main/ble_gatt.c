#include "sdkconfig.h"

// Fallback definitions for VS Code IntelliSense
// These are only used if not already defined in sdkconfig.h
#ifndef CONFIG_BT_LE_LL_RESOLV_LIST_SIZE
#define CONFIG_BT_LE_LL_RESOLV_LIST_SIZE 4
#endif

#ifndef CONFIG_BT_LE_LL_DUP_SCAN_LIST_COUNT
#define CONFIG_BT_LE_LL_DUP_SCAN_LIST_COUNT 16
#endif

#ifndef CONFIG_BT_LE_LL_SCAN_DUPL_CACHE_SIZE
#define CONFIG_BT_LE_LL_SCAN_DUPL_CACHE_SIZE 100
#endif

#ifndef CONFIG_BT_LE_LL_SCAN_DUPL_CACHE_REFRESH_PERIOD
#define CONFIG_BT_LE_LL_SCAN_DUPL_CACHE_REFRESH_PERIOD 0
#endif

#ifndef CONFIG_BT_LE_DFT_TX_POWER_LEVEL_DBM_EFF
#define CONFIG_BT_LE_DFT_TX_POWER_LEVEL_DBM_EFF 9
#endif

#ifndef CONFIG_BT_LE_CTRL_DFT_TX_POWER_LEVEL_EFF
#define CONFIG_BT_LE_CTRL_DFT_TX_POWER_LEVEL_EFF 9
#endif

#ifndef CONFIG_BT_LE_ENHANCED_CONN_UPDATE
#define CONFIG_BT_LE_ENHANCED_CONN_UPDATE 1
#endif

#ifndef CONFIG_BT_LE_CONTROLLER_TASK_STACK_SIZE
#define CONFIG_BT_LE_CONTROLLER_TASK_STACK_SIZE 4096
#endif

#ifndef CONFIG_BT_LE_CONTROLLER_TASK_PRIORITY
#define CONFIG_BT_LE_CONTROLLER_TASK_PRIORITY 25
#endif

#ifndef CONFIG_BT_LE_MAX_CONNECTIONS
#define CONFIG_BT_LE_MAX_CONNECTIONS 3
#endif

#ifndef CONFIG_BT_LE_MAX_PERIODIC_ADVERTISER_LIST
#define CONFIG_BT_LE_MAX_PERIODIC_ADVERTISER_LIST 5
#endif

#ifndef CONFIG_BT_LE_MAX_PERIODIC_SYNCS
#define CONFIG_BT_LE_MAX_PERIODIC_SYNCS 1
#endif

#ifndef CONFIG_BT_LE_MAX_EXT_ADV_INSTANCES
#define CONFIG_BT_LE_MAX_EXT_ADV_INSTANCES 1
#endif

#ifndef CONFIG_BT_LE_EXT_ADV_MAX_SIZE
#define CONFIG_BT_LE_EXT_ADV_MAX_SIZE 31
#endif

#ifndef CONFIG_BT_LE_SCAN_RSP_DATA_MAX_LEN
#define CONFIG_BT_LE_SCAN_RSP_DATA_MAX_LEN 31
#endif

#ifndef CONFIG_BT_LE_SLEEP_ENABLE
#define CONFIG_BT_LE_SLEEP_ENABLE 0
#endif

#ifndef CONFIG_BT_LE_USE_WIFI_PWR_CLK_WORKAROUND
#define CONFIG_BT_LE_USE_WIFI_PWR_CLK_WORKAROUND 0
#endif

#ifndef CONFIG_BT_LE_LL_SCA
#define CONFIG_BT_LE_LL_SCA 500
#endif

#ifndef CONFIG_BT_LE_LP_CLK_ACCURACY_PPM
#define CONFIG_BT_LE_LP_CLK_ACCURACY_PPM 500
#endif

#ifndef CONFIG_BT_LE_COEX_PHY_CODED_TX_RX_TLIM
#define CONFIG_BT_LE_COEX_PHY_CODED_TX_RX_TLIM 0
#endif

#ifndef CONFIG_BT_LE_COEX_PHY_CODED_TX_RX_TLIM_EFF
#define CONFIG_BT_LE_COEX_PHY_CODED_TX_RX_TLIM_EFF 0
#endif

#ifndef CONFIG_BT_CTRL_COEX_PHY_CODED_TX_RX_TLIM_EFF
#define CONFIG_BT_CTRL_COEX_PHY_CODED_TX_RX_TLIM_EFF 0
#endif

#ifndef CONFIG_BT_CTRL_SLEEP_MODE_EFF
#define CONFIG_BT_CTRL_SLEEP_MODE_EFF 0
#endif

#ifndef CONFIG_BT_CTRL_SLEEP_CLOCK_EFF
#define CONFIG_BT_CTRL_SLEEP_CLOCK_EFF 0
#endif

#ifndef CONFIG_BT_CTRL_HCI_TL_EFF
#define CONFIG_BT_CTRL_HCI_TL_EFF 1
#endif

#ifndef CONFIG_BT_CTRL_AGC_RECORRECT_EN
#define CONFIG_BT_CTRL_AGC_RECORRECT_EN 0
#endif

#ifndef CONFIG_BT_CTRL_CODED_AGC_RECORRECT_EN
#define CONFIG_BT_CTRL_CODED_AGC_RECORRECT_EN 0
#endif

#ifndef CONFIG_BT_CTRL_SCAN_BACKOFF_UPPERLIMITMAX
#define CONFIG_BT_CTRL_SCAN_BACKOFF_UPPERLIMITMAX 0
#endif

#include "ble_gatt.h"
#include "tank_monitor.h"
#include "config.h"
#include "esp_log.h"
#include "esp_bt.h"
#include "esp_bt_main.h"
#include "esp_gap_ble_api.h"
#include "esp_gatts_api.h"
#include "esp_gatt_common_api.h"
#include "esp_mac.h"
#include "esp_random.h"
#include <string.h>
#include <stdio.h>

static const char *TAG = "BLE_GATT";

// Static passkey stored for responding to passkey requests
static uint32_t static_passkey = 0;

// Device name with unique identifier
static char device_name[32];

// GATT profile
typedef struct
{
    esp_gatts_cb_t gatts_cb;
    uint16_t gatts_if;
    uint16_t app_id;
    uint16_t conn_id;
    uint16_t service_handle;
    esp_gatt_srvc_id_t service_id;
    uint16_t char_handle;
    esp_bt_uuid_t char_uuid;
    esp_gatt_perm_t perm;
    esp_gatt_char_prop_t property;
    uint16_t descr_handle;
    esp_bt_uuid_t descr_uuid;
} gatts_profile_inst_t;

// Connection tracking
static ble_conn_info_t connections[MAX_CONNECTIONS] = {0};
static uint8_t connected_count = 0;
// Profile instance
static gatts_profile_inst_t profile_tab[PROFILE_NUM];
static uint16_t tank_handle_table[5]; // Increased for PIN change characteristic
static esp_gatt_if_t gatts_if_global = ESP_GATT_IF_NONE;

static ble_conn_info_t *find_connection(uint16_t conn_id, const uint8_t *bda)
{
    for (int i = 0; i < connected_count; i++)
    {
        if (connections[i].conn_id == conn_id)
        {
            return &connections[i];
        }
    }

    if (bda)
    {
        for (int i = 0; i < connected_count; i++)
        {
            if (memcmp(connections[i].remote_bda, bda, sizeof(esp_bd_addr_t)) == 0)
            {
                ESP_LOGW(TAG, "Connection lookup fallback matched by address for conn_id %d", conn_id);
                return &connections[i];
            }
        }
    }

    return NULL;
}

// Forward declarations
static void gatts_profile_event_handler(esp_gatts_cb_event_t event,
                                        esp_gatt_if_t gatts_if,
                                        esp_ble_gatts_cb_param_t *param);
static void gap_event_handler(esp_gap_ble_cb_event_t event, esp_ble_gap_cb_param_t *param);
static void gatts_event_handler(esp_gatts_cb_event_t event, esp_gatt_if_t gatts_if,
                                esp_ble_gatts_cb_param_t *param);

// GAP event handler
static void gap_event_handler(esp_gap_ble_cb_event_t event, esp_ble_gap_cb_param_t *param)
{
    switch (event)
    {
    case ESP_GAP_BLE_SEC_REQ_EVT:
        // Security request from peer device
        ESP_LOGI(TAG, "Security request");
        esp_ble_gap_security_rsp(param->ble_security.ble_req.bd_addr, true);
        break;

    case ESP_GAP_BLE_PASSKEY_REQ_EVT:
        // Passkey request event - reply with our static passkey
        // This shouldn't normally happen with ESP_IO_CAP_OUT, but some Android devices may request it
        ESP_LOGI(TAG, "Passkey request received - replying with static passkey");
        esp_ble_passkey_reply(param->ble_security.ble_req.bd_addr, true, static_passkey);
        break;

    case ESP_GAP_BLE_NC_REQ_EVT:
        // Numeric comparison request - MITM protection
        ESP_LOGI(TAG, "=========================================");
        ESP_LOGI(TAG, "BLE PAIRING REQUEST!");
        ESP_LOGI(TAG, "Verify this code matches your phone:");
        ESP_LOGI(TAG, "         [ %06d ]", param->ble_security.key_notif.passkey);
        ESP_LOGI(TAG, "=========================================");
        ESP_LOGI(TAG, "If codes match, tap 'Pair' on your phone");
        ESP_LOGI(TAG, "If they don't match, tap 'Cancel' (MITM attack!)");

        // Auto-accept on ESP32 side (user confirms on phone)
        esp_ble_confirm_reply(param->ble_security.ble_req.bd_addr, true);
        break;

    case ESP_GAP_BLE_PASSKEY_NOTIF_EVT:
        // Passkey notification event
        ESP_LOGI(TAG, "Passkey notification: %06d", param->ble_security.key_notif.passkey);
        break;

    case ESP_GAP_BLE_AUTH_CMPL_EVT:
        // Authentication complete
        if (param->ble_security.auth_cmpl.success)
        {
            ESP_LOGI(TAG, "Authentication success: %s",
                     param->ble_security.auth_cmpl.auth_mode == ESP_LE_AUTH_BOND ? "BONDED" : "PAIRED");
            
            // Mark connection as encrypted/secured
            for (int i = 0; i < connected_count; i++)
            {
                if (memcmp(connections[i].remote_bda, param->ble_security.auth_cmpl.bd_addr, 6) == 0)
                {
                    connections[i].is_encrypted = true;
                    ESP_LOGI(TAG, "Connection marked as encrypted for conn_id %d", connections[i].conn_id);
                    break;
                }
            }
        }
        else
        {
            ESP_LOGE(TAG, "Authentication failed, reason: 0x%x", param->ble_security.auth_cmpl.fail_reason);
            // Disconnect the peer if authentication fails
            for (int i = 0; i < connected_count; i++)
            {
                if (memcmp(connections[i].remote_bda, param->ble_security.auth_cmpl.bd_addr, 6) == 0)
                {
                    esp_ble_gap_disconnect(connections[i].remote_bda);
                    ESP_LOGI(TAG, "Disconnecting unauthenticated device");
                    break;
                }
            }
        }
        break;

    case ESP_GAP_BLE_ADV_DATA_SET_COMPLETE_EVT:
        if (param->adv_data_cmpl.status == ESP_BT_STATUS_SUCCESS)
        {
            // Configure scan response data with the device name
            esp_ble_adv_data_t scan_rsp_data = {
                .set_scan_rsp = true,
                .include_name = true,
                .include_txpower = false,
                .appearance = 0x00,
                .manufacturer_len = 0,
                .p_manufacturer_data = NULL,
                .service_data_len = 0,
                .p_service_data = NULL,
                .service_uuid_len = 0,
                .p_service_uuid = NULL,
                .flag = 0,
            };
            esp_ble_gap_config_adv_data(&scan_rsp_data);
        }
        break;

    case ESP_GAP_BLE_SCAN_RSP_DATA_SET_COMPLETE_EVT:
        if (param->scan_rsp_data_cmpl.status == ESP_BT_STATUS_SUCCESS)
        {
            // Start advertising after scan response is configured
            esp_ble_adv_params_t adv_params = {
                .adv_int_min = 0x20,
                .adv_int_max = 0x40,
                .adv_type = ADV_TYPE_IND,
                .own_addr_type = BLE_ADDR_TYPE_PUBLIC,
                .channel_map = ADV_CHNL_ALL,
                .adv_filter_policy = ADV_FILTER_ALLOW_SCAN_ANY_CON_ANY,
            };
            esp_ble_gap_start_advertising(&adv_params);
        }
        break;
    case ESP_GAP_BLE_ADV_START_COMPLETE_EVT:
        if (param->adv_start_cmpl.status != ESP_BT_STATUS_SUCCESS)
        {
            ESP_LOGE(TAG, "Advertising start failed");
        }
        break;
    default:
        break;
    }
}

// GATTS profile event handler
static void gatts_profile_event_handler(esp_gatts_cb_event_t event,
                                        esp_gatt_if_t gatts_if,
                                        esp_ble_gatts_cb_param_t *param)
{
    switch (event)
    {
    case ESP_GATTS_REG_EVT:
        ESP_LOGI(TAG, "REGISTER_APP_EVT, status %d, app_id %d",
                 param->reg.status, param->reg.app_id);

        gatts_if_global = gatts_if;

        // Configure advertising data (device name already set in ble_gatt_init)
        esp_ble_adv_data_t adv_data = {
            .set_scan_rsp = false,
            .include_name = true,
            .include_txpower = false,
            .min_interval = 0x0006,
            .max_interval = 0x0010,
            .appearance = 0x00,
            .manufacturer_len = 0,
            .p_manufacturer_data = NULL,
            .service_data_len = 0,
            .p_service_data = NULL,
            .service_uuid_len = 0,
            .p_service_uuid = NULL,
            .flag = (ESP_BLE_ADV_FLAG_GEN_DISC | ESP_BLE_ADV_FLAG_BREDR_NOT_SPT),
        };
        esp_ble_gap_config_adv_data(&adv_data);

        // Create service
        esp_ble_gatts_create_service(gatts_if, &(esp_gatt_srvc_id_t){
                                                   .is_primary = true,
                                                   .id = {
                                                       .inst_id = 0x00,
                                                       .uuid = {
                                                           .len = ESP_UUID_LEN_16,
                                                           .uuid = {.uuid16 = TANK_SERVICE_UUID},
                                                       },
                                                   },
                                               },
                                     10);
        break;

    case ESP_GATTS_CREATE_EVT:
        ESP_LOGI(TAG, "CREATE_SERVICE_EVT, status %d, service_handle %d",
                 param->create.status, param->create.service_handle);

        profile_tab[PROFILE_APP_ID].service_handle = param->create.service_handle;

        // Add characteristics
        esp_ble_gatts_start_service(param->create.service_handle);

        // Tank data characteristic - require encryption for read
        esp_ble_gatts_add_char(param->create.service_handle,
                               &(esp_bt_uuid_t){
                                   .len = ESP_UUID_LEN_16,
                                   .uuid = {.uuid16 = TANK_DATA_CHAR_UUID},
                               },
                               ESP_GATT_PERM_READ_ENC_MITM, // Require encrypted connection
                               ESP_GATT_CHAR_PROP_BIT_READ | ESP_GATT_CHAR_PROP_BIT_NOTIFY,
                               NULL, NULL);
        break;

    case ESP_GATTS_ADD_CHAR_EVT:
        ESP_LOGI(TAG, "ADD_CHAR_EVT, status %d, attr_handle %d",
                 param->add_char.status, param->add_char.attr_handle);

        if (param->add_char.char_uuid.uuid.uuid16 == TANK_DATA_CHAR_UUID)
        {
            tank_handle_table[1] = param->add_char.attr_handle;
            ESP_LOGI(TAG, "Tank data characteristic handle set to %d", tank_handle_table[1]);

            // Add auth characteristic - require encryption
            esp_ble_gatts_add_char(profile_tab[PROFILE_APP_ID].service_handle,
                                   &(esp_bt_uuid_t){
                                       .len = ESP_UUID_LEN_16,
                                       .uuid = {.uuid16 = AUTH_CHAR_UUID},
                                   },
                                   ESP_GATT_PERM_WRITE_ENC_MITM,
                                   ESP_GATT_CHAR_PROP_BIT_WRITE,
                                   NULL, NULL);
        }
        else if (param->add_char.char_uuid.uuid.uuid16 == AUTH_CHAR_UUID)
        {
            tank_handle_table[2] = param->add_char.attr_handle;

            // Add config characteristic - require encryption
            esp_ble_gatts_add_char(profile_tab[PROFILE_APP_ID].service_handle,
                                   &(esp_bt_uuid_t){
                                       .len = ESP_UUID_LEN_16,
                                       .uuid = {.uuid16 = CONFIG_CHAR_UUID},
                                   },
                                   ESP_GATT_PERM_WRITE_ENC_MITM,
                                   ESP_GATT_CHAR_PROP_BIT_WRITE,
                                   NULL, NULL);
        }
        else if (param->add_char.char_uuid.uuid.uuid16 == CONFIG_CHAR_UUID)
        {
            tank_handle_table[3] = param->add_char.attr_handle;

            // Add PIN change characteristic - require encryption
            esp_ble_gatts_add_char(profile_tab[PROFILE_APP_ID].service_handle,
                                   &(esp_bt_uuid_t){
                                       .len = ESP_UUID_LEN_16,
                                       .uuid = {.uuid16 = PIN_CHANGE_CHAR_UUID},
                                   },
                                   ESP_GATT_PERM_WRITE_ENC_MITM,
                                   ESP_GATT_CHAR_PROP_BIT_WRITE,
                                   NULL, NULL);
        }
        else if (param->add_char.char_uuid.uuid.uuid16 == PIN_CHANGE_CHAR_UUID)
        {
            tank_handle_table[4] = param->add_char.attr_handle;
            ESP_LOGI(TAG, "PIN change characteristic added, handle %d", tank_handle_table[4]);
        }
        break;

    case ESP_GATTS_CONNECT_EVT:
        ESP_LOGI(TAG, "Client connected, conn_id %d", param->connect.conn_id);

        // Start security/encryption process
        esp_ble_set_encryption(param->connect.remote_bda, ESP_BLE_SEC_ENCRYPT_MITM);

        // Track connection
        if (connected_count < MAX_CONNECTIONS)
        {
            connections[connected_count].conn_id = param->connect.conn_id;
            memcpy(connections[connected_count].remote_bda, param->connect.remote_bda, 6);
            connections[connected_count].is_connected = true;
            connections[connected_count].notifications_enabled = true; // Enable by default
            connections[connected_count].is_encrypted = false; // Not encrypted until auth completes
            connections[connected_count].is_authenticated = false; // Require PIN authentication per connection
            connected_count++;

            // Continue advertising if we haven't reached the hardware limit
            if (connected_count < CONFIG_BT_LE_MAX_CONNECTIONS)
            {
                ESP_LOGI(TAG, "Continuing to advertise, %d/%d connections", connected_count, CONFIG_BT_LE_MAX_CONNECTIONS);
                // Restart advertising to allow more connections
                esp_ble_gap_start_advertising(&(esp_ble_adv_params_t){
                    .adv_int_min = 0x20,
                    .adv_int_max = 0x40,
                    .adv_type = ADV_TYPE_IND,
                    .own_addr_type = BLE_ADDR_TYPE_PUBLIC,
                    .channel_map = ADV_CHNL_ALL,
                    .adv_filter_policy = ADV_FILTER_ALLOW_SCAN_ANY_CON_ANY,
                });
            }
            else
            {
                ESP_LOGI(TAG, "Max connections reached (%d), stopping advertising", CONFIG_BT_LE_MAX_CONNECTIONS);
            }
        }

        // Don't set attribute value on connection - just rely on read callbacks
        break;

    case ESP_GATTS_DISCONNECT_EVT:
        ESP_LOGI(TAG, "Client disconnected, reason: 0x%x", param->disconnect.reason);

        // Remove from connections
        for (int i = 0; i < connected_count; i++)
        {
            if (connections[i].conn_id == param->disconnect.conn_id)
            {
                connections[i].is_connected = false;
                // Shift remaining connections
                for (int j = i; j < connected_count - 1; j++)
                {
                    connections[j] = connections[j + 1];
                }
                connected_count--;
                memset(&connections[connected_count], 0, sizeof(ble_conn_info_t));
                break;
            }
        }

        // Restart advertising
        esp_ble_gap_start_advertising(&(esp_ble_adv_params_t){
            .adv_int_min = 0x20,
            .adv_int_max = 0x40,
            .adv_type = ADV_TYPE_IND,
            .own_addr_type = BLE_ADDR_TYPE_PUBLIC,
            .channel_map = ADV_CHNL_ALL,
            .adv_filter_policy = ADV_FILTER_ALLOW_SCAN_ANY_CON_ANY,
        });
        break;

    case ESP_GATTS_READ_EVT:
        ESP_LOGI(TAG, "READ_EVT, handle %d", param->read.handle);

        if (param->read.handle == tank_handle_table[1])
        {
            // Send tank data with all raw sensor values
            esp_gatt_rsp_t rsp = {0};
            uint8_t data[9] = {
                g_tank_data.grey_1_3_raw, // Raw sensor states
                g_tank_data.grey_2_3_raw,
                g_tank_data.grey_full_raw,
                g_tank_data.black_1_3_raw,
                g_tank_data.black_2_3_raw,
                g_tank_data.black_full_raw,
                g_tank_data.grey_enabled, // Enable flags
                g_tank_data.black_enabled,
                g_tank_data.system_stable // Stability flag (0=unstable, 1=stable)
            };

            rsp.attr_value.handle = param->read.handle;
            rsp.attr_value.offset = 0;
            rsp.attr_value.len = 9;
            rsp.attr_value.auth_req = ESP_GATT_AUTH_REQ_NONE;
            memcpy(rsp.attr_value.value, data, 9);

            esp_ble_gatts_send_response(gatts_if, param->read.conn_id, param->read.trans_id,
                                        ESP_GATT_OK, &rsp);
        }
        break;

    case ESP_GATTS_WRITE_EVT:
        ESP_LOGI(TAG, "WRITE_EVT, handle %d, value len %d",
                 param->write.handle, param->write.len);

        ble_conn_info_t *connection = find_connection(param->write.conn_id, param->write.bda);
        bool connection_authenticated = connection && connection->is_authenticated;
        esp_gatt_status_t write_status = ESP_GATT_OK;

        if (param->write.handle == tank_handle_table[2])
        {
            // Auth characteristic - verify 6-digit PIN
            if (param->write.len == 6)
            {
                // Load config to get PIN
                tank_config_t config;
                if (tank_config_load(&config))
                {
                    // Log what we received for debugging
                    ESP_LOGI(TAG, "Received PIN bytes: %02x %02x %02x %02x %02x %02x",
                             param->write.value[0], param->write.value[1], param->write.value[2],
                             param->write.value[3], param->write.value[4], param->write.value[5]);
                    ESP_LOGI(TAG, "Expected PIN: %s", config.pin);

                    // Convert received bytes to string for comparison/logging
                    char received_pin[7];
                    memcpy(received_pin, param->write.value, 6);
                    received_pin[6] = '\0';

                    ESP_LOGI(TAG, "Authentication attempt with PIN: %s", received_pin);

                    // Compare PIN strings
                    if (memcmp(param->write.value, config.pin, 6) == 0)
                    {
                        // Find connection and mark as authenticated
                        if (connection)
                        {
                            connection->is_authenticated = true;
                            connection_authenticated = true;
                            ESP_LOGI(TAG, "Client %d authenticated with correct PIN", param->write.conn_id);
                        }
                        else
                        {
                            ESP_LOGW(TAG, "Authenticated connection %d not found in tracking table", param->write.conn_id);
                            write_status = ESP_GATT_INVALID_HANDLE;
                        }
                    }
                    else
                    {
                        if (connection)
                        {
                            connection->is_authenticated = false;
                        }
                        ESP_LOGW(TAG, "Invalid PIN attempt");
                        write_status = ESP_GATT_AUTH_FAIL;
                    }
                }
                else
                {
                    ESP_LOGE(TAG, "Failed to load config for PIN verification");
                    write_status = ESP_GATT_ERROR;
                }
            }
            else
            {
                ESP_LOGW(TAG, "Invalid PIN length: %d (expected 6)", param->write.len);
                write_status = ESP_GATT_INVALID_ATTR_LEN;
            }
        }
        else if (param->write.handle == tank_handle_table[3])
        {
            if (!connection_authenticated)
            {
                ESP_LOGW(TAG, "Config write denied for conn_id %d - not authenticated", param->write.conn_id);
                write_status = ESP_GATT_INSUF_AUTHORIZATION;
                goto send_write_response;
            }
            // Config characteristic
            if (param->write.len >= 2)
            {
                // Load existing config to preserve PIN
                tank_config_t config;
                if (!tank_config_load(&config))
                {
                    tank_config_set_defaults(&config);
                }

                // Update tank enables
                config.grey_enabled = param->write.value[0];
                config.black_enabled = param->write.value[1];

                // Update runtime config
                g_tank_data.grey_enabled = config.grey_enabled;
                g_tank_data.black_enabled = config.black_enabled;

                // Save to NVS
                tank_config_save(&config);

                ESP_LOGI(TAG, "Config updated - Grey: %s, Black: %s",
                         config.grey_enabled ? "ON" : "OFF",
                         config.black_enabled ? "ON" : "OFF");
            }
        }
        else if (param->write.handle == tank_handle_table[4])
        {
            if (!connection_authenticated)
            {
                ESP_LOGW(TAG, "PIN change denied for conn_id %d - not authenticated", param->write.conn_id);
                write_status = ESP_GATT_INSUF_AUTHORIZATION;
                goto send_write_response;
            }
            // PIN change characteristic - requires authentication
            if (param->write.len == 6)
            {
                // Load current config
                tank_config_t config;
                if (tank_config_load(&config))
                {
                    // Update PIN
                    memcpy(config.pin, param->write.value, 6);
                    config.pin[6] = '\0'; // Null terminate

                    // Save config with new PIN
                    if (tank_config_save(&config))
                    {
                        ESP_LOGI(TAG, "PIN changed successfully");
                    }
                    else
                    {
                        ESP_LOGE(TAG, "Failed to save new PIN");
                    }
                }
                else
                {
                    // No existing config, create new one
                    tank_config_t new_config;
                    tank_config_set_defaults(&new_config);
                    memcpy(new_config.pin, param->write.value, 6);
                    new_config.pin[6] = '\0';
                    tank_config_save(&new_config);
                    ESP_LOGI(TAG, "PIN set for first time");
                }
            }
            else
            {
                ESP_LOGW(TAG, "Invalid new PIN length: %d (expected 6)", param->write.len);
            }
        }

send_write_response:
        if (param->write.need_rsp)
        {
            esp_gatt_rsp_t rsp = {0};
            rsp.attr_value.handle = param->write.handle;
            rsp.attr_value.offset = 0;
            rsp.attr_value.len = 0;
            rsp.attr_value.auth_req = ESP_GATT_AUTH_REQ_NONE;
            esp_ble_gatts_send_response(gatts_if, param->write.conn_id, param->write.trans_id,
                                        write_status, &rsp);
        }
        break;

    default:
        break;
    }
}

// Main GATTS event handler
static void gatts_event_handler(esp_gatts_cb_event_t event, esp_gatt_if_t gatts_if,
                                esp_ble_gatts_cb_param_t *param)
{
    if (event == ESP_GATTS_REG_EVT)
    {
        if (param->reg.status == ESP_GATT_OK)
        {
            profile_tab[param->reg.app_id].gatts_if = gatts_if;
        }
        else
        {
            ESP_LOGE(TAG, "Reg app failed, app_id %04x, status %d",
                     param->reg.app_id, param->reg.status);
            return;
        }
    }

    if (gatts_if == ESP_GATT_IF_NONE ||
        gatts_if == profile_tab[PROFILE_APP_ID].gatts_if)
    {
        if (profile_tab[PROFILE_APP_ID].gatts_cb)
        {
            profile_tab[PROFILE_APP_ID].gatts_cb(event, gatts_if, param);
        }
    }
}

// Public functions
void ble_gatt_init(void)
{
    esp_err_t ret;

    // Initialize BT controller
    esp_bt_controller_config_t bt_cfg = BT_CONTROLLER_INIT_CONFIG_DEFAULT();
    ret = esp_bt_controller_init(&bt_cfg);
    if (ret)
    {
        ESP_LOGE(TAG, "Initialize controller failed: %s", esp_err_to_name(ret));
        return;
    }

    ret = esp_bt_controller_enable(ESP_BT_MODE_BLE);
    if (ret)
    {
        ESP_LOGE(TAG, "Enable controller failed: %s", esp_err_to_name(ret));
        return;
    }

    ret = esp_bluedroid_init();
    if (ret)
    {
        ESP_LOGE(TAG, "Init bluedroid failed: %s", esp_err_to_name(ret));
        return;
    }

    ret = esp_bluedroid_enable();
    if (ret)
    {
        ESP_LOGE(TAG, "Enable bluedroid failed: %s", esp_err_to_name(ret));
        return;
    }

    // Generate unique device name with random identifier BEFORE registering
    uint32_t device_id = esp_random();
    snprintf(device_name, sizeof(device_name), "RV Tanks %08lX", (unsigned long)device_id);
    
    // Set device name BEFORE any registration/advertising
    esp_ble_gap_set_device_name(device_name);
    ESP_LOGI(TAG, "Device name set to: %s", device_name);
    
    // Enable local privacy - use random resolvable addresses
    esp_ble_gap_config_local_privacy(true);
    ESP_LOGI(TAG, "Local privacy enabled - using random resolvable addresses");

    // Register callbacks
    esp_ble_gatts_register_callback(gatts_event_handler);
    esp_ble_gap_register_callback(gap_event_handler);

    // Register app
    profile_tab[PROFILE_APP_ID].gatts_cb = gatts_profile_event_handler;
    profile_tab[PROFILE_APP_ID].gatts_if = ESP_GATT_IF_NONE;
    esp_ble_gatts_app_register(PROFILE_APP_ID);

    // Set MTU
    esp_ble_gatt_set_local_mtu(517);

    // Configure security parameters
    // Set authentication requirements: Secure Connections + MITM + Bonding
    esp_ble_auth_req_t auth_req = ESP_LE_AUTH_REQ_SC_MITM_BOND;
    esp_ble_gap_set_security_param(ESP_BLE_SM_AUTHEN_REQ_MODE, &auth_req, sizeof(uint8_t));

    // Only accept connections from devices that can authenticate and reject connections that negotiate down to "Just Works"
    uint8_t only_accept = ESP_BLE_ONLY_ACCEPT_SPECIFIED_AUTH_ENABLE;
    esp_ble_gap_set_security_param(ESP_BLE_SM_ONLY_ACCEPT_SPECIFIED_SEC_AUTH, &only_accept, sizeof(uint8_t));

    // Set I/O capabilities - Display only (we show passkey via serial/docs)
    // Phone will ask user to enter the passkey
    esp_ble_io_cap_t iocap = ESP_IO_CAP_OUT; // Display only
    esp_ble_gap_set_security_param(ESP_BLE_SM_IOCAP_MODE, &iocap, sizeof(uint8_t));

    // Generate truly random passkey using hardware RNG
    // esp_random() uses hardware RNG which is cryptographically secure
    uint32_t passkey = esp_random() % 900000 + 100000;  // Range: 100000-999999
    
    // This ensures:
    // - Always 6 digits (never starts with 0)
    // - Cryptographically random
    // - Different every time ESP32 boots
    // - Cannot be predicted from MAC address

    // Store passkey globally for responding to PASSKEY_REQ_EVT
    static_passkey = passkey;

    // Set the static passkey
    esp_ble_gap_set_security_param(ESP_BLE_SM_SET_STATIC_PASSKEY, &passkey, sizeof(uint32_t));

    // Log device name and passkey on every boot for documentation
    ESP_LOGI(TAG, "=========================================");
    ESP_LOGI(TAG, "DEVICE NAME: %s", device_name);
    ESP_LOGI(TAG, "BLE PAIRING PASSKEY: %06d", passkey);
    ESP_LOGI(TAG, "Document these for pairing!");
    ESP_LOGI(TAG, "Users will see the device name in scan");
    ESP_LOGI(TAG, "Users must enter passkey on their phone");
    ESP_LOGI(TAG, "=========================================");

    // Set maximum encryption key size (16 bytes = 128 bits)
    uint8_t key_size = 16;
    esp_ble_gap_set_security_param(ESP_BLE_SM_MAX_KEY_SIZE, &key_size, sizeof(uint8_t));

    // Set initiator key distribution (what keys we'll distribute)
    uint8_t init_key = ESP_BLE_ENC_KEY_MASK | ESP_BLE_ID_KEY_MASK;
    esp_ble_gap_set_security_param(ESP_BLE_SM_SET_INIT_KEY, &init_key, sizeof(uint8_t));

    // Set responder key distribution
    uint8_t rsp_key = ESP_BLE_ENC_KEY_MASK | ESP_BLE_ID_KEY_MASK;
    esp_ble_gap_set_security_param(ESP_BLE_SM_SET_RSP_KEY, &rsp_key, sizeof(uint8_t));

    ESP_LOGI(TAG, "BLE GATT initialized with encryption enabled");
}

void ble_gatt_send_notification(const uint8_t *data, uint16_t len)
{
    if (gatts_if_global == ESP_GATT_IF_NONE)
        return;

    // Send to all connected AND encrypted clients with notifications enabled
    for (int i = 0; i < connected_count; i++)
    {
        if (connections[i].is_connected && connections[i].notifications_enabled && connections[i].is_encrypted)
        {
            esp_ble_gatts_send_indicate(gatts_if_global, connections[i].conn_id,
                                        tank_handle_table[1], len, (uint8_t *)data, false);
        }
        else if (connections[i].is_connected && !connections[i].is_encrypted)
        {
            ESP_LOGD(TAG, "Skipping notification for conn_id %d - not encrypted yet", connections[i].conn_id);
        }
    }
}

void ble_update_tank_data(uint8_t grey_level, uint8_t black_level,
                          bool grey_enabled, bool black_enabled)
{
    // Only update if handle is valid and service is started
    if (tank_handle_table[1] == 0)
    {
        // Service not ready yet
        return;
    }

    // Send all raw sensor values plus enable flags and stability
    uint8_t data[9] = {
        g_tank_data.grey_1_3_raw,
        g_tank_data.grey_2_3_raw,
        g_tank_data.grey_full_raw,
        g_tank_data.black_1_3_raw,
        g_tank_data.black_2_3_raw,
        g_tank_data.black_full_raw,
        grey_enabled,
        black_enabled,
        g_tank_data.system_stable};

    // Send notification only if connected
    if (ble_is_connected())
    {
        ble_gatt_send_notification(data, sizeof(data));
    }
}

bool ble_is_connected(void)
{
    return connected_count > 0;
}
