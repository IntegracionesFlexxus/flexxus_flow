// Quote Store - Sprint 19 Frontend Implementation
// Zustand store for quote management and builder

import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import {
  Quote,
  QuoteLineItem,
  QuoteSection,
  QuoteTotals,
  CreateLineItemDto,
  ValidationError,
  QuoteFilters,
  DocumentTemplate,
  DocumentGenerationRequest,
  DocumentGenerationResult,
  CreateDto,
  UpdateDto
} from '../product-quote/shared/types';
import { quoteService } from '../product-quote/quotes/services';

interface QuoteBuilder {
  quote: Quote | null;
  isDirty: boolean;
  isValid: boolean;
  validationErrors: ValidationError[];
  autoSaveEnabled: boolean;
  lastSaved?: string;
}

interface QuoteStore {
  // State
  quotes: Quote[];
  currentQuote: Quote | null;
  selectedQuotes: number[];
  quoteTotals: QuoteTotals | null;
  documentTemplates: DocumentTemplate[];

  // Builder state
  builder: QuoteBuilder;

  // Loading states
  loading: boolean;
  builderLoading: boolean;
  calculationLoading: boolean;
  generationLoading: boolean;

  // Error states
  error: string | null;

  // Pagination
  currentPage: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;

  // Filters
  filters: QuoteFilters;

  // Actions - Quote Management
  loadQuotes: (filters?: Partial<QuoteFilters>) => Promise<void>;
  loadQuote: (id: number) => Promise<void>;
  createQuote: (quoteData: CreateDto<Quote>) => Promise<Quote>;
  updateQuote: (id: number, updates: UpdateDto<Quote>) => Promise<void>;
  deleteQuote: (id: number) => Promise<void>;
  duplicateQuote: (id: number, options?: any) => Promise<Quote>;

  // Actions - Quote Versions
  createQuoteVersion: (id: number, versionData?: any) => Promise<Quote>;
  getQuoteVersions: (id: number) => Promise<Quote[]>;

  // Actions - Line Items
  addLineItem: (quoteId: number, item: CreateLineItemDto) => Promise<void>;
  updateLineItem: (quoteId: number, itemId: number, updates: Partial<QuoteLineItem>) => Promise<void>;
  removeLineItem: (quoteId: number, itemId: number) => Promise<void>;
  reorderLineItems: (quoteId: number, itemOrders: Array<{ id: number; sortOrder: number }>) => Promise<void>;

  // Actions - Sections
  addSection: (quoteId: number, section: Omit<QuoteSection, 'id' | 'quoteId'>) => Promise<void>;
  updateSection: (quoteId: number, sectionId: number, updates: Partial<QuoteSection>) => Promise<void>;
  removeSection: (quoteId: number, sectionId: number) => Promise<void>;

  // Actions - Calculations
  calculateTotals: (quoteId: number) => Promise<void>;
  recalculateAllTotals: () => Promise<void>;

  // Actions - Builder
  initializeBuilder: (quoteId?: number) => Promise<void>;
  destroyBuilder: () => void;
  updateBuilderQuote: (updates: Partial<Quote>) => void;
  addBuilderLineItem: (item: CreateLineItemDto) => Promise<void>;
  updateBuilderLineItem: (itemId: number, updates: Partial<QuoteLineItem>) => void;
  removeBuilderLineItem: (itemId: number) => void;
  validateBuilder: () => boolean;
  saveBuilderQuote: () => Promise<void>;
  enableAutoSave: (interval?: number) => void;
  disableAutoSave: () => void;

  // Actions - Workflow
  submitForApproval: (quoteId: number, comments?: string) => Promise<void>;
  convertToOrder: (quoteId: number) => Promise<void>;

  // Actions - Documents
  loadDocumentTemplates: () => Promise<void>;
  generateDocument: (quoteId: number, request: DocumentGenerationRequest) => Promise<DocumentGenerationResult>;
  sendQuoteEmail: (quoteId: number, emailData: any) => Promise<void>;

  // Actions - Bulk Operations
  selectQuote: (id: number) => void;
  selectAllQuotes: () => void;
  clearSelection: () => void;
  bulkUpdateQuotes: (updates: Array<{ id: number; data: Partial<Quote> }>) => Promise<void>;
  bulkDeleteQuotes: (ids: number[]) => Promise<void>;
  exportQuotes: (params: any) => Promise<Blob>;

  // Actions - Filters
  setFilters: (filters: Partial<QuoteFilters>) => void;
  clearFilters: () => void;

  // Actions - Utility
  clearError: () => void;
  resetStore: () => void;
}

const initialFilters: QuoteFilters = {
  status: [],
  type: [],
  customer: '',
  assignedTo: [],
  dateRange: {
    start: '',
    end: ''
  },
  amountRange: [0, 1000000],
  tags: [],
  search: ''
};

const initialBuilder: QuoteBuilder = {
  quote: null,
  isDirty: false,
  isValid: true,
  validationErrors: [],
  autoSaveEnabled: false
};

export const useQuoteStore = create<QuoteStore>()(
  devtools(
    subscribeWithSelector(
      (set, get) => {
        let autoSaveInterval: NodeJS.Timeout | null = null;

        return {
          // Initial state
          quotes: [],
          currentQuote: null,
          selectedQuotes: [],
          quoteTotals: null,
          documentTemplates: [],

          // Builder state
          builder: initialBuilder,

          // Loading states
          loading: false,
          builderLoading: false,
          calculationLoading: false,
          generationLoading: false,

          // Error states
          error: null,

          // Pagination
          currentPage: 1,
          pageSize: 20,
          totalPages: 0,
          totalItems: 0,

          // Filters
          filters: initialFilters,

          // Quote Management Actions
          loadQuotes: async (filters?: Partial<QuoteFilters>) => {
            set({ loading: true, error: null });

            try {
              const state = get();
              const currentFilters = filters ? { ...state.filters, ...filters } : state.filters;

              const params = {
                page: state.currentPage,
                limit: state.pageSize,
                ...(currentFilters.status.length && { status: currentFilters.status }),
                ...(currentFilters.customer && { customer: currentFilters.customer }),
                ...(currentFilters.assignedTo.length && { assignedTo: currentFilters.assignedTo[0] }),
                ...(currentFilters.dateRange.start && { dateFrom: currentFilters.dateRange.start }),
                ...(currentFilters.dateRange.end && { dateTo: currentFilters.dateRange.end }),
                ...(currentFilters.search && { search: currentFilters.search })
              };

              const response = await quoteService.getQuotes(params);

              set({
                quotes: response.data,
                currentPage: response.pagination.page,
                totalPages: response.pagination.totalPages,
                totalItems: response.pagination.total,
                filters: currentFilters,
                loading: false
              });
            } catch (error) {
              set({
                error: error instanceof Error ? error.message : 'Failed to load quotes',
                loading: false
              });
            }
          },

          loadQuote: async (id: number) => {
            set({ loading: true, error: null });

            try {
              const quote = await quoteService.getQuote(id);
              set({ currentQuote: quote, loading: false });

              // Calculate totals for the loaded quote
              await get().calculateTotals(id);
            } catch (error) {
              set({
                error: error instanceof Error ? error.message : 'Failed to load quote',
                loading: false
              });
            }
          },

          createQuote: async (quoteData: CreateDto<Quote>) => {
            set({ loading: true, error: null });

            try {
              const newQuote = await quoteService.createQuote(quoteData);
              const state = get();

              set({
                quotes: [newQuote, ...state.quotes],
                totalItems: state.totalItems + 1,
                loading: false
              });

              return newQuote;
            } catch (error) {
              set({
                error: error instanceof Error ? error.message : 'Failed to create quote',
                loading: false
              });
              throw error;
            }
          },

          updateQuote: async (id: number, updates: UpdateDto<Quote>) => {
            set({ loading: true, error: null });

            try {
              const updatedQuote = await quoteService.updateQuote(id, updates);
              const state = get();

              set({
                quotes: state.quotes.map(q => q.id === id ? updatedQuote : q),
                currentQuote: state.currentQuote?.id === id ? updatedQuote : state.currentQuote,
                loading: false
              });

              // Update builder if it's the same quote
              if (state.builder.quote?.id === id) {
                set({
                  builder: {
                    ...state.builder,
                    quote: updatedQuote,
                    isDirty: false,
                    lastSaved: new Date().toISOString()
                  }
                });
              }
            } catch (error) {
              set({
                error: error instanceof Error ? error.message : 'Failed to update quote',
                loading: false
              });
              throw error;
            }
          },

          deleteQuote: async (id: number) => {
            set({ loading: true, error: null });

            try {
              await quoteService.deleteQuote(id);
              const state = get();

              set({
                quotes: state.quotes.filter(q => q.id !== id),
                selectedQuotes: state.selectedQuotes.filter(qid => qid !== id),
                totalItems: state.totalItems - 1,
                currentQuote: state.currentQuote?.id === id ? null : state.currentQuote,
                loading: false
              });

              // Clear builder if it was for this quote
              if (state.builder.quote?.id === id) {
                get().destroyBuilder();
              }
            } catch (error) {
              set({
                error: error instanceof Error ? error.message : 'Failed to delete quote',
                loading: false
              });
              throw error;
            }
          },

          duplicateQuote: async (id: number, options?: any) => {
            set({ loading: true, error: null });

            try {
              const newQuote = await quoteService.duplicateQuote(id, options);
              const state = get();

              set({
                quotes: [newQuote, ...state.quotes],
                totalItems: state.totalItems + 1,
                loading: false
              });

              return newQuote;
            } catch (error) {
              set({
                error: error instanceof Error ? error.message : 'Failed to duplicate quote',
                loading: false
              });
              throw error;
            }
          },

          // Quote Versions Actions
          createQuoteVersion: async (id: number, versionData?: any) => {
            set({ loading: true, error: null });

            try {
              const newVersion = await quoteService.createQuoteVersion(id, versionData);
              const state = get();

              // Add the new version to quotes list
              set({
                quotes: [newVersion, ...state.quotes],
                totalItems: state.totalItems + 1,
                loading: false
              });

              return newVersion;
            } catch (error) {
              set({
                error: error instanceof Error ? error.message : 'Failed to create quote version',
                loading: false
              });
              throw error;
            }
          },

          getQuoteVersions: async (id: number) => {
            set({ loading: true, error: null });

            try {
              const versions = await quoteService.getQuoteVersions(id);
              set({ loading: false });
              return versions;
            } catch (error) {
              set({
                error: error instanceof Error ? error.message : 'Failed to load quote versions',
                loading: false
              });
              throw error;
            }
          },

          // Line Items Actions
          addLineItem: async (quoteId: number, item: CreateLineItemDto) => {
            set({ loading: true, error: null });

            try {
              await quoteService.addLineItem(quoteId, item);

              // Reload quote to get updated line items
              await get().loadQuote(quoteId);

              // Recalculate totals
              await get().calculateTotals(quoteId);
            } catch (error) {
              set({
                error: error instanceof Error ? error.message : 'Failed to add line item',
                loading: false
              });
              throw error;
            }
          },

          updateLineItem: async (quoteId: number, itemId: number, updates: Partial<QuoteLineItem>) => {
            set({ loading: true, error: null });

            try {
              await quoteService.updateLineItem(quoteId, itemId, updates);

              // Reload quote to get updated line items
              await get().loadQuote(quoteId);

              // Recalculate totals
              await get().calculateTotals(quoteId);
            } catch (error) {
              set({
                error: error instanceof Error ? error.message : 'Failed to update line item',
                loading: false
              });
              throw error;
            }
          },

          removeLineItem: async (quoteId: number, itemId: number) => {
            set({ loading: true, error: null });

            try {
              await quoteService.removeLineItem(quoteId, itemId);

              // Reload quote to get updated line items
              await get().loadQuote(quoteId);

              // Recalculate totals
              await get().calculateTotals(quoteId);
            } catch (error) {
              set({
                error: error instanceof Error ? error.message : 'Failed to remove line item',
                loading: false
              });
              throw error;
            }
          },

          reorderLineItems: async (quoteId: number, itemOrders: Array<{ id: number; sortOrder: number }>) => {
            set({ loading: true, error: null });

            try {
              await quoteService.reorderLineItems(quoteId, itemOrders);

              // Reload quote to get updated order
              await get().loadQuote(quoteId);
            } catch (error) {
              set({
                error: error instanceof Error ? error.message : 'Failed to reorder line items',
                loading: false
              });
              throw error;
            }
          },

          // Sections Actions
          addSection: async (quoteId: number, section: Omit<QuoteSection, 'id' | 'quoteId'>) => {
            set({ loading: true, error: null });

            try {
              await quoteService.addSection(quoteId, section);
              await get().loadQuote(quoteId); // Reload to get updated sections
            } catch (error) {
              set({
                error: error instanceof Error ? error.message : 'Failed to add section',
                loading: false
              });
              throw error;
            }
          },

          updateSection: async (quoteId: number, sectionId: number, updates: Partial<QuoteSection>) => {
            set({ loading: true, error: null });

            try {
              await quoteService.updateSection(quoteId, sectionId, updates);
              await get().loadQuote(quoteId); // Reload to get updated sections
            } catch (error) {
              set({
                error: error instanceof Error ? error.message : 'Failed to update section',
                loading: false
              });
              throw error;
            }
          },

          removeSection: async (quoteId: number, sectionId: number) => {
            set({ loading: true, error: null });

            try {
              await quoteService.removeSection(quoteId, sectionId);
              await get().loadQuote(quoteId); // Reload to get updated sections
            } catch (error) {
              set({
                error: error instanceof Error ? error.message : 'Failed to remove section',
                loading: false
              });
              throw error;
            }
          },

          // Calculations Actions
          calculateTotals: async (quoteId: number) => {
            set({ calculationLoading: true, error: null });

            try {
              const totals = await quoteService.calculateTotals(quoteId);
              set({ quoteTotals: totals, calculationLoading: false });

              // Update the quote in the list with new totals
              const state = get();
              if (state.currentQuote?.id === quoteId) {
                set({
                  currentQuote: {
                    ...state.currentQuote,
                    subtotal: totals.subtotal,
                    totalDiscount: totals.totalDiscount,
                    totalTax: totals.totalTax,
                    total: totals.total,
                    margin: totals.margin
                  }
                });
              }
            } catch (error) {
              set({
                error: error instanceof Error ? error.message : 'Failed to calculate totals',
                calculationLoading: false
              });
            }
          },

          recalculateAllTotals: async () => {
            const state = get();
            const promises = state.quotes.map(quote => get().calculateTotals(quote.id));

            try {
              await Promise.all(promises);
            } catch (error) {
              set({
                error: error instanceof Error ? error.message : 'Failed to recalculate all totals'
              });
            }
          },

          // Builder Actions
          initializeBuilder: async (quoteId?: number) => {
            set({ builderLoading: true, error: null });

            try {
              let quote: Quote | null = null;

              if (quoteId) {
                quote = await quoteService.getQuote(quoteId);
              } else {
                // Create a new quote template
                quote = {
                  id: 0, // Temporary ID for new quote
                  companyId: 0, // Will be set from context
                  quoteNumber: '',
                  version: 1,
                  status: 'draft',
                  type: 'standard',
                  title: '',
                  currencyCode: 'USD',
                  exchangeRate: 1,
                  lineItems: [],
                  sections: [],
                  subtotal: 0,
                  totalDiscount: 0,
                  totalTax: 0,
                  total: 0,
                  validFrom: new Date().toISOString(),
                  validTo: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                  approvalStatus: 'not_required',
                  createdBy: 0 // Will be set from context
                } as Quote;
              }

              set({
                builder: {
                  quote,
                  isDirty: false,
                  isValid: true,
                  validationErrors: [],
                  autoSaveEnabled: false
                },
                builderLoading: false
              });

              // Enable auto-save by default for existing quotes
              if (quoteId) {
                get().enableAutoSave();
              }
            } catch (error) {
              set({
                error: error instanceof Error ? error.message : 'Failed to initialize builder',
                builderLoading: false
              });
            }
          },

          destroyBuilder: () => {
            const state = get();

            // Disable auto-save
            if (autoSaveInterval) {
              clearInterval(autoSaveInterval);
              autoSaveInterval = null;
            }

            set({ builder: initialBuilder });
          },

          updateBuilderQuote: (updates: Partial<Quote>) => {
            const state = get();
            if (!state.builder.quote) return;

            const updatedQuote = { ...state.builder.quote, ...updates };

            set({
              builder: {
                ...state.builder,
                quote: updatedQuote,
                isDirty: true,
                isValid: get().validateBuilder()
              }
            });
          },

          addBuilderLineItem: async (item: CreateLineItemDto) => {
            const state = get();
            if (!state.builder.quote) return;

            // If quote exists, add via API
            if (state.builder.quote.id > 0) {
              await get().addLineItem(state.builder.quote.id, item);
            } else {
              // For new quotes, add locally
              const newItem: QuoteLineItem = {
                id: Date.now(), // Temporary ID
                quoteId: 0,
                name: item.name,
                description: item.description,
                sku: item.sku || '',
                quantity: item.quantity,
                unitPrice: item.unitPrice || 0,
                discount: item.discount || 0,
                discountType: item.discountType || 'percentage',
                subtotal: (item.unitPrice || 0) * item.quantity,
                sortOrder: state.builder.quote.lineItems.length + 1,
                isOptional: item.isOptional || false,
                appliedRules: [],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              };

              const updatedQuote = {
                ...state.builder.quote,
                lineItems: [...state.builder.quote.lineItems, newItem]
              };

              set({
                builder: {
                  ...state.builder,
                  quote: updatedQuote,
                  isDirty: true
                }
              });
            }
          },

          updateBuilderLineItem: (itemId: number, updates: Partial<QuoteLineItem>) => {
            const state = get();
            if (!state.builder.quote) return;

            const updatedLineItems = state.builder.quote.lineItems.map(item =>
              item.id === itemId ? { ...item, ...updates } : item
            );

            const updatedQuote = {
              ...state.builder.quote,
              lineItems: updatedLineItems
            };

            set({
              builder: {
                ...state.builder,
                quote: updatedQuote,
                isDirty: true
              }
            });
          },

          removeBuilderLineItem: (itemId: number) => {
            const state = get();
            if (!state.builder.quote) return;

            const updatedLineItems = state.builder.quote.lineItems.filter(item => item.id !== itemId);
            const updatedQuote = {
              ...state.builder.quote,
              lineItems: updatedLineItems
            };

            set({
              builder: {
                ...state.builder,
                quote: updatedQuote,
                isDirty: true
              }
            });
          },

          validateBuilder: () => {
            const state = get();
            if (!state.builder.quote) return false;

            const errors: ValidationError[] = [];
            const quote = state.builder.quote;

            // Basic validation
            if (!quote.title.trim()) {
              errors.push({
                field: 'title',
                message: 'Quote title is required',
                severity: 'error'
              });
            }

            if (!quote.customerId && !quote.accountId) {
              errors.push({
                field: 'customer',
                message: 'Customer or account is required',
                severity: 'error'
              });
            }

            if (quote.lineItems.length === 0) {
              errors.push({
                field: 'lineItems',
                message: 'At least one line item is required',
                severity: 'warning'
              });
            }

            // Update validation errors
            set({
              builder: {
                ...state.builder,
                validationErrors: errors,
                isValid: errors.filter(e => e.severity === 'error').length === 0
              }
            });

            return errors.filter(e => e.severity === 'error').length === 0;
          },

          saveBuilderQuote: async () => {
            const state = get();
            if (!state.builder.quote || !state.builder.isDirty) return;

            if (!get().validateBuilder()) {
              throw new Error('Quote validation failed');
            }

            set({ loading: true, error: null });

            try {
              let savedQuote: Quote;

              if (state.builder.quote.id > 0) {
                // Update existing quote
                await get().updateQuote(state.builder.quote.id, state.builder.quote);
                savedQuote = state.builder.quote;
              } else {
                // Create new quote
                savedQuote = await get().createQuote(state.builder.quote);
              }

              set({
                builder: {
                  ...state.builder,
                  quote: savedQuote,
                  isDirty: false,
                  lastSaved: new Date().toISOString()
                },
                loading: false
              });
            } catch (error) {
              set({
                error: error instanceof Error ? error.message : 'Failed to save quote',
                loading: false
              });
              throw error;
            }
          },

          enableAutoSave: (interval: number = 30000) => { // 30 seconds default
            const state = get();
            if (state.builder.autoSaveEnabled) return;

            set({
              builder: {
                ...state.builder,
                autoSaveEnabled: true
              }
            });

            autoSaveInterval = setInterval(() => {
              const currentState = get();
              if (currentState.builder.isDirty && currentState.builder.isValid) {
                get().saveBuilderQuote().catch(console.error);
              }
            }, interval);
          },

          disableAutoSave: () => {
            if (autoSaveInterval) {
              clearInterval(autoSaveInterval);
              autoSaveInterval = null;
            }

            const state = get();
            set({
              builder: {
                ...state.builder,
                autoSaveEnabled: false
              }
            });
          },

          // Workflow Actions
          submitForApproval: async (quoteId: number, comments?: string) => {
            set({ loading: true, error: null });

            try {
              await quoteService.submitForApproval(quoteId, comments);

              // Update quote status
              const state = get();
              set({
                quotes: state.quotes.map(q =>
                  q.id === quoteId ? { ...q, status: 'pending_approval', approvalStatus: 'pending' } : q
                ),
                currentQuote: state.currentQuote?.id === quoteId
                  ? { ...state.currentQuote, status: 'pending_approval', approvalStatus: 'pending' }
                  : state.currentQuote,
                loading: false
              });
            } catch (error) {
              set({
                error: error instanceof Error ? error.message : 'Failed to submit for approval',
                loading: false
              });
              throw error;
            }
          },

          convertToOrder: async (quoteId: number) => {
            set({ loading: true, error: null });

            try {
              const result = await quoteService.convertToOrder(quoteId);

              // Update quote status
              const state = get();
              set({
                quotes: state.quotes.map(q =>
                  q.id === quoteId ? { ...q, status: 'converted', convertedOrderId: result.orderId } : q
                ),
                currentQuote: state.currentQuote?.id === quoteId
                  ? { ...state.currentQuote, status: 'converted', convertedOrderId: result.orderId }
                  : state.currentQuote,
                loading: false
              });

              return result;
            } catch (error) {
              set({
                error: error instanceof Error ? error.message : 'Failed to convert to order',
                loading: false
              });
              throw error;
            }
          },

          // Document Actions
          loadDocumentTemplates: async () => {
            set({ loading: true, error: null });

            try {
              const templates = await quoteService.getDocumentTemplates('quote');
              set({ documentTemplates: templates, loading: false });
            } catch (error) {
              set({
                error: error instanceof Error ? error.message : 'Failed to load document templates',
                loading: false
              });
            }
          },

          generateDocument: async (quoteId: number, request: DocumentGenerationRequest) => {
            set({ generationLoading: true, error: null });

            try {
              const result = await quoteService.generateDocument(quoteId, request);
              set({ generationLoading: false });
              return result;
            } catch (error) {
              set({
                error: error instanceof Error ? error.message : 'Failed to generate document',
                generationLoading: false
              });
              throw error;
            }
          },

          sendQuoteEmail: async (quoteId: number, emailData: any) => {
            set({ loading: true, error: null });

            try {
              await quoteService.sendQuoteEmail(quoteId, emailData);
              set({ loading: false });
            } catch (error) {
              set({
                error: error instanceof Error ? error.message : 'Failed to send quote email',
                loading: false
              });
              throw error;
            }
          },

          // Bulk Operations
          selectQuote: (id: number) => {
            const state = get();
            const isSelected = state.selectedQuotes.includes(id);

            set({
              selectedQuotes: isSelected
                ? state.selectedQuotes.filter(qid => qid !== id)
                : [...state.selectedQuotes, id]
            });
          },

          selectAllQuotes: () => {
            const state = get();
            const allIds = state.quotes.map(q => q.id);

            set({
              selectedQuotes: state.selectedQuotes.length === allIds.length ? [] : allIds
            });
          },

          clearSelection: () => set({ selectedQuotes: [] }),

          bulkUpdateQuotes: async (updates: Array<{ id: number; data: Partial<Quote> }>) => {
            set({ loading: true, error: null });

            try {
              await quoteService.bulkUpdateQuotes(updates);
              await get().loadQuotes(); // Reload to get updated data
            } catch (error) {
              set({
                error: error instanceof Error ? error.message : 'Failed to update quotes',
                loading: false
              });
              throw error;
            }
          },

          bulkDeleteQuotes: async (ids: number[]) => {
            set({ loading: true, error: null });

            try {
              // Delete each quote individually (API might not have bulk delete)
              await Promise.all(ids.map(id => quoteService.deleteQuote(id)));

              const state = get();
              set({
                quotes: state.quotes.filter(q => !ids.includes(q.id)),
                selectedQuotes: [],
                totalItems: state.totalItems - ids.length,
                loading: false
              });
            } catch (error) {
              set({
                error: error instanceof Error ? error.message : 'Failed to delete quotes',
                loading: false
              });
              throw error;
            }
          },

          exportQuotes: async (params: any) => {
            set({ loading: true, error: null });

            try {
              const blob = await quoteService.exportQuotes(params);
              set({ loading: false });
              return blob;
            } catch (error) {
              set({
                error: error instanceof Error ? error.message : 'Export failed',
                loading: false
              });
              throw error;
            }
          },

          // Filter Actions
          setFilters: (newFilters: Partial<QuoteFilters>) => {
            const state = get();
            const updatedFilters = { ...state.filters, ...newFilters };

            set({ filters: updatedFilters, currentPage: 1 });
            get().loadQuotes(updatedFilters);
          },

          clearFilters: () => {
            set({ filters: initialFilters, currentPage: 1 });
            get().loadQuotes(initialFilters);
          },

          // Utility Actions
          clearError: () => set({ error: null }),

          resetStore: () => {
            // Cleanup auto-save
            if (autoSaveInterval) {
              clearInterval(autoSaveInterval);
              autoSaveInterval = null;
            }

            set({
              quotes: [],
              currentQuote: null,
              selectedQuotes: [],
              quoteTotals: null,
              documentTemplates: [],
              builder: initialBuilder,
              loading: false,
              builderLoading: false,
              calculationLoading: false,
              generationLoading: false,
              error: null,
              currentPage: 1,
              pageSize: 20,
              totalPages: 0,
              totalItems: 0,
              filters: initialFilters
            });
          }
        };
      }
    ),
    { name: 'QuoteStore' }
  )
);