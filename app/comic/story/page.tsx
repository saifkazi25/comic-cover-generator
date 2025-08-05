// app/comic/story/page.tsx
import ComicStoryClient from "./ComicStoryClient";

export default function ComicStoryPage({
  searchParams,
}: {
  searchParams: { data?: string };
}) {
  // Pass the encoded payload down into the client component
  return <ComicStoryClient data={searchParams.data} />;
}
