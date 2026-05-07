import { ContentLayout, Container, Box, Grid } from "@cloudscape-design/components";
import { useTranslation } from "react-i18next";

import { ProductSelector } from "../components/home/ProductSelector";

export const Home = () => {
    const { t } = useTranslation();
    return (
        <ContentLayout
            headerVariant="high-contrast"
            defaultPadding
            // add box shadow
            headerBackgroundStyle="linear-gradient(166deg, rgba(101,27,182,0.8365721288515406) 25%, rgba(53,106,177,0.8533788515406162) 50%, rgba(13,86,170,0.8645833333333334) 86%)"
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
                                    {/* nosemgrep: i18next-key-format */}
                                    {t("home.title")}
                                </Box>
                                <Box fontSize="display-l" fontWeight="light">
                                    {/* nosemgrep: i18next-key-format */}
                                    {t("home.poweredBy")}
                                </Box>
                                <Box
                                    variant="p"
                                    color="text-body-secondary"
                                    margin={{ top: "xs", bottom: "l" }}
                                >
                                    {/* nosemgrep: i18next-key-format */}
                                    {t("home.subtitle")}
                                </Box>
                            </Box>
                        </Container>
                    </Grid>
                </Box>
            }
        >
            <ProductSelector />
        </ContentLayout>
    );
};
