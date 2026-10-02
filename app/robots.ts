import type {MetadataRoute} from 'next'; export default function robots():MetadataRoute.Robots{return {rules:{userAgent:'*',allow:'/'},sitemap:'https://eleven-football.vercel.app/sitemap.xml'}}
