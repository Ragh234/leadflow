"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateLead } from "@/hooks/use-leads";

const PHONE_PATTERN = /^[0-9+()\-.\s]*$/;

interface AddLeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddLeadDialog({ open, onOpenChange }: AddLeadDialogProps) {
  const createLead = useCreateLead();
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);

  function close() {
    setName("");
    setCompany("");
    setPhone("");
    setError(null);
    onOpenChange(false);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) return setError("Full name is required.");
    if (!PHONE_PATTERN.test(phone)) return setError("Phone can only contain digits, spaces and + - ( ).");

    createLead.mutate(
      { name: name.trim(), company: company.trim() || null, phone: phone.trim() || null },
      {
        onSuccess: (lead) => {
          toast.success(`${lead.name} added as a new lead`);
          close();
        },
        onError: (err) => setError(err.message),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : close())}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add new lead</DialogTitle>
          <DialogDescription>New leads start with the status New.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="lead-name">
              Full name <span className="text-rose-500">*</span>
            </Label>
            <Input
              id="lead-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Ananya Iyer"
              maxLength={120}
              autoFocus
              aria-invalid={error !== null && !name.trim()}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lead-company">
              Company <span className="font-normal text-slate-400">(optional)</span>
            </Label>
            <Input
              id="lead-company"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="e.g. Iyer Family Office"
              maxLength={120}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lead-phone">
              Phone <span className="font-normal text-slate-400">(optional)</span>
            </Label>
            <Input
              id="lead-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. +91 98200 12345"
              maxLength={32}
            />
          </div>

          {error && (
            <p role="alert" className="text-sm text-rose-600">
              {error}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={close}>
              Cancel
            </Button>
            <Button type="submit" disabled={createLead.isPending}>
              {createLead.isPending ? "Saving…" : "Save lead"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
