#include <stdio.h>
#include <string.h>
#include <stdlib.h>
#include "sdkconfig.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "freertos/event_groups.h"
#include "esp_system.h"
#include "esp_log.h"
#include "esp_timer.h"

// Include module headers
#include "sensor.h"
#include "config.h"
#include "tank_monitor.h"
#include "ble_gatt.h"

#define MAIN_TAG "MAIN"

// BLE notification task
void ble_notification_task(void *pvParameters) {
    ESP_LOGI(MAIN_TAG, "BLE notification task started");
    
    while (1) {
        // Send tank data via BLE if connected
        if (ble_is_connected()) {
            ble_update_tank_data(g_tank_data.grey_level, g_tank_data.black_level,
                               g_tank_data.grey_enabled, g_tank_data.black_enabled);
        }
        
        // Wait 1 second between updates
        vTaskDelay(pdMS_TO_TICKS(1000));
    }
}

// PIN reset task - monitors BOOT button for 10 second hold
void pin_reset_task(void *pvParameters) {
    ESP_LOGI(MAIN_TAG, "PIN reset monitoring task started");
    
    uint32_t press_start_time = 0;
    bool button_pressed = false;
    bool reset_triggered = false;
    uint32_t last_blink_time = 0;
    bool led_blink_state = true;
    
    while (1) {
        bool current_state = sensor_is_boot_button_pressed();
        uint32_t current_time = xTaskGetTickCount() * portTICK_PERIOD_MS;
        
        // Debug: Print button state occasionally
        static uint32_t last_debug_time = 0;
        if (current_time - last_debug_time >= 5000) { // Every 5 seconds
            ESP_LOGI(MAIN_TAG, "BOOT button state: %d", current_state ? 1 : 0);
            last_debug_time = current_time;
        }
        
        if (current_state && !button_pressed) {
            // Button just pressed
            button_pressed = true;
            press_start_time = current_time;
            reset_triggered = false;
            led_blink_state = true;
            sensor_set_power_led(true);
            ESP_LOGI(MAIN_TAG, "BOOT button pressed - hold for 10s to reset PIN");
        } else if (!current_state && button_pressed) {
            // Button released - restore solid LED
            button_pressed = false;
            sensor_set_power_led(true);
            if (!reset_triggered) {
                uint32_t held_duration = current_time - press_start_time;
                ESP_LOGI(MAIN_TAG, "BOOT button released after %lu ms", held_duration);
            }
        } else if (current_state && button_pressed && !reset_triggered) {
            // Button still pressed - check duration and provide LED feedback
            uint32_t hold_duration = current_time - press_start_time;
            
            if (hold_duration >= 10000) { // 10 seconds - trigger reset
                // Turn off power LED to indicate reset is happening
                sensor_set_power_led(false);
                ESP_LOGW(MAIN_TAG, "BOOT button held for 10s - resetting PIN to default");
                
                tank_config_t config;
                if (tank_config_load(&config)) {
                    strcpy(config.pin, "000000");
                    config.pin_set = true;
                    
                    if (tank_config_save(&config)) {
                        ESP_LOGI(MAIN_TAG, "PIN successfully reset to default (000000)");
                    } else {
                        ESP_LOGE(MAIN_TAG, "Failed to save reset PIN");
                    }
                } else {
                    ESP_LOGE(MAIN_TAG, "Failed to load config for PIN reset");
                }
                
                // Turn power LED back on to indicate reset complete
                sensor_set_power_led(true);
                ESP_LOGI(MAIN_TAG, "PIN reset complete - LED restored");
                
                reset_triggered = true;
            } else {
                // Progressive LED blinking based on hold duration
                uint32_t blink_interval;
                if (hold_duration < 3000) {
                    blink_interval = 1000; // 1 second blinks for first 3 seconds
                } else if (hold_duration < 6000) {
                    blink_interval = 500;  // 0.5 second blinks for 3-6 seconds
                } else if (hold_duration < 9000) {
                    blink_interval = 250;  // 0.25 second blinks for 6-9 seconds
                } else {
                    blink_interval = 100;  // Very fast blinks for 9-10 seconds
                }
                
                if (current_time - last_blink_time >= blink_interval) {
                    led_blink_state = !led_blink_state;
                    sensor_set_power_led(led_blink_state);
                    last_blink_time = current_time;
                }
            }
        }
        
        // Check every 50ms for responsive button and LED control
        vTaskDelay(pdMS_TO_TICKS(50));
    }
}

void app_main(void) {
    ESP_LOGI(MAIN_TAG, "RV Tank Monitor starting...");
    
    // Initialize NVS
    tank_config_init_nvs();
    
    // Load configuration
    tank_config_t config;
    if (!tank_config_load(&config)) {
        // No saved config, use defaults
        tank_config_set_defaults(&config);
        tank_config_save(&config);
        ESP_LOGI(MAIN_TAG, "Created default config with PIN: %s", config.pin);
    } else {
        // Check if PIN is set
        if (strlen(config.pin) != 6) {
            ESP_LOGW(MAIN_TAG, "Invalid PIN in config, resetting to default");
            strcpy(config.pin, "000000");
            config.pin_set = true;
            tank_config_save(&config);
        }
        ESP_LOGI(MAIN_TAG, "Loaded config with PIN: %s", config.pin);
    }
    
    // Initialize tank monitor with loaded config
    tank_monitor_init();
    g_tank_data.grey_enabled = config.grey_enabled;
    g_tank_data.black_enabled = config.black_enabled;
    
    // Initialize GPIO
    sensor_init_gpio();
    
    // Initialize BLE
    ble_gatt_init();
    
    // Create tank monitoring task
    xTaskCreate(tank_monitor_task, "tank_monitor", 4096, NULL, 5, NULL);
    
    // Create BLE notification task
    xTaskCreate(ble_notification_task, "ble_notify", 2048, NULL, 5, NULL);
    
    // Create PIN reset monitoring task
    xTaskCreate(pin_reset_task, "pin_reset", 2048, NULL, 3, NULL);
    
    ESP_LOGI(MAIN_TAG, "System initialized successfully");
    ESP_LOGI(MAIN_TAG, "Grey tank: %s, Black tank: %s",
            config.grey_enabled ? "Enabled" : "Disabled",
            config.black_enabled ? "Enabled" : "Disabled");
}