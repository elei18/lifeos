'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, childrenApi, profileApi } from '@/lib/supabase';

type Step = 'welcome' | 'children' | 'partner' | 'done';

interface ChildInput {
  name: string;
  season: string;
  year: string;
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('welcome');
  const [children, setChildren] = useState<ChildInput[]>([{ name: '', season: '', year: '' }]);
  const [partnerName, setPartnerName] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleFinish() {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      // Save children
      for (let i = 0; i < children.length; i++) {
        const c = children[i];
        if (!c.name.trim()) continue;
        await childrenApi.create(user.id, {
          name: c.name.trim(),
          birth_season: c.season || null,
          birth_year: c.year ? parseInt(c.year) : null,
          display_order: i,
        });
      }

      // Save profile
      await profileApi.upsert(user.id, {
        partner_name: partnerName.trim() || null,
        onboarding_complete: true,
      });

      router.push('/log');
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-dvh bg-[#faf9f7] flex flex-col">
      {/* Progress dots */}
      <div className="flex justify-center gap-2 pt-12 pb-4">
        {(['welcome', 'children', 'partner'] as Step[]).map((s) => (
          <div
            key={s}
            className={`w-2 h-2 rounded-full transition-all ${
              s === step ? 'bg-amber-600 w-4' : 'bg-stone-300'
            }`}
          />
        ))}
      </div>

      <div className="flex-1 px-6 pt-4">
        {/* Welcome step */}
        {step === 'welcome' && (
          <div className="flex flex-col gap-6">
            <div>
              <p className="text-amber-700 text-sm font-medium tracking-wide uppercase mb-2">Welcome</p>
              <h1 className="text-3xl font-semibold text-stone-900 leading-tight">
                A calm layer for family life.
              </h1>
              <p className="text-stone-500 mt-3 text-base leading-relaxed">
                Log what happens. Understand it better. Show up more clearly for the people you love.
              </p>
            </div>
            <div className="bg-amber-50 rounded-2xl p-5 border border-amber-100">
              <p className="text-stone-700 text-sm leading-relaxed">
                You write short notes — a meltdown at pickup, a quiet evening with your partner, a moment that felt off. LifeOS helps you see what&apos;s actually going on.
              </p>
            </div>
            <button
              onClick={() => setStep('children')}
              className="mt-2 bg-amber-700 text-white rounded-2xl py-4 text-base font-semibold w-full"
            >
              Let&apos;s set up your family →
            </button>
          </div>
        )}

        {/* Children step */}
        {step === 'children' && (
          <div className="flex flex-col gap-6">
            <div>
              <p className="text-amber-700 text-sm font-medium tracking-wide uppercase mb-2">Step 1 of 2</p>
              <h1 className="text-2xl font-semibold text-stone-900">Your kids</h1>
              <p className="text-stone-500 mt-1 text-sm">Name and age so LifeOS can put things in context.</p>
            </div>

            <div className="flex flex-col gap-3">
              {children.map((child, i) => (
                <div key={i} className="bg-white rounded-2xl border border-stone-200 p-4 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-stone-400 uppercase tracking-wide">
                      Child {children.length > 1 ? i + 1 : ''}
                    </span>
                    {children.length > 1 && (
                      <button
                        onClick={() => setChildren(children.filter((_, j) => j !== i))}
                        className="text-stone-300 text-sm"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    placeholder="Name"
                    value={child.name}
                    onChange={(e) => {
                      const updated = [...children];
                      updated[i].name = e.target.value;
                      setChildren(updated);
                    }}
                    className="w-full border border-stone-200 rounded-xl px-4 py-3 text-base text-stone-900 placeholder:text-stone-300 bg-stone-50 focus:outline-none focus:border-amber-400"
                  />
                  <div>
                    <label className="text-xs text-stone-400 mb-1 block">Born around (optional)</label>
                    <div className="flex gap-2">
                      <select
                        value={child.season}
                        onChange={(e) => {
                          const updated = [...children];
                          updated[i].season = e.target.value;
                          setChildren(updated);
                        }}
                        className="flex-1 border border-stone-200 rounded-xl px-3 py-3 text-base text-stone-700 bg-stone-50 focus:outline-none focus:border-amber-400"
                      >
                        <option value="">Season</option>
                        <option value="Spring">Spring</option>
                        <option value="Summer">Summer</option>
                        <option value="Fall">Fall</option>
                        <option value="Winter">Winter</option>
                      </select>
                      <select
                        value={child.year}
                        onChange={(e) => {
                          const updated = [...children];
                          updated[i].year = e.target.value;
                          setChildren(updated);
                        }}
                        className="flex-1 border border-stone-200 rounded-xl px-3 py-3 text-base text-stone-700 bg-stone-50 focus:outline-none focus:border-amber-400"
                      >
                        <option value="">Year</option>
                        {Array.from({ length: 19 }, (_, j) => new Date().getFullYear() - j).map((yr) => (
                          <option key={yr} value={yr}>{yr}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {children.length < 4 && (
              <button
                onClick={() => setChildren([...children, { name: '', season: '', year: '' }])}
                className="text-amber-700 text-sm font-medium py-2"
              >
                + Add another child
              </button>
            )}

            <button
              onClick={() => setStep('partner')}
              disabled={!children.some(c => c.name.trim())}
              className="bg-amber-700 text-white rounded-2xl py-4 text-base font-semibold w-full disabled:opacity-40"
            >
              Next →
            </button>
          </div>
        )}

        {/* Partner step */}
        {step === 'partner' && (
          <div className="flex flex-col gap-6">
            <div>
              <p className="text-amber-700 text-sm font-medium tracking-wide uppercase mb-2">Step 2 of 2</p>
              <h1 className="text-2xl font-semibold text-stone-900">Your partner</h1>
              <p className="text-stone-500 mt-1 text-sm">
                Optional — lets LifeOS personalize insights about your relationship.
              </p>
            </div>

            <input
              type="text"
              placeholder="Partner's name (optional)"
              value={partnerName}
              onChange={(e) => setPartnerName(e.target.value)}
              className="w-full border border-stone-200 rounded-xl px-4 py-3 text-base text-stone-900 placeholder:text-stone-300 bg-white focus:outline-none focus:border-amber-400"
            />

            <p className="text-xs text-stone-400 leading-relaxed">
              LifeOS helps you notice load imbalance and relationship drift — for your awareness only. Nothing is shared with your partner.
            </p>

            <button
              onClick={handleFinish}
              disabled={saving}
              className="bg-amber-700 text-white rounded-2xl py-4 text-base font-semibold w-full disabled:opacity-60"
            >
              {saving ? 'Setting up…' : 'Start using LifeOS →'}
            </button>

            <button
              onClick={handleFinish}
              disabled={saving}
              className="text-stone-400 text-sm py-2 text-center"
            >
              Skip for now
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
