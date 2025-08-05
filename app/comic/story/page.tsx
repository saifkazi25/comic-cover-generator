// app/comic/story/page.tsx

export const dynamic = "force-dynamic";

import ComicStoryClient from "./ComicStoryClient";

export default function Page({
  searchParams,
}: {
  searchParams: { data?: string };
}) {
  return <ComicStoryClient data={searchParams.data} />;
}
