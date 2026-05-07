import { useEffect, useRef } from "react";
import { v4 as uuidv4 } from "uuid";
import { Messages } from "../../utilities/types";
import { Message } from "./Message";
interface ChatMessageProps {
    messages: Array<Messages>;
}
export const ChatMessages = (props: ChatMessageProps) => {
    const { messages } = props;
    const scrollRef = useRef<HTMLDivElement | null>(null);
    const scrollToBottom = () => {
        if (scrollRef.current) {
            // scroll to view
            scrollRef.current.focus();
            scrollRef.current.scrollTo({ behavior: "smooth", top: 10 });
            scrollRef.current.lastElementChild?.scrollIntoView({
                behavior: "smooth",
                block: "nearest",
            });
        }
    };
    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    return (
        <div
            style={{
                flex: "8",
                minHeight: "0",
                display: "flex",
                flexDirection: "column",
            }}
        >
            <div
                ref={scrollRef}
                style={{
                    height: "100%",
                    overflow: "auto",
                    display: "flex",
                    flexDirection: "column",
                }}
            >
                {messages.length > 0 &&
                    messages.map((m) => (
                        <Message key={uuidv4()} rtl={m.rtl} message={m.message} sender={m.sender} />
                    ))}
                <div ref={scrollRef} />
            </div>
        </div>
    );
};
