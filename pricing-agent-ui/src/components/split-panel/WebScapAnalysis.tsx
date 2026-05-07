// nosemgrep: i18next-key-format
import {
    Badge,
    Box,
    Container,
    Header,
    KeyValuePairs,
    Link,
    ProgressBar,
    SpaceBetween,
    Table,
} from "@cloudscape-design/components";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { WebScrapType, CompetitorProduct } from "../../utilities/types";
import { AppRoutes } from "../../pages/PageNavigation";
import { useNavigate } from "react-router-dom";

interface WebScrapAnalysisProps {
    webScrap: string;
    productPrice?: number;
    productName?: string;
}

export const WebScrapAnalysis = (props: WebScrapAnalysisProps) => {
    const { webScrap } = props;
    const navigate = useNavigate();
    const { t } = useTranslation();
    const webScrapJson = useMemo(() => JSON.parse(webScrap) as WebScrapType, [webScrap]);

    const competitorUrl = useMemo(() => {
        if (!webScrapJson.primaryCompetitor) return "#";
        const name = webScrapJson.primaryCompetitor.toLowerCase();
        if (name.includes("amazon")) return "https://www.amazon.com";
        if (name.includes("best buy")) return "https://www.bestbuy.com";
        if (name.includes("walmart")) return "https://www.walmart.com";
        if (name.includes("target")) return "https://www.target.com";
        if (name.includes("tool") || name.includes("master") || name.includes("techhaven")) {
            return AppRoutes.competitor.href.replace(
                ":name",
                "tool-master"
            );
        } else if (name.includes("builder") || name.includes("depot") || name.includes("gadgetworld")) {
            return AppRoutes.competitor.href.replace(
                ":name",
                "builder-depot"
            );
        }
        return "#";
    }, [webScrapJson.primaryCompetitor]);

    // Build market position table: competitor products + our product, sorted by price
    const marketPositionItems = useMemo(() => {
        const competitors: CompetitorProduct[] = webScrapJson.competitorProducts || [];
        const ourPrice = webScrapJson.competitorTotalCost || webScrapJson.averageMarketPrice || 0;

        let items: Array<{
            rank: number;
            name: string;
            price: number;
            rating: string;
            seller: string;
            isOurProduct: boolean;
        }>;

        if (competitors.length > 0) {
            // Use real scraped competitor products
            items = competitors.slice(0, 8).map((p) => ({
                rank: 0,
                name: p.name,
                price: p.price,
                rating: p.rating || "-",
                seller: p.seller || p.source || "-",
                isOurProduct: false,
            }));
        } else {
            // Fallback: construct from aggregate stats
            const entries: Array<{ name: string; price: number; seller: string }> = [];

            if (webScrapJson.primaryCompetitor && webScrapJson.competitorPricePoint) {
                entries.push({
                    name: `${webScrapJson.primaryCompetitor} (Primary)`,
                    price: webScrapJson.competitorPricePoint,
                    seller: webScrapJson.primaryCompetitor,
                });
            }
            if (webScrapJson.lowestMarketPrice && webScrapJson.lowestMarketPrice !== webScrapJson.competitorPricePoint) {
                entries.push({
                    name: "Lowest Market Competitor",
                    price: webScrapJson.lowestMarketPrice,
                    seller: "Market",
                });
            }
            if (webScrapJson.medianMarketPrice && webScrapJson.medianMarketPrice !== webScrapJson.competitorPricePoint) {
                entries.push({
                    name: "Median Market Price",
                    price: webScrapJson.medianMarketPrice,
                    seller: "Market Median",
                });
            }
            if (webScrapJson.averageMarketPrice && webScrapJson.averageMarketPrice !== webScrapJson.medianMarketPrice) {
                entries.push({
                    name: "Average Market Price",
                    price: webScrapJson.averageMarketPrice,
                    seller: "Market Average",
                });
            }
            if (webScrapJson.highestMarketPrice && webScrapJson.highestMarketPrice !== webScrapJson.competitorPricePoint) {
                entries.push({
                    name: "Highest Market Competitor",
                    price: webScrapJson.highestMarketPrice,
                    seller: "Market",
                });
            }

            items = entries.map((e) => ({
                rank: 0,
                name: e.name,
                price: e.price,
                rating: "-",
                seller: e.seller,
                isOurProduct: false,
            }));
        }

        // Add our product
        if (ourPrice > 0) {
            items.push({
                rank: 0,
                name: "⭐ Our Product (Recommended Price)",
                price: ourPrice,
                rating: "-",
                seller: "Our Store",
                isOurProduct: true,
            });
        }

        // Sort by price ascending and assign rank
        items.sort((a, b) => a.price - b.price);
        items.forEach((item, i) => { item.rank = i + 1; });

        return items;
    }, [webScrapJson]);

    return (
        <SpaceBetween size="m">
            <Container>
                <KeyValuePairs
                    columns={3}
                    items={[
                        {
                            type: "group",
                            title: "Suggested Pricing",
                            items: [
                                {
                                    label: "Recommended price",
                                    value: (
                                        <Badge color="blue">
                                            ${webScrapJson.competitorTotalCost ?? "-"}
                                        </Badge>
                                    ),
                                },
                                {
                                    label: "Min price",
                                    value: (
                                        <Badge color="green">
                                            ${webScrapJson.lowestMarketPrice ?? "-"}
                                        </Badge>
                                    ),
                                },
                                {
                                    label: "Max price",
                                    value: (
                                        <Badge color="severity-medium">
                                            ${webScrapJson.highestMarketPrice ?? "-"}
                                        </Badge>
                                    ),
                                },
                            ],
                        },
                        {
                            type: "group",
                            title: "Competitor Statistics",
                            items: [
                                {
                                    label: "Average Market price",
                                    value: (
                                        <Badge color="blue">
                                            ${webScrapJson.averageMarketPrice ?? "-"}
                                        </Badge>
                                    ),
                                },
                                {
                                    label: "Highest Market Price",
                                    value: (
                                        <Badge color="red">
                                            ${webScrapJson.highestMarketPrice ?? "-"}
                                        </Badge>
                                    ),
                                },
                                {
                                    label: "Lowest Market Price",
                                    value: (
                                        <Badge color="severity-medium">
                                            ${webScrapJson.lowestMarketPrice ?? "-"}
                                        </Badge>
                                    ),
                                },
                            ],
                        },
                        {
                            type: "group",
                            title: "Market Assessment",
                            items: [
                                {
                                    label: "Primary Competitor",
                                    value: (
                                        <Link
                                            href={competitorUrl ?? "#"}
                                            external={competitorUrl?.startsWith("http") ?? false}
                                            onClick={(e) => {
                                                if (!competitorUrl?.startsWith("http")) {
                                                    e.preventDefault();
                                                    navigate(competitorUrl ?? "#");
                                                }
                                            }}
                                        >
                                            {webScrapJson.primaryCompetitor ?? "-"}
                                        </Link>
                                    ),
                                },
                                {
                                    label: "Market Position",
                                    value: `${webScrapJson.marketPositionAssessment ?? "-"}`,
                                },
                                {
                                    label: "Confidence Score",
                                    value: (
                                        <ProgressBar
                                            ariaLabelledby="confidence-score-id"
                                            value={webScrapJson.matchConfidenceScore ?? 0}
                                            variant="key-value"
                                        />
                                    ),
                                },
                            ],
                        },
                    ]}
                />
            </Container>

            {/* Market Position — competitor products + our product ranked by price */}
            <Container
                header={
                    <Header
                        variant="h3"
                        description="Top competitor products scraped live from retailer websites, ranked by price with our product's relative position highlighted."
                    >
                        {/* nosemgrep: i18next-key-format */}
                        {t("competitor.marketPosition")}
                    </Header>
                }
            >
                <Table
                    columnDefinitions={[
                        {
                            id: "rank",
                            header: "#",
                            cell: (item) => (
                                <Box fontWeight={item.isOurProduct ? "bold" : "normal"}>
                                    {item.rank}
                                </Box>
                            ),
                            width: 50,
                        },
                        {
                            id: "name",
                            header: "Product",
                            cell: (item) => (
                                <Box
                                    fontWeight={item.isOurProduct ? "bold" : "normal"}
                                    color={item.isOurProduct ? "text-status-success" : "text-body-secondary"}
                                >
                                    {item.name}
                                </Box>
                            ),
                        },
                        {
                            id: "price",
                            header: "Price",
                            cell: (item) => (
                                <Badge color={item.isOurProduct ? "green" : "grey"}>
                                    ${item.price?.toFixed(2)}
                                </Badge>
                            ),
                            width: 120,
                        },
                        {
                            id: "rating",
                            header: "Rating",
                            cell: (item) => item.isOurProduct ? "-" : item.rating,
                            width: 100,
                        },
                        {
                            id: "seller",
                            header: "Seller / Source",
                            cell: (item) => (
                                <Box
                                    fontWeight={item.isOurProduct ? "bold" : "normal"}
                                    color={item.isOurProduct ? "text-status-success" : "text-body-secondary"}
                                >
                                    {item.seller}
                                </Box>
                            ),
                            width: 150,
                        },
                    ]}
                    items={marketPositionItems}
                    variant="embedded"
                    stripedRows
                    empty={
                        <Box textAlign="center" color="text-status-inactive" padding="l">
                            {/* nosemgrep: i18next-key-format */}
                            {t("competitor.noProducts")}
                        </Box>
                    }
                />
            </Container>
        </SpaceBetween>
    );
};
