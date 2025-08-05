// app/comic/story/page.tsx
import ComicStoryClient from "./ComicStoryClient";

export default function ComicStoryPage({
  searchParams,
}: {
  // Next.js passes searchParams as a plain object where values
  // can be string, string[], or undefined
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  // Normalize `data` to a single string (or undefined)
  const raw = searchParams.data;
  const data =
    typeof raw === "string"
      ? raw
      : Array.isArray(raw)
      ? raw[0]
      : undefined;

  return <ComicStoryClient data={data} />;
}
