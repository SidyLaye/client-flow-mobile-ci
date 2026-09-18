import 'package:client_flow_mobile/core/utils/formatters.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('formatPeriod', () {
    test('returns null when both parts are missing', () {
      expect(formatPeriod(null, null), isNull);
    });
    test('zero-pads the month', () {
      expect(formatPeriod(3, 2026), '03/2026');
    });
    test('falls back to whichever part exists', () {
      expect(formatPeriod(null, 2026), '2026');
      expect(formatPeriod(7, null), '7');
    });
  });

  group('safeFileBase', () {
    test('replaces runs of unsafe chars with a single underscore', () {
      expect(safeFileBase('Facture mars / avril'), 'Facture_mars_avril');
    });
    test('caps at 60 chars and defaults to "document"', () {
      expect(safeFileBase('a' * 100).length, 60);
      expect(safeFileBase('///'), '_');
      expect(safeFileBase(''), 'document');
    });
  });

  test('formatKb', () {
    expect(formatKb(null), '—');
    expect(formatKb(0), '—');
    expect(formatKb(1536), '1.5 ko');
  });

  test('pluralPages', () {
    expect(pluralPages(1), '1 page');
    expect(pluralPages(3), '3 pages');
  });
}
