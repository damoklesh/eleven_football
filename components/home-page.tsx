import Image from 'next/image';
import Link from 'next/link';
import {getAllArticles,getFeaturedArticle,getTrendingArticles,getBreakingArticles,type Article} from '@/lib/articles';
import {Card,Newsletter} from '@/components/editorial';
import {categorySlug,getDictionary,type Locale} from '@/lib/i18n';

function highestPriority(articles:Article[], used:Set<string>, categories?:string[]){
  return articles.filter(article=>!used.has(article.slug)&&(!categories||categories.includes(article.category))).sort((a,b)=>b.homepagePriority-a.homepagePriority||+new Date(b.date)-+new Date(a.date))[0];
}

export function HomePage({locale}:{locale:Locale}){
  const dictionary=getDictionary(locale),ui=dictionary.ui;
  const all=getAllArticles(locale),hero=getFeaturedArticle(locale);
  if(!hero)return null;
  const used=new Set([hero.slug]);
  const history=highestPriority(all,used,['Historias','Archivo']);
  if(history)used.add(history.slug);
  const tactics=highestPriority(all,used,['Táctica']);
  if(tactics)used.add(tactics.slug);
  const breaking=getBreakingArticles(locale).find(article=>!used.has(article.slug));
  if(breaking)used.add(breaking.slug);
  const trendingPool=getTrendingArticles(locale).filter(article=>!used.has(article.slug));
  const dataArticles=all.filter(article=>article.category==='Datos'&&!used.has(article.slug)).slice(0,2);
  const dataSlugs=new Set(dataArticles.map(article=>article.slug));
  const trending=[...dataArticles,...trendingPool.filter(article=>!dataSlugs.has(article.slug))].slice(0,5);
  trending.forEach(article=>used.add(article.slug));
  const latest=all.filter(article=>!used.has(article.slug)).slice(0,3);

  return <><div className="hero-grid"><article className="hero"><Image priority src={hero.heroImage||'/images/articles/hero-football.png'} alt={hero.heroAlt} fill sizes="(max-width:900px) 100vw, 70vw"/><div className="shade"/><div className="hero-copy"><span className="tag">{dictionary.categories[hero.category]}</span><h1>{hero.title}</h1><p>{hero.description}</p><Link className="button" href={`/${locale}/article/${hero.slug}`}>{ui.readArticle}</Link></div></article><aside className="sidebar">{breaking&&<Link className="breaking" href={`/${locale}/article/${breaking.slug}`}><span>{ui.breaking}</span><span>{breaking.title}</span></Link>}<div><div className="side-title">{ui.trends}</div>{trending.map((article,index)=><div className="trend" key={article.slug}><strong>0{index+1}</strong><Image src={article.heroImage||'/images/articles/hero-football.png'} alt="" width={58} height={44}/><Link href={`/${locale}/article/${article.slug}`}>{article.title}</Link></div>)}</div></aside></div><section className="section"><div className="section-head"><h2>{ui.latest}</h2><Link href={`/${locale}/search`}>{ui.searchArchive}</Link></div><div className="cards">{latest.map(article=><Card key={article.slug} article={article} locale={locale}/>)}</div></section><div className="feature-row"><section className="section gold">{history&&<><div className="section-head"><h2>{ui.history}</h2><Link href={`/${locale}/category/${categorySlug(locale,'Historias')}`}>{ui.seeAll}</Link></div><article className="feature"><Image src={history.heroImage||'/images/articles/hero-football.png'} alt={history.heroAlt} width={500} height={320} sizes="(max-width: 900px) 100vw, 42vw"/><div><span className="tag">{dictionary.categories[history.category]}</span><h3><Link href={`/${locale}/article/${history.slug}`}>{history.title}</Link></h3><p>{history.description}</p></div></article></>}</section><section className="section blue">{tactics&&<><div className="section-head"><h2>{ui.tactics}</h2><Link href={`/${locale}/category/${categorySlug(locale,'Táctica')}`}>{ui.seeAll}</Link></div><article className="feature"><Image src={tactics.heroImage||'/images/articles/hero-football.png'} alt={tactics.heroAlt} width={500} height={320} sizes="(max-width: 900px) 100vw, 42vw"/><div><span className="tag">{dictionary.categories[tactics.category]}</span><h3><Link href={`/${locale}/article/${tactics.slug}`}>{tactics.title}</Link></h3><p>{tactics.description}</p></div></article></>}</section></div><Newsletter locale={locale}/></>;
}
