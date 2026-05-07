import {
    type Edge,
    useEdgesState,
    useNodesState,
    useReactFlow,
    type Node,
    Background,
    ReactFlow,
} from "@xyflow/react";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { IconNode } from "./IconNode";
import { Wire } from "./Edge";
import { PricingEdges, PricingNodes } from "./FlowData";
import { useAtomValue } from "jotai";
import { useLocation } from "react-router-dom";

import { notificationAtom } from "../../atoms/AppAtoms";
import { toast } from "react-toastify";

export const MultiAgentFlow = () => {
    const { fitView } = useReactFlow();
    const { pathname } = useLocation();
    const sessionID = pathname.split("/")[2];
    const defaultViewport = { x: window.innerWidth, y: window.innerHeight, zoom: 0.5 };
    const nodeTypes = useMemo(() => ({ iconNode: IconNode }), []);
    const edgeTypes = { wire: Wire };
    const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
    const notification = useAtomValue(notificationAtom);

    // Track which toasts have already fired so we never double-fire
    const firedToasts = useRef({
        demand: false,
        web: false,
        margin: false,
        personalized: false,
    });

    // Reset fired state when session changes
    useEffect(() => {
        firedToasts.current = { demand: false, web: false, margin: false, personalized: false };
    }, [sessionID]);

    // ── Demand complete ──
    useEffect(() => {
        if (!notification.isCompleteDemandAnalysis || firedToasts.current.demand) return;
        firedToasts.current.demand = true;
        toast.success("Demand forecast available. Check Pricing Summary panel");
        setEdges((p) =>
            p.map((e) => {
                if (e.id === "edge-2" || e.id === "edge-3")
                    return { ...e, data: { ...e.data, fill: "#43A047", duration: "0s" } };
                if (e.id === "edge-5" || e.id === "edge-6")
                    return { ...e, data: { ...e.data, fill: "#f4ae01", duration: "3s" } };
                return e;
            })
        );
    }, [notification.isCompleteDemandAnalysis]);

    // ── Web scraping complete ──
    useEffect(() => {
        if (!notification.isCompleteWebScarping || firedToasts.current.web) return;
        firedToasts.current.web = true;
        toast.success("Web Scrap data available. Check Pricing Summary panel");
        setEdges((p) =>
            p.map((e) => {
                if (e.id === "edge-5" || e.id === "edge-6")
                    return { ...e, data: { ...e.data, fill: "#43A047", duration: "0s" } };
                if (e.id === "edge-7" || e.id === "edge-8")
                    return { ...e, data: { ...e.data, fill: "#43A047", duration: "3s" } };
                return e;
            })
        );
    }, [notification.isCompleteWebScarping]);

    // ── Margin complete ──
    useEffect(() => {
        if (!notification.isCompleteMarginAnalysis || firedToasts.current.margin) return;
        firedToasts.current.margin = true;
        toast.success("Margin analysis available. Check Pricing Summary panel");
        setEdges((p) =>
            p.map((e) => {
                if (e.id === "edge-7" || e.id === "edge-8")
                    return { ...e, data: { ...e.data, fill: "#43A047", duration: "0s" } };
                if (e.id === "edge-10" || e.id === "edge-11")
                    return { ...e, data: { ...e.data, fill: "#9C27B0", duration: "3s" } };
                return e;
            })
        );
    }, [notification.isCompleteMarginAnalysis]);

    // ── Personalized pricing complete ──
    useEffect(() => {
        if (!notification.isCompletePersonalizedPricing || firedToasts.current.personalized) return;
        firedToasts.current.personalized = true;
        toast.success("Personalized pricing available. Check Pricing Summary panel");
        setEdges((p) =>
            p.map((e) =>
                e.id === "edge-10" || e.id === "edge-11"
                    ? { ...e, data: { ...e.data, fill: "#43A047", duration: "0s" } }
                    : e
            )
        );
    }, [notification.isCompletePersonalizedPricing]);

    const handleOnInit = useCallback(() => {
        setNodes(PricingNodes);
        // Start with demand dots active (blue, moving)
        const initialEdges = PricingEdges.map((e) =>
            e.id === "edge-2" || e.id === "edge-3"
                ? { ...e, data: { ...e.data, fill: "#4285f4", duration: "3s" } }
                : e
        );
        setEdges(initialEdges);
        setTimeout(() => {
            fitView({ duration: 1000, padding: 0.15 });
        }, 1000);
    }, []);

    return (
        <div className="overview" style={{ width: "100%", height: "80vh" }}>
            <ReactFlow
                nodes={nodes}
                nodeTypes={nodeTypes}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                edges={edges}
                edgeTypes={edgeTypes}
                defaultViewport={defaultViewport}
                onInit={handleOnInit}
                fitView
                panOnDrag={false}
                panOnScroll={false}
                zoomOnScroll={false}
                nodesConnectable={false}
            >
                <Background />
            </ReactFlow>
        </div>
    );
};
