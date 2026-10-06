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
  TeamMember,
  EventTeamAssignment,
  Equipment,
  EventEquipmentAssignment,
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

function hexToRgbTuple(hex: string | undefined, fallback: [number, number, number]): [number, number, number] {
  if (!hex) return fallback;
  const clean = hex.replace('#', '').trim();
  if (clean.length === 6) {
    const r = parseInt(clean.slice(0, 2), 16);
    const g = parseInt(clean.slice(2, 4), 16);
    const b = parseInt(clean.slice(4, 6), 16);
    if (!Number.isNaN(r) && !Number.isNaN(g) && !Number.isNaN(b)) {
      return [r, g, b];
    }
  }
  return fallback;
}

function getTableBodyFillColor(profile: AdminProfile): [number, number, number] | false {
  const style = profile.documentTableStyle || 'transparent';
  if (style === 'solid-white') return [255, 255, 255];
  if (style === 'cream') return [245, 242, 235];
  return false; // Transparent so 01.jpg stationery background & lens remain visible as-is
}

async function renderStationeryWithOpacity(
  asset: LoadedImageAsset,
  opacityPercent: number,
  bgRgb: [number, number, number]
): Promise<LoadedImageAsset> {
  if (opacityPercent >= 99 || typeof window === 'undefined') {
    return asset;
  }
  const cacheKey = `${asset.dataUrl.slice(0, 64)}_op_${opacityPercent}_${bgRgb.join(',')}`;
  if (imageCache.has(cacheKey)) {
    return imageCache.get(cacheKey)!;
  }
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = asset.width;
        canvas.height = asset.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(asset);
          return;
        }
        ctx.fillStyle = `rgb(${bgRgb[0]}, ${bgRgb[1]}, ${bgRgb[2]})`;
        ctx.fillRect(0, 0, asset.width, asset.height);
        ctx.globalAlpha = Math.max(0.05, Math.min(1, opacityPercent / 100));
        ctx.drawImage(img, 0, 0, asset.width, asset.height);
        const blended: LoadedImageAsset = {
          dataUrl: canvas.toDataURL('image/jpeg', 0.95),
          format: 'JPEG',
          width: asset.width,
          height: asset.height,
        };
        imageCache.set(cacheKey, blended);
        resolve(blended);
      } catch {
        resolve(asset);
      }
    };
    img.onerror = () => resolve(asset);
    img.src = asset.dataUrl;
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

  // Base warm cream fallback matching 01.jpg (#efece4) or admin-customized page fill color
  const bgRgb = hexToRgbTuple(profile.documentPageFillColor, [239, 236, 228]);
  doc.setFillColor(bgRgb[0], bgRgb[1], bgRgb[2]);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  // 1. Draw the FULL-PAGE official Royal Studio stationery background (01.jpg AS-IS by default)
  const showBackground = profile.documentShowBackground !== false;
  if (showBackground) {
    const resolvedSrc = bgSrc || '/01.jpg';
    const rawBgAsset =
      (await loadImageAsset(resolvedSrc)) ||
      (resolvedSrc !== '/01.jpg' ? await loadImageAsset('/01.jpg') : null) ||
      (await loadImageAsset('/image.png'));

    if (rawBgAsset) {
      try {
        const opacity =
          typeof profile.documentBackgroundOpacity === 'number'
            ? profile.documentBackgroundOpacity
            : 100;
        const bgAsset = await renderStationeryWithOpacity(rawBgAsset, opacity, bgRgb);
        const fitMode = profile.documentBackgroundFit || 'as-is';

        if (fitMode === 'as-is' || fitMode === 'contain') {
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
        } else if (fitMode === 'top-banner') {
          const bannerRatio = bgAsset.height / Math.max(1, bgAsset.width);
          const drawH = Math.min(pageHeight, pageWidth * bannerRatio);
          doc.addImage(
            bgAsset.dataUrl,
            bgAsset.format,
            0,
            0,
            pageWidth,
            drawH,
            undefined,
            'FAST'
          );
        } else if (fitMode === 'center-watermark') {
          const targetW = pageWidth * 0.85;
          const targetH = targetW * (bgAsset.height / Math.max(1, bgAsset.width));
          doc.addImage(
            bgAsset.dataUrl,
            bgAsset.format,
            (pageWidth - targetW) / 2,
            (pageHeight - targetH) / 2,
            targetW,
            targetH,
            undefined,
            'FAST'
          );
        }
      } catch {
        // Fallback cream background already drawn
      }
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
  const showHeaderLogo = profile.documentShowHeaderLogo !== false;
  if (showHeaderLogo) {
    const logoSrc =
      profile.documentLogo || profile.primaryLogo || profile.logo || '/RoyalLogo.png';
    const logoAsset =
      (await loadImageAsset(logoSrc)) ||
      (logoSrc !== '/RoyalLogo.png' ? await loadImageAsset('/RoyalLogo.png') : null);

    if (logoAsset) {
      try {
        const targetHeight =
          typeof profile.documentHeaderLogoHeight === 'number'
            ? Math.max(8, Math.min(30, profile.documentHeaderLogoHeight))
            : 16;
        const aspectRatio = logoAsset.width / Math.max(1, logoAsset.height);
        const targetWidth = Math.min(42, targetHeight * aspectRatio);
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
    profile.invoiceBackground || profile.documentBackground || '/01.jpg';
  await applyOfficialStationeryAndLogo(doc, profile, bgSrc, 'INVOICE');
  const tableFill = getTableBodyFillColor(profile);
  const accentRgb = hexToRgbTuple(profile.documentAccentColor, [165, 129, 55]);

  // TITLE & SUBTITLE
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.setTextColor(15, 23, 42);
  doc.text('INVOICE', 35, 24);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(accentRgb[0], accentRgb[1], accentRgb[2]);
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
      ...(tableFill ? { fillColor: tableFill } : {}),
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
      ...(tableFill ? { fillColor: tableFill } : {}),
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
    profile.quotationBackground || profile.documentBackground || '/01.jpg';
  await applyOfficialStationeryAndLogo(doc, profile, bgSrc, 'QUOTATION');
  const quoTableFill = getTableBodyFillColor(profile);
  const quoAccentRgb = hexToRgbTuple(profile.documentAccentColor, [165, 129, 55]);

  // TITLE & SUBTITLE
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.setTextColor(15, 23, 42);
  doc.text('QUOTATION', 35, 24);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(quoAccentRgb[0], quoAccentRgb[1], quoAccentRgb[2]);
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
      ...(quoTableFill ? { fillColor: quoTableFill } : {}),
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
      ...(quoTableFill ? { fillColor: quoTableFill } : {}),
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

export async function generatePaymentReceiptPDF(
  payment: Payment,
  event: Event,
  client: Client,
  profile: AdminProfile,
  allPayments: Payment[] = []
): Promise<void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const bgSrc = profile.receiptBackground || profile.documentBackground || '/01.jpg';
  await applyOfficialStationeryAndLogo(doc, profile, bgSrc, 'PAYMENT RECEIPT');

  // Official Receipt Badge
  doc.setDrawColor(16, 185, 129);
  doc.setFillColor(209, 250, 229);
  doc.roundedRect(pageWidth - 58, 17, 43, 8, 1.5, 1.5, 'FD');
  doc.setTextColor(6, 95, 70);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('OFFICIAL RECEIPT', pageWidth - 36.5, 22.3, { align: 'center' });

  const receiptNo = `RS-RCPT-${payment.id.slice(-4).toUpperCase()}`;
  doc.setFontSize(8.5);
  doc.setTextColor(40, 45, 55);
  doc.setFont('helvetica', 'bold');
  doc.text('Receipt No:', pageWidth - 62, 31);
  doc.text('Payment Date:', pageWidth - 62, 36);
  doc.text('Payment Method:', pageWidth - 62, 41);

  doc.setFont('helvetica', 'normal');
  doc.text(receiptNo, pageWidth - 15, 31, { align: 'right' });
  doc.text(formatDate(payment.paymentDate), pageWidth - 15, 36, { align: 'right' });
  doc.text(payment.method, pageWidth - 15, 41, { align: 'right' });

  // RECEIVED FROM / STUDIO DETAILS
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(165, 129, 55);
  doc.text('RECEIVED FROM (CLIENT)', 15, 49);

  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text(client.name, 15, 54.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(55, 65, 81);
  doc.text(`Phone: ${client.phone}`, 15, 59.5);
  doc.text(`Event: ${event.title} (${formatDate(event.eventDate)})`, 15, 64);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(165, 129, 55);
  doc.text('RECEIVED BY (OFFICIAL STUDIO)', 105, 49);

  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text(profile.studioName || 'Royal Studio', 105, 54.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(55, 65, 81);
  const fullAddr =
    profile.publicDisplayAddress ||
    profile.address ||
    'Al Jannat Town Entrance, Canal Bungalow Road, Opposite Habib Mall, Burewala, Punjab 61010, Pakistan';
  const addrLines = doc.splitTextToSize(fullAddr, 88);
  doc.text(addrLines, 105, 59.5);
  const phoneY = 59.5 + addrLines.length * 4.2;
  doc.text(
    `Tel: ${profile.phone || '0308-4877073'}${profile.phone2 ? ' / ' + profile.phone2 : ''}`,
    105,
    phoneY
  );

  // PAYMENT RECEIPT TABLE
  autoTable(doc, {
    startY: Math.max(74, phoneY + 6),
    head: [['RECEIPT #', 'PAYMENT DATE', 'METHOD & REFERENCE', 'NOTES', 'AMOUNT RECEIVED']],
    body: [
      [
        receiptNo,
        formatDate(payment.paymentDate),
        `${payment.method}${payment.reference ? ` (${payment.reference})` : ''}`,
        payment.notes || `Payment towards ${event.title}`,
        formatPKR(payment.amount),
      ],
    ],
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      cellPadding: 3.5,
    },
    bodyStyles: {
      fillColor: [255, 255, 255],
      textColor: [15, 23, 42],
      fontSize: 8.5,
      cellPadding: 4,
      fontStyle: 'bold',
    },
    theme: 'grid',
    margin: { left: 15, right: 15 },
  });

  const tableEndY = (doc as any).lastAutoTable.finalY || 105;
  const contractTotal = event.packagePrice - (event.discount || 0) + (event.tax || 0);
  const totalPaidToDate =
    allPayments.length > 0
      ? allPayments.reduce((s, p) => s + p.amount, 0)
      : event.totalClientPayments || payment.amount;
  const remainingBalance = Math.max(0, contractTotal - totalPaidToDate);

  let curY = tableEndY + 10;
  const summaryX = pageWidth - 85;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 70, 85);
  doc.text('Total Contract Value:', summaryX, curY);
  doc.text(formatPKR(contractTotal), pageWidth - 15, curY, { align: 'right' });

  curY += 6;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(21, 128, 61);
  doc.text('This Payment Received:', summaryX, curY);
  doc.text(formatPKR(payment.amount), pageWidth - 15, curY, { align: 'right' });

  curY += 6;
  doc.text('Total Paid to Date:', summaryX, curY);
  doc.text(formatPKR(totalPaidToDate), pageWidth - 15, curY, { align: 'right' });

  curY += 6;
  doc.setTextColor(190, 18, 60);
  doc.text('Remaining Balance Due:', summaryX, curY);
  doc.text(formatPKR(remainingBalance), pageWidth - 15, curY, { align: 'right' });

  // Footer
  const footerY = pageHeight - 12;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 95);
  doc.text(
    profile.documentFooterText ||
      `Official Payment Receipt — ${profile.studioName || 'Royal Studio'}. Thank you for your payment!`,
    pageWidth / 2,
    footerY,
    { align: 'center' }
  );

  doc.save(`${receiptNo}_${client.name.replace(/\s+/g, '_')}.pdf`);
}

export async function generateEventDocumentPDF(
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

  const bgSrc = profile.documentBackground || '/01.jpg';
  await applyOfficialStationeryAndLogo(doc, profile, bgSrc, 'EVENT DOSSIER');

  const docNo = `RS-EVT-${event.id.slice(-4).toUpperCase()}`;
  doc.setFontSize(8.5);
  doc.setTextColor(40, 45, 55);
  doc.setFont('helvetica', 'bold');
  doc.text('Event Ref:', pageWidth - 62, 31);
  doc.text('Event Date:', pageWidth - 62, 36);
  doc.text('Status:', pageWidth - 62, 41);

  doc.setFont('helvetica', 'normal');
  doc.text(docNo, pageWidth - 15, 31, { align: 'right' });
  doc.text(formatDate(event.eventDate), pageWidth - 15, 36, { align: 'right' });
  doc.text(event.status, pageWidth - 15, 41, { align: 'right' });

  // CLIENT & EVENT SUMMARY
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(165, 129, 55);
  doc.text('CLIENT & BOOKING OVERVIEW', 15, 49);

  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`${client.name} — ${event.title}`, 15, 54.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(55, 65, 81);
  doc.text(`Client Contact: ${client.phone} | Venue: ${event.venue}, ${event.city}`, 15, 59.5);
  doc.text(
    `Package: ${selectedPackage?.name || event.category} | Total Value: ${formatPKR(event.packagePrice - (event.discount || 0) + (event.tax || 0))}`,
    15,
    64
  );

  const scheduleRows =
    daySchedules.length > 0
      ? daySchedules.map((d, i) => [
          `Day ${d.dayNumber || i + 1}: ${d.eventType}`,
          formatDate(d.date),
          `${d.startTime || '18:00'} - ${d.endTime || '23:30'} (Call: ${d.callTime || '16:30'})`,
          d.venue || event.venue,
          formatPKR(d.customPrice),
        ])
      : [
          [
            `${event.category} (${event.weddingSubtype || 'Main Event'})`,
            formatDate(event.eventDate),
            `${event.startTime || '18:00'} - ${event.endTime || '23:30'}`,
            `${event.venue}, ${event.city}`,
            formatPKR(event.packagePrice),
          ],
        ];

  autoTable(doc, {
    startY: 72,
    head: [['CEREMONY / DAY', 'DATE', 'TIMINGS', 'VENUE', 'ALLOCATION']],
    body: scheduleRows,
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
    },
    theme: 'grid',
    margin: { left: 15, right: 15 },
  });

  const footerY = pageHeight - 12;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 95);
  doc.text(
    profile.documentFooterText ||
      `Official Event Production Document — ${profile.studioName || 'Royal Studio'}`,
    pageWidth / 2,
    footerY,
    { align: 'center' }
  );

  doc.save(`${docNo}_${event.title.replace(/\s+/g, '_')}.pdf`);
}

export function buildWhatsAppCallSheetText(
  daySchedule: EventDaySchedule,
  event: Event,
  client: Client | null | undefined,
  profile: AdminProfile | null | undefined,
  dayCrew: EventTeamAssignment[],
  teamMembers: TeamMember[],
  dayEquip: EventEquipmentAssignment[],
  equipmentList: Equipment[]
): string {
  const venueQuery = encodeURIComponent(
    `${daySchedule.venue || event.venue}, ${event.city || 'Burewala'}`
  );
  const mapsPinUrl = `https://www.google.com/maps/search/?api=1&query=${venueQuery}`;

  const crewLines =
    dayCrew.length > 0
      ? dayCrew.map((ca, idx) => {
          const member = teamMembers.find((m) => m.id === ca.teamMemberId);
          return `  ${idx + 1}. *${member?.name || 'Crew Specialist'}* — ${ca.role} (${
            member?.phone || 'N/A'
          })`;
        })
      : [
          `  • ${daySchedule.photographersCount ?? 1}x Photographer(s), ${
            daySchedule.cinematographersCount ?? 1
          }x Videographer(s)${daySchedule.droneIncluded ? ', 1x Drone Pilot' : ''}`,
        ];

  const gearLines =
    dayEquip.length > 0
      ? dayEquip.map((ea, idx) => {
          const item = equipmentList.find((eq) => eq.id === ea.equipmentId);
          return `  ${idx + 1}. ${ea.quantity}x ${item?.name || 'Camera / Gear'} (${
            item?.category || 'Gear'
          } · S/N: ${item?.serialNumber || 'N/A'})`;
        })
      : [
          `  • ${daySchedule.cameraCount || 2} Camera Unit(s) (${
            daySchedule.cameraCategory || 'CAT_2'
          })${daySchedule.droneIncluded ? ' + 4K Drone Unit' : ''}`,
        ];

  return [
    `*ROYAL STUDIO — DAILY PRODUCTION CALL SHEET*`,
    `*Event:* ${event.title}`,
    `*Ceremony:* Day ${daySchedule.dayNumber} — ${daySchedule.eventType}`,
    `*Date:* ${formatDate(daySchedule.date)} (${
      daySchedule.timingMode === 'DAY_TIME' ? 'Day Shift' : 'Night Shift'
    })`,
    `*Crew Call Time:* ${daySchedule.callTime || '16:30'} | *Shoot:* ${
      daySchedule.startTime
    } – ${daySchedule.endTime}`,
    `*Dress Code:* ${daySchedule.dressCode || 'Formal Studio Black'}`,
    `*Venue:* ${daySchedule.venue || event.venue}, ${event.city}`,
    `*Google Maps Pin:* ${mapsPinUrl}`,
    `*Client Contact:* ${client?.name || 'Client'} (${client?.phone || 'N/A'})`,
    ``,
    `*ASSIGNED PRODUCTION CREW:*`,
    ...crewLines,
    ``,
    `*ASSIGNED CAMERAS, DRONES & GEAR:*`,
    ...gearLines,
    daySchedule.notes ? `\n*Production Notes:* ${daySchedule.notes}` : '',
    ``,
    `_${profile?.studioName || 'Royal Studio'} Production Desk (${
      profile?.phone || '0308-4877073'
    })_`,
  ]
    .filter(Boolean)
    .join('\n');
}

export async function generateCallSheetPDF(
  daySchedule: EventDaySchedule,
  event: Event,
  client: Client | null | undefined,
  profile: AdminProfile,
  dayCrew: EventTeamAssignment[],
  teamMembers: TeamMember[],
  dayEquip: EventEquipmentAssignment[],
  equipmentList: Equipment[]
): Promise<void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const bgSrc = profile.documentBackground || '/01.jpg';

  await applyOfficialStationeryAndLogo(doc, profile, bgSrc, 'PRODUCTION CALL SHEET');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(15, 23, 42);
  doc.text(`CALL SHEET — DAY ${daySchedule.dayNumber}: ${daySchedule.eventType.toUpperCase()}`, 35, 23);

  doc.setFontSize(8.5);
  doc.setTextColor(165, 129, 55);
  doc.text(
    `${event.title} • ${formatDate(daySchedule.date)} • CALL TIME: ${daySchedule.callTime || '16:30'}`,
    35,
    29
  );

  const venueQuery = encodeURIComponent(
    `${daySchedule.venue || event.venue}, ${event.city || 'Burewala'}`
  );
  const mapsPinUrl = `https://maps.google.com/?q=${venueQuery}`;

  autoTable(doc, {
    startY: 36,
    head: [['CALL TIME', 'SHOOT WINDOW', 'SHIFT MODE', 'DRESS CODE', 'VENUE & MAP PIN']],
    body: [
      [
        daySchedule.callTime || '16:30',
        `${daySchedule.startTime} - ${daySchedule.endTime}`,
        daySchedule.timingMode === 'DAY_TIME' ? 'DAY_TIME (5h)' : 'NIGHT_TIME',
        daySchedule.dressCode || 'Formal Studio Black',
        `${daySchedule.venue || event.venue}, ${event.city}\nMap: ${mapsPinUrl}`,
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
    },
    theme: 'grid',
    margin: { left: 15, right: 15 },
  });

  const afterHeaderY = (doc as any).lastAutoTable?.finalY || 58;

  // Crew Table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('1. ASSIGNED PRODUCTION CREW ROSTER', 15, afterHeaderY + 8);

  const crewRows =
    dayCrew.length > 0
      ? dayCrew.map((ca, idx) => {
          const mem = teamMembers.find((m) => m.id === ca.teamMemberId);
          return [
            String(idx + 1),
            mem?.name || 'Assigned Specialist',
            ca.role,
            mem?.phone || '—',
            daySchedule.callTime || '16:30',
            ca.assignmentStatus,
          ];
        })
      : [
          [
            '1',
            `Day ${daySchedule.dayNumber} Unit`,
            `${daySchedule.photographersCount ?? 1} Photo / ${
              daySchedule.cinematographersCount ?? 1
            } Video${daySchedule.droneIncluded ? ' / 1 Drone' : ''}`,
            profile.phone || '0308-4877073',
            daySchedule.callTime || '16:30',
            'Scheduled',
          ],
        ];

  autoTable(doc, {
    startY: afterHeaderY + 11,
    head: [['#', 'CREW MEMBER', 'ROLE / UNIT', 'CONTACT PHONE', 'CALL TIME', 'STATUS']],
    body: crewRows,
    headStyles: {
      fillColor: [165, 129, 55],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5,
      cellPadding: 2.5,
    },
    bodyStyles: {
      fillColor: [255, 255, 255],
      textColor: [15, 23, 42],
      fontSize: 8,
      cellPadding: 2.5,
    },
    theme: 'grid',
    margin: { left: 15, right: 15 },
  });

  const afterCrewY = (doc as any).lastAutoTable?.finalY || afterHeaderY + 45;

  // Equipment Manifest Table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('2. CAMERA BODIES, LENSES & DRONE MANIFEST', 15, afterCrewY + 8);

  const equipRows =
    dayEquip.length > 0
      ? dayEquip.map((ea, idx) => {
          const item = equipmentList.find((eq) => eq.id === ea.equipmentId);
          return [
            String(idx + 1),
            item?.name || 'Studio Gear',
            item?.category || 'Camera',
            item?.serialNumber || '—',
            String(ea.quantity),
            ea.isCheckedOut ? 'Checked Out' : 'Ready for Dispatch',
          ];
        })
      : [
          [
            '1',
            `Tier ${daySchedule.cameraCategory || 'CAT_2'} Cinema & Still Rig`,
            daySchedule.droneIncluded ? 'Camera + 4K Drone' : 'Camera Rig',
            'STUDIO-KIT',
            String(daySchedule.cameraCount || 2),
            'Ready for Dispatch',
          ],
        ];

  autoTable(doc, {
    startY: afterCrewY + 11,
    head: [['#', 'EQUIPMENT / CAMERA BODY', 'CATEGORY', 'SERIAL NO.', 'QTY', 'DISPATCH STATUS']],
    body: equipRows,
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5,
      cellPadding: 2.5,
    },
    bodyStyles: {
      fillColor: [255, 255, 255],
      textColor: [15, 23, 42],
      fontSize: 8,
      cellPadding: 2.5,
    },
    theme: 'grid',
    margin: { left: 15, right: 15 },
  });

  const afterEquipY = (doc as any).lastAutoTable?.finalY || afterCrewY + 45;

  if (daySchedule.notes) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text('3. SPECIAL PRODUCTION INSTRUCTIONS & PACKAGE NOTES:', 15, afterEquipY + 8);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    const splitNotes = doc.splitTextToSize(daySchedule.notes, pageWidth - 30);
    doc.text(splitNotes, 15, afterEquipY + 13);
  }

  const footerY = pageHeight - 12;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 95);
  doc.text(
    `Official Production Call Sheet — ${profile.studioName || 'Royal Studio'} (${profile.phone || '0308-4877073'})`,
    pageWidth / 2,
    footerY,
    { align: 'center' }
  );

  doc.save(
    `CallSheet_Day${daySchedule.dayNumber}_${daySchedule.eventType.replace(/\s+/g, '_')}_${daySchedule.date}.pdf`
  );
}

export async function generateSampleStationeryPDF(
  profile: AdminProfile,
  docType: 'INVOICE' | 'QUOTATION' = 'INVOICE'
): Promise<void> {
  const sampleClient: Client = {
    id: 'sample-client',
    name: 'Ahsan & Zoya Wedding Family',
    phone: '0300-1234567',
    whatsapp: '0300-1234567',
    email: 'client@example.com',
    city: 'Burewala',
    address: 'Canal View Housing Scheme, Burewala',
    notes: 'Sample stationery preview',
    createdDate: new Date().toISOString().slice(0, 10),
    createdBy: 'Admin',
  };

  const sampleEvent: Event = {
    id: 'sample-event-01',
    title: 'Ahsan & Zoya Royal Wedding',
    category: 'Wedding',
    weddingSubtype: 'Barat',
    clientId: sampleClient.id,
    eventDate: new Date().toISOString().slice(0, 10),
    startTime: '18:00',
    endTime: '23:30',
    venue: 'Royal Palm Marquee',
    city: 'Burewala',
    status: 'Confirmed',
    isMultiDay: true,
    packagePrice: 285000,
    discount: 10000,
    tax: 0,
    advancePaid: 140000,
    totalClientPayments: 140000,
    remainingBalance: 135000,
    staffCost: 45000,
    rentalCost: 0,
    eventExpenses: 15000,
    netProfit: 215000,
    netMargin: 78,
    notes: '2x Full-Frame Cinema Rigs, 2x Portrait Photographers, 4K Aerial Drone Coverage, Luxury Italian Album',
    createdBy: 'Admin',
    createdDate: new Date().toISOString().slice(0, 10),
    updatedDate: new Date().toISOString().slice(0, 10),
  };

  const sampleDays: EventDaySchedule[] = [
    {
      id: 'sample-day-1',
      eventId: sampleEvent.id,
      dayNumber: 1,
      date: new Date().toISOString().slice(0, 10),
      eventType: 'Barat',
      venue: 'Royal Palm Marquee, Burewala',
      startTime: '18:00',
      endTime: '23:30',
      callTime: '16:30',
      dressCode: 'Formal Studio Black',
      timingMode: 'NIGHT_TIME',
      customPrice: 155000,
      photographersCount: 2,
      cinematographersCount: 2,
      droneIncluded: true,
      notes: 'Cinematic Barat entry, couple portraits & aerial drone coverage',
    },
    {
      id: 'sample-day-2',
      eventId: sampleEvent.id,
      dayNumber: 2,
      date: new Date().toISOString().slice(0, 10),
      eventType: 'Walima',
      venue: 'Grand Garrison Banquet, Burewala',
      startTime: '19:00',
      endTime: '23:30',
      callTime: '17:30',
      dressCode: 'Formal Studio Black',
      timingMode: 'NIGHT_TIME',
      customPrice: 130000,
      photographersCount: 2,
      cinematographersCount: 1,
      droneIncluded: true,
      notes: 'Luxury Walima reception portrait session & highlight film',
    },
  ];

  if (docType === 'QUOTATION') {
    const sampleQuotation: Quotation = {
      id: 'sample-quo-01',
      quotationNumber: `${profile.quotationPrefix || 'RS-QUO-'}SAMPLE`,
      eventId: sampleEvent.id,
      clientId: sampleClient.id,
      issueDate: new Date().toISOString().slice(0, 10),
      validUntil: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
      subtotal: 285000,
      discount: 10000,
      tax: 0,
      total: 275000,
      paymentTerms: profile.paymentTerms || '50% advance upon booking confirmation.',
      notes: 'Official Stationery Preview — Customized from Admin Panel',
      createdBy: 'Admin',
    };
    await generateQuotationPDF(sampleQuotation, sampleEvent, sampleClient, profile, sampleDays);
    return;
  }

  const sampleInvoice: Invoice = {
    id: 'sample-inv-01',
    invoiceNumber: `${profile.invoicePrefix || 'RS-INV-'}SAMPLE`,
    eventId: sampleEvent.id,
    clientId: sampleClient.id,
    issueDate: new Date().toISOString().slice(0, 10),
    dueDate: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
    subtotal: 285000,
    discount: 10000,
    tax: 0,
    total: 275000,
    paidAmount: 140000,
    remainingAmount: 135000,
    status: 'Partially Paid',
    paymentTerms: profile.paymentTerms || '50% advance upon booking confirmation.',
    notes: 'Official Stationery Preview — Customized from Admin Panel',
    createdBy: 'Admin',
  };

  await generateInvoicePDF(sampleInvoice, sampleEvent, sampleClient, profile, sampleDays, [
    {
      id: 'sample-pay-1',
      paymentId: 'RS-PAY-SAMPLE',
      eventId: sampleEvent.id,
      invoiceId: sampleInvoice.id,
      amount: 140000,
      paymentDate: new Date().toISOString().slice(0, 10),
      method: 'Bank Transfer',
      reference: 'MEEZAN-984120',
      notes: 'Booking Advance Deposit',
      createdBy: 'Admin',
    },
  ]);
}

