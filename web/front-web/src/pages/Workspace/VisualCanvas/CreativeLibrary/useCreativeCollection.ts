import { useState } from 'react';

interface Collection { favorites: string[]; recent: string[] }
const emptyCollection = (): Collection => ({ favorites: [], recent: [] });
const keyFor = (userId: string) => `ai-script:creative-library:v1:${encodeURIComponent(userId)}`;
const readCollection = (userId?: string): Collection => {
  if (!userId) return emptyCollection();
  try {
    const value = JSON.parse(localStorage.getItem(keyFor(userId)) || '{}');
    const ids = (input: unknown) => Array.isArray(input) ? input.filter((id): id is string => typeof id === 'string').slice(0, 48) : [];
    return { favorites: ids(value.favorites), recent: ids(value.recent).slice(0, 24) };
  } catch { return emptyCollection(); }
};

// The dialog is keyed by account ID, so collections never persist across an account switch.
export function useCreativeCollection(userId?: string) {
  const [collection, setCollection] = useState(() => readCollection(userId));
  const [storageError, setStorageError] = useState('');
  const save = (next: Collection) => {
    if (!userId) { setStorageError('登录后可在本机保存收藏和使用记录'); return; }
    try {
      localStorage.setItem(keyFor(userId), JSON.stringify(next));
      setCollection(next); setStorageError('');
    } catch { setStorageError('本机存储不可用，收藏与使用记录未保存'); }
  };
  return { ...collection, storageError,
    toggleFavorite: (id: string) => {
      if (!collection.favorites.includes(id) && collection.favorites.length >= 48) {
        setStorageError('本机最多收藏 48 项，请先取消部分收藏'); return;
      }
      save({ ...collection, favorites: collection.favorites.includes(id)
        ? collection.favorites.filter(value => value !== id) : [...collection.favorites, id] });
    },
    recordUse: (id: string) => save({ ...collection, recent: [id, ...collection.recent.filter(value => value !== id)].slice(0, 24) }),
  };
}
