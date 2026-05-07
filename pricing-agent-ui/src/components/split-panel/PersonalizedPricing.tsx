import {
    Box,
    ColumnLayout,
    Container,
    Header,
    SpaceBetween,
    Badge,
    KeyValuePairs,
    ExpandableSection,
} from "@cloudscape-design/components";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

interface PersonalizedPricingProps {
    personalizedPricing: string;
}

export const PersonalizedPricing = ({ personalizedPricing }: PersonalizedPricingProps) => {
    const { t } = useTranslation();
    const data = useMemo(() => {
        try {
            return JSON.parse(personalizedPricing);
        } catch {
            return null;
        }
    }, [personalizedPricing]);

    if (!data || !data.personalizedPrice) {
        return (
            <Container header={
                // nosemgrep: i18next-key-format
                <Header variant="h3">{t("personalizedPricing.title")}</Header>
            }>
                <Box textAlign="center" color="text-status-inactive" padding="l">
                    {/* nosemgrep: i18next-key-format */}
                    {t("personalizedPricing.noData")}
                </Box>
            </Container>
        );
    }

    const breakdown = data.discountBreakdown || {};
    const loyalty = breakdown.loyaltyDiscount || breakdown.loyalty_discount || {};
    const payment = breakdown.paymentBonus || breakdown.payment_bonus || {};
    const persona = breakdown.personaOffer || breakdown.persona_offer || {};
    const margin = data.marginValidation || {};
    const offer = data.offerDetails || {};

    const tierColors: Record<string, string> = {
        platinum: "blue",
        gold: "grey",
        silver: "grey",
    };

    return (
        <SpaceBetween size="l">
            {/* Price Summary */}
            <Container
                header={
                    <Header
                        variant="h3"
                        description="Exclusive pricing based on customer loyalty, payment method, and shopping behavior."
                    >
                        {/* nosemgrep: i18next-key-format */}
                        💎 {t("personalizedPricing.personalizedPrice")}
                    </Header>
                }
            >
                <ColumnLayout columns={3} variant="text-grid">
                    <Box>
                        {/* nosemgrep: i18next-key-format */}
                        <Box variant="awsui-key-label">{t("personalizedPricing.personalizedPrice")}</Box>
                        <Box fontSize="display-l" fontWeight="bold" color="text-status-success">
                            ${data.personalizedPrice?.toFixed(2)}
                        </Box>
                    </Box>
                    <Box>
                        {/* nosemgrep: i18next-key-format */}
                        <Box variant="awsui-key-label">{t("personalizedPricing.basePrice")}</Box>
                        <Box fontSize="heading-l" color="text-status-inactive">
                            <s>${data.baseSuggestedPrice?.toFixed(2)}</s>
                        </Box>
                    </Box>
                    <Box>
                        {/* nosemgrep: i18next-key-format */}
                        <Box variant="awsui-key-label">{t("personalizedPricing.youSave")}</Box>
                        <Box fontSize="heading-l" fontWeight="bold" color="text-status-error">
                            ${data.totalSavings?.toFixed(2)} ({data.savingsPercentage?.toFixed(1)}%)
                        </Box>
                    </Box>
                </ColumnLayout>
            </Container>

            {/* Discount Breakdown */}
            <Container
                header={
                    // nosemgrep: i18next-key-format
                    <Header variant="h3">{t("personalizedPricing.discountBreakdown")}</Header>
                }
            >
                <SpaceBetween size="m">
                    {/* Loyalty */}
                    <ColumnLayout columns={3} variant="text-grid">
                        <Box>
                            <Box variant="awsui-key-label">
                                {/* nosemgrep: i18next-key-format */}
                                {t("personalizedPricing.loyaltyTier")}{" "}
                                <Badge color={tierColors[loyalty.tier] || "grey"}>
                                    {(loyalty.tier || "standard").toUpperCase()}
                                </Badge>
                            </Box>
                            <Box fontSize="heading-m">
                                {loyalty.percentage > 0
                                    ? `-${loyalty.percentage}% (−$${loyalty.amount?.toFixed(2)})`
                                    : "0% (standard tier)"}
                            </Box>
                        </Box>
                        <Box>
                            {/* nosemgrep: i18next-key-format */}
                            <Box variant="awsui-key-label">{t("personalizedPricing.paymentBonus")}</Box>
                            <Box fontSize="heading-m">
                                {payment.percentage > 0
                                    ? `-${payment.percentage}% (−$${payment.amount?.toFixed(2)}) — ${(payment.method || "").replace(/_/g, " ")}`
                                    : "0% (no bonus payment method)"}
                            </Box>
                        </Box>
                        <Box>
                            <Box variant="awsui-key-label">
                                {/* nosemgrep: i18next-key-format */}
                                {t("personalizedPricing.personaReward")}{" "}
                                {persona.persona && (
                                    <Badge color="green">
                                        {(persona.persona || "").replace(/_/g, " ")}
                                    </Badge>
                                )}
                            </Box>
                            <Box fontSize="heading-m">
                                {persona.percentage > 0
                                    ? `-${persona.percentage}% (−$${persona.amount?.toFixed(2)}) — ${persona.type || "category match"}`
                                    : "0% (no persona match)"}
                            </Box>
                        </Box>
                    </ColumnLayout>
                </SpaceBetween>
            </Container>

            {/* Margin Validation */}
            <Container
                header={
                    // nosemgrep: i18next-key-format
                    <Header variant="h3">{t("personalizedPricing.marginValidation")}</Header>
                }
            >
                <KeyValuePairs
                    columns={4}
                    items={[
                        {
                            label: "Final Margin",
                            value: `${margin.finalMargin || margin.final_margin || 0}%`,
                        },
                        {
                            label: "Margin Floor",
                            value: `${margin.marginFloor || margin.margin_floor || 0}%`,
                        },
                        {
                            label: "Compliant",
                            value: (margin.isCompliant || margin.is_compliant)
                                ? "✅ Yes"
                                : "❌ No",
                        },
                        {
                            label: "Discount Capped",
                            value: (margin.wasCapped || margin.was_capped)
                                ? "⚠️ Yes (hit margin floor)"
                                : "No",
                        },
                    ]}
                />
            </Container>

            {/* Offer Details */}
            {offer.message && (
                <Container
                    header={
                        // nosemgrep: i18next-key-format
                        <Header variant="h3">{t("personalizedPricing.offerDetails")}</Header>
                    }
                >
                    <SpaceBetween size="s">
                        <Box fontSize="heading-s" fontWeight="bold">
                            {offer.message}
                        </Box>
                        {offer.expiresAt && (
                            <Box color="text-status-inactive">
                                ⏰ Expires: {new Date(offer.expiresAt || offer.expires_at).toLocaleDateString()}
                            </Box>
                        )}
                        {(offer.isExclusive || offer.is_exclusive) && (
                            <Badge color="blue">🔒 Exclusive — not available publicly</Badge>
                        )}
                    </SpaceBetween>
                </Container>
            )}

            {/* Rationale */}
            {data.rationale && (
                <ExpandableSection headerText="Pricing Rationale">
                    <Box variant="p" color="text-body-secondary">
                        {data.rationale}
                    </Box>
                </ExpandableSection>
            )}
        </SpaceBetween>
    );
};
