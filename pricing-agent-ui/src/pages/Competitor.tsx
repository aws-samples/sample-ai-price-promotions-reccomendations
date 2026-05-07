import { ContentLayout, Box, Container, Grid } from "@cloudscape-design/components";
import tool_master_banner from "../assets/tool_master_banner.jpeg";
import builders_depot_banner from "../assets/builders_depot_banner.jpeg";
import { useLocation } from "react-router-dom";
import { StoreItems } from "../components/competitor/StoreItems";
import { QUERY_KEYS } from "../utilities/types";

export const Competitor = () => {
    const { pathname } = useLocation();
    return (
        <ContentLayout
            headerVariant="high-contrast"
            defaultPadding
            headerBackgroundStyle={(mode) =>
                `linear-gradient(rgba(128, 128, 128, 0.5), rgba(128, 128, 128, 0.5)), center center/cover url(${pathname.includes("tool-master") ? tool_master_banner : builders_depot_banner})`
            }
            header={
                <Box padding={{ vertical: "xxxl" }}>
                    <Grid gridDefinition={[{ colspan: { default: 12, s: 8 } }]}>
                        <Container>
                            <Box padding="s">
                                <Box
                                    fontSize="display-l"
                                    fontWeight="bold"
                                    variant="h1"
                                    padding="n"
                                >
                                    {pathname.includes("tool-master")
                                        ? "TECHHAVEN"
                                        : "GADGETWORLD"}
                                </Box>
                                <Box fontSize="display-l" fontWeight="light">
                                    {pathname.includes("tool-master")
                                        ? "Your One-Stop Electronics Destination"
                                        : "Smart Tech. Smart Prices. Smart Shopping."}
                                </Box>
                                <Box
                                    variant="p"
                                    color="text-body-secondary"
                                    margin={{ top: "xs", bottom: "l" }}
                                >
                                    {pathname.includes("tool-master")
                                        ? "Discover premium headphones, speakers, tablets, and smartwatches from top brands. Expert reviews, competitive prices, and fast shipping on all consumer electronics."
                                        : "From wireless earbuds to gaming peripherals, we bring you the latest gadgets at unbeatable prices. Compare specs, read reviews, and find your perfect tech match."}
                                </Box>
                            </Box>
                        </Container>
                    </Grid>
                </Box>
            }
        >
            <StoreItems
                storeName={
                    pathname.includes("tool-master")
                        ? QUERY_KEYS.TOOL_MASTER
                        : QUERY_KEYS.BUILDER_DEPOT
                }
            />
        </ContentLayout>
    );
};
