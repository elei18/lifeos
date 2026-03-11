'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, childrenApi, profileApi, entriesApi } from '@/lib/supabase';
import type { Child, UserProfile, PersonType } from '@/lib/supabase';
import { BottomNav } from '@/components/BottomNav';
import { cn } from '@/lib/utils';
import { Mic, MicOff, Send, Loader2 } from 'lucide-react';

export default function LogPage() {
  const router = useRouter();
  const [children, setChildren] = useState<Child[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [selectedPersonType, setSelectedPersonType] = useState<PersonType>('child');
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }
      const [kids, prof] = await Promise.all([
        childrenApi.list(user.id),
        profileApi.get(user.id),
      ]);
      setChildren(kids);
      setProfile(prof);
      if (!prof?.onboarding_complete) { router.push('/onboarding'); return; }
      if (kids.length > 0) setSelectedChildId(kids[0].id);
    }
    load();
  }, [router]);

  // Person selector options
  const personOptions: { type: PersonType; label: string; emoji: string; id?: string }[] = [
    ...children.map(c => ({ type: 'child' as PersonType, label: c.name, emoji: '🧒', id: c.id })),
    { type: 'partner', label: profile?.partner_name || 'Partner', emoji: '🤝' },
    { type: 'self', label: 'Me', emoji: '🪞' },
    { type: 'household', label: 'Everyone', emoji: '🏠' },
  ];

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      chunksRef.current = [];
      mr.ondataavailable = (e) => chunksRef.current.push(e.data);
      mr.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach(t => t.stop());
        await transcribeAudio(blob);
      };
      mr.start();
      setRecording(true);
    } catch {
      alert('Microphone access needed for voice notes.');
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  }

  async function transcribeAudio(blob: Blob) {
    setTranscribing(true);
    try {
      const formData = new FormData();
      formData.append('audio', blob, 'note.webm');
      const res = await fetch('/api/transcribe', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.transcript) {
        setText(data.transcript);
        textareaRef.current?.focus();
      }
    } catch {
      console.error('Transcription failed');
    } finally {
      setTranscribing(false);
    }
  }

  async function handleSubmit() {
    if (!text.trim()) return;
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Save entry
      const entry = await entriesApi.create(user.id, {
        child_id: selectedPersonType === 'child' ? selectedChildId : null,
        person_type: selectedPersonType,
        raw_text: text.trim(),
      });

      if (!entry) throw new Error('Failed to create entry');

      // Trigger enrichment (non-blocking — navigate immediately)
      fetch('/api/enrich-entry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entryId: entry.id, rawText: text.trim() }),
      });

      // Trigger pattern detection (non-blocking)
      fetch('/api/detect-patterns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });

      router.push(`/entry/${entry.id}`);
    } catch (e) {
      console.error(e);
      setSubmitting(false);
    }
  }

  const selectedOption = personOptions.find(p =>
    p.type === selectedPersonType && (selectedPersonType !== 'child' || p.id === selectedChildId)
  );

  return (
    <div className="min-h-dvh bg-[#faf9f7] flex flex-col">
      {/* Header */}
      <div className="px-5 pt-12 pb-4">
        <h1 className="text-xl font-semibold text-stone-900">What happened?</h1>
        <p className="text-sm text-stone-400 mt-0.5">Log it. We&apos;ll make sense of it together.</p>
      </div>

      {/* Person selector */}
      <div className="px-5 pb-4">
        <p className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-2">About</p>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {personOptions.map((p) => {
            const isSelected = p.type === selectedPersonType &&
              (p.type !== 'child' || p.id === selectedChildId);
            return (
              <button
                key={`${p.type}-${p.id || p.type}`}
                onClick={() => {
                  setSelectedPersonType(p.type);
                  if (p.id) setSelectedChildId(p.id);
                }}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all border',
                  isSelected
                    ? 'bg-amber-700 text-white border-amber-700'
                    : 'bg-white text-stone-600 border-stone-200'
                )}
              >
                <span>{p.emoji}</span>
                <span>{p.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Text input */}
      <div className="flex-1 px-5">
        <div className="bg-white rounded-2xl border border-stone-200 p-4 min-h-40">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={`What happened with ${selectedOption?.label || 'them'}? Just write like you're texting a friend.`}
            className="w-full text-base text-stone-900 placeholder:text-stone-300 bg-transparent focus:outline-none leading-relaxed min-h-32"
            rows={5}
            autoFocus
          />
          {transcribing && (
            <div className="flex items-center gap-2 text-amber-600 text-sm mt-2">
              <Loader2 size={14} className="animate-spin" />
              <span>Transcribing…</span>
            </div>
          )}
        </div>

        {/* Example prompts */}
        {!text && (
          <div className="mt-3 flex flex-wrap gap-2">
            {[
              'Pickup meltdown',
              'Partner seemed checked out',
              'Proud moment',
              'Rough bedtime',
            ].map((prompt) => (
              <button
                key={prompt}
                onClick={() => setText(prompt + ' — ')}
                className="text-xs bg-stone-100 text-stone-500 rounded-full px-3 py-1.5"
              >
                {prompt}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Bottom actions */}
      <div className="px-5 py-4 flex items-center gap-3 page-content">
        {/* Voice button */}
        <button
          onPointerDown={startRecording}
          onPointerUp={stopRecording}
          onPointerLeave={stopRecording}
          className={cn(
            'w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-sm',
            recording ? 'bg-rose-500 scale-110' : 'bg-white border border-stone-200'
          )}
        >
          {recording
            ? <MicOff size={22} className="text-white" />
            : <Mic size={22} className="text-stone-400" />
          }
        </button>

        {/* Submit button */}
        <button
          onClick={handleSubmit}
          disabled={!text.trim() || submitting}
          className="flex-1 h-14 bg-amber-700 text-white rounded-2xl text-base font-semibold flex items-center justify-center gap-2 disabled:opacity-40"
        >
          {submitting ? (
            <Loader2 size={20} className="animate-spin" />
          ) : (
            <>
              <Send size={18} />
              <span>Log it</span>
            </>
          )}
        </button>
      </div>

      <BottomNav />
    </div>
  );
}
