import { promises as fs } from "fs";
import path from "path";
import { cache } from "react";

export interface ManualVersionData {
  lastUpdated: string;
  source?: string;
}

export const getManualVersionData = cache(
  async (): Promise<ManualVersionData | null> => {
    const manualVersionPath = path.join(
      process.cwd(),
      "public",
      "data",
      "manual-version.json"
    );

    try {
      const content = await fs.readFile(manualVersionPath, "utf-8");
      return JSON.parse(content) as ManualVersionData;
    } catch {
      return null;
    }
  }
);
