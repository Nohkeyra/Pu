package com.wawasanpakusop.app.rider;

import android.Manifest;
import android.app.*;
import android.content.*;
import android.content.pm.PackageManager;
import android.location.*;
import android.os.*;
import androidx.core.app.NotificationCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.JSObject;
import com.wawasanpakusop.app.BuildConfig;
import com.wawasanpakusop.app.MainActivity;
import com.wawasanpakusop.app.R;
import com.wawasanpakusop.app.security.SecureStorage;
import org.json.JSONObject;
import java.net.*;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicBoolean;

/** Explicit sharing only. No boot receiver, sticky restart, raw-token persistence or simulated fixes. */
public class RiderLocationService extends Service implements LocationListener {
    private static final String CHANNEL = "rider_location_sharing";
    private static final int NOTICE = 4811;
    private static volatile RiderLocationService instance;
    private static volatile boolean active;
    private static volatile String currentOrder = "", currentSession = "", phase = "idle";
    private static volatile long lastAck;
    private static final ExecutorService NETWORK = Executors.newSingleThreadExecutor();
    private final Handler main = new Handler(Looper.getMainLooper());
    private final AtomicBoolean uploading = new AtomicBoolean(false);
    private final AtomicBoolean checking = new AtomicBoolean(false);
    private LocationManager manager;
    private String orderId, sessionId;
    private int sequence;
    private long lastAttempt, startedElapsed, lastCheck;
    private boolean stopped;
    private final Runnable freshness = new Runnable() {
        @Override public void run() {
            if (stopped) return;
            if ("sharing".equals(phase) && System.currentTimeMillis() - lastAck > 30_000) {
                phase = "acquiring";
                ((NotificationManager) getSystemService(NOTIFICATION_SERVICE)).notify(NOTICE, notification());
            }
            if (ContextCompat.checkSelfPermission(RiderLocationService.this, Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) { finishSharing("permission_denied"); return; }
            // Check closure/replacement even when no usable GPS fix is arriving.
            if (SystemClock.elapsedRealtime() - lastCheck >= 30_000 && checking.compareAndSet(false, true)) {
                lastCheck = SystemClock.elapsedRealtime();
                final String checkedSession = sessionId, checkedOrder = orderId;
                NETWORK.execute(() -> {
                    String outcome;
                    try { outcome = checkSession(checkedOrder, checkedSession); } catch (Exception ignored) { outcome = "offline"; }
                    final String result = outcome;
                    main.post(() -> {
                        checking.set(false);
                        if (stopped || !checkedSession.equals(currentSession)) return;
                        if ("ended".equals(result) || "auth_required".equals(result)) finishSharing(result);
                        else if ("offline".equals(result) && System.currentTimeMillis() - lastAck > 30_000) {
                            phase = "offline";
                            ((NotificationManager) getSystemService(NOTIFICATION_SERVICE)).notify(NOTICE, notification());
                        }
                    });
                });
            }
            main.postDelayed(this, 10_000);
        }
    };
    private final Runnable expiry = () -> finishSharing("ended");

    public static JSObject getState() {
        JSObject state = new JSObject();
        state.put("active", active); state.put("orderId", currentOrder); state.put("sessionId", currentSession);
        state.put("phase", phase); state.put("lastAck", lastAck);
        return state;
    }

    public static void stopSharing(Context context) {
        stopSharing(context, () -> {});
    }

    public static void stopSharing(Context context, Runnable done) {
        RiderLocationService service = instance;
        String stored = null;
        try { stored = SecureStorage.getAdminToken(context); } catch (Exception ignored) {}
        final String token = stored;
        if (service != null) service.main.post(() -> {
            service.finishSharing("idle", token);
            NETWORK.execute(() -> service.main.post(done));
        });
        else { context.stopService(new Intent(context, RiderLocationService.class)); done.run(); }
    }

    @Override public void onCreate() {
        super.onCreate(); instance = this;
        manager = (LocationManager) getSystemService(LOCATION_SERVICE);
        if (Build.VERSION.SDK_INT >= 26) {
            NotificationChannel channel = new NotificationChannel(CHANNEL, "Perkongsian lokasi rider", NotificationManager.IMPORTANCE_LOW);
            channel.setDescription("Kawalan perkongsian lokasi pesanan yang sedang aktif");
            ((NotificationManager) getSystemService(NOTIFICATION_SERVICE)).createNotificationChannel(channel);
        }
    }

    @Override public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && "STOP".equals(intent.getAction())) { finishSharing("idle"); return START_NOT_STICKY; }
        if (intent == null) { stopSelf(); return START_NOT_STICKY; }
        String nextOrder = intent.getStringExtra("orderId"), nextSession = intent.getStringExtra("sessionId");
        if (nextOrder == null || !nextOrder.matches("^[A-Za-z0-9_-]{1,100}$") || nextSession == null || !nextSession.matches("^[A-Za-z0-9_-]{16,80}$")) {
            stopSelf(); return START_NOT_STICKY;
        }
        if (sessionId != null && !sessionId.equals(nextSession)) removeUpdates();
        orderId = nextOrder; sessionId = nextSession; stopped = false; sequence = 0;
        currentOrder = orderId; currentSession = sessionId; active = true; phase = "acquiring"; lastAck = 0;
        startedElapsed = SystemClock.elapsedRealtime(); lastAttempt = 0; lastCheck = startedElapsed;
        try {
            if (Build.VERSION.SDK_INT >= 29) startForeground(NOTICE, notification(), android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION);
            else startForeground(NOTICE, notification());
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
                finishSharing("permission_denied"); return START_NOT_STICKY;
            }
            if (manager.isProviderEnabled(LocationManager.GPS_PROVIDER)) manager.requestLocationUpdates(LocationManager.GPS_PROVIDER, 5000, 0, this, Looper.getMainLooper());
            if (manager.isProviderEnabled(LocationManager.NETWORK_PROVIDER)) manager.requestLocationUpdates(LocationManager.NETWORK_PROVIDER, 5000, 0, this, Looper.getMainLooper());
            main.removeCallbacks(freshness); main.postDelayed(freshness, 10_000);
            main.removeCallbacks(expiry); main.postDelayed(expiry, 4 * 60 * 60 * 1000L);
        } catch (Exception error) { finishSharing("permission_denied"); }
        return START_NOT_STICKY;
    }

    private Notification notification() {
        Intent open = new Intent(this, MainActivity.class).putExtra("open_admin_panel", true).putExtra("rider_order_id", orderId)
            .addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent content = PendingIntent.getActivity(this, NOTICE, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        PendingIntent stop = PendingIntent.getService(this, NOTICE + 1, new Intent(this, RiderLocationService.class).setAction("STOP"), PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        String message = "sharing".equals(phase) ? "Lokasi GPS sedang dikongsi. Ketik untuk buka peta."
            : "offline".equals(phase) ? "Sambungan terganggu. Lokasi belum dikemas kini."
            : "Mencari isyarat GPS. Anda boleh berhenti pada bila-bila masa.";
        return new NotificationCompat.Builder(this, CHANNEL).setSmallIcon(R.drawable.ic_rider_location)
            .setContentTitle("Wawasan · Perkongsian lokasi").setContentText(message).setContentIntent(content)
            .setOngoing(true).setOnlyAlertOnce(true).setVisibility(NotificationCompat.VISIBILITY_PRIVATE)
            .addAction(R.drawable.ic_rider_location, "Henti perkongsian", stop).build();
    }

    @Override public void onLocationChanged(Location location) {
        if (stopped || !active || !sessionId.equals(currentSession)) return;
        long elapsed = SystemClock.elapsedRealtime();
        if (elapsed - startedElapsed >= 4 * 60 * 60 * 1000L) { finishSharing("ended"); return; }
        long age = (SystemClock.elapsedRealtimeNanos() - location.getElapsedRealtimeNanos()) / 1_000_000;
        if (age < 0 || age > 30_000 || !location.hasAccuracy() || location.getAccuracy() <= 0 || location.getAccuracy() > 100) return;
        if (elapsed - lastAttempt < 5000 || !uploading.compareAndSet(false, true)) return;
        lastAttempt = elapsed;
        String capturedSession = sessionId, capturedOrder = orderId;
        int nextSequence = ++sequence;
        JSONObject body = new JSONObject();
        try {
            SimpleDateFormat iso = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US); iso.setTimeZone(TimeZone.getTimeZone("UTC"));
            body.put("active", true).put("source", "gps").put("sessionId", capturedSession).put("sequence", nextSequence)
                .put("lat", location.getLatitude()).put("lng", location.getLongitude()).put("accuracy", location.getAccuracy())
                .put("speed", location.hasSpeed() ? Math.max(0, Math.min(300, location.getSpeed() * 3.6)) : 0)
                .put("heading", location.hasBearing() ? (location.getBearing() + 360) % 360 : 0).put("capturedAt", iso.format(new Date(location.getTime())));
        } catch (Exception error) { uploading.set(false); return; }
        NETWORK.execute(() -> {
            String outcome = "offline";
            try { outcome = post(capturedOrder, body, SecureStorage.getAdminToken(getApplicationContext())); }
            catch (Exception ignored) { /* Never log tokens or coordinates. Retry on the next fresh fix. */ }
            String result = outcome;
            main.post(() -> {
                uploading.set(false);
                if (stopped || !capturedSession.equals(currentSession)) return;
                if ("auth_required".equals(result) || "ended".equals(result)) { finishSharing(result); return; }
                phase = result;
                if ("sharing".equals(result)) lastAck = System.currentTimeMillis();
                ((NotificationManager) getSystemService(NOTIFICATION_SERVICE)).notify(NOTICE, notification());
            });
        });
    }

    private String post(String id, JSONObject body, String token) throws Exception {
        if (token == null || token.isEmpty()) return "auth_required";
        URL origin = new URL(BuildConfig.RIDER_API_BASE_URL);
        if (!"https".equals(origin.getProtocol()) || origin.getUserInfo() != null) return "ended";
        HttpURLConnection connection = (HttpURLConnection) new URL(origin, "/api/orders/" + id + "/rider-location").openConnection();
        try {
            connection.setInstanceFollowRedirects(false); connection.setConnectTimeout(10_000); connection.setReadTimeout(10_000);
            connection.setRequestMethod("POST"); connection.setDoOutput(true);
            connection.setRequestProperty("Authorization", "Bearer " + token); connection.setRequestProperty("Content-Type", "application/json");
            try (OutputStream output = connection.getOutputStream()) { output.write(body.toString().getBytes(StandardCharsets.UTF_8)); }
            int code = connection.getResponseCode();
            if (code == 401 || code == 403) return "auth_required";
            if (code == 404 || code == 409) return "ended";
            return code >= 200 && code < 300 ? "sharing" : "offline";
        } finally { connection.disconnect(); }
    }

    private String checkSession(String id, String session) throws Exception {
        String token = SecureStorage.getAdminToken(this);
        if (token == null || token.isEmpty()) return "auth_required";
        URL origin = new URL(BuildConfig.RIDER_API_BASE_URL);
        if (!"https".equals(origin.getProtocol()) || origin.getUserInfo() != null) return "ended";
        HttpURLConnection connection = (HttpURLConnection) new URL(origin, "/api/orders/" + id + "/rider-location").openConnection();
        try {
            connection.setInstanceFollowRedirects(false); connection.setConnectTimeout(10_000); connection.setReadTimeout(10_000);
            connection.setRequestProperty("Authorization", "Bearer " + token);
            int code = connection.getResponseCode();
            if (code == 401 || code == 403) return "auth_required";
            if (code == 404) return "ended";
            if (code != 200) return "offline";
            ByteArrayOutputStream bytes = new ByteArrayOutputStream();
            try (InputStream input = connection.getInputStream()) {
                byte[] chunk = new byte[2048]; int count;
                while ((count = input.read(chunk)) != -1) { bytes.write(chunk, 0, count); if (bytes.size() > 32768) return "offline"; }
            }
            JSONObject result = new JSONObject(bytes.toString(StandardCharsets.UTF_8.name()));
            JSONObject current = result.optJSONObject("session");
            String status = result.optString("status");
            if (current == null || !session.equals(current.optString("id")) || !current.optBoolean("active")
                || !("approved".equals(status) || "billed".equals(status) || "in_transit".equals(status))) return "ended";
            return "ok";
        } finally { connection.disconnect(); }
    }

    private void removeUpdates() { if (manager != null) { try { manager.removeUpdates(this); } catch (SecurityException ignored) {} } }

    private void finishSharing(String finalPhase) {
        String token = null;
        try { token = SecureStorage.getAdminToken(this); } catch (Exception ignored) {}
        finishSharing(finalPhase, token);
    }

    private void finishSharing(String finalPhase, String token) {
        if (stopped) return;
        stopped = true; active = false; phase = finalPhase; removeUpdates(); main.removeCallbacks(expiry); main.removeCallbacks(freshness);
        String id = orderId, session = sessionId;
        if (id != null && session != null && token != null) {
            final String capturedToken = token;
            int stopSequence = ++sequence;
            NETWORK.execute(() -> { try { post(id, new JSONObject().put("sessionId", session).put("sequence", stopSequence).put("active", false), capturedToken); } catch (Exception ignored) {} });
        }
        stopForeground(STOP_FOREGROUND_REMOVE); stopSelf();
    }
    @Override public void onProviderDisabled(String provider) {
        if (!stopped) { phase = "acquiring"; ((NotificationManager) getSystemService(NOTIFICATION_SERVICE)).notify(NOTICE, notification()); }
    }
    @Override public void onProviderEnabled(String provider) {}
    @Override public void onStatusChanged(String provider, int status, Bundle extras) {}
    @Override public void onDestroy() { finishSharing(phase.equals("auth_required") ? "auth_required" : "idle"); if (instance == this) instance = null; super.onDestroy(); }
    @Override public IBinder onBind(Intent intent) { return null; }
}
