import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'config/app_config.dart';
import 'webview_page.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();

  // Verrouille l'orientation en portrait (optionnel - retire si besoin).
  SystemChrome.setPreferredOrientations(<DeviceOrientation>[
    DeviceOrientation.portraitUp,
  ]);

  runApp(const LaveiyeApp());
}

class LaveiyeApp extends StatelessWidget {
  const LaveiyeApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: AppConfig.appName,
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(
          seedColor: AppConfig.primaryColor,
          primary: AppConfig.primaryColor,
          secondary: AppConfig.accentColor,
        ),
        scaffoldBackgroundColor: Colors.white,
      ),
      home: const WebViewPage(),
    );
  }
}
