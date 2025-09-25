// WorkflowCanvas - Canvas for workflow visualization using React Flow
import React, { useCallback, useMemo } from 'react';
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  Controls,
  MiniMap,
  Background,
  BackgroundVariant,
  NodeTypes,
  EdgeTypes,
  MarkerType
} from 'reactflow';
import 'reactflow/dist/style.css';
import {
  Play,
  Users,
  CheckCircle,
  XCircle,
  Settings,
  Diamond,
  Square,
  Circle,
  AlertTriangle,
  Clock
} from 'lucide-react';
import { WorkflowCanvas as WorkflowCanvasType, WorkflowNode, WorkflowEdge } from '../../shared/types';

// Custom Node Components
const StartNode: React.FC<{ data: any }> = ({ data }) => (
  <div className="px-4 py-2 bg-green-100 border-2 border-green-300 rounded-full flex items-center space-x-2">
    <Play className="h-4 w-4 text-green-600" />
    <span className="text-sm font-medium text-green-800">{data.label}</span>
  </div>
);

const ApprovalStepNode: React.FC<{ data: any }> = ({ data }) => (
  <div className="px-4 py-3 bg-blue-100 border-2 border-blue-300 rounded-lg min-w-[160px]">
    <div className="flex items-center justify-between mb-2">
      <Users className="h-4 w-4 text-blue-600" />
      <span className="text-xs text-blue-600 bg-blue-200 px-2 py-1 rounded">
        {data.config?.type || 'single'}
      </span>
    </div>
    <div className="text-sm font-medium text-blue-800 mb-1">{data.label}</div>
    {data.config?.approvers && (
      <div className="text-xs text-blue-600">
        {data.config.approvers.length} approver(s)
      </div>
    )}
    {data.config?.timeoutHours && (
      <div className="flex items-center text-xs text-blue-600 mt-1">
        <Clock className="h-3 w-3 mr-1" />
        {data.config.timeoutHours}h timeout
      </div>
    )}
  </div>
);

const ConditionNode: React.FC<{ data: any }> = ({ data }) => (
  <div className="px-4 py-3 bg-yellow-100 border-2 border-yellow-300 rounded-lg min-w-[140px]">
    <div className="flex items-center justify-center mb-2">
      <Diamond className="h-4 w-4 text-yellow-600" />
    </div>
    <div className="text-sm font-medium text-yellow-800 text-center">{data.label}</div>
    {data.config?.condition && (
      <div className="text-xs text-yellow-600 text-center mt-1">
        {data.config.condition}
      </div>
    )}
  </div>
);

const ActionNode: React.FC<{ data: any }> = ({ data }) => (
  <div className="px-4 py-3 bg-purple-100 border-2 border-purple-300 rounded-lg min-w-[140px]">
    <div className="flex items-center justify-center mb-2">
      <Settings className="h-4 w-4 text-purple-600" />
    </div>
    <div className="text-sm font-medium text-purple-800 text-center">{data.label}</div>
    {data.config?.actionType && (
      <div className="text-xs text-purple-600 text-center mt-1">
        {data.config.actionType}
      </div>
    )}
  </div>
);

const EndNode: React.FC<{ data: any }> = ({ data }) => (
  <div className="px-4 py-2 bg-gray-100 border-2 border-gray-300 rounded-full flex items-center space-x-2">
    {data.config?.outcome === 'approved' ? (
      <CheckCircle className="h-4 w-4 text-green-600" />
    ) : data.config?.outcome === 'rejected' ? (
      <XCircle className="h-4 w-4 text-red-600" />
    ) : (
      <Circle className="h-4 w-4 text-gray-600" />
    )}
    <span className="text-sm font-medium text-gray-800">{data.label}</span>
  </div>
);

// Node types mapping
const nodeTypes: NodeTypes = {
  start: StartNode,
  approval_step: ApprovalStepNode,
  condition: ConditionNode,
  action: ActionNode,
  end: EndNode
};

// Custom Edge Component
const CustomEdge: React.FC<any> = ({ id, sourceX, sourceY, targetX, targetY, style, data }) => {
  const edgePath = `M${sourceX},${sourceY} L${targetX},${targetY}`;

  return (
    <g>
      <path
        id={id}
        style={style}
        className="react-flow__edge-path"
        d={edgePath}
        markerEnd="url(#react-flow__arrowclosed)"
        fill="none"
        stroke={data?.condition ? '#f59e0b' : '#6b7280'}
        strokeWidth={2}
      />
      {data?.label && (
        <text
          x={(sourceX + targetX) / 2}
          y={(sourceY + targetY) / 2}
          className="react-flow__edge-text"
          textAnchor="middle"
          fontSize="12"
          fill="#374151"
        >
          <tspan dy="0.3em">{data.label}</tspan>
        </text>
      )}
    </g>
  );
};

const edgeTypes: EdgeTypes = {
  custom: CustomEdge
};

interface WorkflowCanvasProps {
  canvas: WorkflowCanvasType;
  editable?: boolean;
  onCanvasChange: (canvas: WorkflowCanvasType) => void;
  onNodeSelect: (nodeId: string) => void;
  selectedNodeId?: string;
}

export const WorkflowCanvas: React.FC<WorkflowCanvasProps> = ({
  canvas,
  editable = false,
  onCanvasChange,
  onNodeSelect,
  selectedNodeId
}) => {
  // Convert canvas format to React Flow format
  const initialNodes: Node[] = useMemo(() =>
    canvas.nodes.map(node => ({
      id: node.id,
      type: node.type,
      position: node.position,
      data: node.data,
      selected: node.id === selectedNodeId,
      style: {
        border: node.id === selectedNodeId ? '2px solid #3b82f6' : undefined
      }
    }))
  , [canvas.nodes, selectedNodeId]);

  const initialEdges: Edge[] = useMemo(() =>
    canvas.edges.map(edge => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      type: edge.type || 'custom',
      label: edge.label,
      data: edge.data,
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 20,
        height: 20,
        color: edge.data?.condition ? '#f59e0b' : '#6b7280'
      }
    }))
  , [canvas.edges]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (params: Connection) => {
      if (!editable) return;

      const newEdge: Edge = {
        ...params,
        id: `edge-${Date.now()}`,
        type: 'custom',
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 20,
          height: 20,
          color: '#6b7280'
        }
      };

      setEdges((eds) => addEdge(newEdge, eds));
    },
    [editable, setEdges]
  );

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    onNodeSelect(node.id);
  }, [onNodeSelect]);

  const onNodesChangeHandler = useCallback((changes: any) => {
    if (!editable) return;
    onNodesChange(changes);
  }, [editable, onNodesChange]);

  const onEdgesChangeHandler = useCallback((changes: any) => {
    if (!editable) return;
    onEdgesChange(changes);
  }, [editable, onEdgesChange]);

  // Update canvas when nodes or edges change
  React.useEffect(() => {
    if (!editable) return;

    const newCanvas: WorkflowCanvasType = {
      nodes: nodes.map(node => ({
        id: node.id,
        type: node.type as WorkflowNode['type'],
        position: node.position,
        data: node.data
      })),
      edges: edges.map(edge => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        type: edge.type,
        label: edge.label,
        data: edge.data
      })),
      viewport: canvas.viewport
    };

    onCanvasChange(newCanvas);
  }, [nodes, edges, editable, onCanvasChange, canvas.viewport]);

  const onViewportChange = useCallback((viewport: any) => {
    if (!editable) return;

    onCanvasChange({
      ...canvas,
      viewport
    });
  }, [editable, canvas, onCanvasChange]);

  return (
    <div className="h-[600px] bg-gray-50 border border-gray-200 rounded-lg overflow-hidden">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChangeHandler}
        onEdgesChange={onEdgesChangeHandler}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onViewportChange={onViewportChange}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultViewport={canvas.viewport}
        fitView
        attributionPosition="bottom-left"
        nodesDraggable={editable}
        nodesConnectable={editable}
        elementsSelectable={editable}
        selectNodesOnDrag={editable}
      >
        <Controls
          showZoom={true}
          showFitView={true}
          showInteractive={false}
          position="top-left"
        />

        <MiniMap
          nodeColor={(node) => {
            switch (node.type) {
              case 'start':
                return '#10b981';
              case 'approval_step':
                return '#3b82f6';
              case 'condition':
                return '#f59e0b';
              case 'action':
                return '#8b5cf6';
              case 'end':
                return '#6b7280';
              default:
                return '#9ca3af';
            }
          }}
          position="bottom-right"
          style={{
            background: '#f9fafb',
            border: '1px solid #e5e7eb'
          }}
        />

        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="#e5e7eb"
        />
      </ReactFlow>

      {/* Legend */}
      <div className="absolute top-4 right-4 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
        <h4 className="text-sm font-medium text-gray-900 mb-3">Legend</h4>
        <div className="space-y-2 text-xs">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-green-100 border border-green-300 rounded-full"></div>
            <span>Start</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-blue-100 border border-blue-300 rounded"></div>
            <span>Approval Step</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-yellow-100 border border-yellow-300 rounded transform rotate-45"></div>
            <span>Condition</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-purple-100 border border-purple-300 rounded"></div>
            <span>Action</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-gray-100 border border-gray-300 rounded-full"></div>
            <span>End</span>
          </div>
        </div>
      </div>

      {/* Toolbar (if editable) */}
      {editable && (
        <div className="absolute bottom-4 left-4 bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
          <div className="text-xs text-gray-600 mb-2">Add Node:</div>
          <div className="flex space-x-2">
            <button
              onClick={() => {
                // Add start node logic
                console.log('Add start node');
              }}
              className="p-2 bg-green-100 text-green-600 rounded hover:bg-green-200"
              title="Add Start"
            >
              <Play className="h-4 w-4" />
            </button>
            <button
              onClick={() => {
                // Add approval step logic
                console.log('Add approval step');
              }}
              className="p-2 bg-blue-100 text-blue-600 rounded hover:bg-blue-200"
              title="Add Approval Step"
            >
              <Users className="h-4 w-4" />
            </button>
            <button
              onClick={() => {
                // Add condition logic
                console.log('Add condition');
              }}
              className="p-2 bg-yellow-100 text-yellow-600 rounded hover:bg-yellow-200"
              title="Add Condition"
            >
              <Diamond className="h-4 w-4" />
            </button>
            <button
              onClick={() => {
                // Add action logic
                console.log('Add action');
              }}
              className="p-2 bg-purple-100 text-purple-600 rounded hover:bg-purple-200"
              title="Add Action"
            >
              <Settings className="h-4 w-4" />
            </button>
            <button
              onClick={() => {
                // Add end node logic
                console.log('Add end node');
              }}
              className="p-2 bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
              title="Add End"
            >
              <Circle className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Status Indicator */}
      <div className="absolute top-4 left-4 bg-white px-3 py-2 rounded-lg border border-gray-200 shadow-sm">
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${editable ? 'bg-blue-500' : 'bg-gray-400'}`}></div>
          <span className="text-sm text-gray-600">
            {editable ? 'Edit Mode' : 'View Mode'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default WorkflowCanvas;