import { atom } from "jotai";
import { atomWithReset, atomWithStorage } from "jotai/utils";
import { Mode } from "@cloudscape-design/global-styles";
import { FetchUserAttributesOutput } from "aws-amplify/auth";
import { NotificationType } from "../utilities/types";

//
export const appName = "Retail Pricing Assistant";
// Theme atom
export const themeAtom = atomWithStorage<Mode>("theme", Mode.Light);

export const toggleThemeAtom = atom(null, (get, set) =>
    set(themeAtom, get(themeAtom) === Mode.Light ? Mode.Dark : Mode.Light)
);
export const UserAttributesAtom = atom<FetchUserAttributesOutput | null>(null);

// left side nav drawer
export const navDrawerAtom = atom(true);
// right side info panel drawer
export const infoDrawerAtom = atom(false);
export const openInfoDrawerAtom = atom(null, (get, set) => set(infoDrawerAtom, true));
export const closeInfoDrawerAtom = atom(null, (get, set) => set(infoDrawerAtom, false));
export const toggleInfoDrawerAtom = atom(null, (get, set) =>
    set(infoDrawerAtom, !get(infoDrawerAtom))
);

export enum HelpPanelTitle {
    EMPTY = "EMPTY",
}
export const infoIdAtom = atom<HelpPanelTitle>(HelpPanelTitle.EMPTY);
export const disclaimerAtom = atomWithStorage("disclaimer", false);

export const splitPanelAtom = atom(false);
export const showSplitPanelAtom = atom(null, (get, set) => set(splitPanelAtom, true));
export const hideSplitPanelAtom = atom(null, (get, set) => set(splitPanelAtom, false));

export const notificationAtom = atomWithReset<NotificationType>({
    currentSessionId: "",
    isCompleteDemandAnalysis: false,
    isCompleteWebScarping: false,
    isCompleteMarginAnalysis: false,
    isCompletePersonalizedPricing: false,
});
