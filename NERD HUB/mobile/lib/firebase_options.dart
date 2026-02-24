import "package:firebase_core/firebase_core.dart";

class DefaultFirebaseOptions {
  static FirebaseOptions get currentPlatform {
    throw UnimplementedError(
      "Firebase nao configurado. Rode `flutterfire configure` para gerar as opcoes por plataforma.",
    );
  }
}

