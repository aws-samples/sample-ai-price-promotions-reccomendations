import { type Edge, type Node, Handle, Position } from "@xyflow/react";
import { GoHubot } from "react-icons/go";
import { CiUser } from "react-icons/ci";
import { RiRobot2Line, RiRobot3Line } from "react-icons/ri";
import { BiBot } from "react-icons/bi";
import { TbDatabaseSearch } from "react-icons/tb";
import { PiGlobeSimpleLight } from "react-icons/pi";
import { LuFileCog } from "react-icons/lu";
const common = { draggable: false, selectable: false, focusable: false };

export const PricingNodes: Node[] = [
    {
        id: "initial-user",
        sourcePosition: Position.Bottom,
        type: "iconNode",
        data: {
            icon: <CiUser style={{ fontSize: 25 }} />,
            label: "User",
            handles: {
                top: null,
                bottom: (
                    <Handle id="initial-user-bottom" type="source" position={Position.Bottom} />
                ),
                right: null,
                left: null,
            },
        },
        position: { x: 350, y: 0 },
        style: { height: "5vh", width: "10vw" },
        ...common,
    },
    {
        id: "super-agent",
        sourcePosition: Position.Bottom,
        targetPosition: Position.Top,
        type: "iconNode",
        data: {
            icon: <GoHubot style={{ fontSize: 25 }} />,
            label: "Orchestrator\n(Bedrock AgentCore)",
            handles: {
                top: (
                    <Handle id={"super-agent-top"} type="target" position={Position.Top} style={{ marginBottom: "5vh" }} />
                ),
                bottom: (
                    <Handle id={"super-agent-bottom"} type="source" position={Position.Bottom} />
                ),
                right: null,
                left: null,
            },
        },
        position: { x: 350, y: 100 },
        style: { height: "8vh", width: "10vw" },
        ...common,
    },
    {
        id: "demand-analyst",
        sourcePosition: Position.Bottom,
        targetPosition: Position.Top,
        type: "iconNode",
        data: {
            icon: <RiRobot2Line style={{ fontSize: 25 }} />,
            label: "Demand analyst\n(Claude Sonnet 4.5)",
            handles: {
                top: (
                    <Handle id={"demand-analyst-top"} type="target" position={Position.Top} style={{ marginBottom: "5vh" }} />
                ),
                bottom: (
                    <Handle id={"demand-analyst-bottom"} type="source" position={Position.Bottom} style={{ marginTop: "5vh" }} />
                ),
                right: null,
                left: null,
            },
        },
        position: { x: 100, y: 260 },
        style: { height: "8vh", width: "10vw" },
        ...common,
    },
    {
        id: "demand-source",
        targetPosition: Position.Top,
        type: "iconNode",
        data: {
            icon: <TbDatabaseSearch style={{ fontSize: 25 }} />,
            label: "Data sources",
            handles: {
                top: (
                    <Handle id={"demand-source-top"} type="target" position={Position.Top} style={{ marginBottom: "5vh" }} />
                ),
                bottom: null,
                right: null,
                left: null,
            },
        },
        position: { x: 100, y: 420 },
        style: { height: "8vh", width: "10vw" },
        ...common,
    },
    {
        id: "web-scraper-agent",
        sourcePosition: Position.Bottom,
        targetPosition: Position.Top,
        type: "iconNode",
        data: {
            icon: <BiBot style={{ fontSize: 25 }} />,
            label: "Web scraper\n(Claude Haiku 4.5)",
            handles: {
                top: (
                    <Handle id={"web-scraper-agent-top"} type="target" position={Position.Top} style={{ marginBottom: "5vh" }} />
                ),
                bottom: (
                    <Handle id={"web-scraper-agent-bottom"} type="source" position={Position.Bottom} />
                ),
                right: null,
                left: null,
            },
        },
        position: { x: 300, y: 260 },
        style: { height: "8vh", width: "10vw" },
        ...common,
    },
    {
        id: "web-source",
        targetPosition: Position.Top,
        type: "iconNode",
        data: {
            icon: <PiGlobeSimpleLight style={{ fontSize: 25 }} />,
            label: "AgentCore Browser\n(Live scraping)",
            handles: {
                top: (
                    <Handle id={"web-source-top"} type="target" position={Position.Top} style={{ marginBottom: "5vh" }} />
                ),
                bottom: null,
                right: null,
                left: null,
            },
        },
        position: { x: 300, y: 420 },
        style: { height: "8vh", width: "10vw" },
        ...common,
    },
    {
        id: "margin-agent",
        sourcePosition: Position.Bottom,
        targetPosition: Position.Top,
        type: "iconNode",
        data: {
            icon: <RiRobot3Line style={{ fontSize: 25 }} />,
            label: "Margin agent\n(Amazon Nova Pro)",
            handles: {
                top: (
                    <Handle id={"margin-agent-top"} type="target" position={Position.Top} style={{ marginBottom: "5vh" }} />
                ),
                bottom: (
                    <Handle id={"margin-agent-bottom"} type="source" position={Position.Bottom} />
                ),
                right: null,
                left: null,
            },
        },
        position: { x: 500, y: 260 },
        style: { height: "8vh", width: "10vw" },
        ...common,
    },
    {
        id: "margin-config",
        targetPosition: Position.Top,
        type: "iconNode",
        data: {
            icon: <LuFileCog style={{ fontSize: 25 }} />,
            label: "Margin config",
            handles: {
                top: (
                    <Handle id={"margin-config-top"} type="target" position={Position.Top} style={{ marginBottom: "5vh" }} />
                ),
                bottom: null,
                right: null,
                left: null,
            },
        },
        position: { x: 500, y: 420 },
        style: { height: "8vh", width: "10vw" },
        ...common,
    },
    {
        id: "personalization-agent",
        sourcePosition: Position.Bottom,
        targetPosition: Position.Top,
        type: "iconNode",
        data: {
            icon: <CiUser style={{ fontSize: 25 }} />,
            label: "Personalization\n(OpenAI gpt-oss-120b)",
            handles: {
                top: (
                    <Handle id={"personalization-agent-top"} type="target" position={Position.Top} style={{ marginBottom: "5vh" }} />
                ),
                bottom: (
                    <Handle id={"personalization-agent-bottom"} type="source" position={Position.Bottom} />
                ),
                right: null,
                left: null,
            },
        },
        position: { x: 700, y: 260 },
        style: { height: "8vh", width: "10vw" },
        ...common,
    },
    {
        id: "customer-data",
        targetPosition: Position.Top,
        type: "iconNode",
        data: {
            icon: <TbDatabaseSearch style={{ fontSize: 25 }} />,
            label: "Customer profiles",
            handles: {
                top: (
                    <Handle id={"customer-data-top"} type="target" position={Position.Top} style={{ marginBottom: "5vh" }} />
                ),
                bottom: null,
                right: null,
                left: null,
            },
        },
        position: { x: 700, y: 420 },
        style: { height: "8vh", width: "10vw" },
        ...common,
    },
];

export const PricingEdges: Edge[] = [
    {
        id: "edge-1",
        source: "initial-user",
        target: "super-agent",
        sourceHandle: "initial-user-bottom",
        targetHandle: "super-agent-top",
        animated: true,
        type: "straight",
    },
    {
        id: "edge-2",
        source: "super-agent",
        target: "demand-analyst",
        sourceHandle: "super-agent-bottom",
        targetHandle: "demand-analyst-top",
        type: "wire",
        data: { fill: "#aaa", duration: "0s" },
    },
    {
        id: "edge-3",
        source: "demand-analyst",
        target: "demand-source",
        sourceHandle: "demand-analyst-bottom",
        targetHandle: "demand-source-top",
        type: "wire",
        data: { fill: "#aaa", duration: "0s" },
    },
    {
        id: "edge-5",
        source: "super-agent",
        target: "web-scraper-agent",
        sourceHandle: "super-agent-bottom",
        targetHandle: "web-scraper-agent-top",
        type: "wire",
        data: { fill: "#aaa", duration: "0s" },
    },
    {
        id: "edge-6",
        source: "web-scraper-agent",
        target: "web-source",
        sourceHandle: "web-scraper-agent-bottom",
        targetHandle: "web-source-top",
        type: "wire",
        data: { fill: "#aaa", duration: "0s" },
    },
    {
        id: "edge-7",
        source: "super-agent",
        target: "margin-agent",
        sourceHandle: "super-agent-bottom",
        targetHandle: "margin-agent-top",
        type: "wire",
        data: { fill: "#aaa", duration: "0s" },
    },
    {
        id: "edge-8",
        source: "margin-agent",
        target: "margin-config",
        sourceHandle: "margin-agent-bottom",
        targetHandle: "margin-config-top",
        type: "wire",
        data: { fill: "#aaa", duration: "0s" },
    },
    {
        id: "edge-10",
        source: "super-agent",
        target: "personalization-agent",
        sourceHandle: "super-agent-bottom",
        targetHandle: "personalization-agent-top",
        type: "wire",
        data: { fill: "#aaa", duration: "0s" },
    },
    {
        id: "edge-11",
        source: "personalization-agent",
        target: "customer-data",
        sourceHandle: "personalization-agent-bottom",
        targetHandle: "customer-data-top",
        type: "wire",
        data: { fill: "#aaa", duration: "0s" },
    },
];
