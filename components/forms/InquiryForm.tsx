"use client";

import { useState, type FormEvent } from "react";
import { Send, CheckCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

export default function InquiryForm() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");
    const form = e.currentTarget;
    const data = new FormData(form);

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(data)),
      });
      if (res.ok) {
        setStatus("success");
        form.reset();
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="brideName" className="mb-2 block text-xs font-medium tracking-widest uppercase text-text-muted">
            Bride Name
          </label>
          <Input id="brideName" name="brideName" required placeholder="Bride's full name" />
        </div>
        <div>
          <label htmlFor="groomName" className="mb-2 block text-xs font-medium tracking-widest uppercase text-text-muted">
            Groom Name
          </label>
          <Input id="groomName" name="groomName" required placeholder="Groom's full name" />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="phone" className="mb-2 block text-xs font-medium tracking-widest uppercase text-text-muted">
            Phone
          </label>
          <Input id="phone" name="phone" type="tel" required placeholder="03XX XXXXXXX" />
        </div>
        <div>
          <label htmlFor="email" className="mb-2 block text-xs font-medium tracking-widest uppercase text-text-muted">
            Email
          </label>
          <Input id="email" name="email" type="email" required placeholder="your@email.com" />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="weddingDate" className="mb-2 block text-xs font-medium tracking-widest uppercase text-text-muted">
            Wedding Date
          </label>
          <Input id="weddingDate" name="weddingDate" type="date" required />
        </div>
        <div>
          <label htmlFor="city" className="mb-2 block text-xs font-medium tracking-widest uppercase text-text-muted">
            City
          </label>
          <Input id="city" name="city" required placeholder="Burewala, Lahore, etc." />
        </div>
      </div>

      <div>
        <label htmlFor="venue" className="mb-2 block text-xs font-medium tracking-widest uppercase text-text-muted">
          Venue
        </label>
        <Input id="venue" name="venue" placeholder="Wedding venue name" />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="services" className="mb-2 block text-xs font-medium tracking-widest uppercase text-text-muted">
            Services Needed
          </label>
          <Select id="services" name="services" required defaultValue="">
            <option value="" disabled>Select services</option>
            <option value="photography">Wedding Photography</option>
            <option value="films">Cinematic Films</option>
            <option value="photo-film">Photo + Film Package</option>
            <option value="bridal">Bridal Portraits</option>
            <option value="drone">Drone Coverage</option>
            <option value="full">Full Royal Signature</option>
          </Select>
        </div>
        <div>
          <label htmlFor="budget" className="mb-2 block text-xs font-medium tracking-widest uppercase text-text-muted">
            Estimated Budget
          </label>
          <Select id="budget" name="budget" defaultValue="">
            <option value="">Select budget range</option>
            <option value="50k-100k">PKR 50,000 – 100,000</option>
            <option value="100k-200k">PKR 100,000 – 200,000</option>
            <option value="200k-300k">PKR 200,000 – 300,000</option>
            <option value="300k+">PKR 300,000+</option>
          </Select>
        </div>
      </div>

      <div>
        <label htmlFor="message" className="mb-2 block text-xs font-medium tracking-widest uppercase text-text-muted">
          Message
        </label>
        <Textarea
          id="message"
          name="message"
          rows={4}
          placeholder="Tell us about your wedding vision, events (Nikah, Mehndi, Barat, Walima), and any special requests..."
        />
      </div>

      <Button type="submit" variant="accent" disabled={status === "loading" || status === "success"}>
        {status === "loading" ? (
          "Sending..."
        ) : status === "success" ? (
          <>
            <CheckCircle size={18} />
            Inquiry Sent Successfully
          </>
        ) : (
          <>
            Send Inquiry
            <Send size={16} />
          </>
        )}
      </Button>

      {status === "error" && (
        <p className="text-sm text-red-600">
          Something went wrong. Please try WhatsApp or call us directly.
        </p>
      )}
    </form>
  );
}
