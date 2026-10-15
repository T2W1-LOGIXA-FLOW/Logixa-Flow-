"use client";

import { useEffect, useState } from "react";

export default function FormattedDate({
  dateString,
  locale = "my-MM",
}: {
  dateString: string;
  locale?: string;
}) {
  const [formatted, setFormatted] = useState("");

  useEffect(() => {
    setFormatted(new Date(dateString).toLocaleDateString(locale));
  }, [dateString, locale]);

  return <time suppressHydrationWarning>{formatted || "Loading..."}</time>;
}
