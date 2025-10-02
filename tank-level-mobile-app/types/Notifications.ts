export interface LastNotification {
  greyLevel: number;
  blackLevel: number;
  greyAlerted: boolean;
  blackAlerted: boolean;
  greyAlertLevel: number; // Track which level triggered the alert
  blackAlertLevel: number; // Track which level triggered the alert
}