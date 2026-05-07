// nosemgrep: i18next-key-format
import {
    Container,
    Header,
    SpaceBetween,
    Spinner,
    Tiles,
    Button,
    Select,
    FormField,
    ColumnLayout,
    Box,
    Badge,
    RadioGroup,
    Modal,
} from "@cloudscape-design/components";
import { useTranslation } from "react-i18next";
import { fetchJsonFromPath, useS3ListItems } from "../../hooks/useStorage";
import { ProductType, QUERY_KEYS } from "../../utilities/types";
import { useEffect, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { addPricing, appsyncResolver } from "../../hooks/useApi";
import { useAuthenticator } from "@aws-amplify/ui-react";

import { useNavigate } from "react-router-dom";
import { AppRoutes } from "../../pages/PageNavigation";
import { useAtom } from "jotai";
import { notificationAtom } from "../../atoms/AppAtoms";
import { useResetAtom } from "jotai/utils";

// ═══════════════════════════════════════════════════════════════════════════
// Persona definitions with product category mappings
// ═══════════════════════════════════════════════════════════════════════════

interface PersonaDef {
    id: string;
    label: string;
    emoji: string;
    description: string;
    categories: string[];
}

const PERSONAS: PersonaDef[] = [
    {
        id: "audiophile",
        label: "Audiophile",
        emoji: "🎧",
        description: "Passionate about sound quality, owns multiple audio devices",
        categories: ["headphones", "speakers", "earbuds"],
    },
    {
        id: "fitness_enthusiast",
        label: "Fitness Enthusiast",
        emoji: "🏃",
        description: "Active lifestyle, tracks workouts and health metrics",
        categories: ["smartwatches", "wearables", "earbuds"],
    },
    {
        id: "movie_lover",
        label: "Movie Lover",
        emoji: "🎬",
        description: "Home entertainment enthusiast, streams content regularly",
        categories: ["tablets", "speakers"],
    },
    {
        id: "early_adopter",
        label: "Early Adopter",
        emoji: "🚀",
        description: "Always wants the latest tech, pre-orders new releases",
        categories: [],
    },
    {
        id: "budget_conscious",
        label: "Budget Conscious",
        emoji: "💰",
        description: "Value-focused shopper, compares prices carefully",
        categories: [],
    },
    {
        id: "gamer",
        label: "Gamer",
        emoji: "🎮",
        description: "Competitive gaming, values precision and low latency",
        categories: ["gaming mice", "keyboards", "headphones"],
    },
    {
        id: "remote_worker",
        label: "Remote Worker",
        emoji: "💻",
        description: "Works from home, needs reliable tech for video calls",
        categories: ["webcams", "headphones", "keyboards"],
    },
    {
        id: "traveler",
        label: "Frequent Traveler",
        emoji: "✈️",
        description: "Always on the go, needs portable and long-battery devices",
        categories: ["headphones", "earbuds", "chargers", "portable chargers"],
    },
];

const LOYALTY_TIERS = [
    { value: "platinum", label: "💎 Platinum Member", discount: "15% loyalty discount" },
    { value: "gold", label: "🥇 Gold Member", discount: "10% loyalty discount" },
    { value: "silver", label: "🥈 Silver Member", discount: "5% loyalty discount" },
    { value: "standard", label: "Standard Customer", discount: "No loyalty discount" },
];

const PAYMENT_METHODS = [
    { value: "brand_credit_card", label: "Brand Credit Card (+3% bonus)" },
    { value: "store_gift_card", label: "Store Gift Card (+2% bonus)" },
    { value: "debit_card", label: "Debit/Credit Card (no bonus)" },
];

const CUSTOMER_MAP: Record<string, Record<string, string>> = {
    audiophile: { gold: "cust-001", platinum: "cust-008", silver: "cust-008", standard: "cust-001" },
    fitness_enthusiast: { platinum: "cust-002", silver: "cust-006", gold: "cust-006", standard: "cust-006" },
    budget_conscious: { silver: "cust-003", standard: "cust-007", gold: "cust-003", platinum: "cust-003" },
    movie_lover: { platinum: "cust-004", silver: "cust-009", gold: "cust-009", standard: "cust-009" },
    early_adopter: { gold: "cust-005", platinum: "cust-010", silver: "cust-005", standard: "cust-005" },
    gamer: { gold: "cust-011", platinum: "cust-011", silver: "cust-011", standard: "cust-011" },
    remote_worker: { silver: "cust-012", gold: "cust-012", platinum: "cust-012", standard: "cust-012" },
    traveler: { platinum: "cust-013", gold: "cust-013", silver: "cust-013", standard: "cust-013" },
};

// ═══════════════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════════════

export const ProductSelector = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { user } = useAuthenticator((context) => [context.user]);
    const { data: productItems, isLoading: isLoadingProducts } = useS3ListItems(
        QUERY_KEYS.PRODUCTS
    );
    const [products, setProducts] = useState<Array<ProductType>>([]);
    const [selectedProductID, setSelectedProductID] = useState("");
    const [showPersonaModal, setShowPersonaModal] = useState(false);
    const [selectedPersona, setSelectedPersona] = useState("");
    const [selectedTier, setSelectedTier] = useState("gold");
    const [selectedPayment, setSelectedPayment] = useState("brand_credit_card");
    const [notification, setNotification] = useAtom(notificationAtom);
    const resetNotifications = useResetAtom(notificationAtom);

    useEffect(() => {
        if (!productItems) return;
        const item = productItems.find((i) =>
            i.itemName.includes(QUERY_KEYS.PRODUCTS.toLowerCase())
        );
        if (!item) return;
        const response = fetchJsonFromPath(item.path + item.itemName);
        response.then((data) => {
            setProducts(data as unknown as [ProductType]);
        });
    }, [productItems]);

    const selectedProduct = useMemo(
        () => products.find((p: ProductType) => p.product_id === selectedProductID),
        [products, selectedProductID]
    );

    // Filter personas based on selected product's class/role
    const relevantPersonas = useMemo(() => {
        if (!selectedProduct) return [];
        const productClass = selectedProduct.class?.toLowerCase() || "";
        const productRole = selectedProduct.role?.toLowerCase() || "";

        return PERSONAS.filter((p) => {
            if (p.id === "early_adopter") return productRole === "best";
            if (p.id === "budget_conscious") return true;
            return p.categories.some((cat) => productClass.includes(cat) || cat.includes(productClass));
        });
    }, [selectedProduct]);

    // Build the customerID for the backend
    const customerID = useMemo(() => {
        if (!selectedPersona) return "";
        return CUSTOMER_MAP[selectedPersona]?.[selectedTier] || "";
    }, [selectedPersona, selectedTier]);

    // trigger resolver function
    const resolverFunctionMutation = useMutation({
        mutationFn: (sessionID: string) =>
            appsyncResolver(
                JSON.stringify({
                    userID: user.userId,
                    sessionID,
                    product: selectedProduct,
                    customerID: customerID || undefined,
                })
            ),
        onError: (error) => {
            console.error(error);
        },
    });

    // create a pricing transaction mutation
    const pricingTransactionMutation = useMutation({
        mutationFn: () => addPricing(user.userId, JSON.stringify(selectedProduct)),
        onError: (error) => {
            console.error(error);
        },
        onSuccess: ({ data }) => {
            resolverFunctionMutation.mutate(data.createPricing.id);
            setNotification({
                ...notification,
                currentSessionId: data.createPricing.id,
            });
            setShowPersonaModal(false);
            navigate(AppRoutes.pricing.href.replace(":id", data.createPricing.id));
        },
        onMutate: () => {
            resetNotifications();
        },
    });

    const handleGenerateClick = () => {
        setSelectedPersona("");
        setSelectedTier("gold");
        setSelectedPayment("brand_credit_card");
        setShowPersonaModal(true);
    };

    const handleConfirmGenerate = () => {
        pricingTransactionMutation.mutate();
    };

    const isGenerating =
        resolverFunctionMutation.isPending || pricingTransactionMutation.isPending;

    return (
        <>
            {/* Product Selection */}
            <Container
                header={
                    <Header
                        variant="h2"
                        description="Select a product to generate AI-powered pricing recommendations."
                        actions={
                            <Button
                                disabled={!selectedProduct}
                                variant="primary"
                                onClick={handleGenerateClick}
                            >
                                {/* nosemgrep: i18next-key-format */}
                                {t("pricing.generatePrice")}
                            </Button>
                        }
                    >
                        {/* nosemgrep: i18next-key-format */}
                        {t("product.productList")}
                    </Header>
                }
            >
                {isLoadingProducts && <Spinner />}
                {products.length > 0 && (
                    <Tiles
                        onChange={({ detail }) => setSelectedProductID(detail.value)}
                        value={selectedProductID}
                        columns={4}
                        items={products.map((c) => ({
                            label: c.product_id,
                            value: c.product_id,
                            description: c.vendor,
                            image: (
                                <img
                                    width={"100%"}
                                    src={
                                        productItems?.find((i) =>
                                            i.itemName.includes(c.product_id)
                                        )?.url ??
                                        "https://img.freepik.com/premium-photo/circular-saw-icon-with-shiny-metallic_992212-269744.jpg"
                                    }
                                    alt={c.product_id}
                                    draggable={false}
                                />
                            ),
                        }))}
                    />
                )}
            </Container>

            {/* Personalization Modal */}
            <Modal
                visible={showPersonaModal}
                onDismiss={() => !isGenerating && setShowPersonaModal(false)}
                header={`Personalize Pricing — ${selectedProduct?.product_id || ""}`}
                size="large"
                footer={
                    <Box float="right">
                        <SpaceBetween direction="horizontal" size="xs">
                            <Button
                                variant="link"
                                onClick={() => setShowPersonaModal(false)}
                                disabled={isGenerating}
                            >
                                {/* nosemgrep: i18next-key-format */}
                                {t("common.cancel")}
                            </Button>
                            <Button
                                variant="primary"
                                onClick={handleConfirmGenerate}
                                loading={isGenerating}
                            >
                                {/* nosemgrep: i18next-key-format */}
                                {t("product.confirmPersona")}
                            </Button>
                        </SpaceBetween>
                    </Box>
                }
            >
                <SpaceBetween direction="vertical" size="l">
                    {/* Product summary */}
                    <Box variant="p" color="text-body-secondary">
                        <strong>{selectedProduct?.vendor}</strong> · {selectedProduct?.class} · {selectedProduct?.role} tier
                        {selectedProduct?.cost && ` · Cost: $${selectedProduct.cost}`}
                        {selectedProduct?.MSRP && ` · MSRP: $${selectedProduct.MSRP}`}
                    </Box>

                    {/* Persona Selection */}
                    <FormField
                        label="Customer Persona"
                        description={`Select a shopping persona relevant to ${selectedProduct?.class || "this product"} (optional)`}
                    >
                        <RadioGroup
                            onChange={({ detail }) => setSelectedPersona(detail.value)}
                            value={selectedPersona}
                            items={[
                                { value: "", label: "No personalization (standard pricing only)" },
                                ...relevantPersonas.map((p) => ({
                                    value: p.id,
                                    label: `${p.emoji} ${p.label}`,
                                    description: p.description,
                                })),
                            ]}
                        />
                    </FormField>

                    {/* Tier + Payment — only when persona is selected */}
                    {selectedPersona && (
                        <ColumnLayout columns={2}>
                            <FormField label="Loyalty Tier">
                                <Select
                                    selectedOption={LOYALTY_TIERS.find((t) => t.value === selectedTier) || null}
                                    onChange={({ detail }) =>
                                        setSelectedTier(detail.selectedOption.value || "standard")
                                    }
                                    options={LOYALTY_TIERS}
                                />
                            </FormField>
                            <FormField label="Payment Method">
                                <Select
                                    selectedOption={PAYMENT_METHODS.find((p) => p.value === selectedPayment) || null}
                                    onChange={({ detail }) =>
                                        setSelectedPayment(detail.selectedOption.value || "debit_card")
                                    }
                                    options={PAYMENT_METHODS}
                                />
                            </FormField>
                        </ColumnLayout>
                    )}

                    {/* Summary badges */}
                    {selectedPersona && (
                        <Box>
                            <SpaceBetween direction="horizontal" size="xs">
                                <Badge color={selectedTier === "platinum" ? "blue" : "grey"}>
                                    {selectedTier.toUpperCase()}
                                </Badge>
                                <Badge color="green">
                                    {PERSONAS.find((p) => p.id === selectedPersona)?.label || selectedPersona}
                                </Badge>
                                <Badge color="grey">
                                    {PAYMENT_METHODS.find((p) => p.value === selectedPayment)?.label || selectedPayment}
                                </Badge>
                            </SpaceBetween>
                        </Box>
                    )}
                </SpaceBetween>
            </Modal>
        </>
    );
};
