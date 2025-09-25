// Workflow Templates - Predefined workflow templates
import {
  ApprovalWorkflow,
  ApprovalStep,
  ApprovalApprover,
  WorkflowCondition,
  EscalationRule
} from '../../shared/types';

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: 'quotes' | 'orders' | 'contracts' | 'discounts' | 'general';
  difficulty: 'simple' | 'intermediate' | 'advanced';
  estimatedSetupTime: number; // in minutes
  tags: string[];
  workflow: Omit<ApprovalWorkflow, 'id' | 'companyId' | 'createdAt' | 'updatedAt' | 'createdBy'>;
}

// Basic Quote Approval Template
export const basicQuoteApprovalTemplate: WorkflowTemplate = {
  id: 'basic-quote-approval',
  name: 'Basic Quote Approval',
  description: 'Simple single-step approval workflow for standard quotes',
  category: 'quotes',
  difficulty: 'simple',
  estimatedSetupTime: 5,
  tags: ['quote', 'basic', 'single-step'],
  workflow: {
    name: 'Basic Quote Approval',
    description: 'Single-step approval for quotes under $10,000',
    type: 'sequential',
    triggerEvent: 'quote_created',
    conditions: [
      {
        id: 1,
        field: 'amount',
        operator: 'less_than',
        value: 10000
      }
    ],
    steps: [
      {
        id: 1,
        workflowId: 0,
        name: 'Manager Approval',
        description: 'Requires approval from direct manager',
        stepNumber: 1,
        type: 'single',
        approvers: [
          {
            id: 1,
            stepId: 1,
            type: 'manager',
            isRequired: true,
            canDelegate: true
          }
        ],
        isRequired: true,
        timeoutHours: 24,
        escalationRules: [
          {
            id: 1,
            stepId: 1,
            triggerAfterHours: 24,
            action: 'escalate',
            notificationTemplate: 'Approval request overdue - escalating to senior manager'
          }
        ]
      }
    ],
    isActive: true,
    isDefault: false,
    priority: 1
  }
};

// High-Value Quote Approval Template
export const highValueQuoteApprovalTemplate: WorkflowTemplate = {
  id: 'high-value-quote-approval',
  name: 'High-Value Quote Approval',
  description: 'Multi-step approval workflow for high-value quotes',
  category: 'quotes',
  difficulty: 'intermediate',
  estimatedSetupTime: 15,
  tags: ['quote', 'high-value', 'multi-step'],
  workflow: {
    name: 'High-Value Quote Approval',
    description: 'Multi-step approval for quotes over $50,000',
    type: 'sequential',
    triggerEvent: 'quote_created',
    conditions: [
      {
        id: 1,
        field: 'amount',
        operator: 'greater_equal',
        value: 50000
      }
    ],
    steps: [
      {
        id: 1,
        workflowId: 0,
        name: 'Manager Review',
        description: 'Initial review by direct manager',
        stepNumber: 1,
        type: 'single',
        approvers: [
          {
            id: 1,
            stepId: 1,
            type: 'manager',
            isRequired: true,
            canDelegate: true
          }
        ],
        isRequired: true,
        timeoutHours: 12,
        escalationRules: [
          {
            id: 1,
            stepId: 1,
            triggerAfterHours: 12,
            action: 'notify',
            notificationTemplate: 'Manager approval overdue for high-value quote'
          }
        ]
      },
      {
        id: 2,
        workflowId: 0,
        name: 'Finance Review',
        description: 'Financial analysis and approval',
        stepNumber: 2,
        type: 'single',
        approvers: [
          {
            id: 2,
            stepId: 2,
            type: 'role',
            roleId: 1, // Finance Manager role
            isRequired: true,
            canDelegate: false
          }
        ],
        isRequired: true,
        timeoutHours: 24,
        escalationRules: [
          {
            id: 2,
            stepId: 2,
            triggerAfterHours: 24,
            action: 'escalate',
            targetRoleId: 2 // CFO role
          }
        ]
      },
      {
        id: 3,
        workflowId: 0,
        name: 'Executive Approval',
        description: 'Final executive approval',
        stepNumber: 3,
        type: 'single',
        approvers: [
          {
            id: 3,
            stepId: 3,
            type: 'role',
            roleId: 3, // Executive role
            isRequired: true,
            canDelegate: false
          }
        ],
        isRequired: true,
        timeoutHours: 48,
        escalationRules: [
          {
            id: 3,
            stepId: 3,
            triggerAfterHours: 48,
            action: 'notify',
            notificationTemplate: 'Executive approval required for high-value quote'
          }
        ]
      }
    ],
    isActive: true,
    isDefault: false,
    priority: 2
  }
};

// Discount Approval Template
export const discountApprovalTemplate: WorkflowTemplate = {
  id: 'discount-approval',
  name: 'Discount Approval Workflow',
  description: 'Tiered approval workflow based on discount percentage',
  category: 'discounts',
  difficulty: 'intermediate',
  estimatedSetupTime: 20,
  tags: ['discount', 'tiered', 'conditional'],
  workflow: {
    name: 'Discount Approval Workflow',
    description: 'Approval workflow based on discount thresholds',
    type: 'conditional',
    triggerEvent: 'discount_threshold',
    conditions: [
      {
        id: 1,
        field: 'discount',
        operator: 'greater_than',
        value: 10
      }
    ],
    steps: [
      {
        id: 1,
        workflowId: 0,
        name: 'Sales Manager Approval (10-20%)',
        description: 'Sales manager approval for moderate discounts',
        stepNumber: 1,
        type: 'single',
        approvers: [
          {
            id: 1,
            stepId: 1,
            type: 'role',
            roleId: 4, // Sales Manager role
            isRequired: true,
            canDelegate: true
          }
        ],
        isRequired: true,
        timeoutHours: 8,
        conditions: [
          {
            id: 1,
            field: 'discount',
            operator: 'less_equal',
            value: 20,
            skipStep: false
          }
        ]
      },
      {
        id: 2,
        workflowId: 0,
        name: 'Regional Director Approval (20-30%)',
        description: 'Regional director approval for high discounts',
        stepNumber: 2,
        type: 'single',
        approvers: [
          {
            id: 2,
            stepId: 2,
            type: 'role',
            roleId: 5, // Regional Director role
            isRequired: true,
            canDelegate: false
          }
        ],
        isRequired: true,
        timeoutHours: 12,
        conditions: [
          {
            id: 2,
            field: 'discount',
            operator: 'greater_than',
            value: 20,
            skipStep: false
          },
          {
            id: 3,
            field: 'discount',
            operator: 'less_equal',
            value: 30,
            skipStep: false
          }
        ]
      },
      {
        id: 3,
        workflowId: 0,
        name: 'VP Approval (30%+)',
        description: 'VP approval for exceptional discounts',
        stepNumber: 3,
        type: 'single',
        approvers: [
          {
            id: 3,
            stepId: 3,
            type: 'role',
            roleId: 6, // VP Sales role
            isRequired: true,
            canDelegate: false
          }
        ],
        isRequired: true,
        timeoutHours: 24,
        conditions: [
          {
            id: 4,
            field: 'discount',
            operator: 'greater_than',
            value: 30,
            skipStep: false
          }
        ]
      }
    ],
    isActive: true,
    isDefault: true,
    priority: 3
  }
};

// Contract Approval Template
export const contractApprovalTemplate: WorkflowTemplate = {
  id: 'contract-approval',
  name: 'Contract Approval Workflow',
  description: 'Comprehensive approval workflow for contracts',
  category: 'contracts',
  difficulty: 'advanced',
  estimatedSetupTime: 30,
  tags: ['contract', 'legal', 'comprehensive'],
  workflow: {
    name: 'Contract Approval Workflow',
    description: 'Multi-stakeholder approval for contracts',
    type: 'parallel',
    triggerEvent: 'manual',
    conditions: [],
    steps: [
      {
        id: 1,
        workflowId: 0,
        name: 'Legal Review',
        description: 'Legal team review of contract terms',
        stepNumber: 1,
        type: 'single',
        approvers: [
          {
            id: 1,
            stepId: 1,
            type: 'role',
            roleId: 7, // Legal Counsel role
            isRequired: true,
            canDelegate: false
          }
        ],
        isRequired: true,
        timeoutHours: 72,
        actions: [
          {
            id: 1,
            type: 'email',
            configuration: {
              template: 'contract_legal_review',
              recipients: ['legal@company.com']
            },
            executeOn: 'step_start'
          }
        ]
      },
      {
        id: 2,
        workflowId: 0,
        name: 'Finance Review',
        description: 'Financial terms and impact review',
        stepNumber: 2,
        type: 'single',
        approvers: [
          {
            id: 2,
            stepId: 2,
            type: 'role',
            roleId: 1, // Finance Manager role
            isRequired: true,
            canDelegate: true
          }
        ],
        isRequired: true,
        timeoutHours: 48,
        actions: [
          {
            id: 2,
            type: 'webhook',
            configuration: {
              url: '/api/finance/contract-review',
              method: 'POST'
            },
            executeOn: 'step_start'
          }
        ]
      },
      {
        id: 3,
        workflowId: 0,
        name: 'Executive Approval',
        description: 'Final executive sign-off',
        stepNumber: 3,
        type: 'consensus',
        approvers: [
          {
            id: 3,
            stepId: 3,
            type: 'role',
            roleId: 3, // Executive role
            isRequired: true,
            canDelegate: false,
            weight: 1
          },
          {
            id: 4,
            stepId: 3,
            type: 'role',
            roleId: 2, // CFO role
            isRequired: true,
            canDelegate: false,
            weight: 1
          }
        ],
        isRequired: true,
        timeoutHours: 96,
        escalationRules: [
          {
            id: 3,
            stepId: 3,
            triggerAfterHours: 96,
            action: 'notify',
            targetRoleId: 8, // CEO role
            notificationTemplate: 'Contract approval escalated to CEO'
          }
        ]
      }
    ],
    isActive: true,
    isDefault: false,
    priority: 4
  }
};

// Emergency Approval Template
export const emergencyApprovalTemplate: WorkflowTemplate = {
  id: 'emergency-approval',
  name: 'Emergency Approval',
  description: 'Fast-track approval for urgent requests',
  category: 'general',
  difficulty: 'simple',
  estimatedSetupTime: 5,
  tags: ['emergency', 'urgent', 'fast-track'],
  workflow: {
    name: 'Emergency Approval',
    description: 'Fast-track approval for urgent business needs',
    type: 'parallel',
    triggerEvent: 'manual',
    conditions: [
      {
        id: 1,
        field: 'priority',
        operator: 'equals',
        value: 'urgent'
      }
    ],
    steps: [
      {
        id: 1,
        workflowId: 0,
        name: 'Emergency Approval',
        description: 'Any available executive can approve',
        stepNumber: 1,
        type: 'any_one',
        approvers: [
          {
            id: 1,
            stepId: 1,
            type: 'role',
            roleId: 3, // Executive
            isRequired: false,
            canDelegate: false
          },
          {
            id: 2,
            stepId: 1,
            type: 'role',
            roleId: 2, // CFO
            isRequired: false,
            canDelegate: false
          },
          {
            id: 3,
            stepId: 1,
            type: 'role',
            roleId: 8, // CEO
            isRequired: false,
            canDelegate: false
          }
        ],
        isRequired: true,
        timeoutHours: 2,
        actions: [
          {
            id: 1,
            type: 'slack',
            configuration: {
              channel: '#emergency-approvals',
              message: 'Emergency approval request requires immediate attention'
            },
            executeOn: 'step_start'
          }
        ],
        escalationRules: [
          {
            id: 1,
            stepId: 1,
            triggerAfterHours: 2,
            action: 'auto_approve',
            notificationTemplate: 'Emergency approval auto-approved due to timeout'
          }
        ]
      }
    ],
    isActive: true,
    isDefault: false,
    priority: 10
  }
};

// All available templates
export const workflowTemplates: WorkflowTemplate[] = [
  basicQuoteApprovalTemplate,
  highValueQuoteApprovalTemplate,
  discountApprovalTemplate,
  contractApprovalTemplate,
  emergencyApprovalTemplate
];

// Template categories
export const templateCategories = [
  { id: 'quotes', name: 'Quote Approvals', description: 'Templates for quote approval workflows' },
  { id: 'orders', name: 'Order Processing', description: 'Templates for order approval workflows' },
  { id: 'contracts', name: 'Contract Management', description: 'Templates for contract approval workflows' },
  { id: 'discounts', name: 'Discount Approvals', description: 'Templates for discount approval workflows' },
  { id: 'general', name: 'General Purpose', description: 'General-purpose approval templates' }
];

// Helper functions
export const getTemplatesByCategory = (category: string): WorkflowTemplate[] => {
  return workflowTemplates.filter(template => template.category === category);
};

export const getTemplatesByDifficulty = (difficulty: string): WorkflowTemplate[] => {
  return workflowTemplates.filter(template => template.difficulty === difficulty);
};

export const getTemplatesByTag = (tag: string): WorkflowTemplate[] => {
  return workflowTemplates.filter(template => template.tags.includes(tag));
};

export const searchTemplates = (query: string): WorkflowTemplate[] => {
  const lowerQuery = query.toLowerCase();
  return workflowTemplates.filter(template =>
    template.name.toLowerCase().includes(lowerQuery) ||
    template.description.toLowerCase().includes(lowerQuery) ||
    template.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
  );
};

export const getRecommendedTemplates = (entityType: string, amount?: number, discount?: number): WorkflowTemplate[] => {
  const recommendations: WorkflowTemplate[] = [];

  if (entityType === 'quote') {
    if (amount && amount > 50000) {
      recommendations.push(highValueQuoteApprovalTemplate);
    } else {
      recommendations.push(basicQuoteApprovalTemplate);
    }

    if (discount && discount > 10) {
      recommendations.push(discountApprovalTemplate);
    }
  }

  if (entityType === 'contract') {
    recommendations.push(contractApprovalTemplate);
  }

  return recommendations;
};