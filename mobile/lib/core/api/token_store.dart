import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Where the JWT pair lives. Abstract so tests use [MemoryTokenStore].
abstract class TokenStore {
  Future<String?> get access;
  Future<String?> get refresh;
  Future<void> save({required String access, required String refresh});

  /// Last known identity (JSON of /client-portal/me/) so the app opens
  /// offline without asking for the password again.
  Future<String?> get profile;
  Future<void> saveProfile(String json);

  /// Forgets tokens and profile.
  Future<void> clear();
}

/// Tokens in the OS keychain (iOS) / keystore-backed storage (Android),
/// cached in memory to avoid a platform call on every request.
class SecureTokenStore implements TokenStore {
  SecureTokenStore([FlutterSecureStorage? storage])
      : _storage = storage ?? const FlutterSecureStorage();

  final FlutterSecureStorage _storage;

  static const _accessKey = 'a2t.access';
  static const _refreshKey = 'a2t.refresh';
  static const _profileKey = 'a2t.profile';

  bool _loaded = false;
  String? _access;
  String? _refresh;
  String? _profile;

  Future<void> _load() async {
    if (_loaded) return;
    try {
      _access = await _storage.read(key: _accessKey);
      _refresh = await _storage.read(key: _refreshKey);
      _profile = await _storage.read(key: _profileKey);
    } catch (_) {
      // Corrupted keystore (e.g. after a backup restore): start signed out.
      _access = null;
      _refresh = null;
      _profile = null;
    }
    _loaded = true;
  }

  @override
  Future<String?> get profile async {
    await _load();
    return _profile;
  }

  @override
  Future<void> saveProfile(String json) async {
    _profile = json;
    try {
      await _storage.write(key: _profileKey, value: json);
    } catch (_) {}
  }

  @override
  Future<String?> get access async {
    await _load();
    return _access;
  }

  @override
  Future<String?> get refresh async {
    await _load();
    return _refresh;
  }

  @override
  Future<void> save({required String access, required String refresh}) async {
    _access = access;
    _refresh = refresh;
    _loaded = true;
    await _storage.write(key: _accessKey, value: access);
    await _storage.write(key: _refreshKey, value: refresh);
  }

  @override
  Future<void> clear() async {
    _access = null;
    _refresh = null;
    _profile = null;
    _loaded = true;
    try {
      await _storage.delete(key: _accessKey);
      await _storage.delete(key: _refreshKey);
      await _storage.delete(key: _profileKey);
    } catch (_) {}
  }
}

class MemoryTokenStore implements TokenStore {
  String? _access;
  String? _refresh;
  String? _profile;

  @override
  Future<String?> get profile async => _profile;

  @override
  Future<void> saveProfile(String json) async {
    _profile = json;
  }

  @override
  Future<String?> get access async => _access;

  @override
  Future<String?> get refresh async => _refresh;

  @override
  Future<void> save({required String access, required String refresh}) async {
    _access = access;
    _refresh = refresh;
  }

  @override
  Future<void> clear() async {
    _access = null;
    _refresh = null;
    _profile = null;
  }
}
