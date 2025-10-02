#include "tank_monitor.h"
#include "esp_log.h"
#include "esp_timer.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"

static const char *TAG = "TANK_MONITOR";

// Global tank data
tank_data_t g_tank_data = {0};

void tank_monitor_init(void) {
    g_tank_data.grey_level = LEVEL_EMPTY;
    g_tank_data.black_level = LEVEL_EMPTY;
    g_tank_data.grey_enabled = true;
    g_tank_data.black_enabled = true;
    g_tank_data.last_stable_time = 0;
    g_tank_data.last_grey_level = LEVEL_EMPTY;
    g_tank_data.last_black_level = LEVEL_EMPTY;
    g_tank_data.system_stable = 0;  // Start as unstable
}

tank_level_t tank_monitor_determine_level(const sensor_data_t *sensors, bool is_grey) {
    if (sensors == NULL) return LEVEL_EMPTY;
    
    uint8_t sensor_1_3, sensor_2_3, sensor_full;
    
    if (is_grey) {
        sensor_1_3 = sensors->grey_1_3;
        sensor_2_3 = sensors->grey_2_3;
        sensor_full = sensors->grey_full;
    } else {
        sensor_1_3 = sensors->black_1_3;
        sensor_2_3 = sensors->black_2_3;
        sensor_full = sensors->black_full;
    }
    
    // Determine level based on sensor states
    if (sensor_full) {
        return LEVEL_FULL;
    } else if (sensor_2_3) {
        return LEVEL_2_3;
    } else if (sensor_1_3) {
        return LEVEL_1_3;
    } else {
        return LEVEL_EMPTY;
    }
}

bool tank_monitor_check_stability(void) {
    uint32_t current_time = esp_timer_get_time() / 1000;  // Convert to ms
    
    // Check if levels have changed
    if (g_tank_data.grey_level != g_tank_data.last_grey_level ||
        g_tank_data.black_level != g_tank_data.last_black_level) {
        
        // Levels changed, reset stability timer
        g_tank_data.last_stable_time = current_time;
        g_tank_data.last_grey_level = g_tank_data.grey_level;
        g_tank_data.last_black_level = g_tank_data.black_level;
        g_tank_data.system_stable = 0;  // Mark as unstable
        
        ESP_LOGI(TAG, "Levels changed - Grey: %d, Black: %d", 
                 g_tank_data.grey_level, g_tank_data.black_level);
        return false;
    }
    
    // Check if enough time has passed for stability
    uint32_t stable_duration = current_time - g_tank_data.last_stable_time;
    if (stable_duration >= STABILITY_DURATION) {
        g_tank_data.system_stable = 1;  // Mark as stable
        return true;
    }
    
    g_tank_data.system_stable = 0;  // Still unstable
    return false;
}

void tank_monitor_update_levels(const sensor_data_t *sensors) {
    if (sensors == NULL) return;
    
    // Store raw sensor values
    g_tank_data.grey_1_3_raw = sensors->grey_1_3;
    g_tank_data.grey_2_3_raw = sensors->grey_2_3;
    g_tank_data.grey_full_raw = sensors->grey_full;
    g_tank_data.black_1_3_raw = sensors->black_1_3;
    g_tank_data.black_2_3_raw = sensors->black_2_3;
    g_tank_data.black_full_raw = sensors->black_full;
    
    // Calculate levels
    if (g_tank_data.grey_enabled) {
        g_tank_data.grey_level = tank_monitor_determine_level(sensors, true);
    }
    
    if (g_tank_data.black_enabled) {
        g_tank_data.black_level = tank_monitor_determine_level(sensors, false);
    }
}

void tank_monitor_task(void *pvParameters) {
    sensor_data_t sensors = {0};
    
    ESP_LOGI(TAG, "Tank monitoring task started");
    
    while (1) {
        // Read all sensors
        sensor_read_all(&sensors);
        
        // Update tank levels
        tank_monitor_update_levels(&sensors);
        
        // Log raw sensor states
        ESP_LOGI(TAG, "Sensors - Grey[1/3:%d 2/3:%d F:%d] Black[1/3:%d 2/3:%d F:%d] Levels[G:%d B:%d]",
                 g_tank_data.grey_1_3_raw, g_tank_data.grey_2_3_raw, g_tank_data.grey_full_raw,
                 g_tank_data.black_1_3_raw, g_tank_data.black_2_3_raw, g_tank_data.black_full_raw,
                 g_tank_data.grey_level, g_tank_data.black_level);
        
        // Check for stability
        bool is_stable = tank_monitor_check_stability();
        
        if (is_stable) {
            ESP_LOGI(TAG, "System stable for %d seconds", STABILITY_DURATION / 1000);
        }
        
        
        vTaskDelay(pdMS_TO_TICKS(STABILITY_CHECK_INTERVAL));
    }
}