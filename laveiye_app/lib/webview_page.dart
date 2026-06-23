import 'dart:async';

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:webview_flutter/webview_flutter.dart';

// Imports specifiques plateforme pour le controle bas niveau.
import 'package:webview_flutter_android/webview_flutter_android.dart';
import 'package:webview_flutter_wkwebview/webview_flutter_wkwebview.dart';

import 'config/app_config.dart';
import 'services/download_service.dart';
import 'services/url_launcher_service.dart';
import 'widgets/error_screen.dart';
import 'widgets/loading_overlay.dart';
import 'widgets/offline_screen.dart';

/// Page principale : encapsule laveiye.com dans une WebView.
/// Gere navigation native, cache/session, offline, upload, retour Android.
class WebViewPage extends StatefulWidget {
  const WebViewPage({super.key});

  @override
  State<WebViewPage> createState() => _WebViewPageState();
}

class _WebViewPageState extends State<WebViewPage> {
  late final WebViewController _controller;
  final GlobalKey<RefreshIndicatorState> _refreshKey =
      GlobalKey<RefreshIndicatorState>();

  // Etat UI.
  int _progress = 0;
  bool _isLoading = true;
  bool _hasError = false;
  String? _errorMessage;
  bool _isOffline = false;

  // Suivi position scroll pour le pull-to-refresh manuel.
  bool _webViewAtTop = true;

  StreamSubscription<List<ConnectivityResult>>? _connectivitySub;

  @override
  void initState() {
    super.initState();
    _initController();
    _initConnectivity();
  }

  @override
  void dispose() {
    _connectivitySub?.cancel();
    super.dispose();
  }

  // --------------------------------------------------------------------------
  // Initialisation du controller WebView (multi-plateforme).
  // --------------------------------------------------------------------------
  void _initController() {
    // Parametres de creation specifiques plateforme.
    late final PlatformWebViewControllerCreationParams params;
    if (WebViewPlatform.instance is WebKitWebViewPlatform) {
      // iOS : autorise la lecture inline des medias sans plein ecran force.
      params = WebKitWebViewControllerCreationParams(
        allowsInlineMediaPlayback: true,
        mediaTypesRequiringUserAction: const <PlaybackMediaTypes>{},
      );
    } else {
      params = const PlatformWebViewControllerCreationParams();
    }

    final WebViewController controller =
        WebViewController.fromPlatformCreationParams(params);

    controller
      // JavaScript active sans restriction.
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(Colors.white)
      ..setNavigationDelegate(_buildNavigationDelegate())
      // Suivi du scroll pour declencher le pull-to-refresh seulement en haut.
      ..setOnScrollPositionChange((ScrollPositionChange pos) {
        _webViewAtTop = pos.y <= 0;
      });

    _controller = controller;

    // Reglages bas niveau par plateforme.
    _configureAndroid();
    _configureIOS();

    _controller.loadRequest(Uri.parse(AppConfig.startUrl));
  }

  /// Configuration Android : lecture medias, upload fichier, permissions web.
  void _configureAndroid() {
    final platform = _controller.platform;
    if (platform is! AndroidWebViewController) return;

    // Active le mode debug WebView en developpement (inspecteur chrome://inspect).
    AndroidWebViewController.enableDebugging(false);

    // Autorise la lecture auto des medias.
    // NB : on ne surcharge PAS setOnShowFileSelector -> le selecteur de
    // fichiers natif par defaut (galerie + camera) gere les <input type="file">.
    platform.setMediaPlaybackRequiresUserGesture(false);

    // Permissions web generiques (camera) demandees par le site.
    platform.setOnPlatformPermissionRequest(
      (PlatformWebViewPermissionRequest request) async {
        await _requestNativePermissions(request.types);
        request.grant();
      },
    );
  }

  /// Configuration iOS : permissions web (camera/micro/geoloc).
  void _configureIOS() {
    final platform = _controller.platform;
    if (platform is! WebKitWebViewController) return;

    platform.setOnPlatformPermissionRequest(
      (PlatformWebViewPermissionRequest request) async {
        await _requestNativePermissions(request.types);
        request.grant();
      },
    );
  }

  /// Demande les permissions runtime natives selon les types web demandes.
  Future<void> _requestNativePermissions(
      Set<WebViewPermissionResourceType> types) async {
    for (final WebViewPermissionResourceType type in types) {
      if (type == WebViewPermissionResourceType.camera) {
        await Permission.camera.request();
      } else if (type == WebViewPermissionResourceType.microphone) {
        await Permission.microphone.request();
      }
    }
  }

  // --------------------------------------------------------------------------
  // NavigationDelegate : controle total des navigations.
  // --------------------------------------------------------------------------
  NavigationDelegate _buildNavigationDelegate() {
    return NavigationDelegate(
      onProgress: (int progress) {
        if (!mounted) return;
        setState(() => _progress = progress);
      },
      onPageStarted: (String url) {
        if (!mounted) return;
        setState(() {
          _isLoading = true;
          _hasError = false;
        });
      },
      onPageFinished: (String url) {
        if (!mounted) return;
        setState(() => _isLoading = false);
      },
      onWebResourceError: (WebResourceError error) {
        if (!mounted) return;
        // Ignore les erreurs de sous-ressources (images, iframes) non bloquantes.
        if (error.isForMainFrame == false) return;
        setState(() {
          _hasError = true;
          _errorMessage = error.description;
          _isLoading = false;
        });
      },
      onNavigationRequest: (NavigationRequest request) {
        final String url = request.url;

        // Lien de telechargement (visuel) -> enregistre dans la galerie,
        // bloque la navigation WebView.
        if (DownloadService.isDownloadable(url)) {
          _handleDownload(url);
          return NavigationDecision.prevent;
        }

        // Lien interne (laveiye.com / www.laveiye.com) -> reste dans la WebView.
        if (AppConfig.isInternalUrl(url)) {
          return NavigationDecision.navigate;
        }

        // Lien externe (autre domaine, mailto, tel, wa.me, social...) ->
        // ouvert dans l'app systeme, bloque dans la WebView.
        UrlLauncherService.openExternal(url);
        return NavigationDecision.prevent;
      },
    );
  }

  // --------------------------------------------------------------------------
  // Connectivite reseau.
  // --------------------------------------------------------------------------
  Future<void> _initConnectivity() async {
    final List<ConnectivityResult> result =
        await Connectivity().checkConnectivity();
    _updateOffline(result);

    _connectivitySub =
        Connectivity().onConnectivityChanged.listen(_updateOffline);
  }

  void _updateOffline(List<ConnectivityResult> result) {
    final bool offline = result.every((ConnectivityResult r) =>
        r == ConnectivityResult.none);
    if (!mounted) return;
    setState(() => _isOffline = offline);
  }

  // --------------------------------------------------------------------------
  // Actions exposees : reload / goBack / goForward / clearCache.
  // --------------------------------------------------------------------------
  Future<void> reload() => _controller.reload();

  Future<void> goBack() async {
    if (await _controller.canGoBack()) {
      await _controller.goBack();
    }
  }

  Future<void> goForward() async {
    if (await _controller.canGoForward()) {
      await _controller.goForward();
    }
  }

  // --------------------------------------------------------------------------
  // Pull-to-refresh.
  // --------------------------------------------------------------------------
  Future<void> _onRefresh() async {
    await _controller.reload();
    // Laisse un court delai pour que l'indicateur reste visible.
    await Future<void>.delayed(const Duration(milliseconds: 600));
  }

  // --------------------------------------------------------------------------
  // Bouton retour Android (PopScope).
  // --------------------------------------------------------------------------
  Future<void> _handlePop(bool didPop, Object? result) async {
    if (didPop) return;

    // Historique WebView disponible -> revenir en arriere dans la WebView.
    if (await _controller.canGoBack()) {
      await _controller.goBack();
      return;
    }

    // Sinon : demander confirmation avant de quitter l'app.
    final bool shouldExit = await _confirmExit();
    if (shouldExit) {
      await SystemNavigator.pop();
    }
  }

  Future<bool> _confirmExit() async {
    final bool? exit = await showDialog<bool>(
      context: context,
      builder: (BuildContext ctx) => AlertDialog(
        title: const Text('Quitter ${AppConfig.appName} ?'),
        content: const Text('Voulez-vous fermer l\'application ?'),
        actions: <Widget>[
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('Annuler'),
          ),
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            child: const Text('Quitter'),
          ),
        ],
      ),
    );
    return exit ?? false;
  }

  // --------------------------------------------------------------------------
  // Build.
  // --------------------------------------------------------------------------
  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: _handlePop,
      child: Scaffold(
        body: SafeArea(child: _buildBody()),
        floatingActionButton: _buildMenuButton(),
      ),
    );
  }

  Widget _buildBody() {
    if (_isOffline) {
      return OfflineScreen(onRetry: _retry);
    }
    if (_hasError) {
      return ErrorScreen(onRetry: _retry, message: _errorMessage);
    }

    // Listener pour declencher le pull-to-refresh quand la WebView est en haut.
    return RefreshIndicator(
      key: _refreshKey,
      color: AppConfig.primaryColor,
      onRefresh: _onRefresh,
      notificationPredicate: (_) => _webViewAtTop,
      child: Stack(
        children: <Widget>[
          // ListView vide sous-jacent pour que RefreshIndicator capte le geste
          // d'overscroll meme si la page web ne scrolle pas verticalement.
          ListView(physics: const AlwaysScrollableScrollPhysics()),
          WebViewWidget(controller: _controller),
          // Loader de transition entre ecrans (page en cours de chargement).
          if (_isLoading && _progress < 100) LoadingOverlay(progress: _progress),
        ],
      ),
    );
  }

  void _retry() {
    setState(() {
      _hasError = false;
      _errorMessage = null;
    });
    _controller.reload();
  }

  /// Telecharge un visuel et l'enregistre dans la galerie. Feedback via snackbar.
  Future<void> _handleDownload(String url) async {
    _showSnack('Telechargement en cours...');
    final DownloadResult r = await DownloadService.download(url);
    if (!mounted) return;

    switch (r.status) {
      case DownloadStatus.success:
        _showSnack('Visuel enregistre dans la galerie');
      case DownloadStatus.denied:
        _showSnack('Permission galerie refusee');
      case DownloadStatus.notMedia:
        // Fichier non-image (pdf, zip...) -> ouverture externe.
        UrlLauncherService.openExternal(url);
      case DownloadStatus.error:
        _showSnack('Echec du telechargement');
    }
  }

  void _showSnack(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(SnackBar(content: Text(message)));
  }

  /// Menu d'actions : back / forward / reload.
  Widget _buildMenuButton() {
    return PopupMenuButton<String>(
      icon: const CircleAvatar(
        backgroundColor: AppConfig.primaryColor,
        child: Icon(Icons.menu, color: Colors.black87, size: 20),
      ),
      onSelected: (String value) {
        switch (value) {
          case 'back':
            goBack();
          case 'forward':
            goForward();
          case 'reload':
            reload();
        }
      },
      itemBuilder: (BuildContext context) => <PopupMenuEntry<String>>[
        const PopupMenuItem<String>(
          value: 'back',
          child: ListTile(
              leading: Icon(Icons.arrow_back), title: Text('Precedent')),
        ),
        const PopupMenuItem<String>(
          value: 'forward',
          child: ListTile(
              leading: Icon(Icons.arrow_forward), title: Text('Suivant')),
        ),
        const PopupMenuItem<String>(
          value: 'reload',
          child:
              ListTile(leading: Icon(Icons.refresh), title: Text('Recharger')),
        ),
      ],
    );
  }
}
