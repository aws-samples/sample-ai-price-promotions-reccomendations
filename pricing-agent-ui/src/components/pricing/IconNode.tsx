import { TextContent } from "@cloudscape-design/components";
import { type NodeProps, type Node } from "@xyflow/react";

type IconNodeProps = {
    icon: React.ReactNode;
    label: string;
    handles: {
        top: React.ReactNode | null;
        bottom: React.ReactNode | null;
        left: React.ReactNode | null;
        right: React.ReactNode | null;
        custom?: React.ReactNode | null;
    };
};

export const IconNode = (props: NodeProps<Node<IconNodeProps>>) => {
    return (
        <>
            {props.data.handles.top ?? null}
            <div
                style={{
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: "center",
                }}
            >
                {props.data.icon}
                <TextContent>
                    <center>
                        <p style={{ whiteSpace: "pre-wrap" }}>{props.data.label}</p>
                    </center>
                </TextContent>
            </div>
            {props.data.handles.bottom ?? null}
            {props.data.handles.right ?? null}
            {props.data.handles.left ?? null}
            {props.data.handles.custom ?? null}
        </>
    );
};
