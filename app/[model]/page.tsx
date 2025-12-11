import { notFound, redirect } from "next/navigation";
import {
  getManifest,
  getBuildForModel,
  getModelDisplayName,
  getModelIdFromSlug,
  getModelSlug,
  getAvailableModels,
} from "@/lib/manifest";
import { SiteFrame } from "@/components/site-frame";

interface ModelPageProps {
  params: Promise<{ model: string }>;
}

export async function generateStaticParams() {
  const manifest = await getManifest();
  const availableModels = getAvailableModels(manifest);

  return availableModels.map((build) => ({
    model: getModelSlug(build.model),
  }));
}

export async function generateMetadata({ params }: ModelPageProps) {
  const { model: slug } = await params;
  const modelId = getModelIdFromSlug(slug);

  if (!modelId) {
    return { title: "Not Found" };
  }

  return {
    title: `Erik's Website - ${getModelDisplayName(modelId)}`,
    description: `Erik's personal website, built by ${getModelDisplayName(modelId)}`,
  };
}

export default async function ModelPage({ params }: ModelPageProps) {
  const { model: slug } = await params;
  const manifest = await getManifest();

  // Get the model ID from the slug
  const modelId = getModelIdFromSlug(slug);

  if (!modelId) {
    notFound();
  }

  // If this is the default model, redirect to home
  if (modelId === manifest.default_model) {
    redirect("/");
  }

  // Get the build for this model
  const build = getBuildForModel(manifest, modelId);

  if (!build) {
    notFound();
  }

  return (
    <SiteFrame
      src={`/${build.path}`}
      title={`Site built by ${getModelDisplayName(modelId)}`}
    />
  );
}
