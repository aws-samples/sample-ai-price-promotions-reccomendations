import { StatusIndicator } from "@cloudscape-design/components";
import { useTranslation } from "react-i18next";

interface StatusDisplayProps {
    status: string | null | undefined;
}
export const StatusDisplay = (props: StatusDisplayProps) => {
    const { status } = props;
    const { t } = useTranslation();
    const capitalizeFirstLetter = (status: string) => {
        return status.charAt(0).toUpperCase() + status.slice(1);
    };

    return (
        <>
            {status === "pending" && (
                <StatusIndicator type="pending">{capitalizeFirstLetter(status)}</StatusIndicator>
            )}
            {status === "in-progress" && (
                <StatusIndicator type="in-progress">
                    {capitalizeFirstLetter(status)}
                </StatusIndicator>
            )}
            {status === "warning" && (
                <StatusIndicator type="warning">{capitalizeFirstLetter(status)}</StatusIndicator>
            )}
            {status === "success" && (
                <StatusIndicator type="success">{capitalizeFirstLetter(status)}</StatusIndicator>
            )}
            {status === "error" && (
                <StatusIndicator type="error">{capitalizeFirstLetter(status)}</StatusIndicator>
            )}
            {status === null ||
                status === undefined ||
                // nosemgrep: i18next-key-format
                (!status && <StatusIndicator type="warning">{t("common.unknownValue")}</StatusIndicator>)}
        </>
    );
};
