package com.doorsign.app;

import android.util.Log;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.FileOutputStream;
import java.io.IOException;

@CapacitorPlugin(name = "Led")
public class LedPlugin extends Plugin {

    private static final String TAG = "LedPlugin";
    private static final String LED_PATH = "/sys/devices/platform/led_con_h/zigbee_reset";

    @PluginMethod
    public void setColor(PluginCall call) {
        String code = call.getString("code", "0x06");
        String payload = "w " + code;
        Log.d(TAG, "setColor called: " + payload);

        // Attempt 1 — direct FileOutputStream (fastest, works if file is world-writable)
        if (writeViaSysfs(payload)) {
            Log.d(TAG, "LED set via FileOutputStream: " + payload);
            resolveOk(call, "sysfs", payload);
            return;
        }

        // Attempt 2 — shell command
        if (writeViaShell(payload)) {
            Log.d(TAG, "LED set via shell: " + payload);
            resolveOk(call, "shell", payload);
            return;
        }

        // Attempt 3 — su (root)
        if (writeViaSu(payload)) {
            Log.d(TAG, "LED set via su: " + payload);
            resolveOk(call, "su", payload);
            return;
        }

        Log.e(TAG, "All LED write methods failed for: " + payload);
        call.reject("LED write failed — check sysfs permissions");
    }

    private void resolveOk(PluginCall call, String method, String payload) {
        JSObject result = new JSObject();
        result.put("success", true);
        result.put("method", method);
        result.put("payload", payload);
        call.resolve(result);
    }

    private boolean writeViaSysfs(String payload) {
        // Try with newline first, then without — some sysfs drivers require it, others don't
        for (String data : new String[]{payload + "\n", payload}) {
            try {
                FileOutputStream fos = new FileOutputStream(LED_PATH);
                fos.write(data.getBytes("ASCII"));
                fos.flush();
                fos.close();
                Log.d(TAG, "writeViaSysfs OK [" + data.trim() + "]");
                return true;
            } catch (Exception e) {
                Log.w(TAG, "writeViaSysfs attempt failed (" + data.trim() + "): " + e.getMessage());
            }
        }
        return false;
    }

    private boolean writeViaShell(String payload) {
        try {
            // Match exact ADB command format: echo w 0x06 > /sys/...
            String cmd = "echo " + payload + " > " + LED_PATH;
            Process p = Runtime.getRuntime().exec(new String[]{"sh", "-c", cmd});
            int exit = p.waitFor();
            Log.d(TAG, "writeViaShell exit=" + exit + " cmd=" + cmd);
            return exit == 0;
        } catch (Exception e) {
            Log.w(TAG, "Shell failed: " + e.getMessage());
            return false;
        }
    }

    private boolean writeViaSu(String payload) {
        try {
            String cmd = "echo " + payload + " > " + LED_PATH;
            Process p = Runtime.getRuntime().exec(new String[]{"su", "-c", cmd});
            int exit = p.waitFor();
            Log.d(TAG, "writeViaSu exit=" + exit);
            return exit == 0;
        } catch (Exception e) {
            Log.w(TAG, "su failed: " + e.getMessage());
            return false;
        }
    }
}
