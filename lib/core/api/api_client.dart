import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart' show MediaType;

import 'token_store.dart';

/// Error raised by [ApiClient]. [message] is always user-presentable (French).
class ApiException implements Exception {
  const ApiException(this.message, {this.statusCode, this.data});

  final String message;
  final int? statusCode;
  final Object? data;

  bool get isUnauthorized => statusCode == 401;
  bool get isNetwork => statusCode == null;

  @override
  String toString() => message;
}

/// HTTP client for the A2T Expertise (Django REST) backend.
///
/// - Sends `Authorization: Bearer <access>` on every call.
/// - On a 401, refreshes the access token once (single flight shared by
///   concurrent calls) and retries; if the refresh fails the session is
///   cleared and [onSessionExpired] fires so the app returns to login.
/// - Maps network failures and DRF error bodies to [ApiException]s with a
///   readable French message.
class ApiClient {
  ApiClient({
    required String baseUrl,
    required TokenStore tokenStore,
    http.Client? httpClient,
  })  : _base = baseUrl.endsWith('/')
            ? baseUrl.substring(0, baseUrl.length - 1)
            : baseUrl,
        _tokens = tokenStore,
        _http = httpClient ?? http.Client();

  final String _base;
  final TokenStore _tokens;
  final http.Client _http;

  static const _timeout = Duration(seconds: 20);
  static const _uploadTimeout = Duration(minutes: 3);

  final _sessionExpired = StreamController<void>.broadcast();
  Future<bool>? _refreshing;

  /// Fires when the refresh token is no longer accepted (expired, revoked,
  /// account suspended by the cabinet…).
  Stream<void> get onSessionExpired => _sessionExpired.stream;

  TokenStore get tokens => _tokens;

  Uri uri(String path, [Map<String, String>? query]) {
    final p = path.startsWith('/') ? path : '/$path';
    final u = Uri.parse('$_base$p');
    if (query == null || query.isEmpty) return u;
    return u.replace(queryParameters: {...u.queryParameters, ...query});
  }

  // ─── auth ────────────────────────────────────────────────────────────────

  /// Exchanges credentials for a JWT pair and stores it.
  Future<void> login(String email, String password) async {
    final res = await _guard(
      () => _http
          .post(
            uri('/api/v1/auth/login/'),
            headers: _jsonHeaders(),
            body: jsonEncode({'email': email.trim(), 'password': password}),
          )
          .timeout(_timeout),
    );
    if (res.statusCode == 401 || res.statusCode == 400) {
      throw const ApiException('Email ou mot de passe incorrect.', statusCode: 401);
    }
    final data = _decodeOrThrow(res) as Map<String, dynamic>;
    await _tokens.save(
      access: data['access'] as String,
      refresh: data['refresh'] as String,
    );
  }

  /// Revokes the refresh token server-side (best effort) and clears storage.
  Future<void> logout() async {
    final refresh = await _tokens.refresh;
    if (refresh != null) {
      try {
        await _send(
          () async => _http.post(
            uri('/api/v1/auth/logout/'),
            headers: await _authHeaders(json: true),
            body: jsonEncode({'refresh': refresh}),
          ),
          retryOnUnauthorized: false,
        );
      } catch (e) {
        debugPrint('[api] logout call failed (ignored) $e');
      }
    }
    await _tokens.clear();
  }

  Future<bool> hasSession() async => (await _tokens.refresh) != null;

  // ─── verbs ───────────────────────────────────────────────────────────────

  Future<dynamic> get(String path, {Map<String, String>? query}) async {
    final res = await _send(
      () async => _http.get(uri(path, query), headers: await _authHeaders()),
    );
    return _decodeOrThrow(res);
  }

  Future<dynamic> post(String path, {Object? body}) async {
    final res = await _send(
      () async => _http.post(
        uri(path),
        headers: await _authHeaders(json: true),
        body: jsonEncode(body ?? const <String, dynamic>{}),
      ),
    );
    return _decodeOrThrow(res);
  }

  Future<dynamic> delete(String path, {Object? body}) async {
    final res = await _send(
      () async => _http.delete(
        uri(path),
        headers: await _authHeaders(json: true),
        body: body == null ? null : jsonEncode(body),
      ),
    );
    return _decodeOrThrow(res);
  }

  /// Multipart upload of one file plus text fields.
  Future<dynamic> postFile(
    String path, {
    required String fileField,
    required String filePath,
    required String filename,
    required String contentType,
    Map<String, String> fields = const {},
  }) async {
    final res = await _send(
      () async {
        final req = http.MultipartRequest('POST', uri(path))
          ..headers.addAll(await _authHeaders())
          ..fields.addAll(fields)
          ..files.add(await http.MultipartFile.fromPath(
            fileField,
            filePath,
            filename: filename,
            contentType: _mediaType(contentType),
          ));
        return http.Response.fromStream(await _http.send(req));
      },
      timeout: _uploadTimeout,
    );
    return _decodeOrThrow(res);
  }

  /// Downloads a protected file (JWT required).
  Future<List<int>> getBytes(String path) async {
    final res = await _send(
      () async => _http.get(uri(path), headers: await _authHeaders()),
      timeout: _uploadTimeout,
    );
    if (res.statusCode >= 200 && res.statusCode < 300) return res.bodyBytes;
    throw _errorFrom(res);
  }

  // ─── internals ───────────────────────────────────────────────────────────

  Map<String, String> _jsonHeaders() => const {
        HttpHeaders.acceptHeader: 'application/json',
        HttpHeaders.contentTypeHeader: 'application/json; charset=utf-8',
      };

  Future<Map<String, String>> _authHeaders({bool json = false}) async {
    final access = await _tokens.access;
    return {
      HttpHeaders.acceptHeader: 'application/json',
      if (json) HttpHeaders.contentTypeHeader: 'application/json; charset=utf-8',
      if (access != null) HttpHeaders.authorizationHeader: 'Bearer $access',
    };
  }

  Future<http.Response> _send(
    Future<http.Response> Function() request, {
    bool retryOnUnauthorized = true,
    Duration timeout = _timeout,
  }) async {
    var res = await _guard(() => request().timeout(timeout));
    if (res.statusCode == 401 && retryOnUnauthorized) {
      final refreshed = await _refreshAccess();
      if (!refreshed) {
        throw const ApiException(
          'Votre session a expiré. Reconnectez-vous.',
          statusCode: 401,
        );
      }
      res = await _guard(() => request().timeout(timeout));
    }
    return res;
  }

  /// One refresh at a time; concurrent 401s wait for the same result.
  Future<bool> _refreshAccess() {
    return _refreshing ??= _doRefresh().whenComplete(() => _refreshing = null);
  }

  Future<bool> _doRefresh() async {
    final refresh = await _tokens.refresh;
    if (refresh == null) return false;
    try {
      final res = await _http
          .post(
            uri('/api/v1/auth/token/refresh/'),
            headers: _jsonHeaders(),
            body: jsonEncode({'refresh': refresh}),
          )
          .timeout(_timeout);
      if (res.statusCode == 200) {
        final data = jsonDecode(utf8.decode(res.bodyBytes)) as Map<String, dynamic>;
        await _tokens.save(
          access: data['access'] as String,
          // ROTATE_REFRESH_TOKENS=True: a new refresh token comes back.
          refresh: (data['refresh'] as String?) ?? refresh,
        );
        return true;
      }
      if (res.statusCode == 401 || res.statusCode == 400) {
        await _tokens.clear();
        _sessionExpired.add(null);
      }
      return false;
    } catch (e) {
      // Offline / TLS / malformed answer: keep the session, the call fails
      // normally and will be retried later.
      debugPrint('[api] token refresh failed $e');
      return false;
    }
  }

  Future<http.Response> _guard(Future<http.Response> Function() call) async {
    try {
      return await call();
    } on TimeoutException {
      throw const ApiException('Le serveur ne répond pas. Réessayez dans un instant.');
    } on SocketException {
      throw const ApiException('Pas de connexion internet.');
    } on http.ClientException {
      throw const ApiException('Connexion au serveur impossible.');
    } on HandshakeException {
      throw const ApiException('Connexion sécurisée impossible.');
    }
  }

  dynamic _decodeOrThrow(http.Response res) {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      if (res.statusCode == 204 || res.bodyBytes.isEmpty) return null;
      return jsonDecode(utf8.decode(res.bodyBytes));
    }
    throw _errorFrom(res);
  }

  ApiException _errorFrom(http.Response res) {
    Object? data;
    try {
      data = jsonDecode(utf8.decode(res.bodyBytes));
    } catch (_) {}
    return ApiException(
      _messageFor(res.statusCode, data),
      statusCode: res.statusCode,
      data: data,
    );
  }

  static String _messageFor(int status, Object? data) {
    final fromBody = _firstMessage(data);
    switch (status) {
      case 401:
        return 'Votre session a expiré. Reconnectez-vous.';
      case 403:
        return fromBody ?? "Vous n'avez pas accès à cette ressource.";
      case 404:
        return fromBody ?? 'Élément introuvable.';
      case 413:
        return 'Fichier trop volumineux.';
      case 429:
        return 'Trop de tentatives. Patientez une minute.';
    }
    if (status >= 500) return 'Le serveur rencontre un problème. Réessayez plus tard.';
    return fromBody ?? 'Requête refusée ($status).';
  }

  /// First readable message of a DRF error body ({detail} or {field: [msg]}).
  static String? _firstMessage(Object? data) {
    if (data is Map) {
      final detail = data['detail'];
      if (detail is String && detail.isNotEmpty) return detail;
      for (final entry in data.entries) {
        if (entry.key == 'status_code') continue;
        final v = entry.value;
        if (v is String && v.isNotEmpty) return v;
        if (v is List && v.isNotEmpty && v.first is String) return v.first as String;
      }
    }
    if (data is List && data.isNotEmpty && data.first is String) {
      return data.first as String;
    }
    return null;
  }

  static MediaType? _mediaType(String contentType) {
    try {
      return MediaType.parse(contentType);
    } catch (_) {
      return null;
    }
  }

  void dispose() {
    _sessionExpired.close();
    _http.close();
  }
}
