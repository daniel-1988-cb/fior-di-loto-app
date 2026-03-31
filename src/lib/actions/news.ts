"use server";

export type NewsItem = {
  titolo: string;
  url: string;
  descrizione: string;
  data: string;
  fonte: string;
  categoria: string;
};

const RSS_FEEDS = [
  { nome: "Estetica Magazine", url: "https://www.estetica.it/feed/", categoria: "industry" },
  { nome: "Beauty Launchpad", url: "https://www.beautylaunchpad.com/feed/", categoria: "trends" },
  { nome: "Nails Magazine", url: "https://www.nailsmag.com/rss/topic/all-articles", categoria: "nails" },
  { nome: "Skin Inc", url: "https://www.skininc.com/rss/topic/all-articles", categoria: "skin" },
  { nome: "Massage Magazine", url: "https://www.massagemag.com/feed/", categoria: "wellness" },
];

async function parseRSS(url: string, fonte: string, categoria: string): Promise<NewsItem[]> {
  try {
    const res = await fetch(url, {
      next: { revalidate: 3600 },
      headers: { "User-Agent": "FiorDiLoto/1.0" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const xml = await res.text();

    const items: NewsItem[] = [];
    const itemMatches = xml.matchAll(/<item>([\s\S]*?)<\/item>/g);

    for (const match of itemMatches) {
      const content = match[1];
      const titolo =
        content.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/)?.[1]
          ?.replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&quot;/g, '"')
          .trim() || "";

      const link =
        content.match(/<link[^>]*>([\s\S]*?)<\/link>/)?.[1]?.trim() ||
        content.match(/<guid[^>]*>([\s\S]*?)<\/guid>/)?.[1]?.trim() ||
        "";

      const descrizione =
        content
          .match(/<description[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/)?.[1]
          ?.replace(/<[^>]*>/g, "")
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&quot;/g, '"')
          .replace(/&#x27;/g, "'")
          .replace(/&nbsp;/g, " ")
          .trim()
          .slice(0, 250) || "";

      const pubDate = content.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1]?.trim() || "";

      if (titolo && link) {
        items.push({
          titolo,
          url: link,
          descrizione,
          data: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
          fonte,
          categoria,
        });
      }
    }

    return items.slice(0, 5);
  } catch {
    return [];
  }
}

export async function fetchNews(categoria?: string): Promise<NewsItem[]> {
  const feeds = categoria && categoria !== "tutti"
    ? RSS_FEEDS.filter((f) => f.categoria === categoria)
    : RSS_FEEDS;

  const results = await Promise.allSettled(
    feeds.map((feed) => parseRSS(feed.url, feed.nome, feed.categoria))
  );

  const allItems: NewsItem[] = [];
  for (const result of results) {
    if (result.status === "fulfilled") {
      allItems.push(...result.value);
    }
  }

  // Sort by date descending
  allItems.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

  return allItems;
}
