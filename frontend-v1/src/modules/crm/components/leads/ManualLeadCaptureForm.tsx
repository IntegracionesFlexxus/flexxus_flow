/**
 * Manual Lead Capture Form Component
 *
 * OMNICHANNEL STATUS: Temporary form for manual lead entry
 * See: FRONTEND_OMNICHANNEL_ADAPTATIONS.md for pending changes
 *
 * TODO: OMNICHANNEL - Replace/supplement with automated capture when ready
 */

import React, { useState, FormEvent } from 'react';
import { Save, X, AlertCircle } from 'lucide-react';
import { ILeadFormData } from '../../types/lead.types';
import { OMNICHANNEL_MESSAGES } from '../../config/features';

interface IManualLeadCaptureFormProps {
  onSubmit: (data: ILeadFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export const ManualLeadCaptureForm: React.FC<IManualLeadCaptureFormProps> = ({
  onSubmit,
  onCancel,
  isLoading = false
}) => {
  const [formData, setFormData] = useState<ILeadFormData>({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    company_name: '',
    job_title: '',
    source: 'manual',
    notes: ''
  });

  const [errors, setErrors] = useState<Partial<Record<keyof ILeadFormData, string>>>({});
  const [showSourceInfo, setShowSourceInfo] = useState(true);

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof ILeadFormData, string>> = {};

    if (!formData.first_name.trim()) {
      newErrors.first_name = 'First name is required';
    }
    if (!formData.last_name.trim()) {
      newErrors.last_name = 'Last name is required';
    }
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    await onSubmit({
      ...formData,
      source: 'manual' // Always set source as manual for now
      // TODO: OMNICHANNEL - Add form_id and landing_page_id when available
    });
  };

  const handleChange = (field: keyof ILeadFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const styles = {
    form: {
      padding: '20px',
      backgroundColor: '#fff',
      borderRadius: '8px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      maxWidth: '600px',
      margin: '0 auto'
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '20px',
      paddingBottom: '12px',
      borderBottom: '1px solid #e0e0e0'
    },
    title: {
      fontSize: '18px',
      fontWeight: 600,
      color: '#333'
    },
    infoBox: {
      display: showSourceInfo ? 'flex' : 'none',
      alignItems: 'flex-start',
      gap: '8px',
      padding: '12px',
      backgroundColor: '#fff3cd',
      border: '1px solid #ffc107',
      borderRadius: '4px',
      marginBottom: '20px',
      fontSize: '13px',
      color: '#856404'
    },
    row: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '16px',
      marginBottom: '16px'
    },
    fullWidth: {
      gridColumn: 'span 2'
    },
    fieldGroup: {
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '4px'
    },
    label: {
      fontSize: '13px',
      fontWeight: 500,
      color: '#495057'
    },
    required: {
      color: '#dc3545'
    },
    input: {
      padding: '8px 12px',
      border: '1px solid #ced4da',
      borderRadius: '4px',
      fontSize: '14px',
      transition: 'border-color 0.15s ease-in-out',
      outline: 'none'
    },
    inputError: {
      borderColor: '#dc3545'
    },
    textarea: {
      padding: '8px 12px',
      border: '1px solid #ced4da',
      borderRadius: '4px',
      fontSize: '14px',
      minHeight: '80px',
      resize: 'vertical' as const,
      outline: 'none'
    },
    error: {
      fontSize: '12px',
      color: '#dc3545',
      marginTop: '2px'
    },
    footer: {
      display: 'flex',
      justifyContent: 'flex-end',
      gap: '12px',
      marginTop: '24px',
      paddingTop: '16px',
      borderTop: '1px solid #e0e0e0'
    },
    button: {
      padding: '8px 16px',
      borderRadius: '4px',
      fontSize: '14px',
      fontWeight: 500,
      cursor: 'pointer',
      transition: 'all 0.2s',
      border: 'none',
      display: 'flex',
      alignItems: 'center',
      gap: '6px'
    },
    primaryButton: {
      backgroundColor: '#007bff',
      color: '#fff'
    },
    secondaryButton: {
      backgroundColor: '#6c757d',
      color: '#fff'
    },
    sourceIndicator: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      padding: '4px 8px',
      backgroundColor: '#f8f9fa',
      border: '1px solid #dee2e6',
      borderRadius: '4px',
      fontSize: '12px',
      color: '#6c757d',
      marginTop: '4px'
    }
  };

  return (
    <form style={styles.form} onSubmit={handleSubmit}>
      <div style={styles.header}>
        <h2 style={styles.title}>Manual Lead Entry</h2>
        <button
          type="button"
          onClick={() => setShowSourceInfo(false)}
          style={{ background: 'none', border: 'none', cursor: 'pointer' }}
        >
          <X size={20} />
        </button>
      </div>

      <div style={styles.infoBox}>
        <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
        <div>
          <strong>Manual Entry Mode</strong><br />
          {OMNICHANNEL_MESSAGES.MANUAL_ENTRY_INFO}
        </div>
      </div>

      <div style={styles.row}>
        <div style={styles.fieldGroup}>
          <label style={styles.label}>
            First Name <span style={styles.required}>*</span>
          </label>
          <input
            type="text"
            style={{
              ...styles.input,
              ...(errors.first_name ? styles.inputError : {})
            }}
            value={formData.first_name}
            onChange={(e) => handleChange('first_name', e.target.value)}
            disabled={isLoading}
          />
          {errors.first_name && (
            <span style={styles.error}>{errors.first_name}</span>
          )}
        </div>

        <div style={styles.fieldGroup}>
          <label style={styles.label}>
            Last Name <span style={styles.required}>*</span>
          </label>
          <input
            type="text"
            style={{
              ...styles.input,
              ...(errors.last_name ? styles.inputError : {})
            }}
            value={formData.last_name}
            onChange={(e) => handleChange('last_name', e.target.value)}
            disabled={isLoading}
          />
          {errors.last_name && (
            <span style={styles.error}>{errors.last_name}</span>
          )}
        </div>
      </div>

      <div style={styles.row}>
        <div style={styles.fieldGroup}>
          <label style={styles.label}>
            Email <span style={styles.required}>*</span>
          </label>
          <input
            type="email"
            style={{
              ...styles.input,
              ...(errors.email ? styles.inputError : {})
            }}
            value={formData.email}
            onChange={(e) => handleChange('email', e.target.value)}
            disabled={isLoading}
          />
          {errors.email && (
            <span style={styles.error}>{errors.email}</span>
          )}
        </div>

        <div style={styles.fieldGroup}>
          <label style={styles.label}>Phone</label>
          <input
            type="tel"
            style={styles.input}
            value={formData.phone || ''}
            onChange={(e) => handleChange('phone', e.target.value)}
            disabled={isLoading}
          />
        </div>
      </div>

      <div style={styles.row}>
        <div style={styles.fieldGroup}>
          <label style={styles.label}>Company Name</label>
          <input
            type="text"
            style={styles.input}
            value={formData.company_name || ''}
            onChange={(e) => handleChange('company_name', e.target.value)}
            disabled={isLoading}
          />
        </div>

        <div style={styles.fieldGroup}>
          <label style={styles.label}>Job Title</label>
          <input
            type="text"
            style={styles.input}
            value={formData.job_title || ''}
            onChange={(e) => handleChange('job_title', e.target.value)}
            disabled={isLoading}
          />
        </div>
      </div>

      <div style={styles.row}>
        <div style={{ ...styles.fieldGroup, ...styles.fullWidth }}>
          <label style={styles.label}>Notes</label>
          <textarea
            style={styles.textarea}
            value={formData.notes || ''}
            onChange={(e) => handleChange('notes', e.target.value)}
            disabled={isLoading}
            placeholder="Add any additional information..."
          />
        </div>
      </div>

      <div style={styles.row}>
        <div style={{ ...styles.fieldGroup, ...styles.fullWidth }}>
          <label style={styles.label}>Lead Source</label>
          <div style={styles.sourceIndicator}>
            <AlertCircle size={12} />
            Manual Entry (Unverified)
          </div>
          <small style={{ fontSize: '11px', color: '#6c757d', marginTop: '4px' }}>
            This lead will be marked as manually entered and pending verification
          </small>
        </div>
      </div>

      <div style={styles.footer}>
        <button
          type="button"
          style={{ ...styles.button, ...styles.secondaryButton }}
          onClick={onCancel}
          disabled={isLoading}
        >
          <X size={16} />
          Cancel
        </button>
        <button
          type="submit"
          style={{ ...styles.button, ...styles.primaryButton }}
          disabled={isLoading}
        >
          <Save size={16} />
          {isLoading ? 'Saving...' : 'Save Lead'}
        </button>
      </div>
    </form>
  );
};

export default ManualLeadCaptureForm;