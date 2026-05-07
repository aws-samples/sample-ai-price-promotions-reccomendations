import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useListPricingByUserID } from "../hooks/useApi";
import { Box, Button, Header, Link, SpaceBetween, Table } from "@cloudscape-design/components";
import { AppRoutes } from "./PageNavigation";
import { useAuthenticator } from "@aws-amplify/ui-react";
import { StatusDisplay } from "../components/StatusDisplay";

export const Executions = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { user } = useAuthenticator((context) => [context.user]);

    const { data, isLoading } = useListPricingByUserID(user.userId);
    return (
        <Table
            renderAriaLive={({ firstIndex, lastIndex, totalItemsCount }) =>
                `Displaying items ${firstIndex} to ${lastIndex} of ${totalItemsCount}`
            }
            ariaLabels={{
                selectionGroupLabel: "Items selection",
                allItemsSelectionLabel: () => "select all",
                itemSelectionLabel: (_, item) => item.id,
            }}
            columnDefinitions={[
                {
                    id: "id",
                    header: "Execution ID",
                    cell: (item) => (
                        <Link
                            onClick={() => {
                                navigate(AppRoutes.pricing.href.replace(":id", item.id));
                            }}
                        >
                            {item.id}
                        </Link>
                    ),
                    sortingField: "id",
                    isRowHeader: true,
                },
                {
                    id: "productName",
                    header: "Product Name",
                    cell: (item) => JSON.parse(item.product ?? "{}")["product_id"] ?? "-",
                },
                {
                    id: "status",
                    header: "Status",
                    cell: (item) => <StatusDisplay status={item.status} />,
                },
                {
                    id: "createdAt",
                    header: "Created At",
                    cell: (item) => item.createdAt,
                },
            ]}
            enableKeyboardNavigation
            items={data ?? []}
            loading={isLoading}
            loadingText="Loading jobs"
            selectionType={undefined}
            trackBy="id"
            empty={
                <Box margin={{ vertical: "xs" }} textAlign="center" color="inherit">
                    <SpaceBetween size="m">
                        {/* nosemgrep: i18next-key-format */}
                        <b>{t("common.noResources")}</b>
                    </SpaceBetween>
                </Box>
            }
            header={
                <Header
                    counter={`(${data?.length ?? 0})`}
                    description="List of all your previous executions."
                    actions={
                        <SpaceBetween direction="horizontal" size="l">
                            <Button
                                key={"Home button"}
                                iconName="map"
                                variant="normal"
                                onClick={() => navigate(AppRoutes.home.href)}
                            >
                                {/* nosemgrep: i18next-key-format */}
                                {t("common.home")}
                            </Button>
                            <Button
                                iconName="arrow-left"
                                variant="primary"
                                onClick={() => {
                                    navigate(-1);
                                }}
                            >
                                {/* nosemgrep: i18next-key-format */}
                                {t("common.goBack")}
                            </Button>
                        </SpaceBetween>
                    }
                >
                    {/* nosemgrep: i18next-key-format */}
                    {t("executions.title")}
                </Header>
            }
        />
    );
};
