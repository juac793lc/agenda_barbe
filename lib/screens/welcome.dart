import 'package:flutter/material.dart';

class WelcomeScreen extends StatefulWidget {
  const WelcomeScreen({Key? key}) : super(key: key);

  @override
  State<WelcomeScreen> createState() => _WelcomeScreenState();
}

class _WelcomeScreenState extends State<WelcomeScreen> {
  final TextEditingController _nameController = TextEditingController();

  @override
  void dispose() {
    _nameController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    // Colors taken from the HTML export
    const primaryColor = Color(0xFFEC6D13);
    const background = Color(0xFF221810);
    const borderDark = Color(0xFF443A32);

    return Scaffold(
      backgroundColor: background,
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.content_cut, size: 64, color: primaryColor),
              const SizedBox(height: 16),
              Text(
                'Wuill Barbe Shop',
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontSize: 32, fontWeight: FontWeight.bold, color: Colors.white),
              ),
              const SizedBox(height: 24),
              ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 480),
                child: TextField(
                  controller: _nameController,
                  style: const TextStyle(color: Colors.white), // texto blanco al escribir
                  decoration: InputDecoration(
                    hintText: 'Ingresa tu nombre',
                    hintStyle: const TextStyle(color: Color(0xFF9A6C4C)),
                    filled: true,
                    fillColor: background,
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: borderDark)),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
                  ),
                ),
              ),
              const SizedBox(height: 18),
              ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 480),
                child: ElevatedButton(
                  onPressed: () {
                    final name = _nameController.text.trim();
                    // Navegar a selección de servicio pasando el nombre
                    Navigator.pushNamed(context, '/services', arguments: {'name': name});
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: primaryColor,
                    foregroundColor: const Color(0xFF1B130D),
                    minimumSize: const Size.fromHeight(48),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: const Text('Continuar', style: TextStyle(fontWeight: FontWeight.bold)),
                ),
              ),
              const SizedBox(height: 12),
              ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 480),
                child: OutlinedButton(
                  onPressed: () => Navigator.pushNamed(context, '/agenda'),
                  style: OutlinedButton.styleFrom(
                    side: const BorderSide(color: Color(0xFFD4AF37)),
                    foregroundColor: const Color(0xFFD4AF37),
                    backgroundColor: background,
                    minimumSize: const Size.fromHeight(48),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: const Text('Ver Agenda General', style: TextStyle(fontWeight: FontWeight.bold)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
