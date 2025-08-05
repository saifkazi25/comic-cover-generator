// app/comic/story/page.tsx
import ComicStoryClient from "./ComicStoryClient";

interface StoryPageProps {
  searchParams: Record<string, string | string[]>;
}

export default function ComicStoryPage({ searchParams }: StoryPageProps) {
  // Normalizes the `data` param to a single string (or undefined):
  const raw = searchParams.data;
  const data =
    typeof raw === "string"
      ? raw
      : Array.isArray(raw)
      ? raw[0]
      : undefined;

  return <ComicStoryClient data={data} />;
}
