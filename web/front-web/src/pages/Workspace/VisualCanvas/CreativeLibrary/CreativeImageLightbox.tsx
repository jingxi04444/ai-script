import { useEffect, useRef, useState } from 'react';
import { CloseOutlined, PictureOutlined } from '@ant-design/icons';
import type { CreativeResourceImage } from '../../../../types/creativeResource';

interface CreativeImageLightboxProps { image: CreativeResourceImage; onClose: () => void }

export default function CreativeImageLightbox({ image, onClose }: CreativeImageLightboxProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const library = document.querySelector<HTMLElement>('.creative-library');
    const previousInert = library?.inert || false;
    if (library) library.inert = true;
    closeRef.current?.focus();
    return () => { if (library) library.inert = previousInert; if (previous?.isConnected) previous.focus(); };
  }, []);
  return <div className="creative-image-lightbox" role="dialog" aria-modal="true" aria-label={`图片预览：${image.label}`} onMouseDown={event => { event.stopPropagation(); if (event.target === event.currentTarget) onClose(); }}>
    <header><span>{image.label}</span><button ref={closeRef} type="button" aria-label="关闭图片预览" onClick={onClose}><CloseOutlined /></button></header>
    {failed ? <div className="character-view-missing"><PictureOutlined /><strong>图片加载失败</strong><button type="button" onClick={() => setFailed(false)}>重试图片</button></div> : <img src={image.url} alt={image.label} onError={() => setFailed(true)} />}
    <p>按 Esc 返回角色设定</p>
  </div>;
}
