import "package:firebase_core/firebase_core.dart";
import "package:flutter/material.dart";

import "firebase_options.dart";

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);
  runApp(const NerdHubApp());
}

class NerdHubApp extends StatelessWidget {
  const NerdHubApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: "NERD HUB",
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        brightness: Brightness.dark,
        scaffoldBackgroundColor: const Color(0xFF0E0F13),
        cardColor: const Color(0xFF161821),
        colorScheme: const ColorScheme.dark(
          primary: Color(0xFFB69CFF),
          secondary: Color(0xFF5EEAD4),
          error: Color(0xFFF87171),
        ),
      ),
      home: const BootstrapPage(),
    );
  }
}

class BootstrapPage extends StatelessWidget {
  const BootstrapPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 460),
          child: Card(
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    "NERD HUB",
                    style: Theme.of(context).textTheme.headlineMedium,
                  ),
                  const SizedBox(height: 8),
                  const Text("Base Flutter + Firebase pronta."),
                  const SizedBox(height: 16),
                  const Text("Proximo passo: Auth + Firestore + Home."),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

