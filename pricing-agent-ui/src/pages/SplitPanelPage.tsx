import { SplitPanel, Tabs } from "@cloudscape-design/components";
import { AppRoutes } from "./PageNavigation";
import { useLocation } from "react-router-dom";
import { useGetPricing } from "../hooks/useApi";
import { DemandAnalysis } from "../components/split-panel/DemandAnalysis";
import { WebScrapAnalysis } from "../components/split-panel/WebScapAnalysis";
import { useAtomValue } from "jotai";
import { splitPanelAtom } from "../atoms/AppAtoms";
import { useEffect } from "react";
import { MarginAnalysis } from "../components/split-panel/MarginAnalysis";
import { ProductCard } from "../components/split-panel/ProductCard";
import { PersonalizedPricing } from "../components/split-panel/PersonalizedPricing";

export const SplitPanelPage = () => {
    // get page route here using react router dom
    const { pathname } = useLocation();

    const { data, refetch } = useGetPricing(pathname.split("/")[2] ?? "");
    const splitPanel = useAtomValue(splitPanelAtom);
    useEffect(() => {
        // refetch data when split panel is toggled open
        if (splitPanel) refetch();
    }, [splitPanel]);

    return (
        <>
            {pathname.includes(AppRoutes.pricing.href.split("/")[1]) ? (
                <SplitPanel header="Pricing Summary">
                    <Tabs
                        onChange={() => refetch()}
                        tabs={[
                            {
                                id: "demand",
                                label: "Demand Analysis",
                                content: (
                                    <DemandAnalysis demandForecast={data?.demandForecast ?? "{}"} />
                                ),
                            },
                            {
                                id: "web",
                                label: "Web Scraping",
                                content: <WebScrapAnalysis webScrap={data?.webScrap ?? "{}"} />,
                            },
                            {
                                id: "margin",
                                label: "Margin Analysis",
                                content: (
                                    <MarginAnalysis marginAnalysis={data?.marginAnalysis ?? "{}"} />
                                ),
                            },
                            {
                                id: "product",
                                label: "Product Price",
                                content: (
                                    <ProductCard
                                        product={data?.product ?? "{}"}
                                        marginAnalysis={data?.marginAnalysis ?? "{}"}
                                    />
                                ),
                            },
                            {
                                id: "personalized",
                                label: "Personalized Price",
                                content: (
                                    <PersonalizedPricing
                                        personalizedPricing={data?.personalizedPricing ?? "{}"}
                                    />
                                ),
                            },
                        ]}
                    />
                </SplitPanel>
            ) : null}
        </>
    );
};
