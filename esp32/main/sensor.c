#include "sensor.h"
#include "esp_log.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"

static const char *TAG = "SENSOR";

void sensor_init_gpio(void) {
    // Configure sensor input pins with pull-up for active-LOW sensors
    gpio_config_t io_conf = {
        .intr_type = GPIO_INTR_DISABLE,
        .mode = GPIO_MODE_INPUT,
        .pin_bit_mask = (1ULL << GREY_1_3_PIN) | (1ULL << GREY_2_3_PIN) | 
                       (1ULL << GREY_FULL_PIN) | (1ULL << BLACK_1_3_PIN) | 
                       (1ULL << BLACK_2_3_PIN) | (1ULL << BLACK_FULL_PIN),
        .pull_down_en = GPIO_PULLDOWN_DISABLE,
        .pull_up_en = GPIO_PULLUP_ENABLE
    };
    gpio_config(&io_conf);
    
    // Configure boot button - it already has external pull-up, just set as input
    io_conf.pin_bit_mask = (1ULL << BOOT_BUTTON_PIN);
    io_conf.mode = GPIO_MODE_INPUT;
    io_conf.pull_down_en = GPIO_PULLDOWN_DISABLE;
    io_conf.pull_up_en = GPIO_PULLUP_DISABLE; // GPIO0 has external pull-up
    gpio_config(&io_conf);
    
    // Configure power LED as output
    io_conf.pin_bit_mask = (1ULL << POWER_LED_PIN);
    io_conf.mode = GPIO_MODE_OUTPUT;
    io_conf.pull_down_en = GPIO_PULLDOWN_DISABLE;
    io_conf.pull_up_en = GPIO_PULLUP_DISABLE;
    gpio_config(&io_conf);
    
    // Turn on power LED by default
    gpio_set_level(POWER_LED_PIN, 1);
    
    ESP_LOGI(TAG, "GPIO pins configured - Sensors: %d,%d,%d,%d,%d,%d Boot: %d LED: %d",
             GREY_1_3_PIN, GREY_2_3_PIN, GREY_FULL_PIN,
             BLACK_1_3_PIN, BLACK_2_3_PIN, BLACK_FULL_PIN, BOOT_BUTTON_PIN, POWER_LED_PIN);
}

void sensor_read_all(sensor_data_t *data) {
    if (data == NULL) return;
    
    // Read all sensors twice and only store if both readings match
    // This ensures we get a stable reading (no mid-transition reads)
    uint8_t first_read[6], second_read[6];
    
    // First read
    first_read[0] = gpio_get_level(GREY_1_3_PIN);
    first_read[1] = gpio_get_level(GREY_2_3_PIN);
    first_read[2] = gpio_get_level(GREY_FULL_PIN);
    first_read[3] = gpio_get_level(BLACK_1_3_PIN);
    first_read[4] = gpio_get_level(BLACK_2_3_PIN);
    first_read[5] = gpio_get_level(BLACK_FULL_PIN);
    
    // Wait for any bounce to settle
    vTaskDelay(pdMS_TO_TICKS(DEBOUNCE_DELAY_MS));
    
    // Second read
    second_read[0] = gpio_get_level(GREY_1_3_PIN);
    second_read[1] = gpio_get_level(GREY_2_3_PIN);
    second_read[2] = gpio_get_level(GREY_FULL_PIN);
    second_read[3] = gpio_get_level(BLACK_1_3_PIN);
    second_read[4] = gpio_get_level(BLACK_2_3_PIN);
    second_read[5] = gpio_get_level(BLACK_FULL_PIN);
    
    // Store values - use second read if stable, otherwise keep trying
    // Invert all readings for active-LOW sensors (LOW = triggered, HIGH = not triggered)
    data->grey_1_3 = (first_read[0] == second_read[0]) ? !second_read[0] : !gpio_get_level(GREY_1_3_PIN);
    data->grey_2_3 = (first_read[1] == second_read[1]) ? !second_read[1] : !gpio_get_level(GREY_2_3_PIN);
    data->grey_full = (first_read[2] == second_read[2]) ? !second_read[2] : !gpio_get_level(GREY_FULL_PIN);
    data->black_1_3 = (first_read[3] == second_read[3]) ? !second_read[3] : !gpio_get_level(BLACK_1_3_PIN);
    data->black_2_3 = (first_read[4] == second_read[4]) ? !second_read[4] : !gpio_get_level(BLACK_2_3_PIN);
    data->black_full = (first_read[5] == second_read[5]) ? !second_read[5] : !gpio_get_level(BLACK_FULL_PIN);
}

bool sensor_is_boot_button_pressed(void) {
    return gpio_get_level(BOOT_BUTTON_PIN) == 0;
}

void sensor_set_power_led(bool on) {
    gpio_set_level(POWER_LED_PIN, on ? 1 : 0);
}