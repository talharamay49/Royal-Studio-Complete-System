"use client";

import { MessageCircle } from "lucide-react";
import { siteConfig } from "@/lib/data";
import { usePublicStudioProfile } from "@/components/shared/StudioProfileContext";
import { Button } from "@/components/ui/button";

export default function WhatsAppButton({
  className,
  customMessage,
  label = "WhatsApp Us",
}: {
  className?: string;
  customMessage?: string;
  label?: string;
}) {
  const profile = usePublicStudioProfile();
  const rawWa = (
    profile?.publicWhatsappNumber ||
    profile?.whatsapp ||
    siteConfig.whatsapp ||
    "0308-4877073"
  ).replace(/[^0-9]/g, "");
  const cleanWa = rawWa.startsWith("92") ? rawWa : `92${rawWa.replace(/^0/, "")}`;
  const studioName = profile?.publicStudioName || profile?.studioName || siteConfig.name;
  const text =
    customMessage ||
    `Hi ${studioName}, I'd like to inquire about wedding photography and check date availability.`;
  const url = `https://wa.me/${cleanWa}?text=${encodeURIComponent(text)}`;

  return (
    <Button asChild variant="whatsapp" className={className}>
      <a href={url} target="_blank" rel="noopener noreferrer">
        <MessageCircle size={18} />
        <span>{label}</span>
      </a>
    </Button>
  );
}
