import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'screens/welcome.dart';
import 'screens/agenda_general.dart';
import 'screens/agendamiento_de_cita.dart';
import 'screens/seleccion_de_servicio.dart';

void main() {
  runApp(const BarbeApp());
}

class BarbeApp extends StatelessWidget {
  const BarbeApp({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Barbe App',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        primaryColor: const Color(0xFFD4AF37),
        scaffoldBackgroundColor: const Color(0xFF1E2A3A),
        textTheme: GoogleFonts.epilogueTextTheme(Theme.of(context).textTheme),
        brightness: Brightness.dark,
      ),
      initialRoute: '/',
      routes: {
        '/': (_) => const WelcomeScreen(),
        '/agenda': (_) => const AgendaGeneralScreen(),
        '/booking': (_) => const AgendamientoDeCitaScreen(),
        '/services': (_) => const SeleccionDeServicioScreen(),
      },
    );
  }
}
