import { Badge, SideNavigation, SpaceBetween, Spinner } from "@cloudscape-design/components";
// router
import { useLocation, useNavigate, Routes, Route } from "react-router-dom";

import { appName, notificationAtom } from "../atoms/AppAtoms";
import { HomeInfo } from "./info/HomeInfo";
import { Home } from "./Home";
import NotFound404 from "../components/NotFound404";
import { Pricing } from "./Pricing";
import { Competitor } from "./Competitor";
import { Executions } from "./Executions";
import { useAtomValue } from "jotai";
import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { QUERY_KEYS } from "../utilities/types";

export const AppRoutes = {
    home: {
        text: "Generate Price",
        href: "/",
    },
    pricing: {
        text: "Pricing",
        href: "/pricing/:id",
    },
    competitor: {
        text: "name",
        href: "/competitor/:name",
    },
    executions: {
        text: "Executions",
        href: "/executions",
    },
};

export const AppSideNavigation = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const notification = useAtomValue(notificationAtom);
    const [badeCount, setBadgeCount] = useState(0);
    useEffect(() => {
        let count = 0;
        if (notification.isCompleteDemandAnalysis) {
            count++;
        }
        if (notification.isCompleteWebScarping) {
            count++;
        }
        if (notification.isCompleteMarginAnalysis) {
            count++;
        }
        if (notification.isCompletePersonalizedPricing) {
            count++;
        }
        setBadgeCount(count);
    }, [notification]);
    return (
        <SideNavigation
            activeHref={location.pathname}
            header={{ href: "/", text: appName }}
            onFollow={(event) => {
                if (!event.detail.external) {
                    event.preventDefault();
                    navigate(event.detail.href);
                }
            }}
            items={[
                { type: "link", text: AppRoutes.home.text, href: AppRoutes.home.href },
                {
                    type: "divider",
                },
                {
                    type: "section-group",
                    title: "Competitor Sites",
                    items: [
                        {
                            type: "link",
                            text: "TechHaven",
                            href: AppRoutes.competitor.href.replace(
                                ":name",
                                QUERY_KEYS.TOOL_MASTER.replace("_", "-").toLowerCase()
                            ),
                        },
                        {
                            type: "link",
                            text: "GadgetWorld",
                            href: AppRoutes.competitor.href.replace(
                                ":name",
                                QUERY_KEYS.BUILDER_DEPOT.replace("_", "-").toLowerCase()
                            ),
                        },
                    ],
                },
                {
                    type: "divider",
                },
                {
                    type: "section-group",
                    title: "History",
                    items: [
                        {
                            type: "link",
                            text: AppRoutes.executions.text,
                            href: AppRoutes.executions.href,
                        },
                        {
                            type: "link",
                            text: "Current Session",
                            href: notification.currentSessionId
                                ? AppRoutes.pricing.href.replace(
                                      ":id",
                                      notification.currentSessionId
                                  )
                                : "#",
                            info: notification.currentSessionId ? (
                                <Badge color="green">{badeCount}</Badge>
                            ) : null,
                        },
                    ],
                },
                {
                    type: "divider",
                },
                {
                    type: "link",
                    text: "Version 1.0",
                    href: "#",
                },
            ]}
        />
    );
};

export const PageContent = () => {
    return (
        <Routes>
            <Route path={AppRoutes.home.href} element={<Home />} />
            <Route path={AppRoutes.pricing.href} element={<Pricing />} />
            <Route path={AppRoutes.competitor.href} element={<Competitor />} />
            <Route path={AppRoutes.executions.href} element={<Executions />} />
            <Route path="*" element={<NotFound404 />} />
        </Routes>
    );
};

export const InfoContent = () => {
    return (
        <Routes>
            <Route path={AppRoutes.home.href} element={<HomeInfo />} />
            <Route path="*" element={<NotFound404 />} />
        </Routes>
    );
};
