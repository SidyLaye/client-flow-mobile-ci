import 'package:equatable/equatable.dart';

/// Row of the `documents` table (client-visible subset).
class Document extends Equatable {
  const Document({
    required this.id,
    required this.fileName,
    required this.status,
    this.originalFileName,
    this.storagePath,
    this.mimeType,
    this.sizeBytes,
    this.category,
    this.periodMonth,
    this.periodYear,
    this.internalComment,
    this.clientComment,
    this.createdAt,
  });

  final String id;
  final String fileName;
  final String? originalFileName;
  final String? storagePath;
  final String? mimeType;
  final int? sizeBytes;
  final String? category;
  final String status;
  final int? periodMonth;
  final int? periodYear;
  final String? internalComment;
  final String? clientComment;
  final DateTime? createdAt;

  String get displayName => originalFileName ?? fileName;

  factory Document.fromJson(Map<String, dynamic> json) => Document(
        id: json['id'] as String,
        fileName: (json['file_name'] as String?) ?? '',
        originalFileName: json['original_file_name'] as String?,
        storagePath: json['storage_path'] as String?,
        mimeType: json['mime_type'] as String?,
        sizeBytes: (json['size_bytes'] as num?)?.toInt(),
        category: json['category'] as String?,
        status: (json['status'] as String?) ?? '',
        periodMonth: (json['period_month'] as num?)?.toInt(),
        periodYear: (json['period_year'] as num?)?.toInt(),
        internalComment: json['internal_comment'] as String?,
        clientComment: json['client_comment'] as String?,
        createdAt: json['created_at'] == null
            ? null
            : DateTime.tryParse(json['created_at'] as String),
      );

  @override
  List<Object?> get props => [
        id,
        fileName,
        originalFileName,
        storagePath,
        mimeType,
        sizeBytes,
        category,
        status,
        periodMonth,
        periodYear,
        internalComment,
        clientComment,
        createdAt,
      ];
}

/// French labels / tints for document statuses.
abstract final class DocumentStatus {
  static const labels = <String, String>{
    'received': 'Reçu',
    'under_review': 'En revue',
    'validated': 'Validé',
    'rejected': 'Rejeté',
    'incomplete': 'Incomplet',
    'archived': 'Archivé',
  };

  static String label(String status) => labels[status] ?? status;
}
