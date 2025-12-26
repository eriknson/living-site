"use client";

import { Tweet } from "react-tweet";

interface TweetEmbedProps {
  id: string;
}

export function TweetEmbed({ id }: TweetEmbedProps) {
  return (
    <div className="my-8 flex justify-center not-prose [&_div]:!m-0">
      <div className="w-full max-w-[550px]">
        <Tweet id={id} />
      </div>
    </div>
  );
}
