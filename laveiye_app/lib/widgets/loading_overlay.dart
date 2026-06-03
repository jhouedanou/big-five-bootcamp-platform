import 'package:flutter/material.dart';
import '../config/app_config.dart';

/// Loader affiche par-dessus la WebView lors du passage d'un ecran a l'autre
/// (entre onPageStarted et onPageFinished). Logo owl + spinner de marque.
class LoadingOverlay extends StatelessWidget {
  const LoadingOverlay({super.key, this.progress});

  /// Progression 0-100 (barre fine sous le spinner). Null = indetermine.
  final int? progress;

  @override
  Widget build(BuildContext context) {
    return Positioned.fill(
      child: ColoredBox(
        color: Colors.white.withValues(alpha: 0.94),
        child: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: <Widget>[
              // Logo dans un cercle orange.
              Container(
                width: 88,
                height: 88,
                decoration: const BoxDecoration(
                  color: AppConfig.primaryColor,
                  shape: BoxShape.circle,
                ),
                clipBehavior: Clip.antiAlias,
                child: Image.asset(
                  'assets/images/logo.png',
                  fit: BoxFit.cover,
                ),
              ),
              const SizedBox(height: 28),
              SizedBox(
                width: 32,
                height: 32,
                child: CircularProgressIndicator(
                  strokeWidth: 3,
                  color: AppConfig.primaryColor,
                  value: (progress != null && progress! > 0 && progress! < 100)
                      ? progress! / 100
                      : null,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
