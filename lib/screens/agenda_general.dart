
import 'package:flutter/material.dart';
import '../services/api_service.dart';


class AgendaGeneralScreen extends StatefulWidget {
  const AgendaGeneralScreen({super.key});

  @override
  State<AgendaGeneralScreen> createState() => _AgendaGeneralScreenState();
}

class _AgendaGeneralScreenState extends State<AgendaGeneralScreen> {
  late Future<List<dynamic>> _appointmentsFuture;
  bool isHoy = true;

  @override
  void initState() {
    super.initState();
    _appointmentsFuture = ApiService.getAppointmentsFiltered(when: 'hoy');
  }

  @override
  Widget build(BuildContext context) {
    const backgroundDark = Color(0xFF0D1B2A);
    const cardDark = Color(0xFF1B263B);
    const primary = Color(0xFFD4AF37);

    Widget appointment(String name, String service, String time, {String? avatarUrl}) {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: BoxDecoration(
          color: Color.fromARGB(
            (0.6 * 255).toInt(),
            cardDark.red,
            cardDark.green,
            cardDark.blue,
          ),
          borderRadius: BorderRadius.circular(16),
        ),
        child: Row(
          children: [
            CircleAvatar(
              backgroundImage: avatarUrl != null
                  ? NetworkImage(avatarUrl)
                  : const NetworkImage('https://ui-avatars.com/api/?name=User'),
              radius: 28,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(name, style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
                  Text(service, style: const TextStyle(color: Colors.white70)),
                ],
              ),
            ),
            Text(time, style: const TextStyle(color: primary, fontSize: 18, fontWeight: FontWeight.bold)),
          ],
        ),
      );
    }

    return Scaffold(
      backgroundColor: backgroundDark,
      appBar: AppBar(
        backgroundColor: backgroundDark,
        elevation: 0,
  title: const Center(child: Text('Minhas Agendas', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold))),
        automaticallyImplyLeading: true,
      ),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          children: [
            Row(
              children: [
                Expanded(
                  child: Container(
                    height: 48,
                    decoration: BoxDecoration(
                      color: Color.fromARGB(
                        (0.6 * 255).toInt(),
                        cardDark.red,
                        cardDark.green,
                        cardDark.blue,
                      ),
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Row(
                      children: [
                        Expanded(
                          child: TextButton(
                            onPressed: () {
                                  setState(() {
                                    isHoy = true;
                                    _appointmentsFuture = ApiService.getAppointmentsFiltered(when: 'hoy');
                                  });
                                },
                            child: Text('Hoje', style: TextStyle(color: isHoy ? primary : Colors.white)),
                          ),
                        ),
                        Expanded(
                          child: TextButton(
                            onPressed: () {
                                  setState(() {
                                    isHoy = false;
                                    _appointmentsFuture = ApiService.getAppointmentsFiltered(when: 'manana');
                                  });
                                },
                            child: Text('Amanhã', style: TextStyle(color: !isHoy ? primary : Colors.white70)),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Expanded(
              child: FutureBuilder<List<dynamic>>(
                key: Key(isHoy ? 'hoy' : 'manana'),
                future: _appointmentsFuture,
                builder: (context, snapshot) {
                  if (snapshot.connectionState == ConnectionState.waiting) {
                    return const Center(child: CircularProgressIndicator());
                  } else if (snapshot.hasError) {
                    return Center(child: Text('Error: \\${snapshot.error}', style: const TextStyle(color: Colors.white)));
                  } else if (!snapshot.hasData || snapshot.data!.isEmpty) {
                    return const Center(child: Text('Nenhum agendamento', style: TextStyle(color: Colors.white70)));
                  }
                  final citas = snapshot.data!;
                  // Ahora el backend ya filtra por fecha si usamos getAppointmentsFiltered.
                  // Ordenamos por time por seguridad (ya viene ordenado desde backend cuando se pasa date/when).
                  citas.sort((a, b) {
                    final ta = a['time'] ?? '';
                    final tb = b['time'] ?? '';
                    return ta.compareTo(tb);
                  });
                  if (citas.isEmpty) {
                    return Center(child: Text('Sem agendamentos para ${isHoy ? 'hoje' : 'amanh\u00e3'}', style: const TextStyle(color: Colors.white70)));
                  }
                  return ListView.separated(
                    itemCount: citas.length,
                    separatorBuilder: (context, i) => const SizedBox(height: 12),
                    itemBuilder: (context, i) {
                      final cita = citas[i];
                      return appointment(
                        cita['name'] ?? 'Sin nombre',
                        cita['service'] ?? '',
                        cita['time'] ?? '',
                        avatarUrl: null,
                      );
                    },
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}