// nosemgrep: i18next-key-format
import {
    Badge,
    Container,
    FormField,
    Header,
    KeyValuePairs,
    SpaceBetween,
    TextContent,
} from "@cloudscape-design/components";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { DemandForecast } from "../../utilities/types";
import { RenderBoldText } from "../../utilities";

interface DemandAnalysisProps {
    demandForecast: string;
}
export const DemandAnalysis = (props: DemandAnalysisProps) => {
    const { t } = useTranslation();
    const { demandForecast } = props;
    const demandForecastJson = useMemo(
        () => JSON.parse(demandForecast) as DemandForecast,
        [demandForecast]
    );
    return (
        <SpaceBetween direction="vertical" size="m">
            <Container>
                <KeyValuePairs
                    columns={2}
                    items={[
                        {
                            type: "group",
                            title: "Suggested Pricing",
                            items: [
                                {
                                    label: "Recommended price",
                                    value: (
                                        <Badge color="blue">
                                            ${demandForecastJson.recommendedPrice ?? "-"}
                                        </Badge>
                                    ),
                                },
                                {
                                    label: "Min price",
                                    value: (
                                        <Badge color="green">
                                            ${demandForecastJson.priceFloor ?? "-"}
                                        </Badge>
                                    ),
                                },
                                {
                                    label: "Max price",
                                    value: (
                                        <Badge color="severity-medium">
                                            ${demandForecastJson.priceCeiling ?? "-"}
                                        </Badge>
                                    ),
                                },
                            ],
                        },
                        {
                            type: "group",
                            title: "Confidence Scores",
                            items: [
                                {
                                    label: "P10",
                                    value: `${demandForecastJson.confidenceP10 ?? "-"}`,
                                },
                                {
                                    label: "P50",
                                    value: `${demandForecastJson.confidenceP50 ?? "-"}`,
                                },
                                {
                                    label: "P90",
                                    value: `${demandForecastJson.confidenceP90 ?? "-"}`,
                                },
                            ],
                        },
                    ]}
                />
            </Container>

            {/* nosemgrep: i18next-key-format */}
            <Container header={<Header>{t("demand.rationale")}</Header>}>
                <TextContent>
                    <div style={{ whiteSpace: "pre-line" }}>
                        {RenderBoldText(demandForecastJson.pricingRationale ?? "-")}
                    </div>
                </TextContent>
            </Container>
        </SpaceBetween>
    );
};
