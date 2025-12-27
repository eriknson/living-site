"use client";

import { useEffect } from "react";
import { inject } from "@vercel/analytics";

export function AnalyticsProvider() {
  useEffect(() => {
    // Inject Vercel Web Analytics on the client side
    inject();
  }, []);

  return null;
}
