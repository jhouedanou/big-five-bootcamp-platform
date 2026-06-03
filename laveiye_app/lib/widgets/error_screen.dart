import 'package:flutter/material.dart';
import '../config/app_config.dart';

/// Ecran affiche sur erreur de ressource web (onWebResourceError).
class ErrorScreen extends StatelessWidget {
  const ErrorScreen({
    super.key,
    required this.onRetry,
    this.message,
  });

  /// Callback bouton "Reessayer".
  final VoidCallback onRetry;

  /// Message d'erreur optionnel.
  final String? message;

  @override
  Widget build(BuildContext context) {
    return Container(
      color: Colors.white,
      padding: const EdgeInsets.all(32),
      child: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: <Widget>[
            const Icon(Icons.error_outline,
                size: 72, color: AppConfig.accentColor),
            const SizedBox(height: 24),
            const Text(
              'Une erreur est survenue',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12),
            Text(
              message ?? 'Impossible de charger la page demandee.',
              textAlign: TextAlign.center,
              style: const TextStyle(color: Colors.black54),
            ),
            const SizedBox(height: 28),
            ElevatedButton.icon(
              onPressed: onRetry,
              icon: const Icon(Icons.refresh),
              label: const Text('Reessayer'),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppConfig.primaryColor,
                foregroundColor: Colors.black87,
                padding:
                    const EdgeInsets.symmetric(horizontal: 28, vertical: 14),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
