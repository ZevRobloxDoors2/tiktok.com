import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { normalizeYoutubeShorts } from '../src/lib/feed.ts';

describe('normalizeYoutubeShorts', () => {
  it('filters blocked and duplicate YouTube items before they enter the feed', () => {
    const items = [
      {
        id: { videoId: 'abc123' },
        snippet: { title: 'ok', channelTitle: 'Tester', channelId: 'chan1' },
        status: { embeddable: true }
      },
      {
        id: { videoId: 'blocked1' },
        snippet: { title: 'blocked', channelTitle: 'Tester', channelId: 'chan2' },
        status: { embeddable: false }
      },
      {
        id: { videoId: 'abc123' },
        snippet: { title: 'duplicate', channelTitle: 'Tester', channelId: 'chan1' },
        status: { embeddable: true }
      }
    ];

    const result = normalizeYoutubeShorts(items);

    assert.equal(result.length, 1);
    assert.equal(result[0].youtubeId, 'abc123');
    assert.equal(result[0].id.videoId, 'abc123');
  });
});
