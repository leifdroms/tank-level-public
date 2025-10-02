#ifndef SENSOR_H
#define SENSOR_H

#include <stdint.h>
#include <stdbool.h>
#include "driver/gpio.h"

// GPIO Pin definitions
#define GREY_1_3_PIN    GPIO_NUM_32
#define GREY_2_3_PIN    GPIO_NUM_33
#define GREY_FULL_PIN   GPIO_NUM_25
#define BLACK_1_3_PIN   GPIO_NUM_26
#define BLACK_2_3_PIN   GPIO_NUM_27
#define BLACK_FULL_PIN  GPIO_NUM_14
#define BOOT_BUTTON_PIN GPIO_NUM_0
#define POWER_LED_PIN   GPIO_NUM_2

// Debounce delay in milliseconds
#define DEBOUNCE_DELAY_MS 100

// Sensor data structure
typedef struct {
    uint8_t grey_1_3;
    uint8_t grey_2_3;
    uint8_t grey_full;
    uint8_t black_1_3;
    uint8_t black_2_3;
    uint8_t black_full;
} sensor_data_t;

// Function prototypes
void sensor_init_gpio(void);
void sensor_read_all(sensor_data_t *data);
bool sensor_is_boot_button_pressed(void);
void sensor_set_power_led(bool on);

#endif // SENSOR_H