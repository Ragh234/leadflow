"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAddDiscussion } from "@/hooks/use-leads";
import {
  addLocalDays,
  combineLocalDateAndTime,
  followUpPresets,
  toDateInputValue,
  toTimeInputValue,
} from "@/lib/follow-up";
import { formatFollowUp } from "@/lib/format";

interface AddDiscussionFormProps {
  leadId: number;
  now: Date;
}

export function AddDiscussionForm({ leadId, now }: AddDiscussionFormProps) {
  const addDiscussion = useAddDiscussion(leadId);
  const [note, setNote] = useState("");
  const [withFollowUp, setWithFollowUp] = useState(false);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [error, setError] = useState<string | null>(null);

  function toggleFollowUp(checked: boolean) {
    setWithFollowUp(checked);
    if (checked && !date) {
      // Sensible default: tomorrow at 10 AM, editable.
      const tomorrow = addLocalDays(now, 1);
      setDate(toDateInputValue(tomorrow));
      setTime("10:00");
    }
  }

  function applyPreset(at: Date) {
    setDate(toDateInputValue(at));
    setTime(toTimeInputValue(at));
    setWithFollowUp(true);
  }

  function submit() {
    if (!note.trim()) return setError("Write a note before saving.");

    let followUpAt: string | null = null;
    if (withFollowUp) {
      const at = combineLocalDateAndTime(date, time);
      if (!at) return setError("Pick a date and a time for the follow-up.");
      followUpAt = at.toISOString();
    }

    addDiscussion.mutate(
      { note: note.trim(), follow_up_at: followUpAt },
      {
        onSuccess: () => {
          toast.success(followUpAt ? `Note saved. Follow-up ${formatFollowUp(followUpAt, new Date())}.` : "Note saved.");
          setNote("");
          setWithFollowUp(false);
          setDate("");
          setTime("");
          setError(null);
        },
        onError: (err) => setError(err.message),
      },
    );
  }

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
      className="space-y-3"
    >
      <Label htmlFor={`note-${leadId}`} className="sr-only">
        New discussion note
      </Label>
      <Textarea
        id={`note-${leadId}`}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            submit();
          }
        }}
        placeholder="Log a new discussion…"
        rows={3}
        maxLength={2000}
        aria-invalid={error !== null && !note.trim()}
        className="resize-y bg-white"
      />

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <div className="flex items-center gap-2">
          <Checkbox
            id={`follow-up-${leadId}`}
            checked={withFollowUp}
            onCheckedChange={(checked) => toggleFollowUp(checked === true)}
          />
          <Label htmlFor={`follow-up-${leadId}`} className="cursor-pointer font-normal">
            Set follow-up
          </Label>
        </div>
        <Input
          type="date"
          aria-label="Follow-up date"
          value={date}
          min={toDateInputValue(now)}
          onChange={(e) => {
            setDate(e.target.value);
            setWithFollowUp(true);
          }}
          className="h-8 w-auto bg-white"
        />
        <Input
          type="time"
          aria-label="Follow-up time"
          value={time}
          onChange={(e) => {
            setTime(e.target.value);
            setWithFollowUp(true);
          }}
          className="h-8 w-auto bg-white"
        />
        <Button type="submit" className="ml-auto" disabled={addDiscussion.isPending}>
          {addDiscussion.isPending ? "Saving…" : "Save note"}
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Quick follow-up times">
        <span className="mr-0.5 text-xs text-slate-500">Quick follow-up:</span>
        {followUpPresets(now).map((preset) => (
          <Button
            key={preset.label}
            type="button"
            variant="outline"
            size="xs"
            onClick={() => applyPreset(preset.at)}
            aria-pressed={withFollowUp && date === toDateInputValue(preset.at) && time === toTimeInputValue(preset.at)}
            className="aria-pressed:border-blue-300 aria-pressed:bg-blue-50 aria-pressed:text-blue-700"
          >
            {preset.label}
          </Button>
        ))}
      </div>

      {error && (
        <p role="alert" className="text-sm text-rose-600">
          {error}
        </p>
      )}
      <p className="text-xs text-slate-400">Follow-up times are in your local time. Ctrl+Enter saves the note.</p>
    </form>
  );
}
