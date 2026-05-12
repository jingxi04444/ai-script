export type Asset = {
  id: string;
  name: string;
  type: string;
  status: string;
  tag: string;
};

export type LibraryType = 'selling-point' | 'viral-script';

export type LibraryAsset = {
  id: string;
  library: LibraryType;
  name: string;
  tag: string;
  status: string;
  updatedAt: string;
  count?: number;
};

export type LibraryAssetDetail = LibraryAsset & {
  summary: string;
  sections: Array<{
    title: string;
    content: string;
  }>;
};
