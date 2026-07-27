import type { PaginatedResponse, PaginationParams } from './api';

export interface Asset {
  id: string;
  projectId?: string;
  name: string;
  type: string;
  category?: string;
  previewUrl?: string;
  storageKey?: string;
  status?: string;
}

export interface AssetSaveParams {
  projectId?: string;
  name: string;
  type: string;
  category?: string;
  storageKey?: string;
  previewUrl?: string;
  mimeType?: string;
  fileSizeBytes?: number;
  metadataJson?: string;
}

export interface SellingPointAsset {
  id: string;
  name: string;
  tagText?: string;
  mainPoint?: string;
  targetAudience?: string;
}

export interface SellingPointAssetSaveParams {
  name: string;
  tagText?: string;
  mainPoint?: string;
  targetAudience?: string;
}

export interface ViralAsset {
  id: string;
  name: string;
  kind?: string;
  platform?: string;
  sourceUrl?: string;
  scriptText?: string;
  structureFormula?: string;
}

export interface ViralAssetSaveParams {
  name: string;
  kind?: string;
  platform?: string;
  sourceUrl?: string;
  scriptText?: string;
  structureFormula?: string;
  tagsJson?: string;
}

export interface FileUploadResult {
  objectKey: string;
  url: string;
  fileName?: string;
  contentType?: string;
  size?: number;
  extractedText?: string;
}

export type AssetPage = PaginatedResponse<Asset>;
export type SellingPointAssetPage = PaginatedResponse<SellingPointAsset>;
export type ViralAssetPage = PaginatedResponse<ViralAsset>;

export interface AssetQueryParams extends PaginationParams {
  projectId?: string;
  type?: string;
  keyword?: string;
}
