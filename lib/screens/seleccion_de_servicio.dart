import 'package:flutter/material.dart';

class SeleccionDeServicioScreen extends StatelessWidget {
  const SeleccionDeServicioScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final args = ModalRoute.of(context)?.settings.arguments as Map<String, dynamic>?;
  final name = (args != null && args['name'] != null && (args['name'] as String).isNotEmpty) ? args['name'] as String : 'Cliente';

    // Palette from code.html
  const primary = Color(0xFFEC6D13);
  const backgroundLight = Color(0xFFF8F7F6);
  const textLight = Color(0xFF1B130D);
  const accentLight = Color(0xFFF3ECE7);
  const subtleLight = Color(0xFF9A6C4C);

  // Forzar fondo blanco suave y textos oscuros independientemente del tema
  final bg = backgroundLight;
  final textColor = textLight;
  final accent = accentLight;
  final subtle = subtleLight;

    final services = [
      {
        'title': 'Corte',
        'subtitle': 'Corte de pelo con estilo',
        'price': r'$25',
        'icon': Icons.content_cut,
      },
      {
        'title': 'Barba',
        'subtitle': 'Afeitado y arreglo de barba',
        'price': r'$15',
        'icon': Icons.cleaning_services,
      },
      {
        'title': 'Corte + Barba',
        'subtitle': 'Paquete completo de corte y barba',
        'price': r'$35',
        'icon': Icons.auto_fix_high,
      },
      {
        'title': 'Tinte',
        'subtitle': 'Tinte de pelo profesional',
        'price': r'$40',
        'icon': Icons.brush,
      },
    ];

    return Scaffold(
      backgroundColor: bg,
      appBar: AppBar(
        backgroundColor: bg,
        elevation: 0,
        leading: IconButton(onPressed: () => Navigator.pop(context), icon: Icon(Icons.arrow_back, color: textColor)),
  title: Text('Selecione um serviço', style: TextStyle(color: textColor, fontWeight: FontWeight.w700)),
        centerTitle: true,
        actions: [
          IconButton(onPressed: () {}, icon: Icon(Icons.storefront, color: textColor)),
        ],
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 12.0),
          child: ListView.separated(
            itemCount: services.length,
            separatorBuilder: (_, __) => const SizedBox(height: 12),
            itemBuilder: (context, index) {
              final s = services[index];
              final icon = s['icon'] as IconData;
              return Material(
                color: Colors.transparent,
                child: InkWell(
                  borderRadius: BorderRadius.circular(12),
                  onTap: () {
                    Navigator.pushNamed(context, '/booking', arguments: {'name': name, 'service': s['title']}).then((refresh) {
                      if (refresh == true) {
                        // Propagar hacia atrás: quien abrió esta pantalla puede refrescar
                        Navigator.pop(context, true);
                      }
                    });
                  },
                  child: Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: bg,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: [
                        Container(
                          width: 48,
                          height: 48,
                          decoration: BoxDecoration(color: accent, borderRadius: BorderRadius.circular(8)),
                          child: Icon(icon, color: primary, size: 28),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(s['title'] as String, style: TextStyle(color: textColor, fontSize: 16, fontWeight: FontWeight.w600)),
                              const SizedBox(height: 4),
                              Text(s['subtitle'] as String, style: TextStyle(color: subtle, fontSize: 13)),
                            ],
                          ),
                        ),
                        const SizedBox(width: 8),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            Text(s['price'] as String, style: TextStyle(color: textColor, fontWeight: FontWeight.w600)),
                            const SizedBox(height: 4),
                            Icon(Icons.chevron_right, color: subtle),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
              );
            },
          ),
        ),
      ),
    );
  }
}
