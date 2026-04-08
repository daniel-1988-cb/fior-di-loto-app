export const dynamic = "force-dynamic";

import { SocialNav } from "@/components/social/social-nav";
import { NewsClient } from "@/components/social/news-client";
import { fetchNews } from "@/lib/actions/news";

export default async function NewsPage() {
 const news = await fetchNews();

 return (
  <div>
   <div className="mb-6">
    <h1 className="text-3xl font-bold text-brown">
     News & Tendenze
    </h1>
    <p className="mt-1 text-sm text-muted-foreground">
     Ultime notizie dal settore beauty ed estetica
    </p>
   </div>

   <SocialNav />

   <NewsClient initialNews={news} />
  </div>
 );
}
