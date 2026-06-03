import 'package:flutter/material.dart';

/// Configuration centrale de l'app LAVEIYE.
/// Tout ce qui peut changer (URL, couleurs, domaines autorises) est ici.
class AppConfig {
  AppConfig._();

  /// Nom affiche de l'app.
  static const String appName = 'Laveiye';

  /// URL de depart chargee dans la WebView.
  static const String startUrl = 'https://laveiye.com/login';

  /// Couleur principale (theme) - or LAVEIYE.
  static const Color primaryColor = Color(0xFFF2B33D);

  /// Couleur d'accent (barre de progression, boutons).
  static const Color accentColor = Color(0xFFE63946);

  /// Hosts consideres comme "internes" -> restent dans la WebView.
  /// Tout le reste = externe -> ouvert via url_launcher.
  static const List<String> internalHosts = <String>[
    'laveiye.com',
    'www.laveiye.com',
  ];

  /// Retourne true si l'URL appartient au site (navigation interne).
  static bool isInternalUrl(String url) {
    final Uri? uri = Uri.tryParse(url);
    if (uri == null) return false;

    // Schemes non-http (mailto, tel, whatsapp, intent...) = toujours externe.
    if (uri.scheme != 'http' && uri.scheme != 'https') return false;

    final String host = uri.host.toLowerCase();
    return internalHosts.contains(host);
  }
}
