import { getManifest, getBuildForModel, getModelDisplayName } from "@/lib/manifest";
import { SiteFrame } from "@/components/site-frame";

export default async function HomePage() {
  const manifest = await getManifest();
  const defaultModel = manifest.default_model;
  const build = getBuildForModel(manifest, defaultModel);

  if (!build) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-var(--menu-bar-height))] text-black/60">
        <p>No build available for the default model.</p>
      </div>
    );
  }

  return (
    <SiteFrame
      src={`/${build.path}`}
      title={`Site built by ${getModelDisplayName(defaultModel)}`}
    />
  );
}
