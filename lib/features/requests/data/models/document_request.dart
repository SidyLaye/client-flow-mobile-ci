import 'package:equatable/equatable.dart';

/// Row of the `document_requests` table.
class DocumentRequest extends Equatable {
  const DocumentRequest({
    required this.id,
    required this.title,
    required this.status,
    this.description,
    this.requestedType,
    this.dueDate,
    this.priority,
    this.createdAt,
  });

  final String id;
  final String title;
  final String? description;
  final String? requestedType;

  /// ISO date (`YYYY-MM-DD`) as stored; displayed verbatim like before.
  final String? dueDate;
  final String? priority;
  final String status;
  final DateTime? createdAt;

  factory DocumentRequest.fromJson(Map<String, dynamic> json) =>
      DocumentRequest(
        id: json['id'] as String,
        title: (json['title'] as String?) ?? '',
        description: json['description'] as String?,
        requestedType: json['requested_type'] as String?,
        dueDate: json['due_date'] as String?,
        priority: json['priority'] as String?,
        status: (json['status'] as String?) ?? '',
        createdAt: json['created_at'] == null
            ? null
            : DateTime.tryParse(json['created_at'] as String),
      );

  @override
  List<Object?> get props => [
        id,
        title,
        description,
        requestedType,
        dueDate,
        priority,
        status,
        createdAt,
      ];
}

abstract final class RequestStatus {
  static const labels = <String, String>{
    'draft': 'Brouillon',
    'sent': 'À traiter',
    'seen': 'Vu',
    'partially_completed': 'Partiel',
    'completed': 'Terminé',
    'overdue': 'En retard',
    'cancelled': 'Annulé',
  };

  static String label(String status) => labels[status] ?? status;
}
