// Tests unitaires de la logique de routage des URLs (interne vs externe).
// La WebView elle-meme ne peut pas s'initialiser hors d'un device/emulateur,
// donc on teste la logique pure d'AppConfig.

import 'package:flutter_test/flutter_test.dart';

import 'package:laveiye_app/config/app_config.dart';

void main() {
  group('AppConfig.isInternalUrl', () {
    test('hosts internes -> true', () {
      expect(AppConfig.isInternalUrl('https://laveiye.com'), isTrue);
      expect(AppConfig.isInternalUrl('https://www.laveiye.com/page'), isTrue);
      expect(AppConfig.isInternalUrl('http://laveiye.com'), isTrue);
    });

    test('domaines externes -> false', () {
      expect(AppConfig.isInternalUrl('https://google.com'), isFalse);
      expect(AppConfig.isInternalUrl('https://facebook.com/laveiye'), isFalse);
    });

    test('schemes non-http (mailto/tel/wa) -> false', () {
      expect(AppConfig.isInternalUrl('mailto:contact@laveiye.com'), isFalse);
      expect(AppConfig.isInternalUrl('tel:+2250700000000'), isFalse);
      expect(AppConfig.isInternalUrl('https://wa.me/2250700000000'), isFalse);
    });

    test('URL invalide -> false', () {
      expect(AppConfig.isInternalUrl('pas une url'), isFalse);
    });
  });
}
