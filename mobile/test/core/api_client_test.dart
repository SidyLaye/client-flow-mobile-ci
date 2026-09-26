import 'dart:convert';

import 'package:client_flow_mobile/core/api/api_client.dart';
import 'package:client_flow_mobile/core/api/token_store.dart';
import 'package:client_flow_mobile/features/documents/data/models/document.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

http.Response _json(Object body, [int status = 200]) => http.Response(
      jsonEncode(body),
      status,
      headers: {'content-type': 'application/json'},
    );

void main() {
  late MemoryTokenStore tokens;

  setUp(() => tokens = MemoryTokenStore());

  ApiClient client(MockClientHandler handler) => ApiClient(
        baseUrl: 'https://api.test/',
        tokenStore: tokens,
        httpClient: MockClient(handler),
      );

  test('login stores the JWT pair and sends it afterwards', () async {
    final api = client((req) async {
      if (req.url.path == '/api/v1/auth/login/') {
        expect(jsonDecode(req.body), {'email': 'a@b.fr', 'password': 'pw'});
        return _json({'access': 'A1', 'refresh': 'R1'});
      }
      expect(req.headers['authorization'], 'Bearer A1');
      return _json({'ok': true});
    });

    await api.login(' a@b.fr ', 'pw');
    expect(await tokens.refresh, 'R1');
    expect(await api.get('/api/v1/client-portal/me/'), {'ok': true});
  });

  test('bad credentials give a French message', () async {
    final api = client((_) async => _json({'detail': 'No active account'}, 401));
    expect(
      () => api.login('a@b.fr', 'bad'),
      throwsA(isA<ApiException>()
          .having((e) => e.message, 'message', 'Email ou mot de passe incorrect.')),
    );
  });

  test('a 401 refreshes once (rotating the refresh token) and retries', () async {
    await tokens.save(access: 'OLD', refresh: 'R1');
    var refreshCalls = 0;
    final api = client((req) async {
      if (req.url.path == '/api/v1/auth/token/refresh/') {
        refreshCalls++;
        expect(jsonDecode(req.body), {'refresh': 'R1'});
        return _json({'access': 'NEW', 'refresh': 'R2'});
      }
      return req.headers['authorization'] == 'Bearer NEW'
          ? _json({'n': 1})
          : _json({'detail': 'expired'}, 401);
    });

    // Two concurrent calls share a single refresh.
    final results = await Future.wait([
      api.get('/api/v1/client-portal/summary/'),
      api.get('/api/v1/client-portal/summary/'),
    ]);
    expect(results, [
      {'n': 1},
      {'n': 1},
    ]);
    expect(refreshCalls, 1);
    expect(await tokens.access, 'NEW');
    expect(await tokens.refresh, 'R2');
  });

  test('a refused refresh clears the session and signals expiry', () async {
    await tokens.save(access: 'OLD', refresh: 'REVOKED');
    final api = client((req) async => req.url.path == '/api/v1/auth/token/refresh/'
        ? _json({'detail': 'Token is blacklisted'}, 401)
        : _json({'detail': 'expired'}, 401));

    var expired = 0;
    api.onSessionExpired.listen((_) => expired++);

    await expectLater(
      api.get('/api/v1/client-portal/me/'),
      throwsA(isA<ApiException>().having((e) => e.statusCode, 'status', 401)),
    );
    await Future<void>.delayed(Duration.zero);
    expect(expired, 1);
    expect(await tokens.refresh, isNull);
  });

  test('DRF validation errors surface the first field message', () async {
    await tokens.save(access: 'A', refresh: 'R');
    final api = client((_) async => _json({
          'document_request': ['Objet invalide.'],
          'status_code': 400,
        }, 400));
    expect(
      () => api.post('/api/v1/client-portal/messages/', body: {'body': 'x'}),
      throwsA(isA<ApiException>().having((e) => e.message, 'message', 'Objet invalide.')),
    );
  });

  test('network failures become readable errors', () async {
    final api = client((_) async => throw http.ClientException('boom'));
    expect(
      () => api.get('/x/'),
      throwsA(isA<ApiException>().having((e) => e.isNetwork, 'isNetwork', true)),
    );
  });

  group('DocumentCategory', () {
    test('maps labels, codes and legacy labels to backend codes', () {
      expect(DocumentCategory.codeFor('Relevé bancaire'), 'bank_statement');
      expect(DocumentCategory.codeFor('rib'), 'rib');
      expect(DocumentCategory.codeFor('Facture'), 'purchase_invoice');
      expect(DocumentCategory.codeFor('Note de frais'), 'purchase_invoice');
      expect(DocumentCategory.codeFor('???'), 'other');
    });
  });
}
