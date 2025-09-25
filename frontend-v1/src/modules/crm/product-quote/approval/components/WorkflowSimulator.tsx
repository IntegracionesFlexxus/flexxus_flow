// WorkflowSimulator - Test workflows with simulations
import React, { useState } from 'react';
import { Play, Pause, RotateCcw, CheckCircle, Clock, User, ArrowRight } from 'lucide-react';
import { ApprovalWorkflow } from '../../shared/types';

interface WorkflowSimulatorProps {
  workflow: ApprovalWorkflow;
  onClose: () => void;
}

interface SimulationStep {
  stepId: number;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'skipped';
  duration: number;
  approvers: number;
}

export const WorkflowSimulator: React.FC<WorkflowSimulatorProps> = ({
  workflow,
  onClose
}) => {
  const [isRunning, setIsRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [simulationSteps, setSimulationSteps] = useState<SimulationStep[]>(
    workflow.steps.map(step => ({
      stepId: step.id,
      name: step.name,
      status: 'pending',
      duration: 0,
      approvers: step.approvers.length
    }))
  );

  const [testData, setTestData] = useState({
    entityType: 'quote',
    amount: 10000,
    discount: 10,
    customerType: 'enterprise'
  });

  const runSimulation = () => {
    setIsRunning(true);
    // Simulate workflow execution
    simulationSteps.forEach((step, index) => {
      setTimeout(() => {
        setSimulationSteps(prev => prev.map((s, i) =>
          i === index ? { ...s, status: 'running' } : s
        ));
        setCurrentStep(index);

        setTimeout(() => {
          setSimulationSteps(prev => prev.map((s, i) =>
            i === index ? { ...s, status: 'completed', duration: Math.random() * 24 } : s
          ));

          if (index === simulationSteps.length - 1) {
            setIsRunning(false);
          }
        }, 1000);
      }, index * 2000);
    });
  };

  const resetSimulation = () => {
    setIsRunning(false);
    setCurrentStep(0);
    setSimulationSteps(workflow.steps.map(step => ({
      stepId: step.id,
      name: step.name,
      status: 'pending',
      duration: 0,
      approvers: step.approvers.length
    })));
  };

  return (
    <div className="space-y-6">
      {/* Test Data Input */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h4 className="text-lg font-medium text-gray-900 mb-4">Test Data</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
            <input
              type="number"
              value={testData.amount}
              onChange={(e) => setTestData(prev => ({ ...prev, amount: Number(e.target.value) }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Discount %</label>
            <input
              type="number"
              value={testData.discount}
              onChange={(e) => setTestData(prev => ({ ...prev, discount: Number(e.target.value) }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Entity Type</label>
            <select
              value={testData.entityType}
              onChange={(e) => setTestData(prev => ({ ...prev, entityType: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="quote">Quote</option>
              <option value="order">Order</option>
              <option value="contract">Contract</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Customer Type</label>
            <select
              value={testData.customerType}
              onChange={(e) => setTestData(prev => ({ ...prev, customerType: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="enterprise">Enterprise</option>
              <option value="smb">SMB</option>
              <option value="individual">Individual</option>
            </select>
          </div>
        </div>
      </div>

      {/* Simulation Controls */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-medium text-gray-900">Simulation</h4>
          <div className="flex items-center space-x-3">
            <button
              onClick={runSimulation}
              disabled={isRunning}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              <Play className="h-4 w-4" />
              <span>Run</span>
            </button>
            <button
              onClick={resetSimulation}
              className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* Simulation Steps */}
        <div className="space-y-4">
          {simulationSteps.map((step, index) => (
            <div key={step.stepId} className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg">
              <div className="flex-shrink-0">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  step.status === 'completed' ? 'bg-green-100 text-green-600' :
                  step.status === 'running' ? 'bg-blue-100 text-blue-600' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  {step.status === 'completed' ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : step.status === 'running' ? (
                    <Clock className="h-5 w-5 animate-spin" />
                  ) : (
                    <span className="text-sm font-medium">{index + 1}</span>
                  )}
                </div>
              </div>

              <div className="flex-1">
                <h5 className="text-sm font-medium text-gray-900">{step.name}</h5>
                <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
                  <div className="flex items-center">
                    <User className="h-3 w-3 mr-1" />
                    {step.approvers} approvers
                  </div>
                  {step.duration > 0 && (
                    <div className="flex items-center">
                      <Clock className="h-3 w-3 mr-1" />
                      {step.duration.toFixed(1)}h
                    </div>
                  )}
                </div>
              </div>

              <div className="flex-shrink-0">
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  step.status === 'completed' ? 'bg-green-100 text-green-800' :
                  step.status === 'running' ? 'bg-blue-100 text-blue-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {step.status}
                </span>
              </div>

              {index < simulationSteps.length - 1 && (
                <ArrowRight className="h-4 w-4 text-gray-400" />
              )}
            </div>
          ))}
        </div>

        {/* Results */}
        {!isRunning && simulationSteps.some(s => s.status === 'completed') && (
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <h5 className="text-sm font-medium text-green-900 mb-2">Simulation Results</h5>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <div className="text-green-700">Total Duration</div>
                <div className="font-medium">
                  {simulationSteps.reduce((sum, step) => sum + step.duration, 0).toFixed(1)}h
                </div>
              </div>
              <div>
                <div className="text-green-700">Completed Steps</div>
                <div className="font-medium">
                  {simulationSteps.filter(s => s.status === 'completed').length} / {simulationSteps.length}
                </div>
              </div>
              <div>
                <div className="text-green-700">Success Rate</div>
                <div className="font-medium">100%</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkflowSimulator;