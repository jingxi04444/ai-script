import React from 'react';
import { createRoot } from 'react-dom/client';
import DirectorStudio from './pages/Workspace/VisualCanvas/DirectorStudio/DirectorStudio';
import { createDirectorScene } from './pages/Workspace/VisualCanvas/DirectorStudio/directorScene';
import { useWorkflowStore } from './stores/workflowStore';
import { createWorkflowNodeData } from './types/workflow';
import './styles/global.css';

useWorkflowStore.setState({ projectKey: 'director-composer-qa', nodes: [{ id: 'qa-director', type: 'workflow', position: { x: 0, y: 0 }, data: { ...createWorkflowNodeData('director'), directorScene: createDirectorScene('product') } }], edges: [] });
createRoot(document.getElementById('root')!).render(<React.StrictMode><DirectorStudio nodeId="qa-director" onClose={() => {}} /></React.StrictMode>);
