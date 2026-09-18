import 'package:bloc_test/bloc_test.dart';
import 'package:client_flow_mobile/features/scan/bloc/scan_bloc.dart';
import 'package:client_flow_mobile/features/scan/data/scan_service.dart';
import 'package:cunning_document_scanner/cunning_document_scanner.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

class _MockScanService extends Mock implements ScanService {}

void main() {
  late _MockScanService service;

  setUp(() => service = _MockScanService());

  ScanBloc build() => ScanBloc(service: service);

  group('ScanLaunchRequested', () {
    blocTest<ScanBloc, ScanState>(
      'appends scanned pages',
      build: () {
        when(() => service.scanDocuments())
            .thenAnswer((_) async => ['/tmp/a.jpg', '/tmp/b.jpg']);
        return build();
      },
      act: (b) => b.add(const ScanLaunchRequested()),
      expect: () => [
        const ScanState(busy: true),
        const ScanState(pages: ['/tmp/a.jpg', '/tmp/b.jpg']),
      ],
    );

    blocTest<ScanBloc, ScanState>(
      'keeps existing pages when the user cancels',
      build: () {
        when(() => service.scanDocuments()).thenAnswer((_) async => null);
        return build();
      },
      seed: () => const ScanState(pages: ['/tmp/a.jpg']),
      act: (b) => b.add(const ScanLaunchRequested()),
      expect: () => [
        const ScanState(pages: ['/tmp/a.jpg'], busy: true),
        const ScanState(pages: ['/tmp/a.jpg']),
      ],
    );

    blocTest<ScanBloc, ScanState>(
      'maps permission_denied to a camera-permission message',
      build: () {
        when(() => service.scanDocuments()).thenThrow(
          const CunningDocumentScannerException(
            'denied',
            code: 'permission_denied',
          ),
        );
        return build();
      },
      act: (b) => b.add(const ScanLaunchRequested()),
      expect: () => [
        const ScanState(busy: true),
        isA<ScanState>()
            .having((s) => s.busy, 'busy', false)
            .having((s) => s.error?.title, 'error.title', 'Erreur scanner')
            .having((s) => s.error?.message, 'error.message',
                contains('appareil photo')),
      ],
    );

    blocTest<ScanBloc, ScanState>(
      'ignores a launch while already busy',
      build: build,
      seed: () => const ScanState(busy: true),
      act: (b) => b.add(const ScanLaunchRequested()),
      expect: () => const <ScanState>[],
      verify: (_) => verifyNever(() => service.scanDocuments()),
    );
  });

  group('ScanFilePickRequested', () {
    blocTest<ScanBloc, ScanState>(
      'a picked PDF is exposed as a one-shot hand-off',
      build: () {
        when(() => service.pickFile()).thenAnswer(
          (_) async => const PickedPdf('/tmp/facture.pdf', name: 'facture'),
        );
        return build();
      },
      act: (b) => b.add(const ScanFilePickRequested()),
      expect: () => [
        const ScanState(busy: true),
        const ScanState(
          pickedPdf: PickedPdf('/tmp/facture.pdf', name: 'facture'),
        ),
      ],
    );

    blocTest<ScanBloc, ScanState>(
      'a picked image is appended as a page',
      build: () {
        when(() => service.pickFile())
            .thenAnswer((_) async => const PickedImage('/tmp/x.png'));
        return build();
      },
      act: (b) => b.add(const ScanFilePickRequested()),
      expect: () => [
        const ScanState(busy: true),
        const ScanState(pages: ['/tmp/x.png']),
      ],
    );
  });

  blocTest<ScanBloc, ScanState>(
    'ScanPageRemoved drops the page at index and ignores bad indexes',
    build: build,
    seed: () => const ScanState(pages: ['a', 'b', 'c']),
    act: (b) => b
      ..add(const ScanPageRemoved(1))
      ..add(const ScanPageRemoved(10)),
    expect: () => [
      const ScanState(pages: ['a', 'c']),
    ],
  );

  blocTest<ScanBloc, ScanState>(
    'ScanEffectConsumed clears one-shot error and pdf',
    build: build,
    seed: () => const ScanState(
      error: ScanError(title: 't', message: 'm'),
      pickedPdf: PickedPdf('/p.pdf', name: 'p'),
    ),
    act: (b) => b.add(const ScanEffectConsumed()),
    expect: () => [const ScanState()],
  );
}
