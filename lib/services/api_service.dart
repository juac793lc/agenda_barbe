import 'dart:convert';
import 'package:http/http.dart' as http;

class ApiService {
  static const String baseUrl = 'http://localhost:3333';

  static Future<List<dynamic>> getAppointments() async {
    final response = await http.get(Uri.parse('$baseUrl/appointments'));
    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      throw Exception('Error al obtener citas');
    }
  }

  // Obtener citas con filtros opcionales
  static Future<List<dynamic>> getAppointmentsFiltered({String? when, String? date}) async {
    // If caller passed a semantic 'when' (hoy/manana), convert to concrete date string
    String? resolvedDate = date;
    if (when != null && resolvedDate == null) {
      final now = DateTime.now();
      if (when.toLowerCase() == 'hoy' || when.toLowerCase() == 'today') {
        resolvedDate = "${now.year}-${now.month.toString().padLeft(2, '0')}-${now.day.toString().padLeft(2, '0')}";
      } else if (when.toLowerCase() == 'manana' || when.toLowerCase() == 'mañana' || when.toLowerCase() == 'tomorrow') {
        final t = now.add(const Duration(days: 1));
        resolvedDate = "${t.year}-${t.month.toString().padLeft(2, '0')}-${t.day.toString().padLeft(2, '0')}";
      }
    }

    final uri = Uri.parse('$baseUrl/appointments').replace(queryParameters: {
      if (resolvedDate != null) 'date': resolvedDate,
    });
    final response = await http.get(uri);
    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      throw Exception('Error al obtener citas filtradas');
    }
  }

  static Future<Map<String, dynamic>> createAppointment({
    required String name,
    required String service,
    required String date,
    required String time,
  }) async {
    final response = await http.post(
      Uri.parse('$baseUrl/appointments'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'name': name,
        'service': service,
        'date': date,
        'time': time,
      }),
    );
    if (response.statusCode == 200) {
      final decoded = jsonDecode(response.body);
      // Supabase may return an array (representation) — normalize to a Map
      if (decoded is List && decoded.isNotEmpty) {
        return Map<String, dynamic>.from(decoded[0] as Map);
      }
      if (decoded is Map) {
        return Map<String, dynamic>.from(decoded);
      }
      throw Exception('Respuesta inesperada al crear cita');
    } else {
      throw Exception('Error al crear cita');
    }
  }

  /// Delete appointment. If [userId] is provided it will be sent in header
  /// `X-User-Id` so the server can validate ownership.
  /// If [userId] is provided it will be sent in header `X-User-Id`.
  /// If [ownerToken] is provided it will be sent in header `X-Owner-Token`.
  static Future<bool> deleteAppointment(String id, {String? userId, String? ownerToken}) async {
    final headers = <String, String>{};
    if (userId != null) headers['X-User-Id'] = userId;
    if (ownerToken != null) headers['X-Owner-Token'] = ownerToken;
    final response = await http.delete(Uri.parse('$baseUrl/appointments/$id'), headers: headers.isNotEmpty ? headers : null);
    if (response.statusCode == 200) {
      return true;
    }
    return false;
  }
}
