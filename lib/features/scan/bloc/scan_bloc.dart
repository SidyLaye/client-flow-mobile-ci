import 'package:cunning_document_scanner/cunning_document_scanner.dart';
import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../data/scan_service.dart';

part 'scan_event.dart';
part 'scan_state.dart';

/// Collects pages (native scanner, gallery, file picker) before review.
class ScanBloc extends Bloc<ScanEvent, ScanState> {
  ScanBloc({required this._service}) : super(const ScanState()) {
    on<ScanLaunchRequested>(_onLaunch);
    on<ScanLibraryPickRequested>(_onLibraryPick);
    on<ScanFilePickRequested>(_onFilePick);
    on<ScanPageRemoved>(_onPageRemoved);
    on<ScanEffectConsumed>(_onEffectConsumed);
  }

  final ScanService _service;

  Future<void> _onLaunch(
    ScanLaunchRequested event,
    Emitter<ScanState> emit,
  ) async {
    if (state.busy) return;
    emit(state.copyWith(busy: true, error: () => null));
    try {
      final scanned = await _service.scanDocuments();
      emit(state.copyWith(
        busy: false,
        pages: scanned == null ? null : [...state.pages, ...scanned],
      ));
    } on CunningDocumentScannerException catch (e) {
      emit(state.copyWith(
        busy: false,
        error: () => ScanError(
          title: 'Erreur scanner',
          message: e.code == 'permission_denied'
              ? "Autorisez l'accès à l'appareil photo pour scanner vos documents."
              : e.message,
        ),
      ));
    } catch (e) {
      emit(state.copyWith(
        busy: false,
        error: () => ScanError(
          title: 'Scanner indisponible',
          message: 'Impossible de lancer le scanner. '
              'Utilisez « Galerie » ou « Fichier ». ($e)',
        ),
      ));
    }
  }

  Future<void> _onLibraryPick(
    ScanLibraryPickRequested event,
    Emitter<ScanState> emit,
  ) async {
    if (state.busy) return;
    emit(state.copyWith(busy: true, error: () => null));
    try {
      final picked = await _service.pickFromLibrary();
      emit(state.copyWith(busy: false, pages: [...state.pages, ...picked]));
    } catch (e) {
      emit(state.copyWith(
        busy: false,
        error: () => ScanError(title: 'Galerie', message: e.toString()),
      ));
    }
  }

  Future<void> _onFilePick(
    ScanFilePickRequested event,
    Emitter<ScanState> emit,
  ) async {
    if (state.busy) return;
    emit(state.copyWith(busy: true, error: () => null));
    try {
      final picked = await _service.pickFile();
      switch (picked) {
        case null:
          emit(state.copyWith(busy: false));
        case PickedPdf():
          emit(state.copyWith(busy: false, pickedPdf: () => picked));
        case PickedImage(:final path):
          emit(state.copyWith(busy: false, pages: [...state.pages, path]));
      }
    } catch (e) {
      emit(state.copyWith(
        busy: false,
        error: () => ScanError(title: 'Fichier', message: e.toString()),
      ));
    }
  }

  void _onPageRemoved(ScanPageRemoved event, Emitter<ScanState> emit) {
    if (event.index < 0 || event.index >= state.pages.length) return;
    final next = [...state.pages]..removeAt(event.index);
    emit(state.copyWith(pages: next));
  }

  void _onEffectConsumed(ScanEffectConsumed event, Emitter<ScanState> emit) {
    emit(state.copyWith(error: () => null, pickedPdf: () => null));
  }
}
