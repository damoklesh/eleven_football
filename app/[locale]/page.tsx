import {notFound} from 'next/navigation';
import {HomePage} from '@/components/home-page';
import {isLocale,locales} from '@/lib/i18n';
export const revalidate=300;
export function generateStaticParams(){return locales.map((locale)=>({locale}));}
export default async function LocaleHome({params}:{params:Promise<{locale:string}>}){const {locale}=await params;if(!isLocale(locale))notFound();return <HomePage locale={locale}/>;}
