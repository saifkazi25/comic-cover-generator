// app/comic/story/page.tsx

export const dynamic = "force-dynamic";

import ComicStoryClient from "./ComicStoryClient";

interface StoryPageProps {
  searchParams: {
    /** URI-encoded JSON string carrying the ComicRequest data */
    data?: string;
  };
}

export default function StoryPage({ searchParams }: StoryPageProps) {
  return <ComicStoryClient data={searchParams.data} />;
}
