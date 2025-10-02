#ifndef CONFIG_H
#define CONFIG_H

#include <stdint.h>
#include <stdbool.h>

#define NVS_NAMESPACE "tank_monitor"
#define NVS_KEY_CONFIG "config"

// Configuration structure
typedef struct {
    bool grey_enabled;
    bool black_enabled;
    char pin[7];           // 6 digits + null terminator
    bool pin_set;          // Has PIN been configured
    uint8_t reserved[6];   // Reserved for future use (reduced from 14)
} tank_config_t;

// Function prototypes
void tank_config_init_nvs(void);
bool tank_config_load(tank_config_t *config);
bool tank_config_save(const tank_config_t *config);
void tank_config_set_defaults(tank_config_t *config);
void tank_config_erase(void);

#endif // CONFIG_H