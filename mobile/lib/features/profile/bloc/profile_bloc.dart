import 'dart:async';

import 'package:equatable/equatable.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../data/notifications_repository.dart';

part 'profile_event.dart';
part 'profile_state.dart';

class ProfileBloc extends Bloc<ProfileEvent, ProfileState> {
  ProfileBloc({
    required NotificationsRepository repository,
    required this._clientId,
    required this._userId,
  })  : _repo = repository,
        super(const ProfileState()) {
    on<ProfileStarted>(_onStarted);
    on<_NotificationReceived>(_onReceived);
    on<NotificationReadRequested>(_onReadRequested);
  }

  final NotificationsRepository _repo;
  final String _clientId;
  final String _userId;
  StreamSubscription<AppNotification>? _sub;

  Future<void> _onStarted(
    ProfileStarted event,
    Emitter<ProfileState> emit,
  ) async {
    emit(state.copyWith(status: ProfileStatus.loading));
    try {
      final results = await Future.wait([
        _repo.loadCompanyName(_clientId),
        _repo.listRecent(_userId),
      ]);
      emit(state.copyWith(
        status: ProfileStatus.success,
        companyName: results[0] as String,
        notifications: results[1] as List<AppNotification>,
      ));
    } catch (e) {
      debugPrint('[profile] load failed $e');
      emit(state.copyWith(status: ProfileStatus.failure));
    }

    await _sub?.cancel();
    _sub = _repo
        .watchInserts(_userId)
        .listen((n) => add(_NotificationReceived(n)));
  }

  void _onReceived(_NotificationReceived event, Emitter<ProfileState> emit) {
    if (state.notifications.any((n) => n.id == event.notification.id)) return;
    emit(state.copyWith(
      notifications: [event.notification, ...state.notifications],
    ));
  }

  Future<void> _onReadRequested(
    NotificationReadRequested event,
    Emitter<ProfileState> emit,
  ) async {
    emit(state.copyWith(
      notifications: [
        for (final n in state.notifications)
          n.id == event.id ? n.copyWith(isRead: true) : n,
      ],
    ));
    try {
      await _repo.markRead(event.id);
    } catch (e) {
      debugPrint('[profile] markRead failed $e');
    }
  }

  @override
  Future<void> close() async {
    await _sub?.cancel();
    return super.close();
  }
}
