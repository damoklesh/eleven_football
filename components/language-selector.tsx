'use client';

import {usePathname, useRouter} from 'next/navigation';
import {dictionaries, locales, type Locale} from '@/lib/i18n';

export function LanguageSelector({locale}: {locale: Locale}) {
  const pathname = usePathname();
  const router = useRouter();

  function changeLanguage(nextLocale: Locale) {
    const segments = pathname.split('/').filter(Boolean);
    const suffix = segments.slice(1).join('/');
    router.push(`/${nextLocale}${suffix ? `/${suffix}` : ''}`);
  }

  return <label className="language-selector"><span className="sr-only">Language</span><select aria-label="Language" value={locale} onChange={(event) => changeLanguage(event.target.value as Locale)}>{locales.map((option) => <option key={option} value={option}>{dictionaries[option].language}</option>)}</select></label>;
}
