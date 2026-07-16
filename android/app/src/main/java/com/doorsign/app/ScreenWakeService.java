package com.doorsign.app;

import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.Build;
import android.os.IBinder;
import android.os.PowerManager;
import android.os.SystemClock;

/**
 * Foreground service that stays alive while the app is installed.
 *
 * – Registers a dynamic BroadcastReceiver for ACTION_SCREEN_ON and
 *   ACTION_USER_PRESENT so the app launches whenever the screen wakes up,
 *   regardless of whether a lock-screen is present.
 * – Holds a PARTIAL_WAKE_LOCK to keep the CPU alive during broadcast
 *   processing (prevents the launch intent from being dropped).
 * – Schedules an AlarmManager restart in onDestroy() so Android's battery
 *   optimiser cannot silence the service permanently.
 * – Returns START_STICKY so the OS itself also tries to restart it.
 */
public class ScreenWakeService extends Service {

    private static final String CHANNEL_ID  = "doorsign_wake_channel";
    private static final int    NOTIF_ID    = 1001;
    private static final int    RESTART_REQ = 9001;
    // Delay before self-restart attempt (ms)
    private static final long   RESTART_DELAY_MS = 3_000L;

    private BroadcastReceiver screenOnReceiver;
    private PowerManager.WakeLock wakeLock;

    // ── Lifecycle ─────────────────────────────────────────────────────────────

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
        startForeground(NOTIF_ID, buildNotification());
        acquireWakeLock();
        registerScreenOnReceiver();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        // Re-acquire the wake lock each time we are (re)started
        if (wakeLock == null || !wakeLock.isHeld()) acquireWakeLock();
        return START_STICKY;
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        // Unregister the screen receiver
        if (screenOnReceiver != null) {
            try { unregisterReceiver(screenOnReceiver); } catch (Exception ignored) {}
            screenOnReceiver = null;
        }
        // Release the wake lock
        if (wakeLock != null && wakeLock.isHeld()) {
            try { wakeLock.release(); } catch (Exception ignored) {}
        }
        // Schedule a restart via AlarmManager so we survive battery optimisation
        scheduleRestart();
    }

    @Override
    public IBinder onBind(Intent intent) { return null; }

    // ── Screen-on receiver ────────────────────────────────────────────────────

    private void registerScreenOnReceiver() {
        screenOnReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                String action = intent.getAction();
                if (Intent.ACTION_SCREEN_ON.equals(action)
                        || Intent.ACTION_USER_PRESENT.equals(action)) {
                    launchApp(context);
                }
            }
        };
        IntentFilter filter = new IntentFilter();
        filter.addAction(Intent.ACTION_SCREEN_ON);
        filter.addAction(Intent.ACTION_USER_PRESENT); // fired after unlock
        registerReceiver(screenOnReceiver, filter);
    }

    private void launchApp(Context context) {
        Intent launch = new Intent(context, MainActivity.class);
        launch.addFlags(
            Intent.FLAG_ACTIVITY_NEW_TASK |
            Intent.FLAG_ACTIVITY_REORDER_TO_FRONT |
            Intent.FLAG_ACTIVITY_SINGLE_TOP
        );
        context.startActivity(launch);
    }

    // ── Wake lock ─────────────────────────────────────────────────────────────

    private void acquireWakeLock() {
        PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
        if (pm == null) return;
        wakeLock = pm.newWakeLock(
            PowerManager.PARTIAL_WAKE_LOCK,
            "doorsign:screenwake"
        );
        wakeLock.setReferenceCounted(false);
        wakeLock.acquire(); // held indefinitely while service is alive
    }

    // ── Self-restart via AlarmManager ─────────────────────────────────────────

    private void scheduleRestart() {
        try {
            AlarmManager am = (AlarmManager) getSystemService(Context.ALARM_SERVICE);
            if (am == null) return;
            Intent restartIntent = new Intent(getApplicationContext(), ScreenWakeService.class);
            int flags = Build.VERSION.SDK_INT >= Build.VERSION_CODES.M
                ? PendingIntent.FLAG_ONE_SHOT | PendingIntent.FLAG_IMMUTABLE
                : PendingIntent.FLAG_ONE_SHOT;
            PendingIntent pi = PendingIntent.getService(
                getApplicationContext(), RESTART_REQ, restartIntent, flags);
            am.set(
                AlarmManager.ELAPSED_REALTIME_WAKEUP,
                SystemClock.elapsedRealtime() + RESTART_DELAY_MS,
                pi
            );
        } catch (Exception ignored) {}
    }

    // ── Notification helpers ──────────────────────────────────────────────────

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID, "Door Sign Wake Service",
                NotificationManager.IMPORTANCE_MIN
            );
            channel.setDescription("Keeps the door sign active");
            channel.setSound(null, null);
            channel.enableVibration(false);
            channel.enableLights(false);
            NotificationManager nm = getSystemService(NotificationManager.class);
            if (nm != null) nm.createNotificationChannel(channel);
        }
    }

    private Notification buildNotification() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            return new Notification.Builder(this, CHANNEL_ID)
                .setContentTitle("Door Sign")
                .setContentText("Running")
                .setSmallIcon(android.R.drawable.ic_menu_info_details)
                .setPriority(Notification.PRIORITY_MIN)
                .build();
        } else {
            //noinspection deprecation
            return new Notification.Builder(this)
                .setContentTitle("Door Sign")
                .setContentText("Running")
                .setSmallIcon(android.R.drawable.ic_menu_info_details)
                .setPriority(Notification.PRIORITY_MIN)
                .build();
        }
    }
}

