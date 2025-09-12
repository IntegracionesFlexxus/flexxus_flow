/**
 * Feature Flag Create Dialog Component - Sprint 3
 * Componente para crear nuevos feature flags
 * Siguiendo principios SOLID y Clean Code del Nivel 2
 */

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useNotifications } from '@/shared/hooks/useNotifications';
import { featureFlagService, CreateFeatureFlagRequest, FeatureFlag } from '@modules/feature-flags/services/featureFlagService';

interface FeatureFlagCreateDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (flag: FeatureFlag) => void;
}

export const FeatureFlagCreateDialog: React.FC<FeatureFlagCreateDialogProps> = ({
  open,
  onClose,
  onSuccess
}) => {
  const [formData, setFormData] = useState<CreateFeatureFlagRequest>({
    name: '',
    description: '',
    environment: 'development',
    enabled: false,
    rolloutPercentage: 0,
    rolloutStrategy: 'percentage',
    category: '',
    tags: []
  });
  
  const [loading, setLoading] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const { addNotification } = useNotifications();

  /**
   * Handle form field changes
   */
  const handleChange = (field: keyof CreateFeatureFlagRequest, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  /**
   * Add tag to the list
   */
  const addTag = () => {
    if (tagInput.trim() && !formData.tags?.includes(tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...(prev.tags || []), tagInput.trim()]
      }));
      setTagInput('');
    }
  };

  /**
   * Remove tag from the list
   */
  const removeTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags?.filter(t => t !== tag) || []
    }));
  };

  /**
   * Validate form data
   */
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (!/^[a-z][a-z0-9_]*$/.test(formData.name)) {
      newErrors.name = 'Name must start with a letter and contain only lowercase letters, numbers, and underscores';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }

    if (formData.rolloutPercentage < 0 || formData.rolloutPercentage > 100) {
      newErrors.rolloutPercentage = 'Rollout percentage must be between 0 and 100';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);
      const response = await featureFlagService.createFeatureFlag(formData);
      onSuccess(response.flag);
      handleClose();
    } catch (error) {
      addNotification('Failed to create feature flag', 'error');
      console.error('Error creating feature flag:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle dialog close
   */
  const handleClose = () => {
    setFormData({
      name: '',
      description: '',
      environment: 'development',
      enabled: false,
      rolloutPercentage: 0,
      rolloutStrategy: 'percentage',
      category: '',
      tags: []
    });
    setTagInput('');
    setErrors({});
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Feature Flag</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Basic Information */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="my_feature_flag"
                className={errors.name ? 'border-red-500' : ''}
              />
              {errors.name && (
                <p className="text-sm text-red-500">{errors.name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="environment">Environment</Label>
              <Select
                value={formData.environment}
                onValueChange={(value) => handleChange('environment', value)}
              >
                <option value="development">Development</option>
                <option value="staging">Staging</option>
                <option value="production">Production</option>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Describe what this feature flag controls..."
              rows={3}
              className={errors.description ? 'border-red-500' : ''}
            />
            {errors.description && (
              <p className="text-sm text-red-500">{errors.description}</p>
            )}
          </div>

          {/* Configuration */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                value={formData.category}
                onChange={(e) => handleChange('category', e.target.value)}
                placeholder="e.g., ui, backend, experiment"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="rolloutStrategy">Rollout Strategy</Label>
              <Select
                value={formData.rolloutStrategy}
                onValueChange={(value) => handleChange('rolloutStrategy', value)}
              >
                <option value="percentage">Percentage</option>
                <option value="user_id">User ID</option>
                <option value="custom">Custom</option>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="rolloutPercentage">Rollout Percentage</Label>
              <Input
                id="rolloutPercentage"
                type="number"
                min="0"
                max="100"
                value={formData.rolloutPercentage}
                onChange={(e) => handleChange('rolloutPercentage', parseInt(e.target.value) || 0)}
                className={errors.rolloutPercentage ? 'border-red-500' : ''}
              />
              {errors.rolloutPercentage && (
                <p className="text-sm text-red-500">{errors.rolloutPercentage}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Initial State</Label>
              <div className="flex items-center space-x-2 pt-2">
                <Switch
                  checked={formData.enabled}
                  onCheckedChange={(enabled) => handleChange('enabled', enabled)}
                />
                <Label className="text-sm">
                  {formData.enabled ? 'Enabled' : 'Disabled'}
                </Label>
              </div>
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label htmlFor="tags">Tags</Label>
            <div className="flex gap-2">
              <Input
                id="tags"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder="Add a tag..."
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addTag();
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                onClick={addTag}
                disabled={!tagInput.trim()}
              >
                Add
              </Button>
            </div>
            
            {formData.tags && formData.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.tags.map(tag => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="cursor-pointer"
                    onClick={() => removeTag(tag)}
                  >
                    {tag} ×
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? 'Creating...' : 'Create Flag'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};