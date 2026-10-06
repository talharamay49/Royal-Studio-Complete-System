"use client";

import React, { useEffect, useState } from "react";
import QRCode from "qrcode";
import {
  QrCode,
  Copy,
  Check,
  Download,
  MessageCircle,
  ExternalLink,
  X,
  ShieldCheck,
  Smartphone,
} from "lucide-react";

interface ProposalQrShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  proposalUrl: string;
  quotationNumber: string;
  eventTitle: string;
  eventDate: string;
  clientName: string;
  clientPhone?: string;
  studioName?: string;
  totalAmountText: string;
}

export default function ProposalQrShareModal({
  isOpen,
  onClose,
  proposalUrl,
  quotationNumber,
  eventTitle,
  eventDate,
  clientName,
  clientPhone,
  studioName = "Royal Studio",
  totalAmountText,
}: ProposalQrShareModalProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen || !proposalUrl) return;
    let active = true;
    QRCode.toDataURL(proposalUrl, {
      width: 320,
      margin: 2,
      color: {
        dark: "#0D0D0F",
        light: "#FFFFFF",
      },
      errorCorrectionLevel: "H",
    })
      .then((url) => {
        if (active) setQrDataUrl(url);
      })
      .catch(() => {
        if (active) setQrDataUrl("");
      });
    return () => {
      active = false;
    };
  }, [isOpen, proposalUrl]);

  if (!isOpen) return null;

  const handleCopyLink = () => {
    if (typeof window === "undefined") return;
    navigator.clipboard.writeText(proposalUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadQrPng = () => {
    if (!qrDataUrl) return;
    const link = document.createElement("a");
    link.href = qrDataUrl;
    link.download = `${quotationNumber || "Proposal"}-QR-Code.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const rawClientDigits = (clientPhone || "").replace(/[^0-9]/g, "");
  const formattedClientWa = rawClientDigits
    ? rawClientDigits.startsWith("92")
      ? rawClientDigits
      : `92${rawClientDigits.replace(/^0/, "")}`
    : "";

  const customerWhatsAppMessage = [
    `*${studioName.toUpperCase()} — DIGITAL PROPOSAL & ONLINE APPROVAL*`,
    `Dear *${clientName}*,`,
    ``,
    `Your official interactive proposal for *${eventTitle}* (Primary Date: ${eventDate}) is ready for review.`,
    `• Proposal Ref: *${quotationNumber}*`,
    `• Total Estimate: *${totalAmountText}*`,
    ``,
    `*Review Details, Customize Add-Ons & Digitally Accept Here:*`,
    proposalUrl,
  ].join("\n");

  const whatsappShareUrl = formattedClientWa
    ? `https://wa.me/${formattedClientWa}?text=${encodeURIComponent(customerWhatsAppMessage)}`
    : `https://wa.me/?text=${encodeURIComponent(customerWhatsAppMessage)}`;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Share Digital Proposal via Link and QR Code"
    >
      <div className="w-full max-w-md rounded-2xl border border-[#D4AF37]/40 bg-[#151519] text-[#F5F2EB] shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-[#111115]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#D4AF37]/20 border border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37]">
              <QrCode className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#F5F2EB]">
                Quick-Share Proposal QR &amp; Direct Link
              </h3>
              <p className="text-[11px] text-[#A39E93]">
                Scan with a smartphone camera to share with family members or co-decision-makers
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#A39E93] hover:text-[#F5F2EB] hover:bg-white/5 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {/* QR Card Display */}
          <div className="rounded-2xl border border-[#D4AF37]/30 bg-gradient-to-b from-[#1A1A22] to-[#0D0D0F] p-5 text-center space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/30 text-[10px] font-bold uppercase tracking-widest text-[#D4AF37]">
              <Smartphone className="w-3 h-3" />
              <span>Scan with Phone Camera to Open Proposal</span>
            </div>

            <div className="w-48 h-48 mx-auto rounded-2xl bg-white p-3 shadow-xl border-2 border-[#D4AF37] flex items-center justify-center">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt={`QR Code for Proposal ${quotationNumber}`}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="text-xs text-slate-500 animate-pulse">
                  Generating QR Code...
                </div>
              )}
            </div>

            <div className="space-y-0.5">
              <div className="text-xs font-bold text-[#F5F2EB]">{eventTitle}</div>
              <div className="text-[11px] text-[#A39E93]">
                Prepared for <strong className="text-[#D4AF37]">{clientName}</strong> · Ref:{" "}
                <span className="font-mono text-[#F5F2EB]">{quotationNumber}</span>
              </div>
              <div className="text-xs font-mono font-bold text-emerald-400 pt-0.5">
                {totalAmountText}
              </div>
            </div>
          </div>

          {/* Direct Proposal URL Input + Copy Button */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-[#A39E93]">
              Direct Customer Proposal Link
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={proposalUrl}
                className="w-full rounded-xl border border-white/15 bg-[#0D0D0F] px-3 py-2 text-xs font-mono text-[#F5F2EB] focus:outline-none"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className="px-3.5 py-2 rounded-xl bg-[#D4AF37] hover:opacity-90 text-[#111111] text-xs font-bold inline-flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Action Buttons: Send via WhatsApp, Download QR PNG, Open Proposal */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <a
              href={whatsappShareUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="py-2.5 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Send to Customer WhatsApp</span>
            </a>

            <button
              type="button"
              onClick={handleDownloadQrPng}
              disabled={!qrDataUrl}
              className="py-2.5 px-3.5 rounded-xl border border-[#D4AF37]/50 bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 text-[#D4AF37] text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Download QR Code PNG</span>
            </button>
          </div>

          <div className="rounded-xl border border-white/10 bg-[#0D0D0F] px-3.5 py-2.5 flex items-center justify-between text-[11px] text-[#A39E93]">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Customer can customize add-ons &amp; digitally sign online</span>
            </span>
            <a
              href={proposalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[#D4AF37] hover:underline font-semibold"
            >
              <span>Open</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
