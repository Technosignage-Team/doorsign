package com.doorsign.app;

import android.util.Log;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.BufferedReader;
import java.io.FileOutputStream;
import java.io.InputStreamReader;

@CapacitorPlugin(name = "Led")
public class LedPlugin extends Plugin {

    private static final String TAG = "LedPlugin";
    // The vendor LED test app uses a RELATIVE path with a leading "./". That's
    // what their factory firmware accepts via the shell. We try BOTH forms.
    private static final String LED_PATH_ABS = "/sys/devices/platform/led_con_h/zigbee_reset";
    private static final String LED_PATH_REL = "./sys/devices/platform/led_con_h/zigbee_reset";

    @PluginMethod
    public void setColor(PluginCall call) {
        String code = call.getString("code", "0x06");
        String payload = "w " + code;
        Log.d(TAG, "setColor called: " + payload);

        // Strategy mirrors the vendor LED app — shell echo to the relative path.
        // We try several approaches and stop at the first success.

        // 1) Vendor-exact: sh -c "echo w 0x06 > ./sys/devices/platform/led_con_h/zigbee_reset"
        if (writeViaShell(payload, LED_PATH_REL)) {
            resolveOk(call, "shell-rel", payload);
            return;
        }
        // 2) Same shell echo but absolute path
        if (writeViaShell(payload, LED_PATH_ABS)) {
            resolveOk(call, "shell-abs", payload);
            return;
        }
        // 3) Direct sysfs write (works only if the node is world-writable)
        if (writeViaSysfs(payload)) {
            resolveOk(call, "sysfs", payload);
            return;
        }
        // 4) Last resort — try via su (rooted device)
        if (writeViaSu(payload, LED_PATH_ABS)) {
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
        for (String data : new String[]{payload + "\n", payload}) {
            try {
                FileOutputStream fos = new FileOutputStream(LED_PATH_ABS);
                fos.write(data.getBytes("ASCII"));
                fos.flush();
                fos.close();
                Log.d(TAG, "writeViaSysfs OK [" + data.trim() + "]");
                return true;
            } catch (Exception e) {
                Log.w(TAG, "writeViaSysfs failed (" + data.trim() + "): " + e.getMessage());
            }
        }
        return false;
    }

    private boolean writeViaShell(String payload, String path) {
        try {
            String cmd = "echo " + payload + " > " + path;
            Process p = Runtime.getRuntime().exec(new String[]{"sh", "-c", cmd});
            int exit = p.waitFor();
            String stderr = drain(p.getErrorStream());
            Log.d(TAG, "writeViaShell exit=" + exit + " cmd=" + cmd
                    + (stderr.isEmpty() ? "" : " stderr=" + stderr));
            return exit == 0 && stderr.isEmpty();
        } catch (Exception e) {
            Log.w(TAG, "writeViaShell failed: " + e.getMessage());
            return false;
        }
    }

    private boolean writeViaSu(String payload, String path) {
        try {
            String cmd = "echo " + payload + " > " + path;
            Process p = Runtime.getRuntime().exec(new String[]{"su", "-c", cmd});
            int exit = p.waitFor();
            Log.d(TAG, "writeViaSu exit=" + exit);
            return exit == 0;
        } catch (Exception e) {
            Log.w(TAG, "writeViaSu failed: " + e.getMessage());
            return false;
        }
    }

    private String drain(java.io.InputStream is) {
        StringBuilder sb = new StringBuilder();
        try (BufferedReader r = new BufferedReader(new InputStreamReader(is))) {
            String line;
            while ((line = r.readLine()) != null) sb.append(line).append('\n');
        } catch (Exception ignored) { }
        return sb.toString().trim();
    }
}
