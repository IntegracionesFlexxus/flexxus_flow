/**
 * Pipeline Page V2 - Sprint 18
 * Enhanced pipeline management with drag & drop Kanban and forecasting
 */

import React, { useState } from 'react';
import {
  Box,
  Paper,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Typography
} from '@mui/material';
import { ViewKanban, Assessment, Settings, TrendingUp } from '@mui/icons-material';
import PipelineKanbanBoard from '../components/pipeline/PipelineKanbanBoard';
import ForecastingDashboard from '../components/forecasting/ForecastingDashboard';
import { OpportunityExtended } from '../types/pipeline.types';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => {
  return (
    <Box
      role="tabpanel"
      hidden={value !== index}
      sx={{
        height: '100%',
        display: value === index ? 'flex' : 'none',
        flexDirection: 'column',
        overflow: 'hidden'
      }}
    >
      {value === index && children}
    </Box>
  );
};

const PipelinePageV2: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [opportunityDialogOpen, setOpportunityDialogOpen] = useState(false);
  const [selectedOpportunity, setSelectedOpportunity] = useState<OpportunityExtended | null>(null);
  const [selectedStageId, setSelectedStageId] = useState<number | undefined>();

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleCreateOpportunity = (stageId?: number) => {
    setSelectedOpportunity(null);
    setSelectedStageId(stageId);
    setOpportunityDialogOpen(true);
  };

  const handleEditOpportunity = (opportunity: OpportunityExtended) => {
    setSelectedOpportunity(opportunity);
    setSelectedStageId(opportunity.stage_id);
    setOpportunityDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setOpportunityDialogOpen(false);
    setSelectedOpportunity(null);
    setSelectedStageId(undefined);
  };

  const handleSaveOpportunity = () => {
    // TODO: Implement save logic
    handleCloseDialog();
  };

  return (
    <Box sx={{ height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column' }}>
      <Paper sx={{ borderRadius: 0, borderBottom: 1, borderColor: 'divider' }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          sx={{ px: 2 }}
        >
          <Tab
            icon={<ViewKanban />}
            iconPosition="start"
            label="Pipeline Kanban"
          />
          <Tab
            icon={<Assessment />}
            iconPosition="start"
            label="Sales Forecasting"
          />
          <Tab
            icon={<TrendingUp />}
            iconPosition="start"
            label="Analytics"
            disabled
          />
          <Tab
            icon={<Settings />}
            iconPosition="start"
            label="Settings"
            disabled
          />
        </Tabs>
      </Paper>

      <Box sx={{ flex: 1, overflow: 'hidden', bgcolor: 'background.default' }}>
        <TabPanel value={tabValue} index={0}>
          <PipelineKanbanBoard
            onCreateOpportunity={handleCreateOpportunity}
            onEditOpportunity={handleEditOpportunity}
          />
        </TabPanel>
        <TabPanel value={tabValue} index={1}>
          <ForecastingDashboard />
        </TabPanel>
        <TabPanel value={tabValue} index={2}>
          <Box sx={{ p: 3 }}>
            <Typography variant="h5">Analytics Dashboard</Typography>
            <Typography color="text.secondary">
              Win/Loss analysis and advanced metrics coming soon...
            </Typography>
          </Box>
        </TabPanel>
        <TabPanel value={tabValue} index={3}>
          <Box sx={{ p: 3 }}>
            <Typography variant="h5">Pipeline Settings</Typography>
            <Typography color="text.secondary">
              Configure stages, automation rules, and templates...
            </Typography>
          </Box>
        </TabPanel>
      </Box>

      {/* Opportunity Dialog */}
      <Dialog
        open={opportunityDialogOpen}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {selectedOpportunity ? 'Edit Opportunity' : 'Create New Opportunity'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 2 }}>
            <TextField
              label="Opportunity Name"
              fullWidth
              defaultValue={selectedOpportunity?.name}
              required
            />
            <TextField
              label="Company/Account"
              fullWidth
              defaultValue={selectedOpportunity?.account?.name}
            />
            <Stack direction="row" spacing={2}>
              <TextField
                label="Amount"
                type="number"
                fullWidth
                defaultValue={selectedOpportunity?.amount || 0}
                InputProps={{
                  startAdornment: '$'
                }}
              />
              <TextField
                label="Probability %"
                type="number"
                fullWidth
                defaultValue={selectedOpportunity?.probability || 0}
                inputProps={{ min: 0, max: 100 }}
              />
            </Stack>
            <FormControl fullWidth>
              <InputLabel>Priority</InputLabel>
              <Select
                defaultValue={selectedOpportunity?.priority || 'medium'}
                label="Priority"
              >
                <MenuItem value="critical">Critical</MenuItem>
                <MenuItem value="high">High</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="low">Low</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Expected Close Date"
              type="date"
              fullWidth
              defaultValue={selectedOpportunity?.expected_close_date?.split('T')[0]}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Notes"
              multiline
              rows={4}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSaveOpportunity} variant="contained">
            {selectedOpportunity ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PipelinePageV2;