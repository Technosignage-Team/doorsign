package com.doorsign.app;

import com.getcapacitor.BridgeActivity;
import android.app.KeyguardManager;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.graphics.Color;
import android.graphics.Rect;
import android.os.PowerManager;
import android.provider.Settings;
import android.view.View;
import android.view.WindowInsets;
import android.view.WindowInsetsAnimation;
import android.view.WindowInsetsController;
import android.view.WindowManager;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import java.util.List;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(LedPlugin.class);
        registerPlugin(KioskPlugin.class);
        super.onCreate(savedInstanceState);

        // Keep the screen on at all times (prevents auto-sleep)
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        // Show this activity on the lock screen and turn the screen on when launched
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true);
            setTurnScreenOn(true);
            KeyguardManager km = getSystemService(KeyguardManager.class);
            if (km != null) km.requestDismissKeyguard(this, null);
        } else {
            //noinspection deprecation
            getWindow().addFlags(
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED |
                WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON |
                WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD
            );
        }

        hideSystemUI();

        // Exclude the entire screen from system gesture recognition (API 29+).
        // This prevents swipe-from-bottom from triggering the navigation gesture.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            getWindow().getDecorView().post(() -> {
                View dv = getWindow().getDecorView();
                List<Rect> rects = new java.util.ArrayList<>();
                rects.add(new Rect(0, 0, dv.getWidth(), dv.getHeight()));
                dv.setSystemGestureExclusionRects(rects);
            });
            getWindow().getDecorView().addOnLayoutChangeListener(
                (v, l, t, r, b, ol, ot, or2, ob) -> {
                    List<Rect> rects = new java.util.ArrayList<>();
                    rects.add(new Rect(0, 0, r - l, b - t));
                    v.setSystemGestureExclusionRects(rects);
                }
            );
        }

        // Aggressively re-hide system bars on every swipe attempt (kiosk mode).
        // API 30+: intercept bar show-animations and cancel them each frame.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            // Re-hide whenever ANY window inset changes (bar appears → immediately hidden).
            getWindow().getDecorView().setOnApplyWindowInsetsListener((view, insets) -> {
                hideSystemUI();
                return view.onApplyWindowInsets(insets);
            });

            getWindow().getDecorView().setWindowInsetsAnimationCallback(
                new WindowInsetsAnimation.Callback(WindowInsetsAnimation.Callback.DISPATCH_MODE_STOP) {
                    @Override
                    public void onPrepare(WindowInsetsAnimation animation) {
                        // Cancel before animation even starts
                        hideSystemUI();
                    }

                    @Override
                    public WindowInsetsAnimation.Bounds onStart(
                            WindowInsetsAnimation animation,
                            WindowInsetsAnimation.Bounds bounds) {
                        // Cancel at the first frame
                        hideSystemUI();
                        return bounds;
                    }

                    @Override
                    public WindowInsets onProgress(
                            WindowInsets insets,
                            List<WindowInsetsAnimation> runningAnimations) {
                        // Cancel on every animation frame so bars never reach full visibility
                        hideSystemUI();
                        return insets;
                    }

                    @Override
                    public void onEnd(WindowInsetsAnimation animation) {
                        // Final re-hide once animation finishes
                        hideSystemUI();
                    }
                }
            );
        } else {
            // Pre-API 30: re-hide whenever system UI visibility flags change
            //noinspection deprecation
            getWindow().getDecorView().setOnSystemUiVisibilityChangeListener(visibility -> {
                if ((visibility & View.SYSTEM_UI_FLAG_HIDE_NAVIGATION) == 0) {
                    hideSystemUI();
                }
            });
        }

        // Request battery-optimisation exemption so Android cannot throttle
        // or kill ScreenWakeService (needed on Android 6+).
        requestBatteryOptimisationExemption();

        // Start the background service that listens for ACTION_SCREEN_ON
        // and brings this activity back to the front automatically
        Intent serviceIntent = new Intent(this, ScreenWakeService.class);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            startForegroundService(serviceIntent);
        } else {
            startService(serviceIntent);
        }
    }

    /**
     * Opens the system "Ignore battery optimisations" dialog for this app if
     * it has not already been granted. The user only needs to approve this once.
     * Without it, aggressive OEM power managers (Samsung, Huawei, Xiaomi, etc.)
     * can kill the foreground service within minutes of the screen turning off.
     */
    private void requestBatteryOptimisationExemption() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            PowerManager pm = (PowerManager) getSystemService(POWER_SERVICE);
            if (pm != null && !pm.isIgnoringBatteryOptimizations(getPackageName())) {
                try {
                    Intent intent = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
                    intent.setData(Uri.parse("package:" + getPackageName()));
                    startActivity(intent);
                } catch (Exception ignored) {
                    // Some ROMs block this intent; the service still works via START_STICKY
                }
            }
        }
    }

    @Override
    public void onBackPressed() {
        // Prevent the hardware back button from exiting the app.
        // All in-app navigation is handled by the React UI.
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        // Re-apply flags when the activity is brought back to front via the service
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        hideSystemUI();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            hideSystemUI();
        }
    }

    private void hideSystemUI() {
        // FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS: required so setNavigationBarColor /
        // setStatusBarColor are actually honoured. Without it Android ignores
        // those calls and paints its own grey scrim.
        // FLAG_TRANSLUCENT_* adds a gradient scrim — clear them so our colour wins.
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
        getWindow().clearFlags(WindowManager.LayoutParams.FLAG_TRANSLUCENT_NAVIGATION);
        getWindow().clearFlags(WindowManager.LayoutParams.FLAG_TRANSLUCENT_STATUS);

        // Fully transparent — 0 alpha — the app content shows straight through.
        // Combined with dark icons (below) the bar is completely invisible.
        getWindow().setNavigationBarColor(Color.TRANSPARENT);
        getWindow().setStatusBarColor(Color.TRANSPARENT);

        // Prevent Android from re-adding its own contrast scrim (API 29+).
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            getWindow().setNavigationBarContrastEnforced(false);
            getWindow().setStatusBarContrastEnforced(false);
        }

        // Hide bars and set transient-swipe behaviour.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            getWindow().setDecorFitsSystemWindows(false);
            WindowInsetsController controller = getWindow().getInsetsController();
            if (controller != null) {
                controller.hide(WindowInsets.Type.systemBars());
                controller.setSystemBarsBehavior(
                    WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
                );
            }
        } else {
            //noinspection deprecation
            getWindow().getDecorView().setSystemUiVisibility(
                View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_FULLSCREEN
            );
        }

        // Use WindowInsetsControllerCompat for icon colour — this is the most
        // reliable way to get dark (black) icons across all Android versions and
        // OEM skins (Samsung One UI, Huawei EMUI, etc.) where the native
        // setSystemBarsAppearance API is sometimes ignored.
        // setAppearanceLightNavigationBars(true) = dark icons on a light background.
        // Dark icons on #050505 near-black are completely invisible.
        WindowInsetsControllerCompat compat =
            WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        compat.setAppearanceLightNavigationBars(true);
        compat.setAppearanceLightStatusBars(true);
    }
}
