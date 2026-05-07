import { HelpPanel, Icon, TextContent } from "@cloudscape-design/components";
import { useTranslation } from "react-i18next";

export const HomeInfo = () => {
    const { t } = useTranslation();
    return (
        <HelpPanel
            footer={
                <TextContent>
                    <h3>
                        {/* nosemgrep: i18next-key-format */}
                        {t("info.learnMore")} <Icon name="external" size="inherit" />
                    </h3>
                    <ul>
                        <li>
                            <a href="https://aws.amazon.com/personalize/" target="_blank">
                                {/* nosemgrep: i18next-key-format */}
                                {t("info.amazonPersonalize")}
                            </a>
                        </li>
                        <li>
                            <a href="https://aws.amazon.com/bedrock/" target="_blank">
                                {/* nosemgrep: i18next-key-format */}
                                {t("info.amazonBedrock")}
                            </a>
                        </li>
                    </ul>
                </TextContent>
            }
            header={
                // nosemgrep: i18next-key-format
                <h2>{t("info.marketingPersonalizations")}</h2>
            }
        >
            <TextContent>
                {/* nosemgrep: i18next-key-format */}
                <h3>{t("info.dataCustomization")}</h3>
                <p>
                    {/* nosemgrep: i18next-key-format */}
                    {t("info.dataCustomizationDesc")}
                </p>
                <br />
                {/* nosemgrep: i18next-key-format */}
                <h3>{t("info.dynamicAdaptation")}</h3>
                <p>
                    {/* nosemgrep: i18next-key-format */}
                    {t("info.dynamicAdaptationDesc")}
                </p>
                <br />
                {/* nosemgrep: i18next-key-format */}
                <h3>{t("info.scalability")}</h3>
                <p>
                    {/* nosemgrep: i18next-key-format */}
                    {t("info.scalabilityDesc")}
                </p>
            </TextContent>
        </HelpPanel>
    );
};
