#ifndef TANK_MONITOR_H
#define TANK_MONITOR_H

#include <stdint.h>
#include <stdbool.h>
#include "sensor.h"
#include "config.h"

// Stability timing (milliseconds)
#define STABILITY_CHECK_INTERVAL    1000   // Check every 1 second
#define STABILITY_DURATION          90000   // 90 seconds for stability

// Tank levels
typedef enum {
    LEVEL_EMPTY = 0,
    LEVEL_1_3 = 1,
    LEVEL_2_3 = 2,
    LEVEL_FULL = 3
} tank_level_t;

// Tank data structure
typedef struct {
    tank_level_t grey_level;
    tank_level_t black_level;
    bool grey_enabled;
    bool black_enabled;
    uint32_t last_stable_time;
    tank_level_t last_grey_level;
    tank_level_t last_black_level;
    // Raw sensor states
    uint8_t grey_1_3_raw;
    uint8_t grey_2_3_raw;
    uint8_t grey_full_raw;
    uint8_t black_1_3_raw;
    uint8_t black_2_3_raw;
    uint8_t black_full_raw;
    uint8_t system_stable;  // 0 = unstable, 1 = stable
} tank_data_t;

// Global tank data
extern tank_data_t g_tank_data;

// Function prototypes
void tank_monitor_init(void);
tank_level_t tank_monitor_determine_level(const sensor_data_t *sensors, bool is_grey);
bool tank_monitor_check_stability(void);
void tank_monitor_update_levels(const sensor_data_t *sensors);
void tank_monitor_task(void *pvParameters);

#endif // TANK_MONITOR_H