import { useEffect, useState } from 'react';
import { scriptApi } from '../services/scriptApi';
import { StoryboardTable } from '../features/workspace/StoryboardTable';
import type { SharedScript } from '../types/script';

export function ShareScriptPage() {
  const [script, setScript] = useState<SharedScript | null>(null);
  useEffect(() => { scriptApi.getShareScript().then((data) => setScript(data)); }, []);
  return <main className="share-page panel"><span className="eyebrow">Readonly Share</span><h1>{script?.title || '加载分享脚本...'}</h1><p>状态：{script?.status || '-'}</p><StoryboardTable rows={script?.scenes || []} /></main>;
}
