import 'package:equatable/equatable.dart';

/// A document visible to the client (`/api/v1/client-portal/documents/`).
/// The cabinet's internal comment is never sent to the app.
class Document extends Equatable {
  const Document({
    required this.id,
    required this.fileName,
    required this.status,
    this.originalFileName,
    this.downloadUrl,
    this.mimeType,
    this.sizeBytes,
    this.category,
    this.categoryLabel,
    this.periodMonth,
    this.periodYear,
    this.clientComment,
    this.requestId,
    this.createdAt,
  });

  final String id;
  final String fileName;
  final String? originalFileName;

  /// API path of the authenticated download (null when no file).
  final String? downloadUrl;
  final String? mimeType;
  final int? sizeBytes;

  /// Category code (`bank_statement`, `purchase_invoice`…).
  final String? category;

  /// French label of [category], from the server.
  final String? categoryLabel;
  final String status;
  final int? periodMonth;
  final int? periodYear;
  final String? clientComment;
  final String? requestId;
  final DateTime? createdAt;

  String get displayName => originalFileName ?? fileName;

  /// Label to show for the category (falls back to the code).
  String? get categoryDisplay => categoryLabel ?? DocumentCategory.label(category);

  factory Document.fromJson(Map<String, dynamic> json) => Document(
        id: json['id'] as String,
        fileName: (json['file_name'] as String?) ?? '',
        originalFileName: (json['display_name'] as String?) ??
            (json['original_file_name'] as String?),
        downloadUrl: json['download_url'] as String?,
        mimeType: json['mime_type'] as String?,
        sizeBytes: (json['size_bytes'] as num?)?.toInt(),
        category: json['category'] as String?,
        categoryLabel: json['category_label'] as String?,
        status: (json['status'] as String?) ?? '',
        periodMonth: (json['period_month'] as num?)?.toInt(),
        periodYear: (json['period_year'] as num?)?.toInt(),
        clientComment: json['client_comment'] as String?,
        requestId: json['document_request']?.toString(),
        createdAt: json['created_at'] == null
            ? null
            : DateTime.tryParse(json['created_at'] as String),
      );

  @override
  List<Object?> get props => [
        id,
        fileName,
        originalFileName,
        downloadUrl,
        mimeType,
        sizeBytes,
        category,
        categoryLabel,
        status,
        periodMonth,
        periodYear,
        clientComment,
        requestId,
        createdAt,
      ];
}

/// French labels for document statuses.
abstract final class DocumentStatus {
  static const labels = <String, String>{
    'received': 'Reçu',
    'under_review': 'En revue',
    'validated': 'Validé',
    'rejected': 'Refusé',
    'incomplete': 'Incomplet',
    'archived': 'Archivé',
  };

  static String label(String status) => labels[status] ?? status;
}

/// Document categories shared with the cabinet (same codes as the backend).
abstract final class DocumentCategory {
  static const labels = <String, String>{
    'purchase_invoice': "Facture d'achat",
    'sales_invoice': 'Facture de vente',
    'bank_statement': 'Relevé bancaire',
    'contract': 'Contrat',
    'id_document': "Pièce d'identité",
    'rib': 'RIB',
    'tax_document': 'Document fiscal',
    'other': 'Autre',
  };

  static const defaultCode = 'other';

  static String? label(String? code) => code == null ? null : (labels[code] ?? code);

  /// Code for a label or a code; unknown values become `other`.
  static String codeFor(String value) {
    if (labels.containsKey(value)) return value;
    for (final e in labels.entries) {
      if (e.value == value) return e.key;
    }
    // Labels used by earlier app versions.
    switch (value) {
      case 'Facture':
      case 'Note de frais':
        return 'purchase_invoice';
      case 'Relevé bancaire':
        return 'bank_statement';
      case 'Contrat':
        return 'contract';
    }
    return defaultCode;
  }
}
