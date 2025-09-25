/**
 * Mock Data Provider
 *
 * OMNICHANNEL STATUS: Temporary provider for missing module data
 * See: FRONTEND_OMNICHANNEL_ADAPTATIONS.md for pending changes
 *
 * TODO: OMNICHANNEL - Replace with real data provider when module is ready
 */

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import {
  ILeadEngagement,
  ILeadScoring,
  IScoringFactor,
  LeadGrade,
  LeadTemperature
} from '../types/lead.types';

// Mock Engagement Data Generator
const generateMockEngagement = (leadId: number): ILeadEngagement => {
  // TODO: OMNICHANNEL - Replace with real engagement data
  return {
    lead_id: leadId,
    email_opens: 0,
    email_clicks: 0,
    website_visits: 0,
    page_views: 0,
    form_submissions: 0,
    chat_interactions: 0,
    content_downloads: 0,
    social_interactions: 0,
    last_engagement_date: null,
    engagement_score: 0,
    is_mock_data: true  // Flag to indicate this is mock data
  };
};

// Mock Behavioral Scoring Data
const generateMockBehavioralScore = (): number => {
  // TODO: OMNICHANNEL - Calculate from real behavioral data
  return Math.floor(Math.random() * 20); // Low scores since no real data
};

// Mock Scoring Factors
const generateMockScoringFactors = (leadId: number): IScoringFactor[] => {
  // TODO: OMNICHANNEL - Replace with real scoring factors
  return [
    {
      category: 'demographic',
      name: 'Budget',
      value: 20,
      max_value: 30,
      weight: 0.3,
      description: 'Based on stated budget'
    },
    {
      category: 'demographic',
      name: 'Authority',
      value: 15,
      max_value: 25,
      weight: 0.25,
      description: 'Decision-making authority'
    },
    {
      category: 'behavioral',
      name: 'Engagement',
      value: 0,
      max_value: 25,
      weight: 0.25,
      description: 'Awaiting OmniChannel data'
    },
    {
      category: 'engagement',
      name: 'Email Activity',
      value: 0,
      max_value: 25,
      weight: 0.25,
      description: 'No email tracking available'
    },
    {
      category: 'fit',
      name: 'Industry Match',
      value: 15,
      max_value: 20,
      weight: 0.2,
      description: 'Industry alignment with ICP'
    }
  ];
};

// Mock Source Verification
const getMockSourceVerification = () => {
  // TODO: OMNICHANNEL - Real source verification
  return {
    verified: false,
    source: 'Manual Entry',
    verification_date: null,
    verification_method: 'pending_omnichannel'
  };
};

// Mock Real-time Updates
const simulateRealtimeUpdate = (callback: () => void, interval: number) => {
  // TODO: OMNICHANNEL - Replace with WebSocket subscription
  const timer = setInterval(callback, interval);
  return () => clearInterval(timer);
};

// Context interface
interface IMockDataContext {
  // Engagement data
  getLeadEngagement: (leadId: number) => ILeadEngagement;
  updateMockEngagement: (leadId: number, data: Partial<ILeadEngagement>) => void;

  // Scoring data
  getMockScoringFactors: (leadId: number) => IScoringFactor[];
  getMockBehavioralScore: () => number;

  // Source verification
  getSourceVerification: (leadId: number) => any;

  // Real-time simulation
  simulateUpdate: (callback: () => void, interval?: number) => () => void;

  // Flags
  isMockDataEnabled: boolean;
  mockDataWarning: string;
}

// Create context
const MockDataContext = createContext<IMockDataContext | undefined>(undefined);

// Provider props
interface MockDataProviderProps {
  children: ReactNode;
  enabled?: boolean;
}

// Provider component
export const MockDataProvider: React.FC<MockDataProviderProps> = ({
  children,
  enabled = true
}) => {
  // Store mock engagement data in memory
  const [mockEngagementCache, setMockEngagementCache] = useState<Map<number, ILeadEngagement>>(
    new Map()
  );

  // Get or generate engagement data
  const getLeadEngagement = useCallback((leadId: number): ILeadEngagement => {
    if (!mockEngagementCache.has(leadId)) {
      const mockData = generateMockEngagement(leadId);
      setMockEngagementCache(prev => new Map(prev).set(leadId, mockData));
      return mockData;
    }
    return mockEngagementCache.get(leadId)!;
  }, [mockEngagementCache]);

  // Update mock engagement (for demo purposes)
  const updateMockEngagement = useCallback((leadId: number, data: Partial<ILeadEngagement>) => {
    setMockEngagementCache(prev => {
      const current = prev.get(leadId) || generateMockEngagement(leadId);
      const updated = { ...current, ...data };
      return new Map(prev).set(leadId, updated);
    });
  }, []);

  // Get mock scoring factors
  const getMockScoringFactors = useCallback((leadId: number): IScoringFactor[] => {
    return generateMockScoringFactors(leadId);
  }, []);

  // Get mock behavioral score
  const getMockBehavioralScore = useCallback((): number => {
    return generateMockBehavioralScore();
  }, []);

  // Get source verification
  const getSourceVerification = useCallback((leadId: number) => {
    return getMockSourceVerification();
  }, []);

  // Simulate real-time updates
  const simulateUpdate = useCallback((callback: () => void, interval = 30000) => {
    return simulateRealtimeUpdate(callback, interval);
  }, []);

  // Context value
  const value: IMockDataContext = {
    getLeadEngagement,
    updateMockEngagement,
    getMockScoringFactors,
    getMockBehavioralScore,
    getSourceVerification,
    simulateUpdate,
    isMockDataEnabled: enabled,
    mockDataWarning: 'Using simulated data - OmniChannel integration pending'
  };

  return (
    <MockDataContext.Provider value={value}>
      {children}
    </MockDataContext.Provider>
  );
};

// Hook to use mock data
export const useMockData = () => {
  const context = useContext(MockDataContext);
  if (!context) {
    throw new Error('useMockData must be used within MockDataProvider');
  }
  return context;
};

// Mock data generators for testing
export const mockDataGenerators = {
  // Generate sample leads
  generateMockLeads: (count: number) => {
    const leads = [];
    const firstNames = ['John', 'Jane', 'Mike', 'Sarah', 'David', 'Emma', 'Robert', 'Lisa'];
    const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller'];
    const companies = ['Tech Corp', 'Sales Inc', 'Marketing Co', 'Finance Ltd', 'Consulting Group'];
    const statuses = ['new', 'contacted', 'qualified', 'proposal', 'negotiation'];

    for (let i = 1; i <= count; i++) {
      const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
      const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];

      leads.push({
        id: i,
        company_id: 1,
        first_name: firstName,
        last_name: lastName,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`,
        phone: `555-${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`,
        company_name: companies[Math.floor(Math.random() * companies.length)],
        job_title: 'Manager',
        status: statuses[Math.floor(Math.random() * statuses.length)] as any,
        score: Math.floor(Math.random() * 100),
        grade: 'B' as LeadGrade,
        temperature: 'warm' as LeadTemperature,
        manual_entry: true,
        source_verified: false,
        do_not_call: false,
        do_not_email: false,
        created_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
        updated_at: new Date()
      });
    }

    return leads;
  },

  // Generate mock activities
  generateMockActivities: (leadId: number, count: number) => {
    const activities = [];
    const types = ['call', 'email', 'meeting', 'task', 'note'];
    const subjects = [
      'Follow-up call',
      'Product demo',
      'Initial contact',
      'Qualification call',
      'Proposal review'
    ];

    for (let i = 1; i <= count; i++) {
      activities.push({
        id: i,
        lead_id: leadId,
        type: types[Math.floor(Math.random() * types.length)],
        subject: subjects[Math.floor(Math.random() * subjects.length)],
        status: Math.random() > 0.5 ? 'completed' : 'planned',
        created_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)
      });
    }

    return activities;
  },

  // Generate mock conversion suggestions
  generateConversionSuggestions: (leadId: number) => {
    return {
      account_match: {
        found: Math.random() > 0.5,
        suggested_account: 'Existing Account Corp',
        confidence: Math.floor(Math.random() * 40) + 60
      },
      duplicate_check: {
        found: Math.random() > 0.8,
        potential_duplicates: Math.floor(Math.random() * 3)
      },
      readiness_score: Math.floor(Math.random() * 40) + 60,
      recommended_actions: [
        'Schedule discovery call',
        'Send pricing information',
        'Prepare proposal'
      ]
    };
  }
};

// Export mock data warning component
export const MockDataWarning: React.FC = () => (
  <div style={{
    padding: '8px 12px',
    backgroundColor: '#fff3cd',
    borderLeft: '4px solid #ffc107',
    color: '#856404',
    fontSize: '12px',
    marginBottom: '8px'
  }}>
    ⚠️ Mock Data: Real engagement data will be available when OmniChannel module is connected
  </div>
);

export default MockDataProvider;