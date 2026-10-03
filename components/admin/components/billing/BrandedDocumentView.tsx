import React, { useRef, useState } from 'react';
import { Download, Printer, X, FileText } from 'lucide-react';
import {
  Event,
  Client,
  Invoice,
  Quotation,
  AdminProfile,
  EventDaySchedule,
  Payment,
} from '../../types';
import { formatPKR, formatDate } from '../../utils/calculations';
import {
  generateInvoicePDF,
  generateQuotationPDF,
  generatePaymentReceiptPDF,
  generateEventDocumentPDF,
} from '../../utils/pdfGenerator';
import { useStudioData } from '../../context/StudioDataContext';

interface BrandedDocumentViewProps {
  type: 'INVOICE' | 'QUOTATION' | 'RECEIPT' | 'EVENT_SUMMARY';
  invoice?: Invoice;
  quotation?: Quotation;
  selectedPayment?: Payment;
  event: Event;
  client: Client;
  profile: AdminProfile;
  daySchedules?: EventDaySchedule[];
  payments?: Payment[];
  onClose: () => void;
}

export const BrandedDocumentView: React.FC<BrandedDocumentViewProps> = ({
  type,
  invoice,
  quotation,
  selectedPayment,
  event,
  client,
  profile,
  daySchedules = [],
  payments = [],
  onClose,
}) => {
  const printContainerRef = useRef<HTMLDivElement>(null);
  const [activeDocType, setActiveDocType] = useState<'INVOICE' | 'QUOTATION' | 'RECEIPT' | 'EVENT_SUMMARY'>(type);
  const { packages } = useStudioData();

  const selectedPackage = packages.find((p) => p.id === event.packageId);

  const isInvoice = activeDocType === 'INVOICE';
  const isReceipt = activeDocType === 'RECEIPT';
  const isEventDoc = activeDocType === 'EVENT_SUMMARY';
  const docNumber = isInvoice
    ? invoice?.invoiceNumber || `${profile.invoicePrefix || 'RS-INV-'}${event.id.slice(-4).toUpperCase()}`
    : isReceipt
    ? `RS-RCPT-${(selectedPayment?.id || event.id).slice(-4).toUpperCase()}`
    : isEventDoc
    ? `RS-EVT-${event.id.slice(-4).toUpperCase()}`
    : quotation?.quotationNumber || `${profile.quotationPrefix || 'RS-QUO-'}${event.id.slice(-4).toUpperCase()}`;

  const issueDate = isInvoice
    ? invoice?.issueDate || event.createdDate?.split('T')[0] || new Date().toISOString().split('T')[0]
    : quotation?.issueDate || event.createdDate?.split('T')[0] || new Date().toISOString().split('T')[0];

  const secondaryDate = isInvoice
    ? invoice?.dueDate || event.eventDate
    : quotation?.validUntil || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const secondaryLabel = isInvoice ? 'Due Date' : 'Valid Until';

  const subtotal = isInvoice
    ? invoice?.subtotal ?? event.packagePrice
    : quotation?.subtotal ?? event.packagePrice;
  const discount = isInvoice
    ? invoice?.discount ?? event.discount ?? 0
    : quotation?.discount ?? event.discount ?? 0;
  const tax = isInvoice
    ? invoice?.tax ?? event.tax ?? 0
    : quotation?.tax ?? event.tax ?? 0;
  const grandTotal = isInvoice
    ? invoice?.total ?? subtotal - discount + tax
    : quotation?.total ?? subtotal - discount + tax;
  const amountPaid = isInvoice
    ? invoice?.paidAmount ?? event.totalClientPayments ?? event.advancePaid ?? 0
    : event.totalClientPayments ?? event.advancePaid ?? 0;
  const balanceDue = isInvoice
    ? invoice?.remainingAmount ?? Math.max(0, grandTotal - amountPaid)
    : Math.max(0, grandTotal - amountPaid);

  // Status Stamp
  let stampText = 'OFFICIAL PROPOSAL';
  let stampColor = 'border-amber-700 text-amber-900 bg-amber-100/90';
  if (isInvoice) {
    if (balanceDue <= 0) {
      stampText = 'PAID IN FULL';
      stampColor = 'border-emerald-600 text-emerald-800 bg-emerald-50/95';
    } else if (amountPaid > 0) {
      stampText = 'PARTIALLY PAID';
      stampColor = 'border-amber-600 text-amber-800 bg-amber-50/95';
    } else {
      stampText = 'UNPAID';
      stampColor = 'border-rose-600 text-rose-800 bg-rose-50/95';
    }
  } else if (isReceipt) {
    stampText = 'OFFICIAL RECEIPT';
    stampColor = 'border-emerald-600 text-emerald-800 bg-emerald-50/95';
  } else if (isEventDoc) {
    stampText = 'OFFICIAL DOSSIER';
    stampColor = 'border-slate-700 text-slate-900 bg-slate-100/95';
  }

  const eventTypeDisplay = event.weddingSubtype
    ? `${event.category} (${event.weddingSubtype})`
    : event.category;
  const packageDisplay = selectedPackage?.name || `${event.category} Custom Coverage`;

  // Dynamic items / services / additional services
  const items =
    event.isMultiDay && daySchedules.length > 0
      ? daySchedules.map((d, i) => ({
          title: `Day ${d.dayNumber || i + 1}: ${d.eventType} Ceremony Coverage (${d.venue || event.venue})`,
          details: [
            `Crew: ${d.photographersCount || 1} Photographer(s), ${d.cinematographersCount || 1} Cinematographer(s)`,
            d.droneIncluded ? '4K Aerial Drone Coverage' : '',
            d.notes || '',
          ]
            .filter(Boolean)
            .join(' • '),
          date: formatDate(d.date || event.eventDate),
          qty: 1,
          rate: d.customPrice,
          amount: d.customPrice,
        }))
      : [
          {
            title: `${packageDisplay} — ${event.title}`,
            details:
              selectedPackage?.deliverables && selectedPackage.deliverables.length > 0
                ? `Services & Deliverables: ${selectedPackage.deliverables.join(' • ')}`
                : event.notes || 'Luxury Wedding Photography, 4K Cinematic Highlight & Full Event Coverage',
            date: formatDate(event.eventDate),
            qty: 1,
            rate: subtotal,
            amount: subtotal,
          },
        ];

  const relevantPayments = payments.filter(
    (p) => p.eventId === event.id || (invoice && p.invoiceId === invoice.id)
  );

  // Official Royal Studio stationery background (`image.png` AS-IS) and logo (`RoyalLogo.png` AS-IS)
  const stationeryBgSrc =
    (isInvoice ? profile.invoiceBackground : profile.quotationBackground) ||
    profile.documentBackground ||
    '/image.png';
  const officialLogoSrc =
    profile.documentLogo || profile.primaryLogo || profile.logo || '/RoyalLogo.png';

  const handleDownloadPDF = async () => {
    if (isReceipt) {
      const paymentRecord: Payment = selectedPayment ||
        relevantPayments[0] || {
          id: `pay-${event.id.slice(-4)}`,
          eventId: event.id,
          invoiceId: invoice?.id,
          amount: amountPaid || grandTotal,
          paymentDate: issueDate,
          method: 'Bank Transfer',
          reference: docNumber,
          notes: `Payment received for ${event.title}`,
          receivedBy: profile.studioName || 'Royal Studio',
        };
      await generatePaymentReceiptPDF(paymentRecord, event, client, profile, relevantPayments);
      return;
    }

    if (isEventDoc) {
      await generateEventDocumentPDF(event, client, profile, daySchedules, selectedPackage);
      return;
    }

    if (isInvoice) {
      const invToPrint: Invoice = invoice || {
        id: 'inv-dl',
        invoiceNumber: docNumber,
        clientId: client.id,
        eventId: event.id,
        issueDate,
        dueDate: secondaryDate,
        subtotal,
        discount,
        tax,
        total: grandTotal,
        paidAmount: amountPaid,
        remainingAmount: balanceDue,
        paymentTerms: profile.paymentTerms || 'Bank Transfer / Cash / JazzCash',
        notes: event.notes || `Invoice for ${event.title}`,
        status: balanceDue <= 0 ? 'Paid' : amountPaid > 0 ? 'Partially Paid' : 'Unpaid',
        createdBy: profile.studioName || 'Royal Studio',
      };
      await generateInvoicePDF(
        invToPrint,
        event,
        client,
        profile,
        daySchedules,
        relevantPayments,
        selectedPackage
      );
    } else {
      const quoToPrint: Quotation = quotation || {
        id: 'quo-dl',
        quotationNumber: docNumber,
        clientId: client.id,
        eventId: event.id,
        issueDate,
        validUntil: secondaryDate,
        subtotal,
        discount,
        tax,
        total: grandTotal,
        paymentTerms: profile.paymentTerms || '50% advance to lock dates and crew',
        notes: event.notes || `Proposal for ${event.title}`,
        createdBy: profile.studioName || 'Royal Studio',
      };
      await generateQuotationPDF(
        quoToPrint,
        event,
        client,
        profile,
        daySchedules,
        selectedPackage
      );
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="royal-print-modal-root fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-xs flex items-start sm:items-center justify-center p-2 sm:p-6 print:p-0 print:bg-transparent print:static print:overflow-visible">
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 0mm;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body * {
            visibility: hidden;
          }
          .royal-print-sheet,
          .royal-print-sheet * {
            visibility: visible !important;
          }
          .royal-print-sheet {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 210mm !important;
            height: 297mm !important;
            max-height: 297mm !important;
            margin: 0 !important;
            padding: 12mm 14mm !important;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
            overflow: hidden !important;
            page-break-after: avoid !important;
            page-break-inside: avoid !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>

      <div className="max-w-[210mm] w-full flex flex-col items-center my-auto">
        {/* Control Top Bar (Hidden when printing) */}
        <div className="w-full flex flex-wrap items-center justify-between pb-3 gap-2 text-white print:hidden">
          <div className="flex items-center gap-3">
            <span className="font-bold text-sm tracking-wide text-amber-400 uppercase flex items-center gap-1.5">
              <FileText className="w-4 h-4" />
              {profile.studioName || 'Royal Studio'} Official {activeDocType}
            </span>
            <span className="text-xs text-gray-300 font-mono">({docNumber})</span>

            <div className="inline-flex rounded-lg bg-slate-800 p-0.5 border border-slate-700 ml-2">
              <button
                type="button"
                onClick={() => setActiveDocType('INVOICE')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  activeDocType === 'INVOICE'
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                Invoice
              </button>
              <button
                type="button"
                onClick={() => setActiveDocType('QUOTATION')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  activeDocType === 'QUOTATION'
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                Quotation
              </button>
              <button
                type="button"
                onClick={() => setActiveDocType('RECEIPT')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  activeDocType === 'RECEIPT'
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                Receipt
              </button>
              <button
                type="button"
                onClick={() => setActiveDocType('EVENT_SUMMARY')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  activeDocType === 'EVENT_SUMMARY'
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                Event Sheet
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer border border-slate-600"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print (A4)</span>
            </button>
            <button
              onClick={handleDownloadPDF}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
              title="Close Preview"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* OFFICIAL A4 DOCUMENT SHEET LAYERED DIRECTLY OVER image.png AS-IS */}
        <div
          ref={printContainerRef}
          className="royal-print-sheet w-full max-w-[210mm] min-h-[297mm] bg-[#f0efe9] text-slate-900 rounded-xl shadow-2xl border border-amber-900/15 p-6 sm:p-10 relative overflow-hidden font-sans flex flex-col justify-between"
          style={{
            WebkitPrintColorAdjust: 'exact',
            printColorAdjust: 'exact',
          }}
        >
          {/* ACTUAL UPLOADED image.png FULL-PAGE DOCUMENT BACKGROUND AS-IS */}
          <img
            src={stationeryBgSrc}
            alt="Royal Studio Official Stationery Background"
            className="absolute inset-0 w-full h-full object-fill pointer-events-none select-none z-0"
            onError={(e) => {
              const target = e.currentTarget as HTMLImageElement;
              if (!target.src.endsWith('/image.png')) {
                target.src = '/image.png';
              }
            }}
          />

          {/* TOP DOCUMENT CONTENT */}
          <div className="relative z-10">
            {/* Header watermark timestamp */}
            <div className="flex justify-between items-center text-[10px] text-slate-500 pb-2.5 border-b border-slate-300/70 mb-5">
              <span>
                {new Date().toLocaleDateString('en-GB')},{' '}
                {new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
              </span>
              <span className="font-semibold tracking-wider text-slate-600 uppercase">
                {profile.studioName || 'Royal Studio'} — Official {activeDocType}
              </span>
            </div>

            {/* HEADER SECTION WITH ORIGINAL RoyalLogo.png AS-IS */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6">
              <div>
                <div className="flex items-center gap-3.5 mb-1.5">
                  <img
                    src={officialLogoSrc}
                    alt={`${profile.studioName || 'Royal Studio'} Official Logo`}
                    className="h-14 w-auto object-contain select-none shrink-0"
                    onError={(e) => {
                      const target = e.currentTarget as HTMLImageElement;
                      if (!target.src.endsWith('/RoyalLogo.png')) {
                        target.src = '/RoyalLogo.png';
                      }
                    }}
                  />
                  <div>
                    <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 font-serif">
                      {isReceipt
                        ? 'PAYMENT RECEIPT'
                        : isEventDoc
                        ? 'EVENT DOSSIER'
                        : activeDocType}
                    </h1>
                    <p className="text-[11px] font-bold tracking-[0.18em] text-[#a58137] uppercase">
                      {profile.letterheadText ||
                        `${profile.studioName || 'ROYAL STUDIO'} — PHOTOGRAPHY & FILMS`}
                    </p>
                  </div>
                </div>
                <p className="text-[11px] font-semibold italic text-slate-700 pl-1">
                  &quot;{profile.tagline || 'Luxury wedding photography, cinematic films, and brand shoots.'}&quot;
                </p>
              </div>

              {/* Status Stamp & Metadata */}
              <div className="flex flex-col sm:items-end bg-white/75 backdrop-blur-[1px] px-3.5 py-2.5 rounded-lg border border-slate-300/60 shadow-2xs">
                <div
                  className={`px-3.5 py-0.5 rounded border-2 border-dashed ${stampColor} font-black text-[11px] uppercase tracking-wider mb-2`}
                >
                  {stampText}
                </div>
                <div className="text-xs text-right space-y-0.5">
                  <div>
                    <span className="font-bold text-slate-800">
                      {isInvoice ? 'Invoice No: ' : 'Quotation No: '}
                    </span>
                    <span className="font-mono font-bold text-slate-900">{docNumber}</span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-800">
                      {isInvoice ? 'Invoice Date: ' : 'Quotation Date: '}
                    </span>
                    <span className="text-slate-700">{formatDate(issueDate || '')}</span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-800">{secondaryLabel}: </span>
                    <span className="text-slate-700">{formatDate(secondaryDate || '')}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* CLIENT & STUDIO DETAILS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5 bg-white/80 backdrop-blur-[1px] p-4 rounded-lg border border-slate-300/60">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#a58137] mb-1">
                  {isInvoice ? 'BILL TO (CLIENT)' : 'PROPOSAL PREPARED FOR'}
                </div>
                <div className="text-sm font-bold text-slate-900">{client.name}</div>
                <div className="text-xs text-slate-700 mt-0.5">
                  Contact: <span className="font-medium">{client.phone}</span>
                  {client.whatsapp && client.whatsapp !== client.phone
                    ? ` | WhatsApp: ${client.whatsapp}`
                    : ''}
                </div>
                <div className="text-xs text-slate-700">
                  Address: {client.address || event.venue}, {client.city}
                </div>
              </div>

              <div className="sm:text-left">
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#a58137] mb-1">
                  FROM (OFFICIAL STUDIO)
                </div>
                <div className="text-sm font-bold text-slate-900">
                  {profile.studioName || 'Royal Studio'}
                </div>
                <div className="text-xs text-slate-700 mt-0.5">
                  {profile.publicDisplayAddress ||
                    profile.address ||
                    'Al Jannat Town Entrance, Canal Bungalow Road, Opposite Habib Mall, Burewala, Punjab 61010, Pakistan'}
                </div>
                <div className="text-xs text-slate-700 font-medium">
                  Tel: {profile.phone || '0308-4877073'}
                  {profile.phone2 ? ` / ${profile.phone2}` : ''} •{' '}
                  {profile.email || 'royalstudio089@gmail.com'}
                </div>
              </div>
            </div>

            {/* EVENT & PACKAGE SUMMARY BANNER */}
            <div className="mb-5 rounded-lg overflow-hidden border border-slate-800/15 shadow-2xs bg-white/90">
              <div className="bg-[#0b172a] text-white grid grid-cols-12 px-3.5 py-2 text-[10px] font-bold uppercase tracking-wider">
                <div className="col-span-3">EVENT NAME</div>
                <div className="col-span-2">EVENT TYPE</div>
                <div className="col-span-2">EVENT DATE</div>
                <div className="col-span-3">VENUE</div>
                <div className="col-span-2">PACKAGE</div>
              </div>
              <div className="text-slate-900 grid grid-cols-12 px-3.5 py-2.5 text-xs font-medium border-t border-slate-200 items-center">
                <div className="col-span-3 font-bold text-slate-900 pr-2">{event.title}</div>
                <div className="col-span-2 text-slate-700">{eventTypeDisplay}</div>
                <div className="col-span-2 text-slate-700">
                  {formatDate(event.eventDate)} ({event.startTime || '18:00'})
                </div>
                <div className="col-span-3 text-slate-700 pr-2">
                  {event.venue}, {event.city}
                </div>
                <div className="col-span-2 font-semibold text-amber-900">{packageDisplay}</div>
              </div>
            </div>

            {/* SERVICES, PACKAGE DETAILS & ADDITIONAL SERVICES TABLE */}
            <div className="mb-5 rounded-lg overflow-hidden border border-slate-800/15 shadow-2xs bg-white/90">
              <div className="bg-[#0b172a] text-white grid grid-cols-12 px-3.5 py-2 text-[10px] font-bold uppercase tracking-wider">
                <div className="col-span-6">PACKAGE DETAILS, SERVICES & COVERAGE SCOPE</div>
                <div className="col-span-2 text-center">DATE</div>
                <div className="col-span-2 text-right">RATE</div>
                <div className="col-span-2 text-right">AMOUNT</div>
              </div>
              <div className="divide-y divide-gray-200">
                {items.map((it, idx) => (
                  <div
                    key={idx}
                    className="grid grid-cols-12 px-3.5 py-2.5 text-xs text-slate-700 items-center"
                  >
                    <div className="col-span-6 pr-2">
                      <div className="font-bold text-slate-900">{it.title}</div>
                      {it.details && (
                        <div className="text-[11px] text-slate-600 mt-0.5 leading-snug">
                          {it.details}
                        </div>
                      )}
                    </div>
                    <div className="col-span-2 text-center text-slate-600 text-[11px]">
                      {it.date}
                    </div>
                    <div className="col-span-2 text-right font-mono">{formatPKR(it.rate)}</div>
                    <div className="col-span-2 text-right font-mono font-bold text-slate-900">
                      {formatPKR(it.amount)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* FINANCIAL TOTALS & PAYMENT LEDGER */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 mb-5 items-start">
              {/* Left: Payment History or Proposal Notes */}
              <div className="sm:col-span-7">
                {isInvoice ? (
                  <div className="bg-white/85 p-3 rounded-lg border border-slate-300/70">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[#a58137] mb-1.5">
                      PAYMENT RECEIPTS & ADVANCE LEDGER
                    </div>
                    <div className="text-xs divide-y divide-gray-100">
                      {relevantPayments.length > 0 ? (
                        relevantPayments.map((p, idx) => (
                          <div key={idx} className="flex justify-between py-1 text-slate-700">
                            <div>
                              <span className="font-semibold text-slate-900">
                                {formatDate(p.paymentDate)}
                              </span>
                              <span className="text-gray-400 mx-1.5">—</span>
                              <span className="text-gray-700">{p.method}</span>
                              {p.reference && (
                                <span className="text-gray-500 font-mono ml-1">
                                  ({p.reference})
                                </span>
                              )}
                            </div>
                            <div className="font-mono font-bold text-emerald-700">
                              {formatPKR(p.amount)}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-xs text-gray-500 italic py-1">
                          No advance or installment payments recorded yet.
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="bg-white/85 p-3 rounded-lg border border-slate-300/70">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[#a58137] mb-1">
                      QUOTATION NOTES & DELIVERABLES SUMMARY
                    </div>
                    <div className="text-xs text-slate-700 leading-relaxed">
                      {quotation?.notes ||
                        event.notes ||
                        'Includes high-resolution edited portraits, cinematic highlight film, full event documentary coverage, and online client gallery delivery.'}
                    </div>
                  </div>
                )}
              </div>

              {/* Right: Subtotal, Discount, Total, Advance, Remaining Balance */}
              <div className="sm:col-span-5 bg-white/90 p-3.5 rounded-lg border border-slate-300/70 space-y-1.5 text-xs">
                <div className="flex justify-between py-0.5 text-slate-700 border-b border-gray-100">
                  <span>Subtotal</span>
                  <span className="font-mono font-medium">{formatPKR(subtotal)}</span>
                </div>

                {discount > 0 && (
                  <div className="flex justify-between py-0.5 text-rose-600 border-b border-gray-100">
                    <span>Discount</span>
                    <span className="font-mono font-medium">- {formatPKR(discount)}</span>
                  </div>
                )}

                {tax > 0 && (
                  <div className="flex justify-between py-0.5 text-slate-700 border-b border-gray-100">
                    <span>Tax ({profile.taxRate || 0}%)</span>
                    <span className="font-mono font-medium">+ {formatPKR(tax)}</span>
                  </div>
                )}

                <div className="flex justify-between py-1.5 px-2.5 bg-[#0b172a] text-white rounded font-bold text-sm">
                  <span>{isInvoice ? 'Total Amount' : 'Quoted Total'}</span>
                  <span className="font-mono">{formatPKR(grandTotal)}</span>
                </div>

                <div className="flex justify-between py-0.5 text-emerald-700 font-bold px-1">
                  <span>{isInvoice ? 'Paid Amount' : 'Advance Paid'}</span>
                  <span className="font-mono">{formatPKR(amountPaid)}</span>
                </div>

                <div className="flex justify-between py-1 text-rose-700 font-black px-1 text-sm border-t border-gray-200">
                  <span>Remaining Balance</span>
                  <span className="font-mono">{formatPKR(balanceDue)}</span>
                </div>
              </div>
            </div>

            {/* PAYMENT METHODS & BANK DETAILS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4 bg-white/85 p-3.5 rounded-lg border border-slate-300/70">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#a58137] mb-1">
                  ACCEPTED PAYMENT METHODS
                </div>
                <div className="text-xs text-slate-800 font-medium">
                  {profile.paymentMethods &&
                  profile.paymentMethods.filter((m) => m.isActive).length > 0
                    ? profile.paymentMethods
                        .filter((m) => m.isActive)
                        .map((m) => m.displayName || m.methodName)
                        .join(' / ')
                    : profile.paymentTerms || 'Bank Transfer / Cash / JazzCash / EasyPaisa'}
                </div>
              </div>

              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#a58137] mb-1">
                  BANK / ACCOUNT INFO FOR DEPOSIT
                </div>
                <div className="text-xs text-slate-700 space-y-0.5">
                  <div>
                    <span className="font-semibold text-slate-900">Account Title: </span>
                    <span>{profile.accountTitle || 'Royal Studio'}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-900">Bank: </span>
                    <span>{profile.bankName || 'Meezan Bank / HBL'}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-900">Account / IBAN: </span>
                    <span className="font-mono">{profile.accountNumber || profile.iban || '—'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* TERMS & CONDITIONS */}
            <div className="mb-4">
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#a58137] mb-1">
                TERMS &amp; CONDITIONS
              </div>
              <div className="text-[11px] text-slate-700 leading-relaxed bg-white/85 p-3 rounded-lg border border-slate-300/70">
                {(isInvoice ? profile.defaultInvoiceTerms : profile.defaultQuotationTerms) ||
                  profile.defaultTermsAndConditions ||
                  profile.legalTerms ||
                  '50% advance deposit required upon contract confirmation to lock dates, camera crew, and equipment. Balance payable before final delivery. Edited highlight reels and albums delivered within 15-20 working days.'}
              </div>
            </div>
          </div>

          {/* BOTTOM SIGNATURE, STAMP & OFFICIAL ROYAL LOGO FOOTER */}
          <div className="relative z-10 pt-3 border-t border-slate-300/80">
            <div className="grid grid-cols-2 gap-8 mb-3 items-end">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#a58137] mb-6">
                  CLIENT ACCEPTANCE &amp; SIGNATURE
                </div>
                <div className="border-b border-slate-400 w-48 mb-1"></div>
                <div className="text-xs font-semibold text-slate-700">{client.name}</div>
              </div>

              <div className="text-right flex flex-col items-end">
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#a58137] mb-2">
                  AUTHORIZED STUDIO REPRESENTATIVE
                </div>
                {profile.signatureImage || profile.stampImage ? (
                  <div className="flex items-center gap-3 mb-1.5 h-10">
                    {profile.stampImage && (
                      <img
                        src={profile.stampImage}
                        alt="Official Stamp"
                        className="h-10 w-auto object-contain opacity-90"
                      />
                    )}
                    {profile.signatureImage && (
                      <img
                        src={profile.signatureImage}
                        alt="Authorized Signature"
                        className="h-9 w-auto object-contain"
                      />
                    )}
                  </div>
                ) : (
                  <div className="mb-4"></div>
                )}
                <div className="border-b border-slate-400 w-48 mb-1"></div>
                <div className="text-xs font-semibold text-slate-800">
                  {profile.studioName || 'Royal Studio'} Official Seal
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-300/60 text-[11px] text-slate-600 font-medium">
              <span>
                {profile.documentFooterText ||
                  profile.invoiceLegalFooter ||
                  `Thank you for choosing ${profile.studioName || 'Royal Studio'}. We Capture Your Memories!`}
              </span>
              <img
                src={officialLogoSrc}
                alt={profile.studioName || 'Royal Studio'}
                className="h-8 w-auto object-contain"
                onError={(e) => {
                  const target = e.currentTarget as HTMLImageElement;
                  if (!target.src.endsWith('/RoyalLogo.png')) {
                    target.src = '/RoyalLogo.png';
                  }
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
