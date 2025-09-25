/**
 * CRM Store - Sprint 15
 * Global state management for CRM module using Zustand
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { Lead, Account, Opportunity, Contact, Activity } from '../types';

interface CRMState {
  // Selected entities
  selectedLead: Lead | null;
  selectedAccount: Account | null;
  selectedOpportunity: Opportunity | null;
  selectedContact: Contact | null;
  selectedActivity: Activity | null;

  // View preferences
  viewMode: 'list' | 'kanban' | 'calendar';
  sidebarOpen: boolean;
  detailPanelOpen: boolean;

  // Global filters
  globalFilters: {
    dateRange?: { start: Date; end: Date };
    ownerId?: number;
    tags?: string[];
  };

  // Quick access lists
  recentLeads: Lead[];
  recentAccounts: Account[];
  favoriteAccounts: number[];

  // Actions - Entity selection
  setSelectedLead: (lead: Lead | null) => void;
  setSelectedAccount: (account: Account | null) => void;
  setSelectedOpportunity: (opportunity: Opportunity | null) => void;
  setSelectedContact: (contact: Contact | null) => void;
  setSelectedActivity: (activity: Activity | null) => void;

  // Actions - View preferences
  setViewMode: (mode: 'list' | 'kanban' | 'calendar') => void;
  toggleSidebar: () => void;
  toggleDetailPanel: () => void;

  // Actions - Filters
  setGlobalFilters: (filters: any) => void;
  clearGlobalFilters: () => void;

  // Actions - Quick access
  addRecentLead: (lead: Lead) => void;
  addRecentAccount: (account: Account) => void;
  toggleFavoriteAccount: (accountId: number) => void;

  // Actions - Utility
  resetSelection: () => void;
  clearStore: () => void;
}

export const useCRMStore = create<CRMState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        selectedLead: null,
        selectedAccount: null,
        selectedOpportunity: null,
        selectedContact: null,
        selectedActivity: null,
        viewMode: 'list',
        sidebarOpen: true,
        detailPanelOpen: false,
        globalFilters: {},
        recentLeads: [],
        recentAccounts: [],
        favoriteAccounts: [],

        // Actions - Entity selection
        setSelectedLead: (lead) => {
          set({ selectedLead: lead });
          if (lead) {
            get().addRecentLead(lead);
          }
        },
        setSelectedAccount: (account) => {
          set({ selectedAccount: account });
          if (account) {
            get().addRecentAccount(account);
          }
        },
        setSelectedOpportunity: (opportunity) => set({ selectedOpportunity: opportunity }),
        setSelectedContact: (contact) => set({ selectedContact: contact }),
        setSelectedActivity: (activity) => set({ selectedActivity: activity }),

        // Actions - View preferences
        setViewMode: (mode) => set({ viewMode: mode }),
        toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
        toggleDetailPanel: () => set((state) => ({ detailPanelOpen: !state.detailPanelOpen })),

        // Actions - Filters
        setGlobalFilters: (filters) => set({ globalFilters: filters }),
        clearGlobalFilters: () => set({ globalFilters: {} }),

        // Actions - Quick access
        addRecentLead: (lead) => set((state) => ({
          recentLeads: [
            lead,
            ...state.recentLeads.filter(l => l.id !== lead.id)
          ].slice(0, 10) // Keep only 10 recent leads
        })),
        addRecentAccount: (account) => set((state) => ({
          recentAccounts: [
            account,
            ...state.recentAccounts.filter(a => a.id !== account.id)
          ].slice(0, 10) // Keep only 10 recent accounts
        })),
        toggleFavoriteAccount: (accountId) => set((state) => ({
          favoriteAccounts: state.favoriteAccounts.includes(accountId)
            ? state.favoriteAccounts.filter(id => id !== accountId)
            : [...state.favoriteAccounts, accountId]
        })),

        // Actions - Utility
        resetSelection: () => set({
          selectedLead: null,
          selectedAccount: null,
          selectedOpportunity: null,
          selectedContact: null,
          selectedActivity: null
        }),
        clearStore: () => set({
          selectedLead: null,
          selectedAccount: null,
          selectedOpportunity: null,
          selectedContact: null,
          selectedActivity: null,
          globalFilters: {},
          recentLeads: [],
          recentAccounts: [],
          favoriteAccounts: []
        })
      }),
      {
        name: 'crm-storage',
        partialize: (state) => ({
          viewMode: state.viewMode,
          sidebarOpen: state.sidebarOpen,
          globalFilters: state.globalFilters,
          favoriteAccounts: state.favoriteAccounts
        })
      }
    ),
    {
      name: 'CRMStore'
    }
  )
);