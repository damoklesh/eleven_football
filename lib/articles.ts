import fs from 'node:fs'; import path from 'node:path'; import matter from 'gray-matter'; import { z } from 'zod';
export const categories=['Actualidad','Táctica','Historias','Archivo','Cultura','Jugadores','Clubes','Datos'] as const;
export type Category=typeof categories[number];
const schema=z.object({title:z.string().min(1),slug:z.string().regex(/^[a-z0-9-]+$/),description:z.string().min(1),date:z.string().datetime({offset:true}),updatedAt:z.string().datetime({offset:true}).optional(),category:z.enum(categories),tags:z.array(z.string()).default([]),author:z.string().default('ELEVEN'),featured:z.boolean().default(false),breaking:z.boolean().default(false),trending:z.boolean().default(false),homepagePriority:z.number().default(0),heroImage:z.string().optional(),heroAlt:z.string().default('Imagen editorial de fútbol'),readingTime:z.number().positive().default(5),sources:z.array(z.object({name:z.string(),url:z.string().url()})).default([])});
export type Article=z.infer<typeof schema>&{body:string}; const dir=path.join(process.cwd(),'content/articles');
export function getAllArticles():Article[]{if(!fs.existsSync(dir))return [];const articles=fs.readdirSync(dir).filter(f=>f.endsWith('.md')).map(file=>{const parsed=matter(fs.readFileSync(path.join(dir,file),'utf8'));const data=schema.parse(parsed.data);return {...data,body:parsed.content}});return articles.sort((a,b)=>+new Date(b.date)-+new Date(a.date));}
export const getArticleBySlug=(slug:string)=>getAllArticles().find(a=>a.slug===slug);
export const getArticlesByCategory=(category:string)=>getAllArticles().filter(a=>a.category.toLowerCase()===category.toLowerCase());
export const getFeaturedArticle=()=>getAllArticles().filter(a=>a.featured).sort((a,b)=>b.homepagePriority-a.homepagePriority)[0]??getAllArticles()[0];
export const getTrendingArticles=()=>{const all=getAllArticles();return [...all.filter(a=>a.trending),...all.filter(a=>!a.trending)].slice(0,5)};
export const getBreakingArticles=()=>getAllArticles().filter(a=>a.breaking);
export function getRelatedArticles(article:Article){return getAllArticles().filter(a=>a.slug!==article.slug).sort((a,b)=>{const score=(x:Article)=>Number(x.category===article.category)*3+x.tags.filter(t=>article.tags.includes(t)).length;return score(b)-score(a)||+new Date(b.date)-+new Date(a.date)}).slice(0,3)}
