import {
    Badge,
    Button,
    Container,
    Grid,
    Header,
    SpaceBetween,
    Spinner,
    TextContent,
    Tiles,
} from "@cloudscape-design/components";
import { MarginAnalysisType, ProductType, QUERY_KEYS } from "../../utilities/types";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Divider } from "@aws-amplify/ui-react";
import { toast } from "react-toastify";
import { useS3ListItems } from "../../hooks/useStorage";

interface ProductCardProps {
    product: string;
    marginAnalysis: string;
}
export const ProductCard = (props: ProductCardProps) => {
    const { t } = useTranslation();
    const { product, marginAnalysis } = props;
    const { data: productItems, isLoading: isLoadingProducts } = useS3ListItems(
        QUERY_KEYS.PRODUCTS
    );
    const [value, setValue] = useState("");
    const productJson = useMemo(() => JSON.parse(product) as ProductType, [product]);
    const marginAnalysisJson = useMemo(
        () => JSON.parse(marginAnalysis) as MarginAnalysisType,
        [marginAnalysis]
    );

    const specs = useMemo(() => {
        return Object.values(productJson.specs);
    }, [productJson]);

    return (
        <Container
            header={
                <Header
                    variant="h2"
                    description="Control product pricing with human oversight and set product price to be displayed in the product display page."
                >
                    {/* nosemgrep: i18next-key-format */}
                    {t("product.productDisplayPage")}
                </Header>
            }
        >
            <Grid gridDefinition={[{ colspan: 3 }, { colspan: 8 }]}>
                <div
                    style={{
                        alignItems: "center",
                        alignContent: "center",
                        display: "flex",
                        justifyContent: "center",
                        height: "100%",
                        paddingRight: "1vw",
                    }}
                >
                    {isLoadingProducts ? (
                        <Spinner />
                    ) : (
                        <img
                            style={{
                                borderRadius: "1vw",
                                border: "1px solid #f4ae01",
                                boxShadow: "0 0 10px rgba(27, 54, 208, 0.73)",
                                objectFit: "cover",
                                height: "100%",
                                width: "100%",
                                objectPosition: "center",
                                overflow: "hidden",
                                background:
                                    "radial-gradient(circle,rgba(238, 174, 202, 1) 0%, rgba(148, 187, 233, 1) 100%)",
                            }}
                            src={
                                productItems?.find((i) =>
                                    i.itemName.includes(productJson.product_id)
                                )?.url
                            }
                            alt={productJson.product_id}
                            width={"100%"}
                        />
                    )}
                </div>
                <SpaceBetween size="m">
                    <TextContent>
                        <h3>{productJson.product_id}</h3>
                        <p>
                            <small>
                                {productJson.vendor}, {productJson.country}
                            </small>
                        </p>
                    </TextContent>
                    <Divider />
                    <TextContent>
                        {/* nosemgrep: i18next-key-format */}
                        <h5>{t("product.features")}</h5>
                        <SpaceBetween direction="horizontal" size="m">
                            {productJson.features.map((feature, index) => (
                                <Badge key={`${feature}+${index}`} color="blue">
                                    {feature}
                                </Badge>
                            ))}
                        </SpaceBetween>
                    </TextContent>
                    <TextContent>
                        {/* nosemgrep: i18next-key-format */}
                        <h5>{t("product.specifications")}</h5>
                        <SpaceBetween direction="horizontal" size="m">
                            {specs.map((feature: string, index) => (
                                <Badge key={`${feature}+${index}`} color="severity-low">
                                    {feature.toLocaleUpperCase()}
                                </Badge>
                            ))}
                        </SpaceBetween>
                    </TextContent>
                    <TextContent>
                        {/* nosemgrep: i18next-key-format */}
                        <h5>{t("pricing.priceSuggestions")}</h5>
                        <Tiles
                            onChange={({ detail }) => setValue(detail.value)}
                            value={value}
                            items={[
                                {
                                    label: `$${marginAnalysisJson.suggestedPrice ? marginAnalysisJson.suggestedPrice.toString() : "-"}`,
                                    value: "suggestedPrice",
                                    description: "Suggested Price",
                                    disabled: !marginAnalysisJson.suggestedPrice,
                                },
                                {
                                    label: `$${marginAnalysisJson.minimumPrice ? marginAnalysisJson.minimumPrice.toString() : "-"}`,
                                    value: "minimumPrice",
                                    description: "Minimum Price",
                                    disabled: !marginAnalysisJson.minimumPrice,
                                },
                                {
                                    label: `$${marginAnalysisJson.maximumPrice ? marginAnalysisJson.maximumPrice.toString() : "-"}`,
                                    value: "maximumPrice",
                                    description: "Maximum Price",
                                    disabled: !marginAnalysisJson.maximumPrice,
                                },
                                {
                                    label: `$${marginAnalysisJson.mapPrice ? marginAnalysisJson.mapPrice.toString() : "-"}`,
                                    value: "mapPrice",
                                    description: "MAP Price",
                                    disabled: !marginAnalysisJson.mapPrice,
                                },
                            ]}
                        />
                    </TextContent>
                    <Button
                        disabled={!value}
                        variant="primary"
                        onClick={() => toast.success("Product price selected")}
                    >
                        {/* nosemgrep: i18next-key-format */}
                        {t("pricing.setPrice")}
                    </Button>
                </SpaceBetween>
            </Grid>
        </Container>
    );
};
