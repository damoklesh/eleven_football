import type {Category} from './articles';

export const locales = ['es', 'en', 'fr'] as const;
export type Locale = (typeof locales)[number];

type Dictionary = {
  language: string;
  localeTag: string;
  categories: Record<Category, string>;
  categorySlugs: Record<Category, string>;
  ui: {
    tagline: string;
    subscribe: string;
    breaking: string;
    trends: string;
    latest: string;
    readArticle: string;
    searchArchive: string;
    history: string;
    tactics: string;
    seeAll: string;
    newsletterTitle: string;
    newsletterText: string;
    email: string;
    newsletterSoon: string;
    author: string;
    minutes: string;
    sources: string;
    keepReading: string;
    backHome: string;
    editorialArchive: string;
    categoryIntro: string;
    search: string;
    searchPlaceholder: string;
    share: string;
    copyLink: string;
    linkCopied: string;
    shared: string;
    copyFailed: string;
  };
};

const spanishCategories: Record<Category, string> = {
  Actualidad: 'Actualidad', Táctica: 'Táctica', Historias: 'Historias', Archivo: 'Archivo',
  Cultura: 'Cultura', Jugadores: 'Jugadores', Clubes: 'Clubes', Datos: 'Datos',
};

export const dictionaries: Record<Locale, Dictionary> = {
  es: {
    language: 'Español', localeTag: 'es-ES', categories: spanishCategories,
    categorySlugs: {Actualidad: 'actualidad', Táctica: 'tactica', Historias: 'historias', Archivo: 'archivo', Cultura: 'cultura', Jugadores: 'jugadores', Clubes: 'clubes', Datos: 'datos'},
    ui: {tagline: 'El fútbol, en contexto.', subscribe: 'Suscríbete', breaking: 'ÚLTIMA HORA', trends: 'Tendencias', latest: 'Últimas historias', readArticle: 'Leer artículo', searchArchive: 'Buscar archivo', history: 'Historias', tactics: 'Táctica', seeAll: 'Ver todas', newsletterTitle: 'La lectura larga vuelve al juego.', newsletterText: 'Recibe historias, análisis y contexto. Sin marcador urgente.', email: 'Tu correo electrónico', newsletterSoon: 'Newsletter próximamente.', author: 'Por', minutes: 'min de lectura', sources: 'Fuentes', keepReading: 'Seguir leyendo', backHome: 'Volver a portada', editorialArchive: 'Archivo editorial', categoryIntro: 'Una selección de piezas de ELEVEN sobre', search: 'Buscar', searchPlaceholder: 'Título, tema, jugador, club…', share: 'Compartir', copyLink: 'Copiar enlace', linkCopied: 'Enlace copiado', shared: 'Compartido', copyFailed: 'No se pudo copiar el enlace'},
  },
  en: {
    language: 'English', localeTag: 'en-GB',
    categories: {Actualidad: 'News', Táctica: 'Tactics', Historias: 'Stories', Archivo: 'Archive', Cultura: 'Culture', Jugadores: 'Players', Clubes: 'Clubs', Datos: 'Data'},
    categorySlugs: {Actualidad: 'news', Táctica: 'tactics', Historias: 'stories', Archivo: 'archive', Cultura: 'culture', Jugadores: 'players', Clubes: 'clubs', Datos: 'data'},
    ui: {tagline: 'Football, in context.', subscribe: 'Subscribe', breaking: 'BREAKING', trends: 'Trending', latest: 'Latest stories', readArticle: 'Read article', searchArchive: 'Search archive', history: 'Stories', tactics: 'Tactics', seeAll: 'See all', newsletterTitle: 'Long-form reading returns to the game.', newsletterText: 'Stories, analysis and context. No urgent scoreline.', email: 'Your email address', newsletterSoon: 'Newsletter coming soon.', author: 'By', minutes: 'min read', sources: 'Sources', keepReading: 'Keep reading', backHome: 'Back to home', editorialArchive: 'Editorial archive', categoryIntro: 'A selection of ELEVEN pieces about', search: 'Search', searchPlaceholder: 'Title, topic, player, club…', share: 'Share', copyLink: 'Copy link', linkCopied: 'Link copied', shared: 'Shared', copyFailed: 'Could not copy the link'},
  },
  fr: {
    language: 'Français', localeTag: 'fr-FR',
    categories: {Actualidad: 'Actualité', Táctica: 'Tactique', Historias: 'Histoires', Archivo: 'Archives', Cultura: 'Culture', Jugadores: 'Joueurs', Clubes: 'Clubs', Datos: 'Données'},
    categorySlugs: {Actualidad: 'actualite', Táctica: 'tactique', Historias: 'histoires', Archivo: 'archives', Cultura: 'culture', Jugadores: 'joueurs', Clubes: 'clubs', Datos: 'donnees'},
    ui: {tagline: 'Le football, dans son contexte.', subscribe: "S'abonner", breaking: 'DERNIÈRE HEURE', trends: 'Tendances', latest: 'Derniers récits', readArticle: "Lire l'article", searchArchive: "Rechercher dans les archives", history: 'Histoires', tactics: 'Tactique', seeAll: 'Voir tout', newsletterTitle: 'La lecture longue revient dans le jeu.', newsletterText: 'Récits, analyses et contexte. Sans urgence du score.', email: 'Votre adresse e-mail', newsletterSoon: 'Newsletter bientôt disponible.', author: 'Par', minutes: 'min de lecture', sources: 'Sources', keepReading: 'À lire aussi', backHome: "Retour à l'accueil", editorialArchive: 'Archives éditoriales', categoryIntro: "Une sélection d'articles ELEVEN sur", search: 'Rechercher', searchPlaceholder: 'Titre, thème, joueur, club…', share: 'Partager', copyLink: 'Copier le lien', linkCopied: 'Lien copié', shared: 'Partagé', copyFailed: 'Impossible de copier le lien'},
  },
};

export function isLocale(value: string): value is Locale { return locales.includes(value as Locale); }
export function getDictionary(locale: Locale) { return dictionaries[locale]; }
export function categorySlug(locale: Locale, category: Category) { return dictionaries[locale].categorySlugs[category]; }
export function categoryFromSlug(locale: Locale, slug: string): Category | undefined {
  return (Object.keys(dictionaries[locale].categorySlugs) as Category[]).find((category) => dictionaries[locale].categorySlugs[category] === slug);
}
