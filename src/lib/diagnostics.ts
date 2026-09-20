
export interface SystemStatus {
  backend: boolean;
  aiChat: boolean;
  aiSearch: boolean;
  youtube: boolean;
  firebase: boolean;
  latency: number;
}

export async function checkSystemHealth(): Promise<SystemStatus> {
  const start = Date.now();
  const status: SystemStatus = {
    backend: false,
    aiChat: false,
    aiSearch: false,
    youtube: false,
    firebase: false,
    latency: 0
  };

  try {
    // 1. Check Backend Health
    const healthRes = await fetch('/api/health');
    status.backend = healthRes.ok;

    // 2. Check Firebase (Simple check by fetching a known collection)
    try {
      const { db } = await import('./firebase');
      const { doc, getDoc } = await import('firebase/firestore');
      const testRef = doc(db, 'app_settings', 'global');
      await getDoc(testRef);
      status.firebase = true;
    } catch (e) {
      console.warn("Firebase check failed", e);
    }

    // 3. Check AI Chat API (GET request just checks if route exists)
    const chatRes = await fetch('/api/chat');
    status.aiChat = chatRes.ok;

    // 4. Check AI Search API (Simple trending query)
    const searchRes = await fetch('/api/ai-search?q=test');
    status.aiSearch = searchRes.ok;

    // 5. Check YouTube API (Check if the proxy returns a response)
    const ytRes = await fetch('/api/youtube-shorts?maxResults=1');
    status.youtube = ytRes.ok;

  } catch (err) {
    console.error("Health check failed", err);
  }

  status.latency = Date.now() - start;
  return status;
}
