export const dynamic = "force-dynamic";

import { getAllSocialPosts } from "@/lib/actions/social";
import { SocialNav } from "@/components/social/social-nav";
import { CalendarioClient } from "@/components/social/calendario-client";
import type { SocialPost } from "@/app/(dashboard)/social/page";

export default async function CalendarioPage() {
 const posts = await getAllSocialPosts();

 return (
  <div>
   <div className="mb-6">
    <h1 className="text-3xl font-bold text-brown">
     Calendario Social
    </h1>
    <p className="mt-1 text-sm text-muted-foreground">
     Visualizza i post pianificati nel calendario
    </p>
   </div>

   <SocialNav />

   <CalendarioClient posts={posts as SocialPost[]} />
  </div>
 );
}
