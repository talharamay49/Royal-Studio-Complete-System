import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  Event,
  Client,
  Invoice,
  Quotation,
  AdminProfile,
  EventDaySchedule,
  Payment,
  Package,
} from '../types';
import { formatPKR, formatDate } from './calculations';

interface LoadedImageAsset {
  dataUrl: string;
  format: 'PNG' | 'JPEG';
  width: number;
  height: number;
}

const imageCache = new Map<string, LoadedImageAsset>();

async function loadImageAsset(src: string): Promise<LoadedImageAsset | null> {
  if (!src || typeof window === 'undefined') return null;
  if (imageCache.has(src)) {
    return imageCache.get(src)!;
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const width = img.naturalWidth || img.width || 1000;
        const height = img.naturalHeight || img.height || 1000;
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const isPng = src.toLowerCase().endsWith('.png') || src.startsWith('data:image/png');
        const mime = isPng ? 'image/png' : 'image/jpeg';
        const format: 'PNG' | 'JPEG' = isPng ? 'PNG' : 'JPEG';
        const dataUrl = canvas.toDataURL(mime, 0.95);
        const asset: LoadedImageAsset = { dataUrl, format, width, height };
        imageCache.set(src, asset);
        resolve(asset);
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

async function applyOfficialStationeryAndLogo(
  doc: jsPDF,
  profile: AdminProfile,
  bgSrc: string,
  docTypeLabel: string
): Promise<void> {
  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 297mm

  // Base warm cream fallback before drawing official image.png background
  doc.setFillColor(240, 239, 233);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  // 1. Draw the FULL-PAGE official Royal Studio stationery background (image.png AS-IS)
  const bgAsset =
    (await loadImageAsset(bgSrc)) ||
    (bgSrc !== '/image.png' ? await loadImageAsset('/image.png') : null);

  if (bgAsset) {
    try {
      doc.addImage(
        bgAsset.dataUrl,
        bgAsset.format,
        0,
        0,
        pageWidth,
        pageHeight,
        undefined,
        'FAST'
      );
    } catch {
      // Fallback cream background already drawn
    }
  }

  // Top timestamp & official document header bar
  const now = new Date();
  const dateStr = `${now.toLocaleDateString('en-GB')}, ${now.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120, 118, 112);
  doc.text(dateStr, 15, 10);
  doc.text(
    `${profile.studioName || 'Royal Studio'} — Official ${docTypeLabel}`,
    pageWidth - 15,
    10,
    { align: 'right' }
  );
  doc.setDrawColor(210, 206, 196);
  doc.setLineWidth(0.2);
  doc.line(15, 12, pageWidth - 15, 12);

  // 2. Draw the ORIGINAL RoyalLogo.png in the top-left header preserving exact proportions
  const logoSrc =
    profile.documentLogo || profile.primaryLogo || profile.logo || '/RoyalLogo.png';
  const logoAsset =
    (await loadImageAsset(logoSrc)) ||
    (logoSrc !== '/RoyalLogo.png' ? await loadImageAsset('/RoyalLogo.png') : null);

  if (logoAsset) {
    try {
      const targetHeight = 16;
      const aspectRatio = logoAsset.width / Math.max(1, logoAsset.height);
      const targetWidth = Math.min(32, targetHeight * aspectRatio);
      doc.addImage(
        logoAsset.dataUrl,
        logoAsset.format,
        15,
        15,
        targetWidth,
        targetHeight,
        undefined,
        'FAST'
      );
    } catch {
      // Non-fatal
    }
  }
}

export async function generateInvoicePDF(
  invoice: Invoice,
  event: Event,
  client: Client,
  profile: AdminProfile,
  daySchedules: EventDaySchedule[] = [],
  paymentsList: Payment[] = [],
  selectedPackage?: Package
): Promise<void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const bgSrc =
    profile.invoiceBackground || profile.documentBackground || '/image.png';
  await applyOfficialStationeryAndLogo(doc, profile, bgSrc, 'INVOICE');

  // TITLE & SUBTITLE
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.setTextColor(15, 23, 42);
  doc.text('INVOICE', 35, 24);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(165, 129, 55);
  doc.text(
    (profile.letterheadText || `${profile.studioName || 'ROYAL STUDIO'} — PHOTOGRAPHY & FILMS`).toUpperCase(),
    35,
    29.5
  );

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(80, 86, 95);
  doc.text(`"${profile.tagline || 'Luxury wedding photography, cinematic films, and brand shoots.'}"`, 15, 36);

  // STATUS STAMP & METADATA
  const balanceDue =
    invoice.remainingAmount ?? Math.max(0, invoice.total - (invoice.paidAmount || 0));
  let stampText = 'PARTIALLY PAID';
  let stampBorder = [217, 119, 6];
  let stampFill = [254, 243, 199];
  let stampTextColor = [180, 83, 9];

  if (balanceDue <= 0) {
    stampText = 'PAID IN FULL';
    stampBorder = [22, 163, 74];
    stampFill = [220, 252, 231];
    stampTextColor = [21, 128, 61];
  } else if (!invoice.paidAmount || invoice.paidAmount === 0) {
    stampText = 'UNPAID';
    stampBorder = [225, 29, 72];
    stampFill = [255, 228, 230];
    stampTextColor = [190, 18, 60];
  }

  doc.setDrawColor(stampBorder[0], stampBorder[1], stampBorder[2]);
  doc.setFillColor(stampFill[0], stampFill[1], stampFill[2]);
  doc.setLineWidth(0.5);
  doc.roundedRect(pageWidth - 65, 15, 50, 8.5, 1.5, 1.5, 'FD');
  doc.setTextColor(stampTextColor[0], stampTextColor[1], stampTextColor[2]);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.text(stampText, pageWidth - 40, 20.5, { align: 'center' });

  doc.setTextColor(31, 41, 55);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('Invoice No:', pageWidth - 65, 28.5);
  doc.setFont('helvetica', 'normal');
  doc.text(invoice.invoiceNumber, pageWidth - 15, 28.5, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.text('Invoice Date:', pageWidth - 65, 33);
  doc.setFont('helvetica', 'normal');
  doc.text(formatDate(invoice.issueDate), pageWidth - 15, 33, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.text('Due Date:', pageWidth - 65, 37.5);
  doc.setFont('helvetica', 'normal');
  doc.text(formatDate(invoice.dueDate), pageWidth - 15, 37.5, { align: 'right' });

  // BILL TO & FROM
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(165, 129, 55);
  doc.text('BILL TO (CLIENT)', 15, 45);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(client.name, 15, 50);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(60, 70, 85);
  doc.text(`Phone: ${client.phone}${client.whatsapp ? ` | WhatsApp: ${client.whatsapp}` : ''}`, 15, 54.5);
  doc.text(`Address: ${client.address || event.venue}, ${client.city}`, 15, 59);

  // FROM (Official Studio Profile)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(165, 129, 55);
  doc.text('FROM (OFFICIAL STUDIO)', 105, 45);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(profile.studioName || 'Royal Studio', 105, 50);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(60, 70, 85);
  const fromAddr =
    profile.publicDisplayAddress ||
    profile.address ||
    'Al Jannat Town Entrance, Canal Bungalow Road, Opposite Habib Mall, Burewala, Punjab 61010, Pakistan';
  const splitFromAddr = doc.splitTextToSize(fromAddr, 90);
  doc.text(splitFromAddr.slice(0, 2), 105, 54.5);
  doc.text(
    `Tel: ${profile.phone || '0308-4877073'}${profile.phone2 ? ` / ${profile.phone2}` : ''} • ${profile.email || 'royalstudio089@gmail.com'}`,
    105,
    62.5
  );

  // EVENT & PACKAGE SUMMARY BAR
  const eventTypeStr = event.weddingSubtype
    ? `${event.category} (${event.weddingSubtype})`
    : event.category;
  const packageTitle = selectedPackage?.name || `${event.category} Custom Coverage`;

  autoTable(doc, {
    startY: 67,
    head: [['EVENT NAME', 'EVENT TYPE', 'EVENT DATE', 'VENUE & CITY', 'PACKAGE']],
    body: [
      [
        event.title,
        eventTypeStr,
        `${formatDate(event.eventDate)} (${event.startTime || '18:00'})`,
        `${event.venue}, ${event.city || ''}`,
        packageTitle,
      ],
    ],
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5,
      cellPadding: 3,
    },
    bodyStyles: {
      fillColor: [255, 255, 255],
      textColor: [15, 23, 42],
      fontSize: 8,
      cellPadding: 3,
      fontStyle: 'bold',
    },
    theme: 'grid',
    margin: { left: 15, right: 15 },
  });

  const eventTableFinalY = (doc as any).lastAutoTable.finalY || 82;

  // SERVICES & COVERAGE ITEMS TABLE
  const itemRows: any[] = [];
  if (event.isMultiDay && daySchedules.length > 0) {
    daySchedules.forEach((day, idx) => {
      const details = [
        `Day ${day.dayNumber || idx + 1}: ${day.eventType} Ceremony Coverage (${day.venue || event.venue})`,
        day.photographersCount || day.cinematographersCount
          ? `Crew: ${day.photographersCount || 1} Photographer(s), ${day.cinematographersCount || 1} Cinematographer(s)${day.droneIncluded ? ', Aerial Drone' : ''}`
          : '',
        day.notes || '',
      ]
        .filter(Boolean)
        .join(' — ');
      itemRows.push([
        details,
        formatDate(day.date || event.eventDate),
        formatPKR(day.customPrice),
        formatPKR(day.customPrice),
      ]);
    });
  } else {
    const pkgDetails = selectedPackage?.deliverables?.length
      ? `Deliverables: ${selectedPackage.deliverables.join(', ')}`
      : event.notes || 'Full HD/4K Cinema & Luxury Portrait Coverage';
    itemRows.push([
      `${packageTitle} — ${event.title}\n${pkgDetails}`,
      formatDate(event.eventDate),
      formatPKR(invoice.subtotal),
      formatPKR(invoice.subtotal),
    ]);
  }

  autoTable(doc, {
    startY: eventTableFinalY + 4,
    head: [['SERVICES, PACKAGE DETAILS & DELIVERABLES', 'DATE', 'RATE', 'AMOUNT']],
    body: itemRows,
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5,
      cellPadding: 3,
    },
    bodyStyles: {
      fillColor: [255, 255, 255],
      textColor: [30, 41, 59],
      fontSize: 8,
      cellPadding: 3,
    },
    columnStyles: {
      0: { cellWidth: 102 },
      1: { cellWidth: 24, halign: 'center' },
      2: { cellWidth: 27, halign: 'right' },
      3: { cellWidth: 27, halign: 'right', fontStyle: 'bold' },
    },
    theme: 'grid',
    margin: { left: 15, right: 15 },
  });

  const itemsTableFinalY = (doc as any).lastAutoTable.finalY || 120;

  // FINANCIAL TOTALS
  const summaryX = pageWidth - 82;
  let curY = itemsTableFinalY + 6;

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 70, 85);
  doc.text('Subtotal:', summaryX, curY);
  doc.text(formatPKR(invoice.subtotal), pageWidth - 15, curY, { align: 'right' });

  if (invoice.discount > 0) {
    curY += 5;
    doc.setTextColor(225, 29, 72);
    doc.text('Discount:', summaryX, curY);
    doc.text(`- ${formatPKR(invoice.discount)}`, pageWidth - 15, curY, { align: 'right' });
  }

  if (invoice.tax > 0) {
    curY += 5;
    doc.setTextColor(60, 70, 85);
    doc.text(`Tax (${profile.taxRate || 0}%):`, summaryX, curY);
    doc.text(`+ ${formatPKR(invoice.tax)}`, pageWidth - 15, curY, { align: 'right' });
  }

  curY += 6;
  doc.setFillColor(226, 232, 240);
  doc.roundedRect(summaryX - 3, curY - 4.5, 70, 7, 1, 1, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Total Invoice Amount:', summaryX, curY);
  doc.text(formatPKR(invoice.total), pageWidth - 15, curY, { align: 'right' });

  curY += 5.5;
  doc.setFontSize(8.5);
  doc.setTextColor(21, 128, 61);
  doc.text('Advance / Paid Amount:', summaryX, curY);
  doc.text(formatPKR(invoice.paidAmount || 0), pageWidth - 15, curY, { align: 'right' });

  curY += 5.5;
  doc.setTextColor(190, 18, 60);
  doc.setFont('helvetica', 'bold');
  doc.text('Remaining Balance:', summaryX, curY);
  doc.text(formatPKR(balanceDue), pageWidth - 15, curY, { align: 'right' });

  // PAYMENT HISTORY
  let sectionY = curY + 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(165, 129, 55);
  doc.text('PAYMENT RECEIPTS & ADVANCE LEDGER', 15, sectionY);

  sectionY += 3.5;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(215, 220, 228);
  doc.setLineWidth(0.25);

  if (paymentsList.length > 0) {
    const boxHeight = Math.max(12, Math.min(paymentsList.length, 4) * 5.5 + 3.5);
    doc.roundedRect(15, sectionY, pageWidth - 30, boxHeight, 1.5, 1.5, 'FD');
    let payRowY = sectionY + 4.5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(31, 41, 55);

    paymentsList.slice(0, 4).forEach((p) => {
      const lineLeft = `${formatDate(p.paymentDate)} — ${p.method} ${p.reference ? `[Ref: ${p.reference}]` : ''} ${p.notes ? `• ${p.notes}` : ''}`;
      doc.text(lineLeft, 18, payRowY);
      doc.text(formatPKR(p.amount), pageWidth - 18, payRowY, { align: 'right' });
      payRowY += 5;
    });
    sectionY += boxHeight + 5;
  } else {
    doc.roundedRect(15, sectionY, pageWidth - 30, 8, 1.5, 1.5, 'FD');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(107, 114, 128);
    doc.text('No advance or installment payments recorded yet.', 18, sectionY + 5);
    sectionY += 13;
  }

  // PAYMENT METHODS & BANK INFO
  const bankY = sectionY;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(165, 129, 55);
  doc.text('PAYMENT TERMS & CHANNELS', 15, bankY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(30, 41, 59);
  const termsLine = invoice.paymentTerms || profile.paymentTerms || 'Bank Transfer / Cash / JazzCash / EasyPaisa';
  doc.text(doc.splitTextToSize(termsLine, 82), 15, bankY + 4.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(165, 129, 55);
  doc.text('OFFICIAL BANK DETAILS FOR DEPOSIT', 105, bankY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(30, 41, 59);
  doc.text(`Account Title: ${profile.accountTitle || 'Royal Studio'}`, 105, bankY + 4.5);
  doc.text(`Bank: ${profile.bankName || 'Meezan Bank'}`, 105, bankY + 8.5);
  doc.text(`Account / IBAN: ${profile.accountNumber || profile.iban || '—'}`, 105, bankY + 12.5);

  // NOTES & TERMS
  const termsY = bankY + 18;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(165, 129, 55);
  doc.text('TERMS, CONDITIONS & NOTES', 15, termsY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  const combinedTerms = [
    invoice.notes ? `Notes: ${invoice.notes}` : '',
    profile.defaultInvoiceTerms ||
      profile.defaultTermsAndConditions ||
      '50% advance required to confirm booking. Remaining balance due prior to final delivery.',
  ]
    .filter(Boolean)
    .join(' | ');
  doc.text(doc.splitTextToSize(combinedTerms, pageWidth - 30).slice(0, 3), 15, termsY + 4);

  // FOOTER
  const footerY = pageHeight - 12;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 95);
  doc.text(
    profile.documentFooterText ||
      `Thank you for choosing ${profile.studioName || 'Royal Studio'}. We Capture Your Memories!`,
    pageWidth / 2,
    footerY,
    { align: 'center' }
  );

  doc.save(`${invoice.invoiceNumber}_${client.name.replace(/\s+/g, '_')}.pdf`);
}

export async function generateQuotationPDF(
  quotation: Quotation,
  event: Event,
  client: Client,
  profile: AdminProfile,
  daySchedules: EventDaySchedule[] = [],
  selectedPackage?: Package
): Promise<void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const bgSrc =
    profile.quotationBackground || profile.documentBackground || '/image.png';
  await applyOfficialStationeryAndLogo(doc, profile, bgSrc, 'QUOTATION');

  // TITLE & SUBTITLE
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.setTextColor(15, 23, 42);
  doc.text('QUOTATION', 35, 24);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(165, 129, 55);
  doc.text(
    (profile.letterheadText || `${profile.studioName || 'ROYAL STUDIO'} — PHOTOGRAPHY & FILMS`).toUpperCase(),
    35,
    29.5
  );

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(80, 86, 95);
  doc.text(`"${profile.tagline || 'Luxury wedding photography, cinematic films, and brand shoots.'}"`, 15, 36);

  // STAMP & METADATA
  doc.setDrawColor(217, 119, 6);
  doc.setFillColor(254, 243, 199);
  doc.setLineWidth(0.5);
  doc.roundedRect(pageWidth - 65, 15, 50, 8.5, 1.5, 1.5, 'FD');
  doc.setTextColor(180, 83, 9);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.text('OFFICIAL PROPOSAL', pageWidth - 40, 20.5, { align: 'center' });

  doc.setTextColor(31, 41, 55);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('Quotation No:', pageWidth - 65, 28.5);
  doc.setFont('helvetica', 'normal');
  doc.text(quotation.quotationNumber, pageWidth - 15, 28.5, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.text('Quotation Date:', pageWidth - 65, 33);
  doc.setFont('helvetica', 'normal');
  doc.text(formatDate(quotation.issueDate), pageWidth - 15, 33, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.text('Valid Until:', pageWidth - 65, 37.5);
  doc.setFont('helvetica', 'normal');
  doc.text(formatDate(quotation.validUntil), pageWidth - 15, 37.5, { align: 'right' });

  // PROPOSAL PREPARED FOR & FROM
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(165, 129, 55);
  doc.text('PROPOSAL PREPARED FOR', 15, 45);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(client.name, 15, 50);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(60, 70, 85);
  doc.text(`Contact: ${client.phone}${client.whatsapp ? ` | WhatsApp: ${client.whatsapp}` : ''}`, 15, 54.5);
  doc.text(`Address: ${client.address || event.venue}, ${client.city}`, 15, 59);

  // FROM
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(165, 129, 55);
  doc.text('FROM (OFFICIAL STUDIO)', 105, 45);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(profile.studioName || 'Royal Studio', 105, 50);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(60, 70, 85);
  const quoFromAddr =
    profile.publicDisplayAddress ||
    profile.address ||
    'Al Jannat Town Entrance, Canal Bungalow Road, Opposite Habib Mall, Burewala, Punjab 61010, Pakistan';
  const splitQuoFromAddr = doc.splitTextToSize(quoFromAddr, 90);
  doc.text(splitQuoFromAddr.slice(0, 2), 105, 54.5);
  doc.text(
    `Tel: ${profile.phone || '0308-4877073'}${profile.phone2 ? ` / ${profile.phone2}` : ''} • ${profile.email || 'royalstudio089@gmail.com'}`,
    105,
    62.5
  );

  // EVENT & PACKAGE DETAILS BAR
  const eventTypeStr = event.weddingSubtype
    ? `${event.category} (${event.weddingSubtype})`
    : event.category;
  const packageTitle = selectedPackage?.name || `${event.category} Custom Package`;

  autoTable(doc, {
    startY: 67,
    head: [['EVENT NAME', 'EVENT TYPE', 'EVENT DATE', 'VENUE & CITY', 'PACKAGE']],
    body: [
      [
        event.title,
        eventTypeStr,
        `${formatDate(event.eventDate)} (${event.startTime || '18:00'})`,
        `${event.venue}, ${event.city || ''}`,
        packageTitle,
      ],
    ],
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5,
      cellPadding: 3,
    },
    bodyStyles: {
      fillColor: [255, 255, 255],
      textColor: [15, 23, 42],
      fontSize: 8,
      cellPadding: 3,
      fontStyle: 'bold',
    },
    theme: 'grid',
    margin: { left: 15, right: 15 },
  });

  const eventTableFinalY = (doc as any).lastAutoTable.finalY || 82;

  // SERVICES & ADDITIONAL SERVICES TABLE
  const itemRows: any[] = [];
  if (event.isMultiDay && daySchedules.length > 0) {
    daySchedules.forEach((day, idx) => {
      const details = [
        `Day ${day.dayNumber || idx + 1}: ${day.eventType} Ceremony Coverage (${day.venue || event.venue})`,
        day.photographersCount || day.cinematographersCount
          ? `Services: ${day.photographersCount || 1} Photographer(s), ${day.cinematographersCount || 1} Cinematographer(s)${day.droneIncluded ? ', Aerial Drone' : ''}`
          : '',
        day.notes || '',
      ]
        .filter(Boolean)
        .join(' — ');
      itemRows.push([
        details,
        formatDate(day.date || event.eventDate),
        formatPKR(day.customPrice),
        formatPKR(day.customPrice),
      ]);
    });
  } else {
    const pkgDetails = selectedPackage?.deliverables?.length
      ? `Services & Deliverables: ${selectedPackage.deliverables.join(', ')}`
      : event.notes || 'Luxury Wedding Photography, Cinematic Highlight Film & Portrait Session';
    itemRows.push([
      `${packageTitle} — ${event.title}\n${pkgDetails}`,
      formatDate(event.eventDate),
      formatPKR(quotation.subtotal),
      formatPKR(quotation.subtotal),
    ]);
  }

  autoTable(doc, {
    startY: eventTableFinalY + 4,
    head: [['PACKAGE, SERVICES & ADDITIONAL COVERAGE DETAILS', 'DATE', 'RATE', 'AMOUNT']],
    body: itemRows,
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5,
      cellPadding: 3,
    },
    bodyStyles: {
      fillColor: [255, 255, 255],
      textColor: [30, 41, 59],
      fontSize: 8,
      cellPadding: 3,
    },
    columnStyles: {
      0: { cellWidth: 102 },
      1: { cellWidth: 24, halign: 'center' },
      2: { cellWidth: 27, halign: 'right' },
      3: { cellWidth: 27, halign: 'right', fontStyle: 'bold' },
    },
    theme: 'grid',
    margin: { left: 15, right: 15 },
  });

  const itemsTableFinalY = (doc as any).lastAutoTable.finalY || 120;

  // FINANCIAL BREAKDOWN (Subtotal, Discount, Total, Advance, Remaining Balance)
  const advancePaid = event.totalClientPayments || event.advancePaid || 0;
  const remainingBalance = Math.max(0, quotation.total - advancePaid);

  const summaryX = pageWidth - 82;
  let curY = itemsTableFinalY + 6;

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 70, 85);
  doc.text('Subtotal:', summaryX, curY);
  doc.text(formatPKR(quotation.subtotal), pageWidth - 15, curY, { align: 'right' });

  if (quotation.discount > 0) {
    curY += 5;
    doc.setTextColor(225, 29, 72);
    doc.text('Discount:', summaryX, curY);
    doc.text(`- ${formatPKR(quotation.discount)}`, pageWidth - 15, curY, { align: 'right' });
  }

  if (quotation.tax > 0) {
    curY += 5;
    doc.setTextColor(60, 70, 85);
    doc.text(`Tax (${profile.taxRate || 0}%):`, summaryX, curY);
    doc.text(`+ ${formatPKR(quotation.tax)}`, pageWidth - 15, curY, { align: 'right' });
  }

  curY += 6;
  doc.setFillColor(226, 232, 240);
  doc.roundedRect(summaryX - 3, curY - 4.5, 70, 7, 1, 1, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Quoted Total:', summaryX, curY);
  doc.text(formatPKR(quotation.total), pageWidth - 15, curY, { align: 'right' });

  curY += 5.5;
  doc.setFontSize(8.5);
  doc.setTextColor(21, 128, 61);
  doc.text('Advance Paid / Required:', summaryX, curY);
  doc.text(
    advancePaid > 0 ? formatPKR(advancePaid) : `50% (${formatPKR(Math.round(quotation.total * 0.5))})`,
    pageWidth - 15,
    curY,
    { align: 'right' }
  );

  curY += 5.5;
  doc.setTextColor(190, 18, 60);
  doc.setFont('helvetica', 'bold');
  doc.text('Remaining Balance:', summaryX, curY);
  doc.text(
    advancePaid > 0 ? formatPKR(remainingBalance) : formatPKR(Math.round(quotation.total * 0.5)),
    pageWidth - 15,
    curY,
    { align: 'right' }
  );

  // TERMS & BANK DETAILS
  const termsY = curY + 10;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(165, 129, 55);
  doc.text('QUOTATION TERMS, CONDITIONS & NOTES', 15, termsY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);
  const quoTerms = [
    quotation.notes ? `Notes: ${quotation.notes}` : '',
    quotation.paymentTerms || '',
    profile.defaultQuotationTerms ||
      profile.defaultTermsAndConditions ||
      '50% advance required upon contract signing to lock dates and production crew. Remaining balance payable prior to final delivery.',
  ]
    .filter(Boolean)
    .join(' — ');
  doc.text(doc.splitTextToSize(quoTerms, pageWidth - 30).slice(0, 4), 15, termsY + 4.5);

  const bankY = termsY + 22;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(165, 129, 55);
  doc.text('OFFICIAL BANK DETAILS FOR ADVANCE DEPOSIT', 15, bankY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);
  doc.text(
    `Account Title: ${profile.accountTitle || 'Royal Studio'} | Bank: ${profile.bankName || 'Meezan Bank'} | Account / IBAN: ${profile.accountNumber || profile.iban || '—'}`,
    15,
    bankY + 4.5
  );

  // FOOTER
  const footerY = pageHeight - 12;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 95);
  doc.text(
    profile.documentFooterText ||
      `Thank you for considering ${profile.studioName || 'Royal Studio'}. We Capture Your Memories!`,
    pageWidth / 2,
    footerY,
    { align: 'center' }
  );

  doc.save(`${quotation.quotationNumber}_${client.name.replace(/\s+/g, '_')}.pdf`);
}
