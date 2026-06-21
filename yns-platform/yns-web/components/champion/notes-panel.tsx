"use client";

import { useState } from "react";
import { Check, Eye, Loader2, Lock, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { saveNote } from "@/lib/api/champion";
import type { NoteVisibility } from "@/types/champion";

interface NotesPanelProps {
  studentId: string;
}

type SaveState = "idle" | "saving" | "saved";

function NoteForm({
  studentId,
  visibility,
  title,
  icon: Icon,
  placeholder,
  helper,
  helperIcon: HelperIcon,
  buttonLabel,
}: {
  studentId: string;
  visibility: NoteVisibility;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  placeholder: string;
  helper: string;
  helperIcon: React.ComponentType<{ className?: string }>;
  buttonLabel: string;
}) {
  const [value, setValue] = useState("");
  const [state, setState] = useState<SaveState>("idle");

  async function handleSave() {
    if (!value.trim()) return;
    setState("saving");
    await saveNote({ studentId, note: value, visibility });
    setState("saved");
    setTimeout(() => setState("idle"), 2000);
  }

  return (
    <div className="flex flex-col">
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-brand">
        <Icon className="h-4 w-4" />
        {title}
      </div>
      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
      />
      <Button
        onClick={handleSave}
        disabled={state === "saving" || !value.trim()}
        className="mt-3 w-full"
      >
        {state === "saving" && <Loader2 className="h-4 w-4 animate-spin" />}
        {state === "saved" && <Check className="h-4 w-4" />}
        {state === "saved" ? "Saved" : buttonLabel}
      </Button>
      <p className="mt-2 flex items-center gap-1.5 text-xs text-gray-400">
        <HelperIcon className="h-3.5 w-3.5" />
        {helper}
      </p>
    </div>
  );
}

export function NotesPanel({ studentId }: NotesPanelProps) {
  return (
    <Card>
      <div className="border-b border-gray-100 p-5">
        <h2 className="text-sm font-bold text-brand">Notes</h2>
      </div>
      <div className="grid grid-cols-1 gap-6 p-5 md:grid-cols-2">
        <NoteForm
          studentId={studentId}
          visibility="student"
          title="Note for Student"
          icon={UserRound}
          placeholder="Write a message that the student can see..."
          helper="This note will be visible to the student."
          helperIcon={Eye}
          buttonLabel="Save Note for Student"
        />
        <NoteForm
          studentId={studentId}
          visibility="private"
          title="Private Mentor Note"
          icon={Lock}
          placeholder="Write a private note only you can see..."
          helper="Only mentors can see this note."
          helperIcon={Lock}
          buttonLabel="Save Private Note"
        />
      </div>
    </Card>
  );
}
