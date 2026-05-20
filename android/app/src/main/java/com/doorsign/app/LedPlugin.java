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
    private static final String LED_PATH_ABS = "/sys/devices/platform/led_con_h/zigbee_reset";
    private static final String LED_PATH_REL = "./sys/devices/platform/led_con_h/zigbee_reset";

    // su binaries vary by vendor — try the common locations
    private static final String[] SU_BINARIES = {
        "su",
        "/system/xbin/su",
        "/system/bin/su",
        "/sbin/su",
        "/vendor/bin/su"
    };

    @PluginMethod
    public void setColor(PluginCall call) {
        String code = call.getString("code", "0x06");
        String payload = "w " + code;
        Log.d(TAG, "setColor called: " + payload);

        StringBuilder log = new StringBuilder();
        String shellCmd = "echo " + payload + " > " + LED_PATH_ABS;

        // 1) Try every su binary first — these factory door-sign panels are
        //    almost always rooted for the vendor LED app, and the sysfs node
        //    is typically root:root 0600 so only su can write to it.
        //    This device's su rejects "-c" (says "invalid uid/gid '-c'"),
        //    so we must try multiple invocation styles per binary.
        for (String su : SU_BINARIES) {
            // a) traditional Android su: pipe command via stdin
            Result r = writeViaStdin(new String[]{su}, shellCmd, "su-stdin:" + su);
            log.append(r.detail).append(" | ");
            if (r.ok) { resolveOk(call, "su-stdin:" + su, payload, log.toString()); return; }

            // b) embedded su that expects: su <uid> -c <cmd>
            r = writeViaProcess(new String[]{su, "0", "-c", shellCmd}, "su-0:" + su);
            log.append(r.detail).append(" | ");
            if (r.ok) { resolveOk(call, "su-0:" + su, payload, log.toString()); return; }

            r = writeViaProcess(new String[]{su, "root", "-c", shellCmd}, "su-root:" + su);
            log.append(r.detail).append(" | ");
            if (r.ok) { resolveOk(call, "su-root:" + su, payload, log.toString()); return; }

            // c) magisk-style: su -c '<cmd>'
            r = writeViaProcess(new String[]{su, "-c", shellCmd}, "su-c:" + su);
            log.append(r.detail).append(" | ");
            if (r.ok) { resolveOk(call, "su-c:" + su, payload, log.toString()); return; }
        }

        // 2) Vendor-exact: plain sh with the relative path (matches the vendor app)
        Result r = writeViaProcess(new String[]{"sh", "-c", "echo " + payload + " > " + LED_PATH_REL}, "sh-rel");
        log.append(r.detail).append(" | ");
        if (r.ok) { resolveOk(call, "sh-rel", payload, log.toString()); return; }

        // 3) sh with absolute path
        r = writeViaProcess(new String[]{"sh", "-c", "echo " + payload + " > " + LED_PATH_ABS}, "sh-abs");
        log.append(r.detail).append(" | ");
        if (r.ok) { resolveOk(call, "sh-abs", payload, log.toString()); return; }

        // 4) Direct sysfs (only works if node is world-writable)
        for (String data : new String[]{payload + "\n", payload}) {
            try {
                FileOutputStream fos = new FileOutputStream(LED_PATH_ABS);
                fos.write(data.getBytes("ASCII"));
                fos.flush();
                fos.close();
                log.append("sysfs OK | ");
                resolveOk(call, "sysfs", payload, log.toString());
                return;
            } catch (Exception e) {
                log.append("sysfs[").append(data.trim()).append("] FAIL: ").append(e.getMessage()).append(" | ");
            }
        }

        // Everything failed — return a *detailed* error so the UI shows what happened.
        Log.e(TAG, "All LED writes failed for " + payload + " — log: " + log);
        JSObject err = new JSObject();
        err.put("code", "LED_WRITE_FAILED");
        err.put("payload", payload);
        err.put("trace", log.toString());
        call.reject("LED write failed — " + log.toString(), "LED_WRITE_FAILED", null, err);
    }

    /** Optional debug: run any shell command and return stdout / stderr / exit. */
    @PluginMethod
    public void shell(PluginCall call) {
        String cmd = call.getString("cmd", "");
        boolean useSu = Boolean.TRUE.equals(call.getBoolean("su", false));
        try {
            Process p;
            if (useSu) {
                // Try stdin pipe to su first (works on this device's variant)
                p = Runtime.getRuntime().exec(new String[]{"su"});
                p.getOutputStream().write((cmd + "\nexit\n").getBytes("ASCII"));
                p.getOutputStream().flush();
                p.getOutputStream().close();
            } else {
                p = Runtime.getRuntime().exec(new String[]{"sh", "-c", cmd});
            }
            String out = drain(p.getInputStream());
            String err = drain(p.getErrorStream());
            int exit = p.waitFor();
            JSObject result = new JSObject();
            result.put("exit", exit);
            result.put("stdout", out);
            result.put("stderr", err);
            call.resolve(result);
        } catch (Exception e) {
            call.reject("shell exec failed: " + e.getMessage());
        }
    }

    /** Read the current value of the LED sysfs node (if readable). */
    @PluginMethod
    public void readLed(PluginCall call) {
        try (BufferedReader r = new BufferedReader(new java.io.FileReader(LED_PATH_ABS))) {
            StringBuilder sb = new StringBuilder();
            String line;
            while ((line = r.readLine()) != null) sb.append(line).append('\n');
            JSObject result = new JSObject();
            result.put("value", sb.toString().trim());
            call.resolve(result);
        } catch (Exception e) {
            call.reject("read failed: " + e.getMessage());
        }
    }

    private void resolveOk(PluginCall call, String method, String payload, String trace) {
        JSObject result = new JSObject();
        result.put("success", true);
        result.put("method", method);
        result.put("payload", payload);
        result.put("trace", trace);
        call.resolve(result);
        Log.d(TAG, "LED OK via " + method + " payload=" + payload);
    }

    private static class Result {
        final boolean ok;
        final String detail;
        Result(boolean ok, String detail) { this.ok = ok; this.detail = detail; }
    }

    private Result writeViaProcess(String[] argv, String tag) {
        try {
            Process p = Runtime.getRuntime().exec(argv);
            int exit = p.waitFor();
            String err = drain(p.getErrorStream());
            String d = tag + " exit=" + exit + (err.isEmpty() ? "" : " err=" + err);
            Log.d(TAG, d);
            return new Result(exit == 0 && err.isEmpty(), d);
        } catch (Exception e) {
            String d = tag + " threw " + e.getClass().getSimpleName() + ": " + e.getMessage();
            Log.w(TAG, d);
            return new Result(false, d);
        }
    }

    /** Launch a process and pipe a command into its stdin (for su that rejects -c). */
    private Result writeViaStdin(String[] argv, String cmd, String tag) {
        try {
            Process p = Runtime.getRuntime().exec(argv);
            p.getOutputStream().write((cmd + "\nexit\n").getBytes("ASCII"));
            p.getOutputStream().flush();
            p.getOutputStream().close();
            int exit = p.waitFor();
            String err = drain(p.getErrorStream());
            String d = tag + " exit=" + exit + (err.isEmpty() ? "" : " err=" + err);
            Log.d(TAG, d);
            return new Result(exit == 0 && err.isEmpty(), d);
        } catch (Exception e) {
            String d = tag + " threw " + e.getClass().getSimpleName() + ": " + e.getMessage();
            Log.w(TAG, d);
            return new Result(false, d);
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
