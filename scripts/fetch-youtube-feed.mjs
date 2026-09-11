import {mkdir, readFile, writeFile} from 'node:fs/promises';

const apiKey = process.env.YOUTUBE_API_KEY;
if (!apiKey) throw new Error('YOUTUBE_API_KEY is required');

const queries = ['shorts'];
const videos = [];
const seen = new Set();
let pageToken = '';

for (const query of queries) {
  const params = new URLSearchParams({
    part: 'snippet',
    maxResults: '25',
    q: query,
    type: 'video',
    videoDuration: 'short',
    videoEmbeddable: 'true',
    safeSearch: 'moderate',
    key: apiKey
  });
  if (pageToken) params.set('pageToken', pageToken);

  const response = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`);
  if (!response.ok) {
    try {
      const existing = await readFile('public/youtube-feed.json', 'utf8');
      JSON.parse(existing);
      console.warn(`YouTube API returned ${response.status}; preserving the existing Shorts feed.`);
      process.exit(0);
    } catch {
      throw new Error(`YouTube API returned ${response.status}: ${await response.text()}`);
    }
  }

  const data = await response.json();
  for (const item of data.items || []) {
    const videoId = item.id?.videoId;
    if (!videoId || seen.has(videoId)) continue;
    seen.add(videoId);
    videos.push({
      videoId,
      title: item.snippet?.title || 'YouTube Short',
      channelTitle: item.snippet?.channelTitle || 'YouTube Creator',
      channelId: item.snippet?.channelId || videoId
    });
  }
  pageToken = data.nextPageToken || '';
}

await mkdir('public', {recursive: true});
await writeFile('public/youtube-feed.json', JSON.stringify({videos, generatedAt: Date.now()}));
console.log(`Generated ${videos.length} YouTube Shorts`);
