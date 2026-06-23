import 'package:flutter/foundation.dart';
import 'package:url_launcher/url_launcher.dart';

/// Service d'ouverture des liens externes hors WebView.
/// mailto:, tel:, wa.me, reseaux sociaux, autres domaines...
class UrlLauncherService {
  UrlLauncherService._();

  /// Ouvre [url] dans l'app systeme appropriee (navigateur, mail, tel, WhatsApp).
  /// Retourne true si l'ouverture a reussi.
  static Future<bool> openExternal(String url) async {
    final Uri? uri = Uri.tryParse(url);
    if (uri == null) return false;

    try {
      // externalApplication = quitte la WebView, ouvre l'app native dediee.
      final bool ok = await launchUrl(
        uri,
        mode: LaunchMode.externalApplication,
      );
      return ok;
    } catch (e) {
      debugPrint('UrlLauncherService: echec ouverture $url -> $e');
      return false;
    }
  }
}
