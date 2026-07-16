package com.doorsign.app;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "Kiosk")
public class KioskPlugin extends Plugin {

    @PluginMethod
    public void start(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            try {
                getActivity().startLockTask();
                call.resolve();
            } catch (Exception e) {
                call.reject("startLockTask failed: " + e.getMessage());
            }
        });
    }

    @PluginMethod
    public void stop(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            try {
                getActivity().stopLockTask();
                call.resolve();
            } catch (Exception e) {
                call.reject("stopLockTask failed: " + e.getMessage());
            }
        });
    }
}

