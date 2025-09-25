// Price Simulator Page - Sprint 19 Phase 3
// What-if scenario simulator for pricing analysis

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Play,
  Plus,
  Trash2,
  Copy,
  Download,
  Upload,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Target,
  DollarSign,
  Percent,
  BarChart3,
  PieChart,
  Save,
  Share,
  Settings,
  AlertTriangle,
  CheckCircle,
  Clock,
  Calculator
} from 'lucide-react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ScatterChart,
  Scatter
} from 'recharts';
import { usePricingStore } from '../../../../stores/pricingStore';
import { usePriceSimulation } from '../hooks/usePriceSimulation';
import {
  PricingScenario,
  SimulationResult,
  PriceCalculationParams,
  PriceResult
} from '../../../shared/types/pricing.types';
import { Button } from '../../../../../shared/ui/Button';
import { Card } from '../../../../../shared/ui/Card';
import { Loading } from '../../../../../shared/ui/Loading';
import { Badge } from '../../../../../shared/ui/Badge';
import { Modal } from '../../../../../shared/ui/Modal';
import { PriceBreakdown } from '../components/PriceBreakdown';

interface ScenarioForm {
  name: string;
  description?: string;
  productId: number;
  variantId?: number;
  quantity: number;
  customerId?: number;
  accountId?: number;
  currencyCode?: string;
  salesChannel?: string;
  region?: string;
  promotionCode?: string;
}

interface ComparisonView {
  type: 'table' | 'chart' | 'breakdown';
  groupBy: 'scenario' | 'product' | 'customer';
}

export const PriceSimulatorPage: React.FC = () => {
  const navigate = useNavigate();
  const [scenarios, setScenarios] = useState<PricingScenario[]>([]);
  const [results, setResults] = useState<SimulationResult[]>([]);
  const [selectedScenarios, setSelectedScenarios] = useState<number[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [showScenarioForm, setShowScenarioForm] = useState(false);
  const [editingScenario, setEditingScenario] = useState<PricingScenario | null>(null);
  const [comparisonView, setComparisonView] = useState<ComparisonView>({
    type: 'table',
    groupBy: 'scenario'
  });
  const [scenarioForm, setScenarioForm] = useState<ScenarioForm>({
    name: '',
    description: '',
    productId: 0,
    quantity: 1,
    currencyCode: 'USD'
  });
  const [showResultDetails, setShowResultDetails] = useState(false);
  const [selectedResult, setSelectedResult] = useState<SimulationResult | null>(null);

  const {
    simulationResults,
    loading,
    error,
    simulatePricing,
    clearError
  } = usePricingStore();

  const {
    runSimulation,
    compareScenarios,
    exportResults,
    saveScenarioSet,
    loadScenarioSet
  } = usePriceSimulation();

  useEffect(() => {
    // Load saved scenarios from localStorage
    const savedScenarios = localStorage.getItem('pricingScenarios');
    if (savedScenarios) {
      try {
        setScenarios(JSON.parse(savedScenarios));
      } catch (error) {
        console.error('Failed to load saved scenarios:', error);
      }
    }
  }, []);

  useEffect(() => {
    // Save scenarios to localStorage
    localStorage.setItem('pricingScenarios', JSON.stringify(scenarios));
  }, [scenarios]);

  const handleAddScenario = () => {
    setEditingScenario(null);
    setScenarioForm({
      name: '',
      description: '',
      productId: 0,
      quantity: 1,
      currencyCode: 'USD'
    });
    setShowScenarioForm(true);
  };

  const handleEditScenario = (scenario: PricingScenario, index: number) => {
    setEditingScenario(scenario);
    setScenarioForm({
      name: scenario.name,
      description: scenario.description,
      productId: scenario.parameters.productId,
      variantId: scenario.parameters.variantId,
      quantity: scenario.parameters.quantity,
      customerId: scenario.parameters.customerId,
      accountId: scenario.parameters.accountId,
      currencyCode: scenario.parameters.currencyCode || 'USD',
      salesChannel: scenario.parameters.context?.salesChannel,
      region: scenario.parameters.context?.region,
      promotionCode: scenario.parameters.context?.promotionCode
    });
    setShowScenarioForm(true);
  };

  const handleSaveScenario = () => {
    const newScenario: PricingScenario = {
      name: scenarioForm.name,
      description: scenarioForm.description,
      parameters: {
        productId: scenarioForm.productId,
        variantId: scenarioForm.variantId,
        quantity: scenarioForm.quantity,
        customerId: scenarioForm.customerId,
        accountId: scenarioForm.accountId,
        currencyCode: scenarioForm.currencyCode,
        context: {
          salesChannel: scenarioForm.salesChannel,
          region: scenarioForm.region,
          promotionCode: scenarioForm.promotionCode
        }
      }
    };

    if (editingScenario) {
      const updatedScenarios = scenarios.map(scenario =>
        scenario === editingScenario ? newScenario : scenario
      );
      setScenarios(updatedScenarios);
    } else {
      setScenarios([...scenarios, newScenario]);
    }

    setShowScenarioForm(false);
    setEditingScenario(null);
  };

  const handleDeleteScenario = (index: number) => {
    const updatedScenarios = scenarios.filter((_, i) => i !== index);
    setScenarios(updatedScenarios);
  };

  const handleDuplicateScenario = (scenario: PricingScenario) => {
    const duplicatedScenario = {
      ...scenario,
      name: `${scenario.name} (Copy)`
    };
    setScenarios([...scenarios, duplicatedScenario]);
  };

  const handleRunSimulation = async () => {
    if (scenarios.length === 0) {
      alert('Please add at least one scenario to run simulation');
      return;
    }

    setIsRunning(true);
    try {
      const simulationResults = await runSimulation(scenarios);
      setResults(simulationResults);
    } catch (error) {
      console.error('Simulation failed:', error);
    } finally {
      setIsRunning(false);
    }
  };

  const handleRunSelectedScenarios = async () => {
    if (selectedScenarios.length === 0) {
      alert('Please select scenarios to run');
      return;
    }

    const selectedScenarioList = selectedScenarios.map(index => scenarios[index]);
    setIsRunning(true);
    try {
      const simulationResults = await runSimulation(selectedScenarioList);
      setResults(simulationResults);
    } catch (error) {
      console.error('Simulation failed:', error);
    } finally {
      setIsRunning(false);
    }
  };

  const handleViewResultDetails = (result: SimulationResult) => {
    setSelectedResult(result);
    setShowResultDetails(true);
  };

  const handleExportResults = async () => {
    if (results.length === 0) {
      alert('No results to export');
      return;
    }

    try {
      await exportResults(results);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const handleSaveScenarioSet = async () => {
    try {
      await saveScenarioSet(scenarios, 'My Scenario Set');
    } catch (error) {
      console.error('Failed to save scenario set:', error);
    }
  };

  const getResultSummary = () => {
    if (results.length === 0) return null;

    const prices = results.map(r => r.result.finalPrice);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
    const priceVariance = ((maxPrice - minPrice) / avgPrice) * 100;

    return {
      minPrice,
      maxPrice,
      avgPrice,
      priceVariance,
      totalScenarios: results.length
    };
  };

  const getChartData = () => {
    return results.map((result, index) => ({
      name: result.scenario.name,
      basePrice: result.result.basePrice,
      finalPrice: result.result.finalPrice,
      discount: result.result.basePrice - result.result.finalPrice,
      scenario: index
    }));
  };

  const summary = getResultSummary();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Price Simulator</h1>
              <p className="text-sm text-gray-500">
                Test pricing scenarios and analyze what-if situations
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSaveScenarioSet}
                disabled={scenarios.length === 0}
              >
                <Save className="w-4 h-4 mr-2" />
                Save Set
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleExportResults}
                disabled={results.length === 0}
              >
                <Download className="w-4 h-4 mr-2" />
                Export Results
              </Button>

              <Button
                onClick={handleRunSimulation}
                disabled={scenarios.length === 0 || isRunning}
              >
                {isRunning ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Play className="w-4 h-4 mr-2" />
                )}
                Run Simulation
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error Alert */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <AlertTriangle className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <p className="mt-1 text-sm text-red-700">{error}</p>
                <div className="mt-2">
                  <Button variant="outline" size="sm" onClick={clearError}>
                    Dismiss
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Scenarios Panel */}
          <div className="lg:col-span-1">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Scenarios</h3>
                <Button size="sm" onClick={handleAddScenario}>
                  <Plus className="w-4 h-4 mr-1" />
                  Add
                </Button>
              </div>

              <div className="space-y-3 max-h-96 overflow-y-auto">
                {scenarios.map((scenario, index) => (
                  <div
                    key={index}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedScenarios.includes(index)
                        ? 'border-blue-300 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => {
                      if (selectedScenarios.includes(index)) {
                        setSelectedScenarios(selectedScenarios.filter(i => i !== index));
                      } else {
                        setSelectedScenarios([...selectedScenarios, index]);
                      }
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{scenario.name}</h4>
                        <p className="text-sm text-gray-500">
                          Product: {scenario.parameters.productId}, Qty: {scenario.parameters.quantity}
                        </p>
                        {scenario.description && (
                          <p className="text-xs text-gray-400 mt-1">{scenario.description}</p>
                        )}
                      </div>
                      <div className="flex items-center space-x-1 ml-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditScenario(scenario, index);
                          }}
                          className="p-1 text-gray-400 hover:text-gray-600"
                        >
                          <Settings className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDuplicateScenario(scenario);
                          }}
                          className="p-1 text-gray-400 hover:text-gray-600"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteScenario(index);
                          }}
                          className="p-1 text-gray-400 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {scenarios.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Calculator className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>No scenarios added yet</p>
                    <p className="text-sm">Add scenarios to start simulation</p>
                  </div>
                )}
              </div>

              {selectedScenarios.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">
                      {selectedScenarios.length} selected
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleRunSelectedScenarios}
                      disabled={isRunning}
                    >
                      Run Selected
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          </div>

          {/* Results Panel */}
          <div className="lg:col-span-2">
            {/* Summary Cards */}
            {summary && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <Card className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Min Price</p>
                      <p className="text-xl font-bold text-green-600">
                        ${summary.minPrice.toFixed(2)}
                      </p>
                    </div>
                    <TrendingDown className="w-6 h-6 text-green-600" />
                  </div>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Max Price</p>
                      <p className="text-xl font-bold text-red-600">
                        ${summary.maxPrice.toFixed(2)}
                      </p>
                    </div>
                    <TrendingUp className="w-6 h-6 text-red-600" />
                  </div>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Avg Price</p>
                      <p className="text-xl font-bold text-blue-600">
                        ${summary.avgPrice.toFixed(2)}
                      </p>
                    </div>
                    <Target className="w-6 h-6 text-blue-600" />
                  </div>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Variance</p>
                      <p className="text-xl font-bold text-yellow-600">
                        {summary.priceVariance.toFixed(1)}%
                      </p>
                    </div>
                    <Percent className="w-6 h-6 text-yellow-600" />
                  </div>
                </Card>
              </div>
            )}

            {/* Comparison View Controls */}
            {results.length > 0 && (
              <Card className="p-4 mb-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Results View</h3>
                  <div className="flex items-center space-x-2">
                    <select
                      value={comparisonView.type}
                      onChange={(e) =>
                        setComparisonView({ ...comparisonView, type: e.target.value as any })
                      }
                      className="px-3 py-1 border border-gray-300 rounded text-sm"
                    >
                      <option value="table">Table View</option>
                      <option value="chart">Chart View</option>
                      <option value="breakdown">Breakdown View</option>
                    </select>
                  </div>
                </div>
              </Card>
            )}

            {/* Results Display */}
            {isRunning ? (
              <Card className="p-8">
                <div className="flex flex-col items-center justify-center">
                  <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mb-4" />
                  <p className="text-lg font-medium text-gray-900">Running Simulation...</p>
                  <p className="text-sm text-gray-500">This may take a few moments</p>
                </div>
              </Card>
            ) : results.length > 0 ? (
              <Card className="p-6">
                {comparisonView.type === 'table' && (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Scenario
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Base Price
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Final Price
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Discount
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Rules Applied
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {results.map((result, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {result.scenario.name}
                                </div>
                                <div className="text-sm text-gray-500">
                                  Qty: {result.scenario.parameters.quantity}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              ${result.result.basePrice.toFixed(2)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">
                                ${result.result.finalPrice.toFixed(2)}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-green-600">
                                -${(result.result.basePrice - result.result.finalPrice).toFixed(2)}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <Badge variant="info">
                                {result.result.appliedRules.length} rules
                              </Badge>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleViewResultDetails(result)}
                              >
                                View Details
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {comparisonView.type === 'chart' && (
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={getChartData()}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="basePrice" fill="#8884d8" name="Base Price" />
                        <Bar dataKey="finalPrice" fill="#82ca9d" name="Final Price" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </Card>
            ) : (
              <Card className="p-8">
                <div className="text-center text-gray-500">
                  <BarChart3 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>No simulation results yet</p>
                  <p className="text-sm">Add scenarios and run simulation to see results</p>
                </div>
              </Card>
            )}
          </div>
        </div>

        {/* Scenario Form Modal */}
        {showScenarioForm && (
          <Modal
            isOpen={showScenarioForm}
            onClose={() => setShowScenarioForm(false)}
            title={editingScenario ? 'Edit Scenario' : 'Add Scenario'}
            size="lg"
          >
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Scenario Name *
                </label>
                <input
                  type="text"
                  value={scenarioForm.name}
                  onChange={(e) => setScenarioForm({ ...scenarioForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter scenario name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={scenarioForm.description}
                  onChange={(e) => setScenarioForm({ ...scenarioForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={2}
                  placeholder="Optional description"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Product ID *
                  </label>
                  <input
                    type="number"
                    value={scenarioForm.productId}
                    onChange={(e) => setScenarioForm({ ...scenarioForm, productId: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quantity *
                  </label>
                  <input
                    type="number"
                    value={scenarioForm.quantity}
                    onChange={(e) => setScenarioForm({ ...scenarioForm, quantity: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Customer ID
                  </label>
                  <input
                    type="number"
                    value={scenarioForm.customerId || ''}
                    onChange={(e) => setScenarioForm({ ...scenarioForm, customerId: e.target.value ? parseInt(e.target.value) : undefined })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Currency
                  </label>
                  <select
                    value={scenarioForm.currencyCode}
                    onChange={(e) => setScenarioForm({ ...scenarioForm, currencyCode: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                    <option value="CAD">CAD</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sales Channel
                  </label>
                  <select
                    value={scenarioForm.salesChannel || ''}
                    onChange={(e) => setScenarioForm({ ...scenarioForm, salesChannel: e.target.value || undefined })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select channel</option>
                    <option value="online">Online</option>
                    <option value="retail">Retail</option>
                    <option value="wholesale">Wholesale</option>
                    <option value="partner">Partner</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Region
                  </label>
                  <select
                    value={scenarioForm.region || ''}
                    onChange={(e) => setScenarioForm({ ...scenarioForm, region: e.target.value || undefined })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select region</option>
                    <option value="north_america">North America</option>
                    <option value="europe">Europe</option>
                    <option value="asia_pacific">Asia Pacific</option>
                    <option value="latin_america">Latin America</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Promotion Code
                </label>
                <input
                  type="text"
                  value={scenarioForm.promotionCode || ''}
                  onChange={(e) => setScenarioForm({ ...scenarioForm, promotionCode: e.target.value || undefined })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Optional promotion code"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowScenarioForm(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveScenario}
                  disabled={!scenarioForm.name || !scenarioForm.productId}
                >
                  {editingScenario ? 'Update' : 'Add'} Scenario
                </Button>
              </div>
            </div>
          </Modal>
        )}

        {/* Result Details Modal */}
        {showResultDetails && selectedResult && (
          <Modal
            isOpen={showResultDetails}
            onClose={() => setShowResultDetails(false)}
            title={`Result Details: ${selectedResult.scenario.name}`}
            size="lg"
          >
            <div className="p-6">
              <PriceBreakdown
                result={selectedResult.result}
                showDetails={true}
              />
            </div>
          </Modal>
        )}
      </div>
    </div>
  );
};

export default PriceSimulatorPage;