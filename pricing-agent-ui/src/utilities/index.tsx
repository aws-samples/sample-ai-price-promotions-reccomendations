export const isLocalhost = Boolean(
    window.location.hostname === "localhost" ||
        // [::1] is the IPv6 localhost address.
        window.location.hostname === "[::1]" ||
        // 127.0.0.1/8 is considered localhost for IPv4.
        window.location.hostname.match(/^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/)
);

export const RenderBoldText = (text: string) => {
    const parts = text.split(/\*\*(.+?)\*\*/g);

    return (
        <div>
            {parts.map((part, index) => {
                if (index % 2 === 1) {
                    return <b key={index}>{part}</b>;
                } else {
                    return <span key={index}>{part}</span>;
                }
            })}
        </div>
    );
};
