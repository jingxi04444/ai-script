export type SellingAsset = {
  id: string;
  name: string;
  tag: string;
  main: string;
  count: number;
};

export type SellingAssetDetail = SellingAsset & {
  targetGroups: string[];
  status: string;
  updatedAt: string;
  items: Array<{
    id: string;
    content: string;
    pointType: string;
    metadata?: Record<string, unknown>;
  }>;
};

export type ProductBriefInput = {
  productName: string;
  brief: string;
  sellingPoints: string[];
  primarySellingPoint: string;
  auxiliarySellingPoints: string[];
  targetGroups: string[];
  otherRequirements: string;
};

export type OptimizeBriefResult = ProductBriefInput & {
  summary: string;
};
