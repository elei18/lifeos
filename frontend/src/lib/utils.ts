import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { formatDistanceToNow, format, differenceInYears, differenceInMonths } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatRelativeTime(dateString: string): string {
  return formatDistanceToNow(new Date(dateString), { addSuffix: true });
}

export function formatDate(dateString: string): string {
  return format(new Date(dateString), 'MMM d');
}

export function formatFullDate(dateString: string): string {
  return format(new Date(dateString), 'EEEE, MMMM d');
}

export function getChildAge(dateOfBirth: string | null): string {
  if (!dateOfBirth) return '';
  const dob = new Date(dateOfBirth);
  const years = differenceInYears(new Date(), dob);
  if (years === 0) {
    const months = differenceInMonths(new Date(), dob);
    return months <= 1 ? '1 month' : `${months} months`;
  }
  return years === 1 ? '1 year' : `${years} years`;
}

export function getPersonLabel(personType: string, childName?: string, partnerName?: string): string {
  switch (personType) {
    case 'child': return childName || 'Child';
    case 'partner': return partnerName || 'Partner';
    case 'self': return 'Me';
    case 'household': return 'Everyone';
    default: return personType;
  }
}

export function getSentimentColor(sentiment: string | null): string {
  if (!sentiment) return 'text-stone-500';
  const map: Record<string, string> = {
    Positive: 'text-emerald-600',
    Proud: 'text-emerald-600',
    Relieved: 'text-emerald-600',
    Neutral: 'text-stone-500',
    Mixed: 'text-amber-600',
    Tired: 'text-amber-600',
    Negative: 'text-rose-500',
    Stressed: 'text-rose-500',
    Overwhelmed: 'text-rose-500',
    Frustrated: 'text-rose-500',
  };
  return map[sentiment] || 'text-stone-500';
}

export function getPatternEmoji(patternType: string | null): string {
  if (!patternType) return '📋';
  const map: Record<string, string> = {
    'Transition Overload': '🔄',
    'Boundary Erosion': '🚧',
    'Misaligned Expectations': '🎯',
    'Authority Confusion': '❓',
    'Emotional Spillover': '💧',
    'Capacity Mismatch': '⚖️',
    'Anticipatory Stress': '🔮',
    'Routine Drift': '🌊',
    'Third-Party Interference': '↔️',
    'Early Warning Signal': '🌤️',
  };
  return map[patternType] || '📋';
}

export function getPersonTypeEmoji(personType: string): string {
  const map: Record<string, string> = {
    child: '🧒',
    partner: '🤝',
    self: '🪞',
    household: '🏠',
  };
  return map[personType] || '👤';
}
