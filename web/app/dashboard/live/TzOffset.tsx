"use client";

import { useEffect, useState } from "react";

/** Sends the browser's timezone offset so scheduled times read correctly in notifications. */
export function TzOffset() {
  const [offset, setOffset] = useState(0);
  useEffect(() => setOffset(new Date().getTimezoneOffset()), []);
  return <input type="hidden" name="tz_offset" value={offset} />;
}
