import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { Invoice } from "./mock-data";
import { mockClients } from "./mock-data";

// ── Helpers ──

/** Round to 2 decimals consistently */
const r2 = (n: number) => Math.round(n * 100) / 100;

const fmtNum = (n: number) =>
  new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(r2(n));

const fmtCur = (n: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(
    r2(n)
  );

const typeTitle: Record<string, string> = {
  facture: "FACTURE",
  devis: "DEVIS",
  avoir: "AVOIR",
};

// ── Company defaults (would come from settings) ──
const co = {
  name: "ComptaFlow",
  legalForm: "SAS au capital de 10 000 €",
  address: "123 Rue de la Comptabilité",
  zipCity: "75001 Paris",
  country: "France",
  phone: "01 23 45 67 89",
  email: "contact@comptaflow.fr",
  siren: "999 888 777",
  siret: "999 888 777 00011",
  vat: "FR12 999 888 777",
  iban: "FR76 3000 4000 0500 0000 1234 567",
  bic: "BNPAFRPP",
  bank: "BNP Paribas",
};

// ── Colour palette (single accent) ──
const C = {
  accent: [30, 64, 175] as [number, number, number],       // blue-800
  accentLight: [219, 234, 254] as [number, number, number], // blue-100
  text: [15, 23, 42] as [number, number, number],           // slate-900
  muted: [100, 116, 139] as [number, number, number],       // slate-500
  line: [226, 232, 240] as [number, number, number],        // slate-200
  bg: [248, 250, 252] as [number, number, number],          // slate-50
  white: [255, 255, 255] as [number, number, number],
  red: [220, 38, 38] as [number, number, number],
  green: [22, 163, 74] as [number, number, number],
};

// ── PDF builder ──

export function generateInvoicePdf(invoice: Invoice): void {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();   // 210
  const H = doc.internal.pageSize.getHeight();  // 297
  const ML = 18; // margin left
  const MR = 18;
  const CW = W - ML - MR; // content width

  let y = 0;

  // ────────────────────────────────
  // 1. HEADER BAR
  // ────────────────────────────────
  const headerH = 8;
  doc.setFillColor(...C.accent);
  doc.rect(0, 0, W, headerH, "F");

  y = headerH + 10;

  // ── Company info (left) ──
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...C.accent);
  doc.text(co.name, ML, y);

  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...C.muted);
  doc.text(co.address, ML, y);
  y += 3.5;
  doc.text(`${co.zipCity} — ${co.country}`, ML, y);
  y += 3.5;
  doc.text(`Tél : ${co.phone}  ·  ${co.email}`, ML, y);
  y += 3.5;
  doc.text(`SIRET : ${co.siret}  ·  TVA : ${co.vat}`, ML, y);
  y += 3.5;
  doc.text(co.legalForm, ML, y);

  // ── Doc type block (right) ──
  const titleY = headerH + 10;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(...C.accent);
  doc.text(typeTitle[invoice.type] || "FACTURE", W - MR, titleY, {
    align: "right",
  });

  doc.setFontSize(11);
  doc.setTextColor(...C.text);
  doc.text(`N° ${invoice.number}`, W - MR, titleY + 8, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...C.muted);
  doc.text(`Émise le : ${invoice.issueDate}`, W - MR, titleY + 14, {
    align: "right",
  });
  doc.text(`Échéance : ${invoice.dueDate}`, W - MR, titleY + 19, {
    align: "right",
  });

  // ────────────────────────────────
  // 2. CLIENT BLOCK
  // ────────────────────────────────
  y += 10;
  const client = mockClients.find((c) => c.id === invoice.clientId);

  // subtle box
  doc.setFillColor(...C.bg);
  doc.setDrawColor(...C.line);
  doc.roundedRect(ML, y, CW / 2 - 2, 30, 1.5, 1.5, "FD");

  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...C.muted);
  doc.text("FACTURÉ À", ML + 5, y + 5.5);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...C.text);
  doc.text(invoice.clientName, ML + 5, y + 11);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...C.muted);
  let cy = y + 16;
  if (client) {
    doc.text(
      `${client.contactFirstName} ${client.contactLastName}`,
      ML + 5,
      cy
    );
    cy += 3.5;
    doc.text(client.email, ML + 5, cy);
    cy += 3.5;
    doc.text(`SIRET : ${client.siret}`, ML + 5, cy);
  }

  // Linked invoice for avoir
  if (invoice.originalInvoiceId) {
    const rightX = ML + CW / 2 + 6;
    doc.setFillColor(254, 243, 199); // amber-100
    doc.setDrawColor(253, 224, 71);  // amber-300
    doc.roundedRect(rightX, y, CW / 2 - 2, 12, 1.5, 1.5, "FD");
    doc.setFontSize(8);
    doc.setTextColor(...C.text);
    doc.setFont("helvetica", "normal");
    doc.text(
      `Avoir lié à la facture d'origine (${invoice.originalInvoiceId})`,
      rightX + 4,
      y + 7
    );
  }

  y += 38;

  // ────────────────────────────────
  // 3. ITEMS TABLE
  // ────────────────────────────────
  const tableBody = invoice.items.map((item) => {
    const label = item.description
      ? `${item.label}\n${item.description}`
      : item.label;
    return [
      label,
      `${fmtNum(item.quantity)}`,
      item.unit,
      `${fmtCur(Math.abs(item.unitPriceHt))}`,
      item.discountPercent > 0 ? `${item.discountPercent} %` : "—",
      `${item.vatRate} %`,
      fmtCur(item.lineTotalHt),
    ];
  });

  autoTable(doc, {
    startY: y,
    margin: { left: ML, right: MR },
    head: [
      ["Désignation", "Qté", "Unité", "Prix unit. HT", "Remise", "TVA", "Total HT"],
    ],
    body: tableBody,
    styles: {
      fontSize: 8,
      cellPadding: { top: 3, bottom: 3, left: 3, right: 3 },
      textColor: C.text,
      lineColor: C.line,
      lineWidth: 0.2,
      font: "helvetica",
    },
    headStyles: {
      fillColor: C.accent,
      textColor: C.white,
      fontStyle: "bold",
      fontSize: 7.5,
      cellPadding: { top: 3.5, bottom: 3.5, left: 3, right: 3 },
    },
    alternateRowStyles: {
      fillColor: C.bg,
    },
    columnStyles: {
      0: { cellWidth: "auto", fontStyle: "normal" },
      1: { halign: "center", cellWidth: 16 },
      2: { halign: "center", cellWidth: 18 },
      3: { halign: "right", cellWidth: 28 },
      4: { halign: "center", cellWidth: 18 },
      5: { halign: "center", cellWidth: 16 },
      6: { halign: "right", cellWidth: 28, fontStyle: "bold" },
    },
    didParseCell: (data) => {
      // make the description part smaller & muted
      if (data.column.index === 0 && data.section === "body") {
        data.cell.styles.fontSize = 8;
      }
    },
  });

  y = (doc as any).lastAutoTable.finalY + 8;

  // ────────────────────────────────
  // 4. TOTALS
  // ────────────────────────────────
  const totW = 70;
  const totX = W - MR - totW;

  const drawTotLine = (
    label: string,
    value: string,
    opts?: {
      bold?: boolean;
      valueColor?: [number, number, number];
      bg?: [number, number, number];
      largeLine?: boolean;
    }
  ) => {
    const lineH = opts?.largeLine ? 9 : 6.5;
    if (opts?.bg) {
      doc.setFillColor(...opts.bg);
      doc.roundedRect(totX, y - 1, totW, lineH, 1, 1, "F");
    }
    doc.setFontSize(opts?.largeLine ? 10 : 8.5);
    doc.setFont("helvetica", opts?.bold ? "bold" : "normal");
    doc.setTextColor(...(opts?.largeLine ? C.white : C.muted));
    doc.text(label, totX + 4, y + (opts?.largeLine ? 4.5 : 3.5));
    doc.setTextColor(
      ...(opts?.largeLine
        ? C.white
        : opts?.valueColor
        ? opts.valueColor
        : C.text)
    );
    doc.setFont("helvetica", "bold");
    doc.text(value, totX + totW - 4, y + (opts?.largeLine ? 4.5 : 3.5), {
      align: "right",
    });
    y += lineH + 1;
  };

  // Sub-total HT (before discounts)
  const rawHt = invoice.subtotalHt + Math.abs(invoice.totalDiscountHt);
  if (invoice.totalDiscountHt !== 0) {
    drawTotLine("Sous-total HT", fmtCur(rawHt));
    drawTotLine("Remises", `– ${fmtCur(Math.abs(invoice.totalDiscountHt))}`, {
      valueColor: C.red,
    });
  }
  drawTotLine("Total HT", fmtCur(invoice.subtotalHt), { bold: true });

  // VAT breakdown (group by rate)
  const vatByRate: Record<number, number> = {};
  invoice.items.forEach((item) => {
    const htNet =
      item.quantity * Math.abs(item.unitPriceHt) * (1 - item.discountPercent / 100);
    const vat = r2(htNet * (item.vatRate / 100));
    vatByRate[item.vatRate] = r2((vatByRate[item.vatRate] || 0) + vat);
  });
  Object.entries(vatByRate).forEach(([rate, amount]) => {
    drawTotLine(`TVA ${rate} %`, fmtCur(Math.abs(amount)));
  });

  // separator
  doc.setDrawColor(...C.line);
  doc.line(totX + 4, y - 1, totX + totW - 4, y - 1);
  y += 2;

  // TTC highlight
  drawTotLine("TOTAL TTC", fmtCur(invoice.totalTtc), {
    bold: true,
    largeLine: true,
    bg: C.accent,
  });

  // Paid / Due
  if (invoice.amountPaid !== 0) {
    y += 1;
    drawTotLine("Déjà réglé", fmtCur(invoice.amountPaid), {
      valueColor: C.green,
    });
    drawTotLine("Reste à payer", fmtCur(Math.max(0, invoice.amountDue)), {
      bold: true,
      valueColor: invoice.amountDue > 0 ? C.red : C.green,
    });
  }

  // ────────────────────────────────
  // 5. PAYMENT INFO + NOTES  (left column, same Y as totals)
  // ────────────────────────────────
  const leftColY = (doc as any).lastAutoTable.finalY + 8;
  const leftColW = totX - ML - 8;
  let ly = leftColY;

  // Terms
  if (invoice.terms) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...C.text);
    doc.text("Conditions de paiement", ML, ly);
    ly += 4;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...C.muted);
    doc.text(invoice.terms, ML, ly, { maxWidth: leftColW });
    ly += 6;
  }

  // Notes
  if (invoice.notes) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...C.text);
    doc.text("Notes", ML, ly);
    ly += 4;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...C.muted);
    doc.text(invoice.notes, ML, ly, { maxWidth: leftColW });
    ly += 8;
  }

  // ────────────────────────────────
  // 6. BANK DETAILS BOX
  // ────────────────────────────────
  const bankY = Math.max(y + 6, ly + 4);
  doc.setFillColor(...C.bg);
  doc.setDrawColor(...C.line);
  doc.roundedRect(ML, bankY, CW, 16, 1.5, 1.5, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...C.muted);
  doc.text("COORDONNÉES BANCAIRES", ML + 5, bankY + 5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...C.text);
  doc.text(
    `Banque : ${co.bank}    ·    IBAN : ${co.iban}    ·    BIC : ${co.bic}`,
    ML + 5,
    bankY + 11
  );

  // ────────────────────────────────
  // 7. LEGAL FOOTER
  // ────────────────────────────────
  // Thin accent line
  doc.setDrawColor(...C.accent);
  doc.setLineWidth(0.4);
  doc.line(ML, H - 28, W - MR, H - 28);

  const legalLines: string[] = [
    `${co.name} — ${co.legalForm} — SIRET : ${co.siret} — TVA Intracommunautaire : ${co.vat}`,
    `En cas de retard de paiement, une pénalité égale à 3 fois le taux d'intérêt légal sera exigible (art. L.441-10 du Code de commerce).`,
    `Indemnité forfaitaire pour frais de recouvrement : 40 € (art. D.441-5 du Code de commerce).`,
  ];
  if (invoice.footer) legalLines.push(invoice.footer);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  doc.setTextColor(...C.muted);
  legalLines.forEach((line, i) => {
    doc.text(line, W / 2, H - 24 + i * 3.5, { align: "center", maxWidth: CW });
  });

  // page number
  doc.setFontSize(6);
  doc.text(`Page 1/1`, W - MR, H - 6, { align: "right" });

  // ── Bottom accent bar ──
  doc.setFillColor(...C.accent);
  doc.rect(0, H - 3, W, 3, "F");

  // ── Save ──
  doc.save(`${invoice.number}.pdf`);
}
