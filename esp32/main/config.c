#include "config.h"
#include "nvs_flash.h"
#include "nvs.h"
#include "esp_log.h"
#include <string.h>

static const char *TAG = "CONFIG";

void tank_config_init_nvs(void) {
    esp_err_t ret = nvs_flash_init();
    if (ret == ESP_ERR_NVS_NO_FREE_PAGES || ret == ESP_ERR_NVS_NEW_VERSION_FOUND) {
        ESP_ERROR_CHECK(nvs_flash_erase());
        ret = nvs_flash_init();
    }
    ESP_ERROR_CHECK(ret);
    ESP_LOGI(TAG, "NVS initialized");
}

bool tank_config_load(tank_config_t *config) {
    if (config == NULL) return false;
    
    nvs_handle_t nvs_handle;
    esp_err_t err = nvs_open(NVS_NAMESPACE, NVS_READONLY, &nvs_handle);
    if (err != ESP_OK) {
        ESP_LOGI(TAG, "No saved config found");
        return false;
    }
    
    size_t length = sizeof(tank_config_t);
    err = nvs_get_blob(nvs_handle, NVS_KEY_CONFIG, config, &length);
    nvs_close(nvs_handle);
    
    if (err != ESP_OK || length != sizeof(tank_config_t)) {
        ESP_LOGI(TAG, "Failed to load config");
        return false;
    }
    
    ESP_LOGI(TAG, "Config loaded - Grey: %s, Black: %s, PIN: %s",
             config->grey_enabled ? "ON" : "OFF",
             config->black_enabled ? "ON" : "OFF",
             config->pin);
    return true;
}

bool tank_config_save(const tank_config_t *config) {
    if (config == NULL) return false;
    
    nvs_handle_t nvs_handle;
    esp_err_t err = nvs_open(NVS_NAMESPACE, NVS_READWRITE, &nvs_handle);
    if (err != ESP_OK) {
        ESP_LOGE(TAG, "Failed to open NVS for writing");
        return false;
    }
    
    err = nvs_set_blob(nvs_handle, NVS_KEY_CONFIG, config, sizeof(tank_config_t));
    if (err != ESP_OK) {
        ESP_LOGE(TAG, "Failed to save config");
        nvs_close(nvs_handle);
        return false;
    }
    
    err = nvs_commit(nvs_handle);
    nvs_close(nvs_handle);
    
    if (err != ESP_OK) {
        ESP_LOGE(TAG, "Failed to commit config");
        return false;
    }
    
    ESP_LOGI(TAG, "Config saved - Grey: %s, Black: %s, PIN: %s",
             config->grey_enabled ? "ON" : "OFF",
             config->black_enabled ? "ON" : "OFF",
             config->pin);
    return true;
}

void tank_config_set_defaults(tank_config_t *config) {
    if (config == NULL) return;
    
    memset(config, 0, sizeof(tank_config_t));
    config->grey_enabled = true;
    config->black_enabled = true;
    strcpy(config->pin, "000000");  // Default PIN
    config->pin_set = true;
    ESP_LOGI(TAG, "Config set to defaults with PIN: 000000");
}

void tank_config_erase(void) {
    nvs_handle_t nvs_handle;
    esp_err_t err = nvs_open(NVS_NAMESPACE, NVS_READWRITE, &nvs_handle);
    if (err == ESP_OK) {
        nvs_erase_key(nvs_handle, NVS_KEY_CONFIG);
        nvs_commit(nvs_handle);
        nvs_close(nvs_handle);
        ESP_LOGI(TAG, "Config erased from NVS");
    }
}