import 'package:bloc_test/bloc_test.dart';
import 'package:client_flow_mobile/features/upload/bloc/upload_bloc.dart';
import 'package:client_flow_mobile/features/upload/data/upload_repository.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

class _MockUploadRepository extends Mock implements UploadRepository {}

void main() {
  late _MockUploadRepository repo;

  setUp(() => repo = _MockUploadRepository());

  UploadBloc build({String? requestId}) => UploadBloc(
        repository: repo,
        clientId: 'client-1',
        userId: 'user-1',
        pageUris: const ['/tmp/1.jpg', '/tmp/2.jpg'],
        requestId: requestId,
      );

  blocTest<UploadBloc, UploadState>(
    'rejects an empty title without touching the repository',
    build: build,
    act: (b) => b.add(
      const UploadSubmitted(title: '   ', category: 'Autre', comment: ''),
    ),
    expect: () => [
      isA<UploadState>()
          .having((s) => s.status, 'status', UploadStatus.failure)
          .having((s) => s.error, 'error', contains('Titre requis')),
    ],
    verify: (_) => verifyNever(
      () => repo.submit(
        clientId: any(named: 'clientId'),
        userId: any(named: 'userId'),
        pageUris: any(named: 'pageUris'),
        title: any(named: 'title'),
        category: any(named: 'category'),
        comment: any(named: 'comment'),
        requestId: any(named: 'requestId'),
      ),
    ),
  );

  blocTest<UploadBloc, UploadState>(
    'submits with the request id and reports success',
    build: () {
      when(
        () => repo.submit(
          clientId: 'client-1',
          userId: 'user-1',
          pageUris: const ['/tmp/1.jpg', '/tmp/2.jpg'],
          title: 'Facture mars',
          category: 'Facture',
          comment: 'RAS',
          requestId: 'req-9',
        ),
      ).thenAnswer(
        (_) async => const UploadResult(
          fileName: 'Facture_mars_1.pdf',
          savedPath: '/docs/scans/Facture_mars_1.pdf',
        ),
      );
      return build(requestId: 'req-9');
    },
    act: (b) => b.add(
      const UploadSubmitted(
        title: 'Facture mars',
        category: 'Facture',
        comment: 'RAS',
      ),
    ),
    expect: () => [
      const UploadState(status: UploadStatus.submitting),
      const UploadState(
        status: UploadStatus.success,
        savedPath: '/docs/scans/Facture_mars_1.pdf',
      ),
    ],
  );

  blocTest<UploadBloc, UploadState>(
    'surfaces repository failures and can be reset',
    build: () {
      when(
        () => repo.submit(
          clientId: any(named: 'clientId'),
          userId: any(named: 'userId'),
          pageUris: any(named: 'pageUris'),
          title: any(named: 'title'),
          category: any(named: 'category'),
          comment: any(named: 'comment'),
          requestId: any(named: 'requestId'),
        ),
      ).thenThrow(Exception('bucket unavailable'));
      return build();
    },
    act: (b) => b
      ..add(const UploadSubmitted(title: 'Doc', category: 'Autre', comment: ''))
      ..add(const UploadErrorConsumed()),
    expect: () => [
      const UploadState(status: UploadStatus.submitting),
      isA<UploadState>()
          .having((s) => s.status, 'status', UploadStatus.failure)
          .having((s) => s.error, 'error', contains('bucket unavailable')),
      const UploadState(),
    ],
  );

  test('isSinglePdf only matches a lone .pdf path', () {
    expect(UploadRepository.isSinglePdf(const ['/a/b.PDF']), isTrue);
    expect(UploadRepository.isSinglePdf(const ['/a/b.jpg']), isFalse);
    expect(UploadRepository.isSinglePdf(const ['/a.pdf', '/b.pdf']), isFalse);
  });
}
