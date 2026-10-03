"use client";

import { useState } from "react";
import { MediaPicker, type MediaItem } from "./MediaPicker";

/** MediaPicker for use inside a plain <form>: submits the chosen URL as `name`. */
export function ImageField({ name, label, defaultValue, library: initial }: { name: string; label: string; defaultValue: string; library: MediaItem[] }) {
  const [value, setValue] = useState(defaultValue);
  const [library, setLibrary] = useState(initial);
  return (
    <>
      <MediaPicker label={label} value={value} onChange={setValue} library={library} onUploaded={(m) => setLibrary((l) => [m, ...l])} />
      <input type="hidden" name={name} value={value} />
    </>
  );
}
