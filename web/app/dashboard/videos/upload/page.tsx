import { VideoMetaFields } from "@/components/dashboard/VideoMetaFields";
import { VideoTabs } from "@/components/dashboard/VideoTabs";
import { VideoUploader } from "@/components/dashboard/VideoUploader";
import { getVideoCategories } from "@/lib/app-data";
import { requireTrainer } from "@/lib/trainer";
import { getCollections } from "@/lib/videos-admin";

export default async function UploadVideo() {
  const trainer = await requireTrainer();
  const [collections, categories] = await Promise.all([getCollections(trainer.id), getVideoCategories(trainer.id)]);
  return (
    <>
      <h1 style={{ margin: 0 }}>Upload a video</h1>
      <VideoTabs active="/dashboard/videos/upload" />
      <VideoUploader>
        <VideoMetaFields categories={categories} collections={collections} />
      </VideoUploader>
    </>
  );
}
