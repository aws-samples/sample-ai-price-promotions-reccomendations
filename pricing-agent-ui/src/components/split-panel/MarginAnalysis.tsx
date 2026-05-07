import { useMemo } from "react";
import { MarginAnalysisType } from "../../utilities/types";
import {
    Badge,
    Container,
    KeyValuePairs,
    ProgressBar,
    SpaceBetween,
} from "@cloudscape-design/components";
import { RenderBoldText } from "../../utilities";

interface MarginAnalysisProps {
    marginAnalysis: string;
}
export const MarginAnalysis = (props: MarginAnalysisProps) => {
    const { marginAnalysis } = props;
    const marginAnalysisJson = useMemo(
        () => JSON.parse(marginAnalysis) as MarginAnalysisType,
        [marginAnalysis]
    );
    return (
        <SpaceBetween direction="vertical" size="m">
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
                                            ${marginAnalysisJson.suggestedPrice ?? "-"}
                                        </Badge>
                                    ),
                                },
                                {
                                    label: "Min price",
                                    value: (
                                        <Badge color="green">
                                            ${marginAnalysisJson.minimumPrice ?? "-"}
                                        </Badge>
                                    ),
                                },
                                {
                                    label: "Max price",
                                    value: (
                                        <Badge color="severity-medium">
                                            ${marginAnalysisJson.maximumPrice ?? "-"}
                                        </Badge>
                                    ),
                                },
                                {
                                    label: "MAP price",
                                    value: (
                                        <Badge color="grey">
                                            ${marginAnalysisJson.mapPrice ?? "-"}
                                        </Badge>
                                    ),
                                },
                            ],
                        },
                        {
                            type: "group",
                            title: "Margin Rates",
                            items: [
                                {
                                    label: "Base Margin",
                                    value: (
                                        <ProgressBar
                                            ariaLabelledby="base-margin-id"
                                            value={
                                                marginAnalysisJson.baseMarginRate
                                                    ? marginAnalysisJson.baseMarginRate * 100
                                                    : 0
                                            }
                                            variant="key-value"
                                        />
                                    ),
                                },
                                {
                                    label: "Calculated Margin",
                                    value: (
                                        <ProgressBar
                                            ariaLabelledby="calculated-margin-id"
                                            value={
                                                marginAnalysisJson.calculatedMargin
                                                    ? marginAnalysisJson.calculatedMargin * 100
                                                    : 0
                                            }
                                            variant="key-value"
                                        />
                                    ),
                                },
                                {
                                    label: "Adjusted Margin",
                                    value: (
                                        <ProgressBar
                                            ariaLabelledby="adjusted-margin-id"
                                            value={
                                                marginAnalysisJson.adjustedMarginRate
                                                    ? marginAnalysisJson.adjustedMarginRate * 100
                                                    : 0
                                            }
                                            variant="key-value"
                                        />
                                    ),
                                },
                            ],
                        },
                        {
                            type: "group",
                            title: "Margin Flags",
                            items: [
                                {
                                    label: "MAP Compliance",
                                    value: (
                                        <Badge
                                            color={
                                                marginAnalysisJson.isMapCompliant ? "green" : "red"
                                            }
                                        >
                                            {marginAnalysisJson.isMapCompliant ? "Yes" : "No"}
                                        </Badge>
                                    ),
                                },
                                {
                                    label: "Margin Compliance",
                                    value: (
                                        <Badge
                                            color={
                                                marginAnalysisJson.isMarginCompliant
                                                    ? "green"
                                                    : "red"
                                            }
                                        >
                                            {marginAnalysisJson.isMarginCompliant ? "Yes" : "No"}
                                        </Badge>
                                    ),
                                },
                                {
                                    label: "Requires Human Review",
                                    value: (
                                        <Badge
                                            color={
                                                marginAnalysisJson.requiresReview ? "red" : "green"
                                            }
                                        >
                                            {marginAnalysisJson.requiresReview ? "Yes" : "No"}
                                        </Badge>
                                    ),
                                },
                            ],
                        },
                    ]}
                />
            </Container>
            <Container>
                <KeyValuePairs
                    columns={2}
                    items={[
                        {
                            label: "Margin Explanation",
                            value: (
                                <div style={{ whiteSpace: "pre-line" }}>
                                    {RenderBoldText(marginAnalysisJson.marginExplanation ?? "-")}
                                </div>
                            ),
                        },
                        {
                            label: "Pricing Explanation",
                            value: (
                                <div style={{ whiteSpace: "pre-line" }}>
                                    {RenderBoldText(marginAnalysisJson.pricingRationale ?? "-")}
                                </div>
                            ),
                        },
                    ]}
                />
            </Container>
        </SpaceBetween>
    );
};
