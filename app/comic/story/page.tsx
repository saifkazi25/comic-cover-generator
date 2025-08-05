// app/comic/story/page.tsx
import ComicStoryClient from "./ComicStoryClient";
import { ReactElement } from "react";

type SearchParams = {
  // Next.js may give you string | string[] | undefined for each key
  readonly [key: string]: string | string[] | undefined;
};

export default function ComicStoryPage({
  searchParams,
}: {
  searchParams: SearchParams;
}): ReactElement {
  // pull out the raw `data=` value (could be an array if someone repeated the param)
  const raw = searchParams.data;
  const data =
    typeof raw === "string"
      ? raw
      : Array.isArray(raw)
      ? raw[0]
      : undefined;

  return <ComicStoryClient data={data} />;
}
