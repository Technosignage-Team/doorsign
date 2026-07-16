package com.doorsign.app;

import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.SystemClock;

/**
 * Handles two broadcast actions:
 *
 * 1. BOOT_COMPLETED (and quick-boot variants):
 *    – Starts ScreenWakeService so ACTION_SCREEN_ON is caught from here on.
 *    – Schedules an AlarmManager callback 5 s later to give the system time
 *      to fully initialise before we try to show the app.
 *
 * 2. POST_LAUNCH_NOTIFICATION (our own delayed alarm):
 *    – Posts a full-screen-intent notification that wakes the screen and
 *      opens MainActivity. Full-screen notifications are specifically exempt
 *      from Android 10+ background-activity-start restrictions, so this
 *      works on all modern Android versions without extra user permissions.
 *
 * The HOME launcher category in the manifest is the PRIMARY auto-launch
 * mechanism (Android always starts the default home app on boot).
 * This receiver is the SECONDARY fallback for devices that don't honour it.
 */
public class BootReceiver extends BroadcastReceiver {

    static final String ACTION_POST_NOTIFICATION = "com.doorsign.app.POST_LAUNCH_NOTIFICATION";

    private static final String CHANNEL_ID     = "doorsign_launch_channel";
    private static final int    NOTIF_ID       = 2002;
    private static final int    ALARM_REQ_CODE = 2003;
    private static final long   LAUNCH_DELAY_MS = 5_000L;

    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent.getAction();
        if (action == null) return;

        if (ACTION_POST_NOTIFICATION.equals(action)) {
            // Alarm fired — post the full-screen notification to launch the app
            postLaunchNotification(context);
            return;
        }

        if (!isBootAction(action)) return;

        // ── Boot path ────────────────────────────────────────────────────────

        // 1. (Re)start the persistent foreground service
        Intent serviceIntent = new Intent(context, ScreenWakeService.class);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.startForegroundService(serviceIntent);
        } else {
            context.startService(serviceIntent);
        }

        // 2. Schedule a delayed full-screen notification
        scheduleDelayedLaunch(context);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private void scheduleDelayedLaunch(Context context) {
        Intent alarmIntent = new Intent(context, BootReceiver.class);
        alarmIntent.setAction(ACTION_POST_NOTIFICATION);

        int piFlags = Build.VERSION.SDK_INT >= Build.VERSION_CODES.M
            ? PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            : PendingIntent.FLAG_UPDATE_CURRENT;
        PendingIntent pi = PendingIntent.getBroadcast(context, ALARM_REQ_CODE, alarmIntent, piFlags);

        AlarmManager am = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (am == null) return;

        long triggerAt = SystemClock.elapsedRealtime() + LAUNCH_DELAY_MS;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            am.setExactAndAllowWhileIdle(AlarmManager.ELAPSED_REALTIME_WAKEUP, triggerAt, pi);
        } else {
            am.setExact(AlarmManager.ELAPSED_REALTIME_WAKEUP, triggerAt, pi);
        }
    }

    private void postLaunchNotification(Context context) {
        createChannel(context);

        Intent launch = new Intent(context, MainActivity.class);
        launch.addFlags(
            Intent.FLAG_ACTIVITY_NEW_TASK |
            Intent.FLAG_ACTIVITY_SINGLE_TOP |
            Intent.FLAG_ACTIVITY_REORDER_TO_FRONT
        );
        int piFlags = Build.VERSION.SDK_INT >= Build.VERSION_CODES.M
            ? PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            : PendingIntent.FLAG_UPDATE_CURRENT;
        PendingIntent actPi = PendingIntent.getActivity(context, NOTIF_ID, launch, piFlags);

        Notification.Builder builder;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            builder = new Notification.Builder(context, CHANNEL_ID);
        } else {
            //noinspection deprecation
            builder = new Notification.Builder(context);
        }

        Notification n = builder
            .setContentTitle("Door Sign")
            .setContentText("Starting…")
            .setSmallIcon(android.R.drawable.ic_menu_info_details)
            .setContentIntent(actPi)
            // setFullScreenIntent wakes the screen and bypasses Android 10+
            // background-activity-start restrictions (used by alarm / call apps).
            .setFullScreenIntent(actPi, true)
            .setAutoCancel(true)
            .build();

        NotificationManager nm = (NotificationManager)
            context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm != null) nm.notify(NOTIF_ID, n);
    }

    private void createChannel(Context context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel ch = new NotificationChannel(
                CHANNEL_ID, "Door Sign Launch", NotificationManager.IMPORTANCE_HIGH);
            ch.setDescription("Launches door sign on boot");
            NotificationManager nm = context.getSystemService(NotificationManager.class);
            if (nm != null) nm.createNotificationChannel(ch);
        }
    }

    private boolean isBootAction(String action) {
        return Intent.ACTION_BOOT_COMPLETED.equals(action)
            || "android.intent.action.QUICKBOOT_POWERON".equals(action)
            || "com.htc.intent.action.QUICKBOOT_POWERON".equals(action)
            || "android.intent.action.LOCKED_BOOT_COMPLETED".equals(action);
    }
}

