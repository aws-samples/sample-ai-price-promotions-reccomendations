import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAtom } from "jotai";
import { ToastContainer, Slide } from "react-toastify";
import { infoDrawerAtom, navDrawerAtom, splitPanelAtom, themeAtom } from "../atoms/AppAtoms";
import Bar from "../components/Bar";
import { BrowserRouter } from "react-router-dom";
import I18nProvider from "@cloudscape-design/components/i18n";

import messages from "@cloudscape-design/components/i18n/messages/all.all";
import { AppLayout } from "@cloudscape-design/components";
import { applyMode } from "@cloudscape-design/global-styles";
import { useEffect } from "react";
import { ReactFlowProvider } from "@xyflow/react";
import { PageContent, InfoContent, AppSideNavigation } from "./PageNavigation";
import { SplitPanelPage } from "./SplitPanelPage";

const LOCALE = "en";

const appLayoutLabels = {
    navigation: "Side navigation",
    navigationToggle: "Open side navigation",
    navigationClose: "Close side navigation",
    notifications: "Notifications",
    tools: "Help panel",
    toolsToggle: "Open help panel",
    toolsClose: "Close help panel",
};

export const AppBase = () => {
    // Create a client
    const queryClient = new QueryClient();
    // atoms
    const [theme] = useAtom(themeAtom);
    const [navDrawer, setNavDrawer] = useAtom(navDrawerAtom);
    const [infoDrawer, setInfoDrawer] = useAtom(infoDrawerAtom);
    const [showSplitPanel, setShowSplitPanel] = useAtom(splitPanelAtom);
    useEffect(() => {
        // theme control
        applyMode(theme);
    }, [theme]);

    return (
        <QueryClientProvider client={queryClient}>
            <ToastContainer
                position="bottom-left"
                newestOnTop={true}
                closeOnClick
                rtl={false}
                pauseOnFocusLoss={false}
                draggable
                pauseOnHover
                theme={theme}
                transition={Slide}
            />
            <BrowserRouter>
                <Bar />
                <ReactFlowProvider>
                    <I18nProvider locale={LOCALE} messages={[messages]}>
                        <AppLayout
                            content={<PageContent />}
                            splitPanelOpen={showSplitPanel}
                            splitPanel={<SplitPanelPage />}
                            onSplitPanelToggle={() => setShowSplitPanel(!showSplitPanel)}
                            navigationOpen={navDrawer}
                            navigation={<AppSideNavigation />}
                            onNavigationChange={({ detail }) => setNavDrawer(detail.open)}
                            toolsHide
                            tools={<InfoContent />}
                            toolsOpen={infoDrawer}
                            onToolsChange={({ detail }) => setInfoDrawer(detail.open)}
                            contentType="default"
                            ariaLabels={appLayoutLabels}
                            notifications={[]} // stack page level notifications here
                        />
                    </I18nProvider>
                </ReactFlowProvider>
            </BrowserRouter>
        </QueryClientProvider>
    );
};
