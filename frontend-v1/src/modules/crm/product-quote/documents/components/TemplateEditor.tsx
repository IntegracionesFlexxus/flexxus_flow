// Template Editor Component - Sprint 19 Frontend Implementation

import React, { useState, useEffect, useCallback } from 'react';
import {
  Save,
  Eye,
  Undo,
  Redo,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  Image,
  Link,
  Table,
  Type,
  Palette,
  Settings,
  Code,
  FileText,
  Tag,
  Plus,
  X,
  Copy,
  Monitor,
  Smartphone,
  Tablet
} from 'lucide-react';

// TipTap Editor imports
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Image as TiptapImage } from '@tiptap/extension-image';
import { Link as TiptapLink } from '@tiptap/extension-link';
import { Table as TiptapTable } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import TextAlign from '@tiptap/extension-text-align';
import Color from '@tiptap/extension-color';
import TextStyle from '@tiptap/extension-text-style';
import Highlight from '@tiptap/extension-highlight';

// Local imports
import { TemplateVariablesManager } from './TemplateVariablesManager';
import { useTemplateEditor } from '../hooks/useTemplateEditor';

interface TemplateEditorProps {
  templateId?: number | null;
  onSave?: (data: any) => void;
  onCancel?: () => void;
}

interface TemplateData {
  id?: number;
  name: string;
  description: string;
  category: string;
  language: string;
  content: string;
  variables: TemplateVariable[];
  styles: {
    fonts: {
      heading: string;
      body: string;
    };
    colors: {
      primary: string;
      secondary: string;
      text: string;
    };
    layout: {
      margin: string;
      spacing: string;
    };
  };
  settings: {
    pageSize: string;
    orientation: string;
    headerFooter: boolean;
    watermark: boolean;
  };
}

interface TemplateVariable {
  name: string;
  type: 'text' | 'number' | 'date' | 'currency' | 'image' | 'list';
  label: string;
  description?: string;
  required: boolean;
  defaultValue?: any;
}

type ViewMode = 'desktop' | 'tablet' | 'mobile';

export const TemplateEditor: React.FC<TemplateEditorProps> = ({
  templateId,
  onSave,
  onCancel
}) => {
  // State
  const [templateData, setTemplateData] = useState<TemplateData>({
    name: '',
    description: '',
    category: 'quote',
    language: 'en',
    content: '',
    variables: [],
    styles: {
      fonts: {
        heading: 'Arial',
        body: 'Arial'
      },
      colors: {
        primary: '#3B82F6',
        secondary: '#6B7280',
        text: '#1F2937'
      },
      layout: {
        margin: '20px',
        spacing: '16px'
      }
    },
    settings: {
      pageSize: 'A4',
      orientation: 'portrait',
      headerFooter: true,
      watermark: false
    }
  });

  const [activeTab, setActiveTab] = useState<'content' | 'variables' | 'styles' | 'settings'>('content');
  const [viewMode, setViewMode] = useState<ViewMode>('desktop');
  const [showVariablePanel, setShowVariablePanel] = useState(false);
  const [unsavedChanges, setUnsavedChanges] = useState(false);

  // Hooks
  const {
    currentTemplate,
    isLoading,
    loadTemplate,
    saveTemplate,
    previewTemplate
  } = useTemplateEditor();

  // TipTap Editor
  const editor = useEditor({
    extensions: [
      StarterKit,
      TiptapImage.configure({
        HTMLAttributes: {
          class: 'template-image',
        },
      }),
      TiptapLink.configure({
        HTMLAttributes: {
          class: 'template-link',
        },
      }),
      TiptapTable.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      TextStyle,
      Color.configure({
        types: ['textStyle'],
      }),
      Highlight.configure({
        multicolor: true,
      }),
    ],
    content: templateData.content,
    onUpdate: ({ editor }) => {
      const content = editor.getHTML();
      setTemplateData(prev => ({ ...prev, content }));
      setUnsavedChanges(true);
    },
  });

  // Effects
  useEffect(() => {
    if (templateId) {
      loadTemplate(templateId);
    }
  }, [templateId, loadTemplate]);

  useEffect(() => {
    if (currentTemplate) {
      setTemplateData(currentTemplate);
      editor?.commands.setContent(currentTemplate.content);
    }
  }, [currentTemplate, editor]);

  // Handlers
  const handleSave = async () => {
    try {
      await saveTemplate(templateData);
      setUnsavedChanges(false);
      onSave?.(templateData);
    } catch (error) {
      console.error('Failed to save template:', error);
    }
  };

  const handleInsertVariable = (variable: TemplateVariable) => {
    if (editor) {
      const variableTag = `{{${variable.name}}}`;
      editor.chain().focus().insertContent(variableTag).run();
    }
  };

  const handleAddVariable = () => {
    const newVariable: TemplateVariable = {
      name: `variable_${Date.now()}`,
      type: 'text',
      label: 'New Variable',
      required: false
    };

    setTemplateData(prev => ({
      ...prev,
      variables: [...prev.variables, newVariable]
    }));
    setUnsavedChanges(true);
  };

  const handleUpdateVariable = (index: number, variable: TemplateVariable) => {
    setTemplateData(prev => ({
      ...prev,
      variables: prev.variables.map((v, i) => i === index ? variable : v)
    }));
    setUnsavedChanges(true);
  };

  const handleDeleteVariable = (index: number) => {
    setTemplateData(prev => ({
      ...prev,
      variables: prev.variables.filter((_, i) => i !== index)
    }));
    setUnsavedChanges(true);
  };

  const handleStyleChange = (category: string, property: string, value: string) => {
    setTemplateData(prev => ({
      ...prev,
      styles: {
        ...prev.styles,
        [category]: {
          ...prev.styles[category as keyof typeof prev.styles],
          [property]: value
        }
      }
    }));
    setUnsavedChanges(true);
  };

  const handleSettingChange = (setting: string, value: any) => {
    setTemplateData(prev => ({
      ...prev,
      settings: {
        ...prev.settings,
        [setting]: value
      }
    }));
    setUnsavedChanges(true);
  };

  // Toolbar component
  const EditorToolbar = () => {
    if (!editor) return null;

    const toolbarGroups = [
      {
        label: 'History',
        buttons: [
          {
            icon: Undo,
            action: () => editor.chain().focus().undo().run(),
            active: false,
            disabled: !editor.can().undo()
          },
          {
            icon: Redo,
            action: () => editor.chain().focus().redo().run(),
            active: false,
            disabled: !editor.can().redo()
          }
        ]
      },
      {
        label: 'Format',
        buttons: [
          {
            icon: Bold,
            action: () => editor.chain().focus().toggleBold().run(),
            active: editor.isActive('bold')
          },
          {
            icon: Italic,
            action: () => editor.chain().focus().toggleItalic().run(),
            active: editor.isActive('italic')
          },
          {
            icon: Underline,
            action: () => editor.chain().focus().toggleUnderline().run(),
            active: editor.isActive('underline')
          }
        ]
      },
      {
        label: 'Alignment',
        buttons: [
          {
            icon: AlignLeft,
            action: () => editor.chain().focus().setTextAlign('left').run(),
            active: editor.isActive({ textAlign: 'left' })
          },
          {
            icon: AlignCenter,
            action: () => editor.chain().focus().setTextAlign('center').run(),
            active: editor.isActive({ textAlign: 'center' })
          },
          {
            icon: AlignRight,
            action: () => editor.chain().focus().setTextAlign('right').run(),
            active: editor.isActive({ textAlign: 'right' })
          }
        ]
      },
      {
        label: 'Lists',
        buttons: [
          {
            icon: List,
            action: () => editor.chain().focus().toggleBulletList().run(),
            active: editor.isActive('bulletList')
          },
          {
            icon: ListOrdered,
            action: () => editor.chain().focus().toggleOrderedList().run(),
            active: editor.isActive('orderedList')
          }
        ]
      }
    ];

    return (
      <div className="border-b border-gray-200 p-3 flex items-center gap-1 flex-wrap">
        {toolbarGroups.map((group, groupIndex) => (
          <React.Fragment key={group.label}>
            {group.buttons.map((button, buttonIndex) => {
              const Icon = button.icon;
              return (
                <button
                  key={buttonIndex}
                  onClick={button.action}
                  disabled={button.disabled}
                  className={`
                    p-2 rounded hover:bg-gray-100 transition-colors
                    ${button.active ? 'bg-blue-100 text-blue-600' : 'text-gray-600'}
                    ${button.disabled ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                  title={group.label}
                >
                  <Icon className="w-4 h-4" />
                </button>
              );
            })}
            {groupIndex < toolbarGroups.length - 1 && (
              <div className="w-px h-6 bg-gray-300 mx-2" />
            )}
          </React.Fragment>
        ))}

        <div className="w-px h-6 bg-gray-300 mx-2" />

        {/* Insert Menu */}
        <div className="relative">
          <button
            onClick={() => setShowVariablePanel(!showVariablePanel)}
            className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50"
          >
            <Tag className="w-4 h-4" />
            Variables
          </button>

          {showVariablePanel && (
            <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
              <div className="p-3 border-b border-gray-200">
                <h3 className="font-medium text-gray-900">Insert Variable</h3>
              </div>
              <div className="max-h-48 overflow-y-auto">
                {templateData.variables.map((variable, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      handleInsertVariable(variable);
                      setShowVariablePanel(false);
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center justify-between"
                  >
                    <div>
                      <div className="text-sm font-medium text-gray-900">{variable.label}</div>
                      <div className="text-xs text-gray-500">{`{{ ${variable.name} }}`}</div>
                    </div>
                    <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
                      {variable.type}
                    </span>
                  </button>
                ))}
                {templateData.variables.length === 0 && (
                  <div className="px-3 py-4 text-sm text-gray-500 text-center">
                    No variables defined
                  </div>
                )}
              </div>
              <div className="p-3 border-t border-gray-200">
                <button
                  onClick={() => {
                    setActiveTab('variables');
                    setShowVariablePanel(false);
                  }}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  Manage Variables →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* View Mode Toggle */}
        <div className="ml-auto flex items-center gap-1">
          {[
            { mode: 'desktop' as ViewMode, icon: Monitor },
            { mode: 'tablet' as ViewMode, icon: Tablet },
            { mode: 'mobile' as ViewMode, icon: Smartphone }
          ].map(({ mode, icon: Icon }) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`
                p-2 rounded transition-colors
                ${viewMode === mode ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-100'}
              `}
              title={`${mode} view`}
            >
              <Icon className="w-4 h-4" />
            </button>
          ))}
        </div>
      </div>
    );
  };

  // Variables panel
  const VariablesPanel = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Template Variables</h3>
        <button
          onClick={handleAddVariable}
          className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          Add Variable
        </button>
      </div>

      <div className="space-y-4">
        {templateData.variables.map((variable, index) => (
          <div key={index} className="border border-gray-200 rounded-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Variable Name
                </label>
                <input
                  type="text"
                  value={variable.name}
                  onChange={(e) => handleUpdateVariable(index, { ...variable, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Display Label
                </label>
                <input
                  type="text"
                  value={variable.label}
                  onChange={(e) => handleUpdateVariable(index, { ...variable, label: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type
                </label>
                <select
                  value={variable.type}
                  onChange={(e) => handleUpdateVariable(index, { ...variable, type: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="text">Text</option>
                  <option value="number">Number</option>
                  <option value="date">Date</option>
                  <option value="currency">Currency</option>
                  <option value="image">Image</option>
                  <option value="list">List</option>
                </select>
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={variable.required}
                    onChange={(e) => handleUpdateVariable(index, { ...variable, required: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Required</span>
                </label>

                <button
                  onClick={() => handleDeleteVariable(index)}
                  className="text-red-600 hover:text-red-700"
                  title="Delete Variable"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={variable.description || ''}
                  onChange={(e) => handleUpdateVariable(index, { ...variable, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Optional description for users"
                />
              </div>
            </div>
          </div>
        ))}

        {templateData.variables.length === 0 && (
          <div className="text-center py-8">
            <Tag className="mx-auto w-12 h-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Variables Defined</h3>
            <p className="text-sm text-gray-500 mb-4">
              Add variables to make your template dynamic and reusable.
            </p>
            <button
              onClick={handleAddVariable}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Add Your First Variable
            </button>
          </div>
        )}
      </div>
    </div>
  );

  // Styles panel
  const StylesPanel = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900">Template Styles</h3>

      {/* Fonts */}
      <div className="space-y-4">
        <h4 className="font-medium text-gray-900">Typography</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Heading Font
            </label>
            <select
              value={templateData.styles.fonts.heading}
              onChange={(e) => handleStyleChange('fonts', 'heading', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="Arial">Arial</option>
              <option value="Helvetica">Helvetica</option>
              <option value="Times New Roman">Times New Roman</option>
              <option value="Georgia">Georgia</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Body Font
            </label>
            <select
              value={templateData.styles.fonts.body}
              onChange={(e) => handleStyleChange('fonts', 'body', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="Arial">Arial</option>
              <option value="Helvetica">Helvetica</option>
              <option value="Times New Roman">Times New Roman</option>
              <option value="Georgia">Georgia</option>
            </select>
          </div>
        </div>
      </div>

      {/* Colors */}
      <div className="space-y-4">
        <h4 className="font-medium text-gray-900">Colors</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Primary Color
            </label>
            <input
              type="color"
              value={templateData.styles.colors.primary}
              onChange={(e) => handleStyleChange('colors', 'primary', e.target.value)}
              className="w-full h-10 border border-gray-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Secondary Color
            </label>
            <input
              type="color"
              value={templateData.styles.colors.secondary}
              onChange={(e) => handleStyleChange('colors', 'secondary', e.target.value)}
              className="w-full h-10 border border-gray-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Text Color
            </label>
            <input
              type="color"
              value={templateData.styles.colors.text}
              onChange={(e) => handleStyleChange('colors', 'text', e.target.value)}
              className="w-full h-10 border border-gray-300 rounded-lg"
            />
          </div>
        </div>
      </div>

      {/* Layout */}
      <div className="space-y-4">
        <h4 className="font-medium text-gray-900">Layout</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Page Margin
            </label>
            <select
              value={templateData.styles.layout.margin}
              onChange={(e) => handleStyleChange('layout', 'margin', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="10px">Small (10px)</option>
              <option value="20px">Medium (20px)</option>
              <option value="30px">Large (30px)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Element Spacing
            </label>
            <select
              value={templateData.styles.layout.spacing}
              onChange={(e) => handleStyleChange('layout', 'spacing', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="8px">Tight (8px)</option>
              <option value="16px">Normal (16px)</option>
              <option value="24px">Loose (24px)</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );

  // Settings panel
  const SettingsPanel = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900">Template Settings</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Template Name
          </label>
          <input
            type="text"
            value={templateData.name}
            onChange={(e) => setTemplateData(prev => ({ ...prev, name: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Category
          </label>
          <select
            value={templateData.category}
            onChange={(e) => setTemplateData(prev => ({ ...prev, category: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="quote">Quote</option>
            <option value="invoice">Invoice</option>
            <option value="contract">Contract</option>
            <option value="proposal">Proposal</option>
            <option value="custom">Custom</option>
          </select>
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            value={templateData.description}
            onChange={(e) => setTemplateData(prev => ({ ...prev, description: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={3}
          />
        </div>
      </div>

      {/* Page Settings */}
      <div className="space-y-4">
        <h4 className="font-medium text-gray-900">Page Settings</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Page Size
            </label>
            <select
              value={templateData.settings.pageSize}
              onChange={(e) => handleSettingChange('pageSize', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="A4">A4</option>
              <option value="Letter">Letter</option>
              <option value="Legal">Legal</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Orientation
            </label>
            <select
              value={templateData.settings.orientation}
              onChange={(e) => handleSettingChange('orientation', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="portrait">Portrait</option>
              <option value="landscape">Landscape</option>
            </select>
          </div>
        </div>
      </div>

      {/* Options */}
      <div className="space-y-4">
        <h4 className="font-medium text-gray-900">Options</h4>
        <div className="space-y-3">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={templateData.settings.headerFooter}
              onChange={(e) => handleSettingChange('headerFooter', e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Include Header & Footer</span>
          </label>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={templateData.settings.watermark}
              onChange={(e) => handleSettingChange('watermark', e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Enable Watermark</span>
          </label>
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {templateId ? 'Edit Template' : 'Create New Template'}
            </h2>
            {unsavedChanges && (
              <p className="text-sm text-amber-600">You have unsaved changes</p>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => previewTemplate(templateData)}
              className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <Eye className="w-4 h-4" />
              Preview
            </button>
            <button
              onClick={handleSave}
              disabled={!unsavedChanges}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              Save Template
            </button>
            {onCancel && (
              <button
                onClick={onCancel}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex mt-4 border-b border-gray-200">
          {[
            { id: 'content', label: 'Content', icon: FileText },
            { id: 'variables', label: 'Variables', icon: Tag },
            { id: 'styles', label: 'Styles', icon: Palette },
            { id: 'settings', label: 'Settings', icon: Settings }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`
                  flex items-center gap-2 px-4 py-3 border-b-2 font-medium text-sm
                  transition-colors duration-200
                  ${isActive
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'content' && (
          <div className="h-full flex flex-col">
            <EditorToolbar />
            <div className={`flex-1 overflow-auto p-6 ${
              viewMode === 'mobile' ? 'max-w-sm' :
              viewMode === 'tablet' ? 'max-w-3xl' : 'max-w-none'
            } mx-auto`}>
              <EditorContent
                editor={editor}
                className="prose prose-sm max-w-none min-h-[500px] border border-gray-200 rounded-lg p-4 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent"
              />
            </div>
          </div>
        )}

        {activeTab === 'variables' && (
          <div className="h-full overflow-auto p-6">
            <VariablesPanel />
          </div>
        )}

        {activeTab === 'styles' && (
          <div className="h-full overflow-auto p-6">
            <StylesPanel />
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="h-full overflow-auto p-6">
            <SettingsPanel />
          </div>
        )}
      </div>
    </div>
  );
};

export default TemplateEditor;