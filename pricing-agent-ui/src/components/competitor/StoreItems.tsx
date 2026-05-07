import {
    Cards,
    Box,
    SpaceBetween,
    Header,
    ButtonDropdown,
    Container,
    ButtonDropdownProps,
    TextContent,
} from "@cloudscape-design/components";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { getUrl } from "aws-amplify/storage";
import { DatasetPrefix, QUERY_KEYS, StoreProduct } from "../../utilities/types";
import { fetchJsonFromPath, useS3ListItems } from "../../hooks/useStorage";

interface props {
    storeName: QUERY_KEYS.BUILDER_DEPOT | QUERY_KEYS.TOOL_MASTER;
}
export const StoreItems = (props: props) => {
    const { t } = useTranslation();
    const { data: productItems, isLoading: isLoadingProducts } = useS3ListItems(props.storeName);
    const [products, setProducts] = useState<Array<StoreProduct>>([]);
    const [selectedProductType, setSelectedProductType] = useState("");

    const buttonGroupItems = useMemo(() => {
        const items = products.map((i) => ({
            id: i.product_type,
            text: i.product_type,
        }));
        const uniqueItems = items.filter(
            (item, index, self) => index === self.findIndex((t) => t.id === item.id)
        );
        uniqueItems.unshift({
            id: "All",
            text: "All",
        });
        return uniqueItems as ButtonDropdownProps.ItemOrGroup[];
    }, [products]);

    const filteredProducts = useMemo(() => {
        if (selectedProductType === "" || selectedProductType === "All") return products;
        return products.filter((product) => product.product_type === selectedProductType);
    }, [selectedProductType, products]);

    useEffect(() => {
        setSelectedProductType("");
        if (!productItems) return;
        // Find the listings.json file — skip image files
        const jsonItem = productItems.find((i) => i.itemName.endsWith(".json"));
        if (!jsonItem) return;
        const response = fetchJsonFromPath(jsonItem.path + jsonItem.itemName);
        response.then((data) => {
            if (Array.isArray(data)) {
                setProducts(data as unknown as [StoreProduct]);
            }
        });
    }, [productItems]);

    return (
        <Container
            header={
                <Header
                    counter={`(${filteredProducts.length})`}
                    actions={
                        <SpaceBetween direction="horizontal" size="xs">
                            <ButtonDropdown
                                variant="primary"
                                onItemClick={({ detail }) => setSelectedProductType(detail.id)}
                                items={buttonGroupItems}
                            >
                                {/* nosemgrep: i18next-key-format */}
                                {t("product.productTypes")}
                            </ButtonDropdown>
                        </SpaceBetween>
                    }
                >
                    {/* nosemgrep: i18next-key-format */}
                    {t("product.productList")}
                </Header>
            }
        >
            <Cards
                cardDefinition={{
                    header: (item) => {
                        const storeDisplayName: Record<string, string> = {
                            TOOL_MASTER: "TechHaven",
                            BUILDER_DEPOT: "GadgetWorld",
                        };
                        return (
                        <TextContent>
                            <h4>{item.model}</h4>
                            <p>
                                <small>{storeDisplayName[props.storeName] || props.storeName}</small>
                            </p>
                        </TextContent>
                    )},
                    sections: [
                        {
                            id: "image",
                            content: (item) => (
                                <ProductImage
                                    storeName={props.storeName}
                                    model={item.model}
                                />
                            ),
                        },
                        {
                            id: "regularPrice",
                            header: "Price",
                            content: (item) => `$ ${item.regular_price}`,
                        },
                        {
                            id: "product_type",
                            header: "Product Type",
                            content: (item) => item.product_type,
                        },
                        {
                            id: "stock_status",
                            header: "Stock Status",
                            content: (item) => item.stock_status,
                        },
                    ],
                }}
                cardsPerRow={[{ cards: 2 }, { minWidth: 200, cards: 5 }]}
                items={filteredProducts}
                loading={isLoadingProducts}
                loadingText="Loading resources"
                selectionType="single"
                trackBy="model"
                visibleSections={["image", "regularPrice", "product_type", "stock_status"]}
                empty={
                    <Box margin={{ vertical: "xs" }} textAlign="center" color="inherit">
                        <SpaceBetween size="m">
                            {/* nosemgrep: i18next-key-format */}
                            <b>{t("common.noResources")}</b>
                        </SpaceBetween>
                    </Box>
                }
            />
        </Container>
    );
};

const ProductImage = ({ storeName, model }: { storeName: string; model: string }) => {
    const { t } = useTranslation();
    const [imgUrl, setImgUrl] = useState<string>("");

    useEffect(() => {
        // Use the same DatasetPrefix mapping as the store listings
        const prefix = DatasetPrefix[storeName as keyof typeof DatasetPrefix] || "builder-depot/";
        const fileName = model.replace(/\s+/g, "-");
        const path = `${prefix}${fileName}.png`;

        getUrl({
            path,
            options: { validateObjectExistence: true, expiresIn: 3600 },
        })
            .then((result) => setImgUrl(result.url.href.toString()))
            .catch(() => setImgUrl(""));
    }, [storeName, model]);

    return (
        <div
            style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                height: "100%",
            }}
        >
            {imgUrl ? (
                <img
                    style={{
                        borderRadius: "1vw",
                        border: "1px solid #f4ae01",
                        boxShadow: "0 0 10px rgba(27, 54, 208, 0.73)",
                        objectFit: "cover",
                        width: "70%",
                        objectPosition: "center",
                        overflow: "hidden",
                        margin: "1vw",
                    }}
                    src={imgUrl}
                    alt={model}
                />
            ) : (
                <Box padding="l" textAlign="center" color="text-status-inactive">
                    {/* nosemgrep: i18next-key-format */}
                    {t("common.loading")}
                </Box>
            )}
        </div>
    );
};
