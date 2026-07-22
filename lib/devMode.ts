/**
 * DEV_WEB_MODE — flip this ONE constant before running/building.
 *
 *   true  → web browser testing:
 *             • Setup wizard is skipped entirely
 *             • License check is bypassed
 *             • Host URL and activation key below are used automatically
 *
 *   false → normal APK / production flow:
 *             • Setup wizard runs on first launch
 *             • License is validated
 *
 * Remember to set this back to FALSE before building the release APK.
 */
export const DEV_WEB_MODE = true;

export const DEV_HOST_URL       = 'https://sb.asasconnect.com';
export const DEV_ACTIVATION_KEY = 'JSSIRKGXA7';
