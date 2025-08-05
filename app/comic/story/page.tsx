/* eslint-disable @typescript-eslint/no-explicit-any */
import ComicStoryClient from "./ComicStoryClient";

export default function ComicStoryPage({ searchParams }: any) {
  // Normalize the `data` param to a single string (or undefined)
  const raw = searchParams.data;
  const data =
    typeof raw === "string"
      ? raw
      : Array.isArray(raw)
      ? raw[0]
      : undefined;

  return <ComicStoryClient data={data} />;
}
