// nosemgrep: i18next-key-format
import { Grid, SpaceBetween, Spinner, TextContent } from "@cloudscape-design/components";
import { useAtomValue } from "jotai";
import { useCallback } from "react";
import { BiBot } from "react-icons/bi";
import { CiUser } from "react-icons/ci";
import { GoHubot } from "react-icons/go";
import { RiRobot2Line, RiRobot3Line } from "react-icons/ri";
import { useTranslation } from "react-i18next";
import { v4 as uuidv4 } from "uuid";
import { themeAtom } from "../../atoms/AppAtoms";
import { Mode } from "@cloudscape-design/global-styles";

interface MessageInterface {
    rtl: boolean;
    sender: string;
    message: string;
}
interface MessageTextContentProps {
    sender: string;
    message: string;
}
export const Message = (props: MessageInterface) => {
    const { rtl, sender, message } = props;
    const theme = useAtomValue(themeAtom);
    const { t } = useTranslation();

    const getIcon = useCallback((sender: string) => {
        switch (sender) {
            case "user":
                return <CiUser size={30} color="black" />;
            case "super-agent":
                return <GoHubot size={30} color="black" />;
            case "[demand-forecast-agent]":
                return <RiRobot2Line size={30} color="black" />;
            case "[web-scraper-agent]":
                return <BiBot size={30} color="black" />;
            case "[retail-product-pricing-orchestrator-chain]":
                return <RiRobot3Line size={30} color="black" />;
            default:
                return <CiUser size={30} color="black" />;
        }
    }, []);

    const MessageTextContent = (props: MessageTextContentProps) => {
        const formatMessage = (sender: string, messageString: string) => {
            if (sender.includes("demand-forecast-agent") || sender.includes("web-scraper-agent")) {
                try {
                    const messageJson = JSON.parse(messageString.replace(sender, ""));
                    return messageJson.pricing_rationale.replace(/"/g, "");
                } catch (err) {
                    return messageString.replace(sender, "");
                }
            } else {
                return messageString.replace(sender, "");
            }
        };

        const formatSender = (sender: string) => {
            return sender
                .replace("[retail-product-pricing-orchestrator-chain]", "Margin Agent")
                .toLocaleUpperCase()
                .replace(/\[/g, "")
                .replace(/\]/g, "");
        };

        return (
            <TextContent>
                <p>
                    <small>
                        <b>{formatSender(sender)}</b>
                    </small>
                </p>
                <p>{formatMessage(props.sender, props.message)}</p>
            </TextContent>
        );
    };

    return (
        <div>
            {rtl ? (
                <div
                    key={uuidv4()}
                    style={{
                        display: "flex",
                        flexDirection: "row",
                        alignContent: "space-around",
                        padding: 10,
                    }}
                >
                    <div
                        style={{
                            flex: 1,
                            padding: 10,
                            alignContent: "center",
                            alignSelf: "center",
                            marginLeft: "10%",
                            marginRight: 0,
                            backgroundImage:
                                theme === Mode.Light
                                    ? "radial-gradient(circle,rgba(83, 184, 180, 0.71) 12%, rgba(148, 187, 233, 0.61) 86%)"
                                    : "none",
                            borderRadius: "2vw",
                        }}
                    >
                        <div
                            style={{
                                display: "flex",
                                flexDirection: "row",
                                alignContent: "space-between",
                                padding: "1vw",
                                alignItems: "center",
                            }}
                        >
                            {message === "loading" ? (
                                <Grid gridDefinition={[{ colspan: 2 }, { colspan: 10 }]}>
                                    <Spinner />
                                    {/* nosemgrep: i18next-key-format */}
                                    <div>{t("common.thinking")}</div>
                                </Grid>
                            ) : (
                                <div
                                    style={{
                                        padding: 5,
                                        justifyItems: "flex-start",
                                        minWidth: "90%",
                                    }}
                                >
                                    <MessageTextContent sender={sender} message={message} />
                                </div>
                            )}

                            <div
                                style={{
                                    flex: 1,
                                    padding: 10,
                                    justifyItems: "flex-end",
                                    alignContent: "center",
                                }}
                            >
                                {getIcon(sender)}
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div
                    key={uuidv4()}
                    style={{
                        display: "flex",
                        flexDirection: "row-reverse",
                        alignContent: "space-around",
                        padding: 10,
                    }}
                >
                    <div
                        style={{
                            flex: 1,
                            padding: 10,
                            alignContent: "center",
                            alignSelf: "center",
                            marginLeft: "0",
                            marginRight: "10%",
                            borderRadius: "2vw",
                            backgroundImage:
                                theme === Mode.Light
                                    ? "radial-gradient(circle,rgba(83, 184, 180, 0.71) 12%, rgba(148, 187, 233, 0.61) 86%)"
                                    : "none",
                        }}
                    >
                        <div
                            style={{
                                display: "flex",
                                flexDirection: "row",
                                alignContent: "space-between",
                                padding: "1vw",
                                alignItems: "center",
                            }}
                        >
                            <div
                                style={{
                                    flex: 1,
                                    padding: 10,
                                    justifyItems: "flex-start",
                                    alignContent: "center",
                                }}
                            >
                                {getIcon(sender)}
                            </div>
                            {message === "loading" ? (
                                <Grid gridDefinition={[{ colspan: 10 }, { colspan: 2 }]}>
                                    {/* nosemgrep: i18next-key-format */}
                                    <div>{t("common.thinking")}</div>
                                    <Spinner />
                                </Grid>
                            ) : (
                                <div
                                    style={{
                                        padding: 5,
                                        justifyItems: "flex-start",
                                        minWidth: "90%",
                                    }}
                                >
                                    <div
                                        style={{
                                            padding: 5,
                                            justifyItems: "flex-start",
                                            minWidth: "90%",
                                        }}
                                    >
                                        <MessageTextContent sender={sender} message={message} />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
