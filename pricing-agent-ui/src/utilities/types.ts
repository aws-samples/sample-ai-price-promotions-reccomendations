export enum QUERY_KEYS {
    PRODUCTS = "PRODUCTS",
    PRICING = "PRICING",
    TOOL_MASTER = "TOOL_MASTER",
    BUILDER_DEPOT = "BUILDER_DEPOT",
    WEB_SCRAP = "WEB_SCRAP",
}

export const DatasetPrefix = {
    [QUERY_KEYS.PRODUCTS]: "products/",
    [QUERY_KEYS.PRICING]: "pricing/",
    [QUERY_KEYS.TOOL_MASTER]: "builder-depot/",
    [QUERY_KEYS.BUILDER_DEPOT]: "tool-master/",
    [QUERY_KEYS.WEB_SCRAP]: "web-scrap/",
};

export type ItemType = { itemName: string; path: string; url: string };

export type ProductType = {
    product_id: string;
    department: string;
    class: string;
    role: string;
    color: string;
    size: number;
    power: string;
    battery: string;
    specs: object;
    seasonality: string;
    vendor: string;
    country: string;
    cost: string;
    MSRP: string;
    MAP: string;
    yearTarget: string;
    features: Array<string>;
};

export type Messages = {
    rtl: boolean;
    sender: string;
    message: string;
};

type BotMessageContent = {
    text: string;
};

export type BotMessage = {
    role: string;
    content: [BotMessageContent];
};

export type DemandForecast = {
    confidenceP10: number;
    confidenceP50: number;
    confidenceP90: number;
    currentConfidenceScore: number;
    currentDemandTrend: string;
    currentDemandValue: number;
    isSeasonallyAdjusted: boolean;
    priceCeiling: number;
    priceFloor: number;
    pricingRationale: string;
    projectedDemandValue: number;
    projectedTimeframe: string;
    recommendedPrice: number;
};

export type WebScrapType = {
    averageMarketPrice: number;
    competitorCount: number;
    competitorPricePoint: number;
    competitorPromotionActive: boolean;
    competitorShippingCost: number;
    competitorStockStatus: string;
    competitorTotalCost: number;
    highestMarketPrice: number;
    lowestMarketPrice: number;
    marketPositionAssessment: string;
    matchConfidenceScore: number;
    medianMarketPrice: number;
    primaryCompetitor: string;
    competitorProducts?: CompetitorProduct[];
};

export type CompetitorProduct = {
    name: string;
    price: number;
    rating: string;
    seller: string;
    source: string;
};

export type MarginAnalysisType = {
    adjustedMarginRate: number;
    adjustmentBreakdown: string;
    baseMarginRate: number;
    calculatedMargin: number;
    featureAdjustments: string;
    isMapCompliant: boolean;
    isMarginCompliant: boolean;
    mapPrice: number;
    marginAdjustments: string;
    marginExplanation: string;
    maximumPrice: number;
    minimumPrice: number;
    pricingRationale: string;
    requiresReview: boolean;
    seasonalAdjustment: string;
    suggestedPrice: number;
    volumeAdjustment: string;
};

type StoreItemType =
    | "Circular Saw"
    | "Power Drill"
    | "Impact Driver"
    | "Angle Grinder"
    | "Orbital Sander"
    | "All";
type StockStatus = "In Stock" | "Out of Stock" | "Limited Stock" | "Pre-Order";
type MarketPosition =
    | "Economy"
    | "Entry-level"
    | "Mid-range"
    | "Professional"
    | "Premium"
    | "Industrial"
    | "Compact";

export interface StoreProduct {
    product_type: StoreItemType;
    model: string;
    regular_price: number;
    promotion_type: string | null;
    promotion_end_date: string | null;
    stock_status: StockStatus;
    shipping_cost: number;
    rating: number;
    review_count: number;
    market_position: MarketPosition;
}

export type NotificationType = {
    currentSessionId: string;
    isCompleteDemandAnalysis: boolean;
    isCompleteWebScarping: boolean;
    isCompleteMarginAnalysis: boolean;
    isCompletePersonalizedPricing: boolean;
};
