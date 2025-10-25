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
    final uri = Uri.parse('$baseUrl/appointments').replace(queryParameters: {
      if (when != null) 'when': when,
      if (date != null) 'date': date,
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
      return jsonDecode(response.body);
    } else {
      throw Exception('Error al crear cita');
    }
  }
}
