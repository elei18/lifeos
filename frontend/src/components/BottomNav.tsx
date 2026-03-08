'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/log', label: 'Log', icon: '✏️' },
  { href: '/journal', label: 'Journal', icon: '📖' },
  { href: '/digest', label: 'Digest', icon: '🌅' },
  { href: '/patterns', label: 'Patterns', icon: '🔁' },
  { href: '/settings', label: 'Settings', icon: '⚙️' },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-stone-200 safe-area-pb">
      <div className="flex max-w-lg mx-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center flex-1 py-2 gap-0.5 transition-colors',
                isActive ? 'text-amber-700' : 'text-stone-400'
              )}
            >
              <span className="text-xl leading-none">{item.icon}</span>
              <span className={cn(
                'text-[10px] font-medium tracking-wide',
                isActive ? 'text-amber-700' : 'text-stone-400'
              )}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
