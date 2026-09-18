part of 'scan_bloc.dart';

sealed class ScanEvent extends Equatable {
  const ScanEvent();

  @override
  List<Object?> get props => [];
}

/// Open the native scanner (auto-fired once on screen mount).
final class ScanLaunchRequested extends ScanEvent {
  const ScanLaunchRequested();
}

final class ScanLibraryPickRequested extends ScanEvent {
  const ScanLibraryPickRequested();
}

final class ScanFilePickRequested extends ScanEvent {
  const ScanFilePickRequested();
}

final class ScanPageRemoved extends ScanEvent {
  const ScanPageRemoved(this.index);

  final int index;

  @override
  List<Object?> get props => [index];
}

/// Acknowledge a one-shot side effect (error alert / PDF hand-off) so it is
/// not replayed.
final class ScanEffectConsumed extends ScanEvent {
  const ScanEffectConsumed();
}
