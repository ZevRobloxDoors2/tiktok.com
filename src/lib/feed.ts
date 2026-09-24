export type NormalizedYoutubeItem = {
  id: { videoId: string };
  youtubeId: string;
  snippet: {
    title: string;
    channelTitle: string;
    channelId: string;
  };
  status?: { embeddable?: boolean };
};

export function normalizeYoutubeShorts<T extends {
  id?: { videoId?: string };
  snippet?: { title?: string; channelTitle?: string; channelId?: string };
  status?: { embeddable?: boolean };
}>(items: T[] = [], seenIds: Set<string> = new Set()): Array<T & { youtubeId: string }> {
  const deduped = new Set<string>();

  return items
    .filter((item) => {
      const videoId = item?.id?.videoId;
      if (!videoId || seenIds.has(videoId) || deduped.has(videoId)) {
        return false;
      }

      if (item?.status && item.status.embeddable === false) {
        return false;
      }

      const title = item?.snippet?.title?.trim() ?? '';
      if (!title || /private video|deleted video|unavailable|removed/i.test(title)) {
        return false;
      }

      // Filter out outdated years or generic cringe/boring compilations
      if (/\b(2020|2021|2022|old trend|try not to laugh challenge 2020)\b/i.test(title)) {
        return false;
      }

      deduped.add(videoId);
      return true;
    })
    .map((item) => ({
      ...item,
      youtubeId: item.id!.videoId!
    }));
}
