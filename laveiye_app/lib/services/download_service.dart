import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:gal/gal.dart';
import 'package:http/http.dart' as http;
import 'package:path_provider/path_provider.dart';

/// Resultat d'un telechargement.
enum DownloadStatus { success, denied, notMedia, error }

class DownloadResult {
  const DownloadResult(this.status, [this.message]);
  final DownloadStatus status;
  final String? message;
}

/// Telecharge un visuel depuis la WebView et l'enregistre dans la galerie.
/// Images -> Gal.putImageBytes ; videos -> fichier temp puis Gal.putVideo.
/// Autres types (pdf, zip...) -> non-media, gere par le caller (ouverture ext).
class DownloadService {
  DownloadService._();

  static const Set<String> _imageExts = <String>{
    '.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.heic', '.heif',
  };
  static const Set<String> _videoExts = <String>{
    '.mp4', '.mov', '.m4v', '.webm',
  };

  /// Heuristique : ce lien est-il un telechargement de fichier ?
  /// Extension media/fichier connue, ou chemin/parametre "download".
  static bool isDownloadable(String url) {
    final Uri? u = Uri.tryParse(url);
    if (u == null) return false;
    final String path = u.path.toLowerCase();
    final bool hasExt = _imageExts.any(path.endsWith) ||
        _videoExts.any(path.endsWith) ||
        path.endsWith('.pdf') ||
        path.endsWith('.zip');
    final bool flagged =
        path.contains('/download') || u.queryParameters.containsKey('download');
    return hasExt || flagged;
  }

  static bool _isImage(String path, String contentType) =>
      contentType.startsWith('image/') || _imageExts.any(path.endsWith);

  static bool _isVideo(String path, String contentType) =>
      contentType.startsWith('video/') || _videoExts.any(path.endsWith);

  static String _fileName(Uri u) {
    final String last = u.pathSegments.isNotEmpty ? u.pathSegments.last : '';
    if (last.isNotEmpty && last.contains('.')) return last;
    return 'laveiye_${DateTime.now().millisecondsSinceEpoch}';
  }

  /// Telecharge [url] et enregistre dans la galerie si media.
  static Future<DownloadResult> download(String url) async {
    final Uri? u = Uri.tryParse(url);
    if (u == null) return const DownloadResult(DownloadStatus.error, 'URL invalide');

    try {
      // Demande l'acces galerie (declenche l'ecran de permission systeme).
      final bool granted = await Gal.requestAccess();
      if (!granted) return const DownloadResult(DownloadStatus.denied);

      final http.Response res = await http.get(u);
      if (res.statusCode != 200) {
        return DownloadResult(DownloadStatus.error, 'HTTP ${res.statusCode}');
      }

      final String path = u.path.toLowerCase();
      final String contentType =
          (res.headers['content-type'] ?? '').toLowerCase();
      final String name = _fileName(u);

      if (_isImage(path, contentType)) {
        await Gal.putImageBytes(res.bodyBytes, name: name);
        return const DownloadResult(DownloadStatus.success);
      }

      if (_isVideo(path, contentType)) {
        final Directory dir = await getTemporaryDirectory();
        final File f = File('${dir.path}/$name');
        await f.writeAsBytes(res.bodyBytes);
        await Gal.putVideo(f.path);
        return const DownloadResult(DownloadStatus.success);
      }

      // Type non-media (pdf, zip...) : laisse le caller ouvrir en externe.
      return const DownloadResult(DownloadStatus.notMedia);
    } on GalException catch (e) {
      debugPrint('DownloadService Gal: ${e.type.message}');
      return DownloadResult(DownloadStatus.error, e.type.message);
    } catch (e) {
      debugPrint('DownloadService: $e');
      return DownloadResult(DownloadStatus.error, e.toString());
    }
  }
}
