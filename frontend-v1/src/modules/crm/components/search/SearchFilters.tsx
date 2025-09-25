/**
 * Search Filters Component - Sprint 17
 * Advanced search filters for CRM entities
 */

import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Slider,
  Grid,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton,
  Badge
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  FilterList as FilterIcon,
  Clear as ClearIcon,
  Save as SaveIcon
} from '@mui/icons-material';
import type { SearchFilters as ISearchFilters, EntityType } from '../../types';

interface SearchFiltersProps {
  filters: ISearchFilters;
  onFiltersChange: (filters: ISearchFilters) => void;
  onClear: () => void;
  onSave?: () => void;
  entityTypes?: EntityType[];
  showSaveButton?: boolean;
}

export const SearchFilters: React.FC<SearchFiltersProps> = ({
  filters,
  onFiltersChange,
  onClear,
  onSave,
  entityTypes = ['account', 'contact', 'lead', 'opportunity'],
  showSaveButton = true
}) => {
  const [expanded, setExpanded] = useState<string | false>('basic');
  const [activeFiltersCount, setActiveFiltersCount] = useState(0);

  const handleChange = (panel: string) => (_: React.SyntheticEvent, isExpanded: boolean) => {
    setExpanded(isExpanded ? panel : false);
  };

  const updateFilter = (key: keyof ISearchFilters, value: any) => {
    const newFilters = { ...filters, [key]: value };
    onFiltersChange(newFilters);
    updateActiveFiltersCount(newFilters);
  };

  const updateActiveFiltersCount = (currentFilters: ISearchFilters) => {
    let count = 0;
    Object.values(currentFilters).forEach(value => {
      if (value && (Array.isArray(value) ? value.length > 0 : true)) {
        count++;
      }
    });
    setActiveFiltersCount(count);
  };

  const handleClearAll = () => {
    onClear();
    setActiveFiltersCount(0);
  };

  return (
    <Paper sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Badge badgeContent={activeFiltersCount} color="primary">
            <FilterIcon />
          </Badge>
          <Typography variant="h6" fontWeight="bold">
            Advanced Filters
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {activeFiltersCount > 0 && (
            <Button
              variant="outlined"
              size="small"
              startIcon={<ClearIcon />}
              onClick={handleClearAll}
            >
              Clear All
            </Button>
          )}
          {showSaveButton && onSave && (
            <Button
              variant="contained"
              size="small"
              startIcon={<SaveIcon />}
              onClick={onSave}
            >
              Save Search
            </Button>
          )}
        </Box>
      </Box>

      {/* Basic Filters */}
      <Accordion expanded={expanded === 'basic'} onChange={handleChange('basic')}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography>Basic Filters</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            {/* Account Type */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Account Type</InputLabel>
                <Select
                  multiple
                  value={filters.account_type || []}
                  onChange={(e) => updateFilter('account_type', e.target.value)}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {(selected as string[]).map((value) => (
                        <Chip key={value} label={value} size="small" />
                      ))}
                    </Box>
                  )}
                >
                  <MenuItem value="customer">Customer</MenuItem>
                  <MenuItem value="prospect">Prospect</MenuItem>
                  <MenuItem value="partner">Partner</MenuItem>
                  <MenuItem value="vendor">Vendor</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Industry */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Industry</InputLabel>
                <Select
                  multiple
                  value={filters.industry || []}
                  onChange={(e) => updateFilter('industry', e.target.value)}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {(selected as string[]).map((value) => (
                        <Chip key={value} label={value} size="small" />
                      ))}
                    </Box>
                  )}
                >
                  <MenuItem value="technology">Technology</MenuItem>
                  <MenuItem value="healthcare">Healthcare</MenuItem>
                  <MenuItem value="finance">Finance</MenuItem>
                  <MenuItem value="manufacturing">Manufacturing</MenuItem>
                  <MenuItem value="retail">Retail</MenuItem>
                  <MenuItem value="services">Services</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Account Tier */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Account Tier</InputLabel>
                <Select
                  multiple
                  value={filters.account_tier || []}
                  onChange={(e) => updateFilter('account_tier', e.target.value)}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {(selected as string[]).map((value) => (
                        <Chip key={value} label={value} size="small" />
                      ))}
                    </Box>
                  )}
                >
                  <MenuItem value="strategic">Strategic</MenuItem>
                  <MenuItem value="key">Key</MenuItem>
                  <MenuItem value="standard">Standard</MenuItem>
                  <MenuItem value="small">Small</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Health Grade */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Health Grade</InputLabel>
                <Select
                  multiple
                  value={filters.health_grade || []}
                  onChange={(e) => updateFilter('health_grade', e.target.value)}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {(selected as string[]).map((value) => (
                        <Chip
                          key={value}
                          label={value}
                          size="small"
                          sx={{
                            backgroundColor:
                              value === 'A' ? '#22c55e' :
                              value === 'B' ? '#84cc16' :
                              value === 'C' ? '#eab308' :
                              value === 'D' ? '#f97316' :
                              '#ef4444',
                            color: 'white'
                          }}
                        />
                      ))}
                    </Box>
                  )}
                >
                  <MenuItem value="A">Grade A</MenuItem>
                  <MenuItem value="B">Grade B</MenuItem>
                  <MenuItem value="C">Grade C</MenuItem>
                  <MenuItem value="D">Grade D</MenuItem>
                  <MenuItem value="F">Grade F</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* Range Filters */}
      <Accordion expanded={expanded === 'ranges'} onChange={handleChange('ranges')}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography>Range Filters</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={3}>
            {/* Revenue Range */}
            <Grid item xs={12}>
              <Typography gutterBottom>Annual Revenue</Typography>
              <Box sx={{ px: 2 }}>
                <Slider
                  value={[
                    filters.revenue?.min || 0,
                    filters.revenue?.max || 10000000
                  ]}
                  onChange={(_, value) => {
                    const [min, max] = value as number[];
                    updateFilter('revenue', { min, max });
                  }}
                  valueLabelDisplay="auto"
                  valueLabelFormat={(value) => `$${(value / 1000000).toFixed(1)}M`}
                  min={0}
                  max={10000000}
                  step={100000}
                />
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="caption">$0</Typography>
                  <Typography variant="caption">$10M+</Typography>
                </Box>
              </Box>
            </Grid>

            {/* Employee Count Range */}
            <Grid item xs={12}>
              <Typography gutterBottom>Employee Count</Typography>
              <Box sx={{ px: 2 }}>
                <Slider
                  value={[
                    filters.employee_count?.min || 0,
                    filters.employee_count?.max || 10000
                  ]}
                  onChange={(_, value) => {
                    const [min, max] = value as number[];
                    updateFilter('employee_count', { min, max });
                  }}
                  valueLabelDisplay="auto"
                  min={0}
                  max={10000}
                  step={100}
                />
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="caption">0</Typography>
                  <Typography variant="caption">10,000+</Typography>
                </Box>
              </Box>
            </Grid>

            {/* Health Score Range */}
            <Grid item xs={12}>
              <Typography gutterBottom>Health Score</Typography>
              <Box sx={{ px: 2 }}>
                <Slider
                  value={[
                    filters.health_score?.min || 0,
                    filters.health_score?.max || 100
                  ]}
                  onChange={(_, value) => {
                    const [min, max] = value as number[];
                    updateFilter('health_score', { min, max });
                  }}
                  valueLabelDisplay="auto"
                  min={0}
                  max={100}
                  marks={[
                    { value: 0, label: '0' },
                    { value: 25, label: '25' },
                    { value: 50, label: '50' },
                    { value: 75, label: '75' },
                    { value: 100, label: '100' }
                  ]}
                />
              </Box>
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* Contact Filters */}
      <Accordion expanded={expanded === 'contacts'} onChange={handleChange('contacts')}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography>Contact Filters</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            {/* Job Title */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                size="small"
                label="Job Title"
                value={filters.job_title || ''}
                onChange={(e) => updateFilter('job_title', e.target.value)}
                placeholder="e.g., Director, Manager"
              />
            </Grid>

            {/* Department */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Department</InputLabel>
                <Select
                  multiple
                  value={filters.department || []}
                  onChange={(e) => updateFilter('department', e.target.value)}
                  renderValue={(selected) => (selected as string[]).join(', ')}
                >
                  <MenuItem value="sales">Sales</MenuItem>
                  <MenuItem value="marketing">Marketing</MenuItem>
                  <MenuItem value="it">IT</MenuItem>
                  <MenuItem value="finance">Finance</MenuItem>
                  <MenuItem value="operations">Operations</MenuItem>
                  <MenuItem value="hr">HR</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Seniority */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Seniority Level</InputLabel>
                <Select
                  multiple
                  value={filters.seniority || []}
                  onChange={(e) => updateFilter('seniority', e.target.value)}
                  renderValue={(selected) => (selected as string[]).join(', ')}
                >
                  <MenuItem value="executive">Executive</MenuItem>
                  <MenuItem value="director">Director</MenuItem>
                  <MenuItem value="manager">Manager</MenuItem>
                  <MenuItem value="individual">Individual Contributor</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Has Role */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Has Role</InputLabel>
                <Select
                  value={filters.has_role !== undefined ? filters.has_role.toString() : ''}
                  onChange={(e) => updateFilter('has_role', e.target.value === 'true')}
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="true">With Role</MenuItem>
                  <MenuItem value="false">Without Role</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* Location Filters */}
      <Accordion expanded={expanded === 'location'} onChange={handleChange('location')}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography>Location</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                size="small"
                label="Country"
                value={filters.country?.join(', ') || ''}
                onChange={(e) => updateFilter('country', e.target.value.split(',').map(s => s.trim()))}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                size="small"
                label="State/Province"
                value={filters.state?.join(', ') || ''}
                onChange={(e) => updateFilter('state', e.target.value.split(',').map(s => s.trim()))}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                size="small"
                label="City"
                value={filters.city?.join(', ') || ''}
                onChange={(e) => updateFilter('city', e.target.value.split(',').map(s => s.trim()))}
              />
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* Active Filters Display */}
      {activeFiltersCount > 0 && (
        <Box sx={{ mt: 2, p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
          <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mb: 1 }}>
            Active Filters ({activeFiltersCount})
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {Object.entries(filters).map(([key, value]) => {
              if (!value || (Array.isArray(value) && value.length === 0)) return null;

              const displayValue = Array.isArray(value)
                ? value.join(', ')
                : typeof value === 'object'
                ? `${value.min || 0} - ${value.max || '∞'}`
                : value.toString();

              return (
                <Chip
                  key={key}
                  label={`${key.replace(/_/g, ' ')}: ${displayValue}`}
                  size="small"
                  onDelete={() => updateFilter(key as keyof ISearchFilters, undefined)}
                />
              );
            })}
          </Box>
        </Box>
      )}
    </Paper>
  );
};

export default SearchFilters;