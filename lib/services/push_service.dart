import 'dart:async';
import 'dart:html' as html;
import 'dart:js_util' as js_util;
import 'dart:convert';
import 'package:flutter/foundation.dart';

/// Wrapper to call the `window.initPush(userId, metadata)` function defined in
/// `web/push_subscribe.js`. Only works on web (kIsWeb).
class PushService {
  /// Initializes push for a given appointment or user. Returns the inserted
  /// subscription object from the backend, or null on non-web / failure.
  static Future<Map<String, dynamic>?> initPushForAppointment(String appointmentId, {String? name}) async {
    if (!kIsWeb) return null;
    try {
      final initFn = js_util.getProperty(html.window, 'initPush');
      if (initFn == null) {
        // helper script not loaded
        print('initPush not available on window');
        return null;
      }
      final metadata = { 'appointment_id': appointmentId, if (name != null) 'name': name };
      final promise = js_util.callMethod(html.window, 'initPush', [appointmentId, metadata]);
      final result = await js_util.promiseToFuture<dynamic>(promise);
      if (result == null) return null;
      // In the client script we return a JSON string to avoid LegacyJavaScriptObject issues.
      if (result is String) {
        try {
          final parsed = jsonDecode(result);
          if (parsed is Map) return Map<String, dynamic>.from(parsed);
        } catch (e) {
          print('PushService: failed to parse JSON result: $e');
          return null;
        }
      }
      // Last resort: attempt to convert JS object using dart interop helpers (may still fail)
      try {
        final map = <String, dynamic>{};
        final keys = js_util.callMethod(js_util.getProperty(html.window, 'Object'), 'keys', [result]);
        for (var i = 0; i < (keys as List).length; i++) {
          final k = keys[i];
          final v = js_util.getProperty(result, k);
          map[k.toString()] = v;
        }
        return map;
      } catch (e) {
        print('PushService: fallback conversion failed: $e');
        return null;
      }
    } catch (e) {
      print('PushService.initPushForAppointment error: $e');
      return null;
    }
  }
}
