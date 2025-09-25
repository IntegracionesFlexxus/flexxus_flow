/**
 * Lead Store - Sprint 15
 * Lead-specific state management
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { Lead, LeadFilters, LeadStatus } from '../types';

interface LeadState {
  // Lead lists
  leads: Lead[];
  filteredLeads: Lead[];
  totalLeads: number;

  // Loading states
  isLoading: boolean;
  isCreating: boolean;
  isUpdating: boolean;
  isConverting: boolean;

  // Filters and pagination
  filters: LeadFilters;
  currentPage: number;
  pageSize: number;
  totalPages: number;

  // Selection
  selectedLeadIds: number[];
  leadToConvert: Lead | null;

  // Scoring
  scoringInProgress: boolean;
  lastScoringUpdate: Date | null;

  // Actions - CRUD
  setLeads: (leads: Lead[], total: number) => void;
  addLead: (lead: Lead) => void;
  updateLead: (id: number, updates: Partial<Lead>) => void;
  removeLead: (id: number) => void;

  // Actions - Filters
  setFilters: (filters: LeadFilters) => void;
  clearFilters: () => void;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;

  // Actions - Selection
  selectLead: (id: number) => void;
  unselectLead: (id: number) => void;
  selectAllLeads: () => void;
  clearSelection: () => void;

  // Actions - Conversion
  setLeadToConvert: (lead: Lead | null) => void;
  markAsConverted: (id: number) => void;

  // Actions - Loading states
  setLoading: (loading: boolean) => void;
  setCreating: (creating: boolean) => void;
  setUpdating: (updating: boolean) => void;
  setConverting: (converting: boolean) => void;

  // Actions - Scoring
  setScoringInProgress: (inProgress: boolean) => void;
  updateLeadScore: (id: number, score: number) => void;
  bulkUpdateScores: (scores: { id: number; score: number }[]) => void;

  // Utility
  getLeadById: (id: number) => Lead | undefined;
  getLeadsByStatus: (status: LeadStatus) => Lead[];
  getHotLeads: (minScore?: number) => Lead[];
}

export const useLeadStore = create<LeadState>()(
  devtools(
    (set, get) => ({
      // Initial state
      leads: [],
      filteredLeads: [],
      totalLeads: 0,
      isLoading: false,
      isCreating: false,
      isUpdating: false,
      isConverting: false,
      filters: {},
      currentPage: 1,
      pageSize: 20,
      totalPages: 0,
      selectedLeadIds: [],
      leadToConvert: null,
      scoringInProgress: false,
      lastScoringUpdate: null,

      // Actions - CRUD
      setLeads: (leads, total) => set({
        leads,
        filteredLeads: leads,
        totalLeads: total,
        totalPages: Math.ceil(total / get().pageSize)
      }),
      addLead: (lead) => set((state) => ({
        leads: [lead, ...state.leads],
        filteredLeads: [lead, ...state.filteredLeads],
        totalLeads: state.totalLeads + 1
      })),
      updateLead: (id, updates) => set((state) => ({
        leads: state.leads.map(l => l.id === id ? { ...l, ...updates } : l),
        filteredLeads: state.filteredLeads.map(l => l.id === id ? { ...l, ...updates } : l)
      })),
      removeLead: (id) => set((state) => ({
        leads: state.leads.filter(l => l.id !== id),
        filteredLeads: state.filteredLeads.filter(l => l.id !== id),
        totalLeads: state.totalLeads - 1,
        selectedLeadIds: state.selectedLeadIds.filter(leadId => leadId !== id)
      })),

      // Actions - Filters
      setFilters: (filters) => set({ filters, currentPage: 1 }),
      clearFilters: () => set({ filters: {}, currentPage: 1 }),
      setPage: (page) => set({ currentPage: page }),
      setPageSize: (size) => set((state) => ({
        pageSize: size,
        totalPages: Math.ceil(state.totalLeads / size),
        currentPage: 1
      })),

      // Actions - Selection
      selectLead: (id) => set((state) => ({
        selectedLeadIds: [...state.selectedLeadIds, id]
      })),
      unselectLead: (id) => set((state) => ({
        selectedLeadIds: state.selectedLeadIds.filter(leadId => leadId !== id)
      })),
      selectAllLeads: () => set((state) => ({
        selectedLeadIds: state.filteredLeads.map(l => l.id)
      })),
      clearSelection: () => set({ selectedLeadIds: [] }),

      // Actions - Conversion
      setLeadToConvert: (lead) => set({ leadToConvert: lead }),
      markAsConverted: (id) => set((state) => ({
        leads: state.leads.map(l => l.id === id ? { ...l, status: 'converted' as LeadStatus } : l),
        filteredLeads: state.filteredLeads.map(l => l.id === id ? { ...l, status: 'converted' as LeadStatus } : l)
      })),

      // Actions - Loading states
      setLoading: (loading) => set({ isLoading: loading }),
      setCreating: (creating) => set({ isCreating: creating }),
      setUpdating: (updating) => set({ isUpdating: updating }),
      setConverting: (converting) => set({ isConverting: converting }),

      // Actions - Scoring
      setScoringInProgress: (inProgress) => set({ scoringInProgress: inProgress }),
      updateLeadScore: (id, score) => set((state) => ({
        leads: state.leads.map(l => l.id === id ? { ...l, score } : l),
        filteredLeads: state.filteredLeads.map(l => l.id === id ? { ...l, score } : l),
        lastScoringUpdate: new Date()
      })),
      bulkUpdateScores: (scores) => set((state) => {
        const scoreMap = new Map(scores.map(s => [s.id, s.score]));
        return {
          leads: state.leads.map(l => scoreMap.has(l.id) ? { ...l, score: scoreMap.get(l.id) } : l),
          filteredLeads: state.filteredLeads.map(l => scoreMap.has(l.id) ? { ...l, score: scoreMap.get(l.id) } : l),
          lastScoringUpdate: new Date()
        };
      }),

      // Utility
      getLeadById: (id) => get().leads.find(l => l.id === id),
      getLeadsByStatus: (status) => get().leads.filter(l => l.status === status),
      getHotLeads: (minScore = 70) => get().leads.filter(l => (l.score || 0) >= minScore)
    }),
    {
      name: 'LeadStore'
    }
  )
);