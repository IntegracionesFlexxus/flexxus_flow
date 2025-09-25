/**
 * Pipeline Filters Panel Component
 * Advanced filtering options for pipeline view
 */

import React, { useState, useCallback } from 'react';
import {
  Box,
  Button,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Slider,
  Typography,
  Chip,
  Divider,
  TextField,
  Autocomplete,
  FormGroup,
  FormControlLabel,
  Checkbox,
  SelectChangeEvent
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import usePipelineStore from '../../stores/usePipelineStore';
import { Priority, OpportunityStatus } from '../../types/pipeline.types';
import { formatCurrency } from '../../utils/formatters';

interface PipelineFiltersPanelProps {
  onClose?: () => void;
}

const priorityOptions: Priority[] = ['critical', 'high', 'medium', 'low'];
const statusOptions: OpportunityStatus[] = ['open', 'won', 'lost'];

export const PipelineFiltersPanel: React.FC<PipelineFiltersPanelProps> = ({ onClose }) => {
  const {
    filters,
    stages,
    opportunities,
    updateFilters,
    clearFilters
  } = usePipelineStore();

  const [localFilters, setLocalFilters] = useState({
    stage_ids: filters.stage_ids || [],
    owner_ids: filters.owner_ids || [],
    priority: filters.priority || [],
    status: filters.status || [],
    min_amount: filters.min_amount || 0,
    max_amount: filters.max_amount || 1000000,
    date_from: filters.date_from || null,
    date_to: filters.date_to || null
  });

  // Get unique owners from opportunities
  const owners = React.useMemo(() => {
    const ownerSet = new Set<string>();
    opportunities.forEach(opp => {
      if (opp.owner_id) {
        ownerSet.add(opp.owner_id);
      }
    });
    return Array.from(ownerSet);
  }, [opportunities]);

  // Get amount range
  const amountRange = React.useMemo(() => {
    if (opportunities.length === 0) return [0, 1000000];

    const amounts = opportunities.map(o => o.amount);
    return [Math.min(...amounts), Math.max(...amounts)];
  }, [opportunities]);

  const handleStageChange = (event: SelectChangeEvent<number[]>) => {
    const value = event.target.value;
    setLocalFilters({
      ...localFilters,
      stage_ids: typeof value === 'string' ? [] : value
    });
  };

  const handleOwnerChange = (event: React.SyntheticEvent, value: string[]) => {
    setLocalFilters({
      ...localFilters,
      owner_ids: value
    });
  };

  const handlePriorityChange = (priority: Priority) => {
    const current = localFilters.priority || [];
    const index = current.indexOf(priority);

    if (index === -1) {
      setLocalFilters({
        ...localFilters,
        priority: [...current, priority]
      });
    } else {
      setLocalFilters({
        ...localFilters,
        priority: current.filter(p => p !== priority)
      });
    }
  };

  const handleStatusChange = (status: OpportunityStatus) => {
    const current = localFilters.status || [];
    const index = current.indexOf(status);

    if (index === -1) {
      setLocalFilters({
        ...localFilters,
        status: [...current, status]
      });
    } else {
      setLocalFilters({
        ...localFilters,
        status: current.filter(s => s !== status)
      });
    }
  };

  const handleAmountChange = (event: Event, newValue: number | number[]) => {
    const values = newValue as number[];
    setLocalFilters({
      ...localFilters,
      min_amount: values[0],
      max_amount: values[1]
    });
  };

  const handleDateFromChange = (newValue: Date | null) => {
    setLocalFilters({
      ...localFilters,
      date_from: newValue ? newValue.toISOString() : null
    });
  };

  const handleDateToChange = (newValue: Date | null) => {
    setLocalFilters({
      ...localFilters,
      date_to: newValue ? newValue.toISOString() : null
    });
  };

  const handleApply = useCallback(() => {
    const cleanFilters: any = {};

    if (localFilters.stage_ids.length > 0) {
      cleanFilters.stage_ids = localFilters.stage_ids;
    }
    if (localFilters.owner_ids.length > 0) {
      cleanFilters.owner_ids = localFilters.owner_ids;
    }
    if (localFilters.priority.length > 0) {
      cleanFilters.priority = localFilters.priority;
    }
    if (localFilters.status.length > 0) {
      cleanFilters.status = localFilters.status;
    }
    if (localFilters.min_amount > amountRange[0]) {
      cleanFilters.min_amount = localFilters.min_amount;
    }
    if (localFilters.max_amount < amountRange[1]) {
      cleanFilters.max_amount = localFilters.max_amount;
    }
    if (localFilters.date_from) {
      cleanFilters.date_from = localFilters.date_from;
    }
    if (localFilters.date_to) {
      cleanFilters.date_to = localFilters.date_to;
    }

    updateFilters(cleanFilters);
    onClose?.();
  }, [localFilters, updateFilters, onClose, amountRange]);

  const handleClear = useCallback(() => {
    setLocalFilters({
      stage_ids: [],
      owner_ids: [],
      priority: [],
      status: [],
      min_amount: amountRange[0],
      max_amount: amountRange[1],
      date_from: null,
      date_to: null
    });
    clearFilters();
  }, [clearFilters, amountRange]);

  const activeFiltersCount = React.useMemo(() => {
    let count = 0;
    if (localFilters.stage_ids.length > 0) count++;
    if (localFilters.owner_ids.length > 0) count++;
    if (localFilters.priority.length > 0) count++;
    if (localFilters.status.length > 0) count++;
    if (localFilters.min_amount > amountRange[0]) count++;
    if (localFilters.max_amount < amountRange[1]) count++;
    if (localFilters.date_from) count++;
    if (localFilters.date_to) count++;
    return count;
  }, [localFilters, amountRange]);

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Stack spacing={3}>
        {/* Stages */}
        <FormControl fullWidth>
          <InputLabel>Stages</InputLabel>
          <Select
            multiple
            value={localFilters.stage_ids}
            onChange={handleStageChange}
            renderValue={(selected) => (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {selected.map((value) => {
                  const stage = stages.find(s => s.stage_id === value);
                  return (
                    <Chip key={value} label={stage?.name || value} size="small" />
                  );
                })}
              </Box>
            )}
          >
            {stages.map((stage) => (
              <MenuItem key={stage.stage_id} value={stage.stage_id}>
                {stage.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Owners */}
        <Autocomplete
          multiple
          options={owners}
          value={localFilters.owner_ids}
          onChange={handleOwnerChange}
          renderInput={(params) => (
            <TextField {...params} label="Owners" placeholder="Select owners" />
          )}
          renderTags={(value, getTagProps) =>
            value.map((option, index) => (
              <Chip label={option} size="small" {...getTagProps({ index })} />
            ))
          }
        />

        <Divider />

        {/* Priority */}
        <Box>
          <Typography variant="subtitle2" gutterBottom>
            Priority
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            {priorityOptions.map(priority => (
              <Chip
                key={priority}
                label={priority}
                onClick={() => handlePriorityChange(priority)}
                color={localFilters.priority.includes(priority) ? 'primary' : 'default'}
                variant={localFilters.priority.includes(priority) ? 'filled' : 'outlined'}
              />
            ))}
          </Stack>
        </Box>

        {/* Status */}
        <Box>
          <Typography variant="subtitle2" gutterBottom>
            Status
          </Typography>
          <FormGroup row>
            {statusOptions.map(status => (
              <FormControlLabel
                key={status}
                control={
                  <Checkbox
                    checked={localFilters.status.includes(status)}
                    onChange={() => handleStatusChange(status)}
                  />
                }
                label={status.charAt(0).toUpperCase() + status.slice(1)}
              />
            ))}
          </FormGroup>
        </Box>

        <Divider />

        {/* Amount Range */}
        <Box>
          <Typography variant="subtitle2" gutterBottom>
            Deal Amount
          </Typography>
          <Slider
            value={[localFilters.min_amount, localFilters.max_amount]}
            onChange={handleAmountChange}
            valueLabelDisplay="auto"
            min={amountRange[0]}
            max={amountRange[1]}
            valueLabelFormat={(value) => formatCurrency(value)}
          />
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="caption">
              {formatCurrency(localFilters.min_amount)}
            </Typography>
            <Typography variant="caption">
              {formatCurrency(localFilters.max_amount)}
            </Typography>
          </Stack>
        </Box>

        <Divider />

        {/* Date Range */}
        <Stack spacing={2}>
          <DatePicker
            label="From Date"
            value={localFilters.date_from ? new Date(localFilters.date_from) : null}
            onChange={handleDateFromChange}
            slotProps={{ textField: { fullWidth: true } }}
          />
          <DatePicker
            label="To Date"
            value={localFilters.date_to ? new Date(localFilters.date_to) : null}
            onChange={handleDateToChange}
            slotProps={{ textField: { fullWidth: true } }}
            minDate={localFilters.date_from ? new Date(localFilters.date_from) : undefined}
          />
        </Stack>

        <Divider />

        {/* Action Buttons */}
        <Stack direction="row" spacing={2}>
          <Button
            variant="outlined"
            onClick={handleClear}
            disabled={activeFiltersCount === 0}
            fullWidth
          >
            Clear All
          </Button>
          <Button
            variant="contained"
            onClick={handleApply}
            fullWidth
          >
            Apply Filters {activeFiltersCount > 0 && `(${activeFiltersCount})`}
          </Button>
        </Stack>
      </Stack>
    </LocalizationProvider>
  );
};

export default PipelineFiltersPanel;