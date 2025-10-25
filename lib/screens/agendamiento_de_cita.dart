
import 'package:flutter/material.dart';
import '../services/api_service.dart';

class AgendamientoDeCitaScreen extends StatefulWidget {
  const AgendamientoDeCitaScreen({Key? key}) : super(key: key);

  @override
  State<AgendamientoDeCitaScreen> createState() => _AgendamientoDeCitaScreenState();
}

class _AgendamientoDeCitaScreenState extends State<AgendamientoDeCitaScreen> {
  bool isHoy = true;
  String? selectedSlot;
  List<String> slotsOcupados = [];

  @override
  void initState() {
    super.initState();
    _loadSlotsOcupados();
  }

  Future<void> _loadSlotsOcupados() async {
    try {
      final citas = await ApiService.getAppointmentsFiltered(when: isHoy ? 'hoy' : 'manana');
      setState(() {
        slotsOcupados = citas
            .map<String>((c) {
              final t = c['time'] ?? '';
              if (t.isEmpty) return '';
              // Convertir a formato 12h para comparar con slots
              int hour = int.parse(t.split(':')[0]);
              int minute = int.parse(t.split(':')[1]);
              String suffix = hour >= 12 ? 'pm' : 'am';
              int hour12 = hour % 12 == 0 ? 12 : hour % 12;
              String slot = "${hour12}:${minute.toString().padLeft(2, '0')} $suffix";
              return slot;
            })
            .where((s) => s.isNotEmpty)
            .toList();
      });
    } catch (_) {
      setState(() {
        slotsOcupados = [];
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    const bg = Color(0xFF1E2A3A);
    const surface = Color(0xFF222222);
    const disabled = Color(0xFF888888);
    const primary = Color(0xFFD4AF37);

    final slots = [
      '8:00 am', '8:30 am', '9:00 am', '9:30 am', '10:00 am', '10:30 am', '11:00 am', '11:30 am', '12:00 pm', '12:30 pm', '1:00 pm', '1:30 pm', '2:00 pm', '2:30 pm', '3:00 pm', '3:30 pm', '4:00 pm', '4:30 pm', '5:00 pm', '5:30 pm', '6:00 pm', '6:30 pm', '7:00 pm', '7:30 pm'
    ];

    return Scaffold(
      backgroundColor: bg,
      appBar: AppBar(
        backgroundColor: surface,
        elevation: 0,
  title: const Center(child: Text('Agendar Horário', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold))),
      ),
      body: Padding(
        padding: const EdgeInsets.all(12.0),
        child: Column(
          children: [
            Container(
              color: surface,
              child: Row(
                children: [
                  Expanded(
                    child: InkWell(
                      onTap: () {
                        setState(() {
                          isHoy = true;
                          selectedSlot = null;
                        });
                        _loadSlotsOcupados();
                      },
                      child: _TabButton(label: 'Hoje', selected: isHoy),
                    ),
                  ),
                  Expanded(
                    child: InkWell(
                      onTap: () {
                        setState(() {
                          isHoy = false;
                          selectedSlot = null;
                        });
                        _loadSlotsOcupados();
                      },
                      child: _TabButton(label: 'Amanhã', selected: !isHoy),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),
            Expanded(
              child: GridView.count(
                crossAxisCount: 3,
                childAspectRatio: 3,
                crossAxisSpacing: 8,
                mainAxisSpacing: 8,
                children: slots.map((s) {
                  // Deshabilitar si ya está ocupado, si ya pasó la hora (solo hoy), o si ya está seleccionado
                  final isOcupado = slotsOcupados.contains(s);
                  final isSelected = selectedSlot == s;
                  bool isPast = false;
                  if (isHoy) {
                    final now = DateTime.now();
                    // Convertir slot a DateTime
                    String time12 = s;
                    List<String> parts = time12.replaceAll('am', '').replaceAll('pm', '').trim().split(':');
                    int hour = int.parse(parts[0]);
                    int minute = int.parse(parts[1].split(' ')[0]);
                    if (s.contains('pm') && hour != 12) hour += 12;
                    if (s.contains('am') && hour == 12) hour = 0;
                    final slotTime = DateTime(now.year, now.month, now.day, hour, minute);
                    isPast = now.isAfter(slotTime);
                  }
                  final disabledSlot = isOcupado || isPast;
                  return GestureDetector(
                    onTap: disabledSlot || isSelected
                        ? null
                        : () async {
                            setState(() {
                              selectedSlot = s;
                            });
                            final args = ModalRoute.of(context)?.settings.arguments as Map<String, dynamic>?;
                            final name = args != null && args['name'] != null && (args['name'] as String).isNotEmpty ? args['name'] as String : 'Cliente';
                            final service = args != null && args['service'] != null ? args['service'] as String : 'Serviço';
                            final fecha = isHoy ? 'Hoje' : 'Amanhã';
                            // Calcular la fecha real (hoy o mañana)
                            final now = DateTime.now();
                            final date = isHoy
                                ? "${now.year}-${now.month.toString().padLeft(2, '0')}-${now.day.toString().padLeft(2, '0')}"
                                : "${now.add(const Duration(days: 1)).year}-${now.add(const Duration(days: 1)).month.toString().padLeft(2, '0')}-${now.add(const Duration(days: 1)).day.toString().padLeft(2, '0')}";
                            // Convertir hora a formato 24h para backend
                            String time24 = s.replaceAll('am', '').replaceAll('pm', '').trim();
                            List<String> parts = time24.split(':');
                            int hour = int.parse(parts[0]);
                            int minute = int.parse(parts[1]);
                            if (s.contains('pm') && hour != 12) hour += 12;
                            if (s.contains('am') && hour == 12) hour = 0;
                            final time = "${hour.toString().padLeft(2, '0')}:${minute.toString().padLeft(2, '0')}";
                            try {
                              await ApiService.createAppointment(
                                name: name,
                                service: service,
                                date: date,
                                time: time,
                              );
                              // ignore: use_build_context_synchronously
                              await showDialog(context: context, builder: (_) => _confirmationDialog(context, primary, name, service, s, fecha));
                              // Cerrar la pantalla retornando true para indicar que hubo un cambio
                              if (mounted) Navigator.of(context).pop(true);
                            } catch (e) {
                              // ignore: use_build_context_synchronously
                              showDialog(
                                context: context,
                                builder: (_) => AlertDialog(
                                  backgroundColor: const Color(0xFF222222),
                                  title: const Text('Error', style: TextStyle(color: Colors.red)),
                                  content: Text('No se pudo agendar la cita.\n$e', style: const TextStyle(color: Colors.white)),
                                  actions: [
                                    TextButton(
                                      onPressed: () => Navigator.of(context).pop(),
                                      child: const Text('Cerrar', style: TextStyle(color: Colors.white)),
                                    ),
                                  ],
                                ),
                              );
                            }
                          },
                    child: Container(
                      decoration: BoxDecoration(
                        color: isSelected
                            ? primary
                            : disabledSlot
                                ? disabled.withOpacity(0.3)
                                : surface,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Center(
                        child: Text(
                          s,
                          style: TextStyle(
                            color: isSelected
                                ? surface
                                : disabledSlot
                                    ? disabled
                                    : Colors.white,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ),
                    ),
                  );
                }).toList(),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _confirmationDialog(BuildContext context, Color primary, String name, String service, String time, String fecha) {
    return Dialog(
      backgroundColor: const Color(0xFF222222),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const CircleAvatar(backgroundColor: Colors.green, radius: 28, child: Icon(Icons.check, color: Colors.white, size: 32)),
            const SizedBox(height: 12),
            const Text('Agendamento Confirmado', style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            const Text('Seu horário foi agendado com sucesso.', style: TextStyle(color: Colors.white70)),
            const SizedBox(height: 12),
            Text('Cliente: $name', style: const TextStyle(color: Colors.white)),
            Text('Serviço: $service', style: const TextStyle(color: Colors.white)),
            Text('Data: $fecha', style: const TextStyle(color: Colors.white)),
            Text('Hora: $time', style: const TextStyle(color: Colors.white)),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () => Navigator.of(context).pop(),
                style: ElevatedButton.styleFrom(backgroundColor: primary, foregroundColor: const Color(0xFF222222)),
                child: const Text('OK'),
              ),
            )
          ],
        ),
      ),
    );
  }
}

class _TabButton extends StatelessWidget {
  final String label;
  final bool selected;
  const _TabButton({required this.label, required this.selected});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(8.0),
      child: Container(
        height: 48,
        decoration: BoxDecoration(
          color: selected ? const Color(0xFFD4AF37) : Colors.transparent,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Center(
          child: Text(label, style: TextStyle(color: selected ? const Color(0xFF1E2A3A) : Colors.white, fontWeight: FontWeight.bold)),
        ),
      ),
    );
  }
}

