import 'package:intl/intl.dart';

/// `MM/YYYY`, or whichever half is available, or `null` when both are absent.
String? formatPeriod(int? month, int? year) {
  if (month == null && year == null) return null;
  if (month != null && year != null) {
    return '${month.toString().padLeft(2, '0')}/$year';
  }
  return (year ?? month).toString();
}

/// `HH:mm` in local time (mirrors `toLocaleTimeString().slice(0, 5)`).
String formatTime(DateTime? dt) {
  if (dt == null) return '';
  return DateFormat.Hm().format(dt.toLocal());
}

/// Human-readable size in kilobytes, one decimal.
String formatKb(int? bytes) =>
    bytes == null || bytes == 0 ? '—' : '${(bytes / 1024).toStringAsFixed(1)} ko';

/// Strips anything that is not `[a-zA-Z0-9-_]` and caps at 60 chars, the same
/// rule the backend-facing file names used before.
String safeFileBase(String raw) {
  final cleaned = raw.replaceAll(RegExp(r'[^a-zA-Z0-9\-_]+'), '_');
  final capped = cleaned.length > 60 ? cleaned.substring(0, 60) : cleaned;
  return capped.isEmpty ? 'document' : capped;
}

String pluralPages(int n) => '$n page${n > 1 ? 's' : ''}';
