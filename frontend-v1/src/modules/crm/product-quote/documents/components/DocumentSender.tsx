// Document Sender Component - Sprint 19 Frontend Implementation

import React, { useState, useEffect } from 'react';
import {
  X,
  Send,
  Plus,
  Trash2,
  Mail,
  User,
  MessageSquare,
  Paperclip,
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle,
  Users,
  Link,
  Copy,
  Download,
  Eye,
  Settings
} from 'lucide-react';

interface DocumentSenderProps {
  document: GeneratedDocument;
  onClose: () => void;
  onSent: () => void;
}

interface GeneratedDocument {
  id: number;
  fileName: string;
  url: string;
  format: string;
  size: number;
  templateName: string;
}

interface Recipient {
  id?: number;
  email: string;
  name?: string;
  type: 'to' | 'cc' | 'bcc';
}

interface EmailTemplate {
  id: number;
  name: string;
  subject: string;
  body: string;
  isDefault: boolean;
}

interface SendOptions {
  requireSignature: boolean;
  trackOpening: boolean;
  trackDownloads: boolean;
  expiryDate?: string;
  passwordProtect: boolean;
  password?: string;
  deliveryReceipt: boolean;
  priority: 'normal' | 'high' | 'low';
}

export const DocumentSender: React.FC<DocumentSenderProps> = ({
  document,
  onClose,
  onSent
}) => {
  // State
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [subject, setSubject] = useState(`Document: ${document.fileName}`);
  const [message, setMessage] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null);
  const [sendOptions, setSendOptions] = useState<SendOptions>({
    requireSignature: false,
    trackOpening: true,
    trackDownloads: true,
    passwordProtect: false,
    deliveryReceipt: false,
    priority: 'normal'
  });
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'compose' | 'options' | 'preview'>('compose');

  // Sample email templates
  const emailTemplates: EmailTemplate[] = [
    {
      id: 1,
      name: 'Quote Follow-up',
      subject: 'Quote for {{customerName}} - {{quoteNumber}}',
      body: `Dear {{customerName}},

Please find attached your quote for the requested services.

This quote is valid until {{expiryDate}}.

If you have any questions, please don't hesitate to contact us.

Best regards,
{{senderName}}`,
      isDefault: true
    },
    {
      id: 2,
      name: 'Invoice Delivery',
      subject: 'Invoice {{invoiceNumber}} - {{companyName}}',
      body: `Dear {{customerName}},

Please find attached invoice {{invoiceNumber}} for your recent purchase.

Payment is due by {{dueDate}}.

Thank you for your business!

Best regards,
{{senderName}}`,
      isDefault: false
    }
  ];

  // Effects
  useEffect(() => {
    // Load default template if available
    const defaultTemplate = emailTemplates.find(t => t.isDefault);
    if (defaultTemplate) {
      setSelectedTemplate(defaultTemplate.id);
      setSubject(defaultTemplate.subject);
      setMessage(defaultTemplate.body);
    }
  }, []);

  // Handlers
  const addRecipient = (type: 'to' | 'cc' | 'bcc' = 'to') => {
    setRecipients(prev => [...prev, {
      id: Date.now(),
      email: '',
      name: '',
      type
    }]);
  };

  const updateRecipient = (index: number, updates: Partial<Recipient>) => {
    setRecipients(prev => prev.map((recipient, i) =>
      i === index ? { ...recipient, ...updates } : recipient
    ));
  };

  const removeRecipient = (index: number) => {
    setRecipients(prev => prev.filter((_, i) => i !== index));
  };

  const handleTemplateSelect = (templateId: number) => {
    const template = emailTemplates.find(t => t.id === templateId);
    if (template) {
      setSelectedTemplate(templateId);
      setSubject(template.subject);
      setMessage(template.body);
    }
  };

  const handleSend = async () => {
    setIsSending(true);
    setError(null);

    try {
      // Validate recipients
      const validRecipients = recipients.filter(r => r.email.trim() && r.email.includes('@'));
      if (validRecipients.length === 0) {
        throw new Error('Please add at least one valid recipient');
      }

      // Prepare send data
      const sendData = {
        documentId: document.id,
        recipients: validRecipients,
        subject,
        message,
        options: sendOptions
      };

      // Send document
      const response = await fetch('/api/crm/documents/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sendData),
      });

      if (!response.ok) {
        throw new Error('Failed to send document');
      }

      setSuccess(true);
      setTimeout(() => {
        onSent();
      }, 2000);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send document');
    } finally {
      setIsSending(false);
    }
  };

  const generateShareLink = async () => {
    try {
      const response = await fetch(`/api/crm/documents/${document.id}/share-link`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          expiryDate: sendOptions.expiryDate,
          requirePassword: sendOptions.passwordProtect,
          password: sendOptions.password
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate share link');
      }

      const { shareUrl } = await response.json();

      // Copy to clipboard
      await navigator.clipboard.writeText(shareUrl);
      alert('Share link copied to clipboard!');

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate share link');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getRecipientsByType = (type: 'to' | 'cc' | 'bcc') => {
    return recipients.filter(r => r.type === type);
  };

  // Render recipient input
  const RecipientInput: React.FC<{ recipient: Recipient; index: number }> = ({ recipient, index }) => (
    <div className="flex items-center gap-2 p-2 border border-gray-200 rounded-lg">
      <select
        value={recipient.type}
        onChange={(e) => updateRecipient(index, { type: e.target.value as 'to' | 'cc' | 'bcc' })}
        className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      >
        <option value="to">To</option>
        <option value="cc">CC</option>
        <option value="bcc">BCC</option>
      </select>

      <div className="flex-1 grid grid-cols-2 gap-2">
        <input
          type="email"
          placeholder="Email address"
          value={recipient.email}
          onChange={(e) => updateRecipient(index, { email: e.target.value })}
          className="px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <input
          type="text"
          placeholder="Name (optional)"
          value={recipient.name || ''}
          onChange={(e) => updateRecipient(index, { name: e.target.value })}
          className="px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <button
        onClick={() => removeRecipient(index)}
        className="p-2 text-red-600 hover:text-red-700"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );

  if (success) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4 text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Document Sent Successfully!</h2>
          <p className="text-gray-600 mb-6">
            Your document has been sent to {recipients.length} recipient(s).
          </p>
          <button
            onClick={onSent}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Mail className="w-6 h-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-bold text-gray-900">Send Document</h2>
              <p className="text-sm text-gray-500">{document.fileName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200 px-6">
          {[
            { id: 'compose', label: 'Compose', icon: Mail },
            { id: 'options', label: 'Options', icon: Settings },
            { id: 'preview', label: 'Preview', icon: Eye }
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

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {activeTab === 'compose' && (
            <div className="space-y-6">
              {/* Email Template Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Template
                </label>
                <select
                  value={selectedTemplate || ''}
                  onChange={(e) => handleTemplateSelect(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select a template...</option>
                  {emailTemplates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Recipients */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Recipients
                  </label>
                  <button
                    onClick={() => addRecipient('to')}
                    className="flex items-center gap-1 px-3 py-1 text-sm text-blue-600 hover:text-blue-700"
                  >
                    <Plus className="w-4 h-4" />
                    Add Recipient
                  </button>
                </div>

                <div className="space-y-3">
                  {recipients.map((recipient, index) => (
                    <RecipientInput key={recipient.id || index} recipient={recipient} index={index} />
                  ))}

                  {recipients.length === 0 && (
                    <button
                      onClick={() => addRecipient('to')}
                      className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-gray-400 hover:text-gray-600"
                    >
                      <Plus className="w-6 h-6 mx-auto mb-2" />
                      Add your first recipient
                    </button>
                  )}
                </div>
              </div>

              {/* Subject */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subject
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Email subject"
                />
              </div>

              {/* Message */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Message
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={8}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Your message..."
                />
              </div>

              {/* Document Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">Attached Document</h4>
                <div className="flex items-center gap-3">
                  <Paperclip className="w-5 h-5 text-gray-400" />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">{document.fileName}</div>
                    <div className="text-xs text-gray-500">
                      {document.format.toUpperCase()} • {formatFileSize(document.size)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'options' && (
            <div className="space-y-6">
              {/* Delivery Options */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Delivery Options</h3>
                <div className="space-y-4">
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={sendOptions.trackOpening}
                      onChange={(e) => setSendOptions(prev => ({ ...prev, trackOpening: e.target.checked }))}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <div className="font-medium text-gray-900">Track email opening</div>
                      <div className="text-sm text-gray-500">Get notified when recipients open the email</div>
                    </div>
                  </label>

                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={sendOptions.trackDownloads}
                      onChange={(e) => setSendOptions(prev => ({ ...prev, trackDownloads: e.target.checked }))}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <div className="font-medium text-gray-900">Track document downloads</div>
                      <div className="text-sm text-gray-500">Get notified when recipients download the document</div>
                    </div>
                  </label>

                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={sendOptions.deliveryReceipt}
                      onChange={(e) => setSendOptions(prev => ({ ...prev, deliveryReceipt: e.target.checked }))}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <div className="font-medium text-gray-900">Request delivery receipt</div>
                      <div className="text-sm text-gray-500">Request confirmation when email is delivered</div>
                    </div>
                  </label>

                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={sendOptions.requireSignature}
                      onChange={(e) => setSendOptions(prev => ({ ...prev, requireSignature: e.target.checked }))}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <div className="font-medium text-gray-900">Require digital signature</div>
                      <div className="text-sm text-gray-500">Recipients must sign before viewing the document</div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Security Options */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Security Options</h3>
                <div className="space-y-4">
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={sendOptions.passwordProtect}
                      onChange={(e) => setSendOptions(prev => ({ ...prev, passwordProtect: e.target.checked }))}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <div className="font-medium text-gray-900">Password protect document</div>
                      <div className="text-sm text-gray-500">Require password to open the document</div>
                    </div>
                  </label>

                  {sendOptions.passwordProtect && (
                    <div className="ml-6">
                      <input
                        type="password"
                        placeholder="Enter password"
                        value={sendOptions.password || ''}
                        onChange={(e) => setSendOptions(prev => ({ ...prev, password: e.target.value }))}
                        className="w-full max-w-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Document expiry date (optional)
                    </label>
                    <input
                      type="date"
                      value={sendOptions.expiryDate || ''}
                      onChange={(e) => setSendOptions(prev => ({ ...prev, expiryDate: e.target.value }))}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                </div>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Priority
                </label>
                <select
                  value={sendOptions.priority}
                  onChange={(e) => setSendOptions(prev => ({ ...prev, priority: e.target.value as any }))}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="low">Low Priority</option>
                  <option value="normal">Normal Priority</option>
                  <option value="high">High Priority</option>
                </select>
              </div>
            </div>
          )}

          {activeTab === 'preview' && (
            <div className="space-y-6">
              {/* Email Preview */}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                  <h3 className="font-medium text-gray-900">Email Preview</h3>
                </div>
                <div className="p-4">
                  <div className="space-y-3">
                    <div>
                      <span className="text-sm font-medium text-gray-700">To: </span>
                      <span className="text-sm text-gray-900">
                        {getRecipientsByType('to').map(r => r.email).join(', ') || 'No recipients'}
                      </span>
                    </div>
                    {getRecipientsByType('cc').length > 0 && (
                      <div>
                        <span className="text-sm font-medium text-gray-700">CC: </span>
                        <span className="text-sm text-gray-900">
                          {getRecipientsByType('cc').map(r => r.email).join(', ')}
                        </span>
                      </div>
                    )}
                    <div>
                      <span className="text-sm font-medium text-gray-700">Subject: </span>
                      <span className="text-sm text-gray-900">{subject || 'No subject'}</span>
                    </div>
                  </div>

                  <div className="mt-6 p-4 bg-gray-50 rounded border">
                    <pre className="whitespace-pre-wrap text-sm text-gray-900 font-sans">
                      {message || 'No message'}
                    </pre>
                  </div>

                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
                    <div className="flex items-center gap-2">
                      <Paperclip className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-900">
                        {document.fileName}
                      </span>
                      <span className="text-xs text-blue-700">
                        ({formatFileSize(document.size)})
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Share Link Option */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">Alternative: Share Link</h4>
                <p className="text-sm text-gray-600 mb-4">
                  Generate a secure link that you can share manually instead of sending emails.
                </p>
                <button
                  onClick={generateShareLink}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  <Link className="w-4 h-4" />
                  Generate Share Link
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              {error && (
                <div className="flex items-center gap-2 text-red-600">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm">{error}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSend}
                disabled={isSending || recipients.length === 0}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSending ? (
                  <>
                    <Clock className="w-4 h-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Send Email
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentSender;