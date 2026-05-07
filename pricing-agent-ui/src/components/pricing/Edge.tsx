import {
    BaseEdge,
    EdgeLabelRenderer,
    EdgeProps,
    getBezierPath,
    getSmoothStepPath,
    getStraightPath,
} from "@xyflow/react";
import { useMemo } from "react";

// comment to update file in Git mem
export const Wire = ({
    id,
    data,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
}: EdgeProps) => {
    // Use straight path when vertically aligned, smooth step otherwise
    const isVertical = Math.abs(sourceX - targetX) < 20;
    
    const [path] = isVertical
        ? getStraightPath({ sourceX, sourceY, targetX, targetY })
        : getSmoothStepPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition });

    const [, labelX, labelY] = getBezierPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
    });

    const labelTransform = useMemo(() => {
        const y = (data?.y as string) ?? "0";
        const x = (data?.x as string) ?? "0";
        return `translate(${y}vw, ${x}vh) translate(${labelX}px,${labelY}px)`;
    }, [data, labelX, labelY]);

    return (
        <>
            <BaseEdge id={id} path={path} label="test" />
            <circle r="0.25vw" fill={(data?.fill as string) ?? "#ff0073"}>
                <animateMotion
                    rotate={"auto-reverse"}
                    begin={(data?.beginDelay as string) ?? "0s"}
                    dur={(data?.duration as string) ?? "2s"}
                    repeatCount="indefinite"
                    calcMode="linear"
                    path={path}
                />
            </circle>
            <EdgeLabelRenderer>
                <div
                    style={{
                        position: "absolute",
                        transform: labelTransform,
                        borderRadius: 5,
                        fontSize: 10,
                        fontWeight: 200,
                        whiteSpace: "pre-wrap",
                        textAlign: "center",
                    }}
                    className="nodrag nopan"
                >
                    {data?.label as string}
                </div>
            </EdgeLabelRenderer>
        </>
    );
};
