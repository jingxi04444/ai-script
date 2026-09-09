import { useEffect, useState } from 'react';
import { ImageOff } from 'lucide-react';
import { creativeMediaPreviewUrl, isCreativeMediaUrl } from './creativeResourceForm';

interface CreativeResourceCoverProps { url?: string; name: string; className?: string; emptyLabel?: string; unavailableLabel?: string }

export default function CreativeResourceCover({ url = '', name, className = '', emptyLabel = '待添加封面', unavailableLabel = '封面暂不可用' }: CreativeResourceCoverProps) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [url]);
  return <div className={`creative-resource-cover ${className}`}>
    {!failed && isCreativeMediaUrl(url) ? <img src={creativeMediaPreviewUrl(url, import.meta.env.BASE_URL)} alt={name} loading="lazy" onError={() => setFailed(true)} /> : <span className="creative-cover-empty"><ImageOff size={26} /><small>{url ? unavailableLabel : emptyLabel}</small></span>}
  </div>;
}
