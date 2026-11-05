// API 3: Wikipedia REST (Page Summary). Descripción turística del destino.
// Usa el artículo que Nominatim indicó en `extratags.wikipedia`.
// Documentación: https://en.wikipedia.org/api/rest_v1/#/Page%20content/get_page_summary__title_
import { ApiError, getJson } from './http';

export const WIKIPEDIA = {
  id: 'wikipedia',
  name: 'Wikipedia REST API',
  summaryUrl: 'https://{lang}.wikipedia.org/api/rest_v1/page/summary/{title}',
  docs: 'https://www.mediawiki.org/wiki/Wikimedia_REST_API',
};

const LANG_REGEX = /^[a-z-]{2,12}$/;

export function parseSummary(json) {
  if (!json || !json.title || !json.extract) {
    throw new ApiError('Wikipedia no tiene un resumen para este destino.', 'EMPTY');
  }
  if (json.type === 'disambiguation') {
    throw new ApiError('El nombre es ambiguo en Wikipedia. Prueba agregando el país.', 'EMPTY');
  }
  const thumb = json.thumbnail?.source;
  const image = thumb?.startsWith('https://')
    ? thumb.replace(/(\d+)px-/, '960px-') // tamaño estándar de Wikimedia, nítido para la portada
    : null;
  return {
    title: json.title,
    description: json.description ?? '',
    extract: json.extract,
    image,
    // Banderas y escudos vienen como SVG; no sirven como fotografía de portada.
    isPhoto: !!image && !/\.svg/i.test(image),
    url: json.content_urls?.mobile?.page ?? json.content_urls?.desktop?.page ?? null,
    lang: json.lang,
  };
}

// OpenStreetMap suele indicar el artículo en el idioma local (ej. "ja:京都市").
// Se busca su equivalente en español con la API de MediaWiki (langlinks).
// Si falla o no existe, se usa el artículo original.
async function toSpanish(lang, title) {
  if (lang === 'es') return { lang, title };
  try {
    const { json } = await getJson(WIKIPEDIA.id, `https://${lang}.wikipedia.org/w/api.php`, {
      action: 'query',
      titles: title,
      prop: 'langlinks',
      lllang: 'es',
      redirects: 1,
      format: 'json',
      formatversion: 2,
      origin: '*', // permite la petición desde la versión web (CORS)
    });
    const esTitle = json?.query?.pages?.[0]?.langlinks?.[0]?.title;
    return esTitle ? { lang: 'es', title: esTitle } : { lang, title };
  } catch {
    return { lang, title };
  }
}

export async function getSummary({ lang, title }) {
  const article = await toSpanish(LANG_REGEX.test(lang) ? lang : 'es', title.trim());
  // El título va en la ruta: espacios -> "_" y el resto se codifica para evitar inyección en la URL.
  const path = encodeURIComponent(article.title.replace(/ /g, '_'));
  const base = `https://${article.lang}.wikipedia.org/api/rest_v1/page/summary/${path}`;
  const { json, url, ms } = await getJson(WIKIPEDIA.id, base, { redirect: true }, {
    messages: { notFound: 'Wikipedia no tiene un artículo para este destino.' },
  });
  return { data: parseSummary(json), url, ms };
}
