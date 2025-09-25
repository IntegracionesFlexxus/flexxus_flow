/**
 * Contact Roles Manager - Sprint 17
 * Manage contact roles and buying committees
 */

import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Avatar,
  Stack,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Slider,
  Grid,
  Card,
  CardContent,
  Alert,
  Tooltip
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Person as PersonIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  Group as GroupIcon,
  TrendingUp as InfluenceIcon,
  BusinessCenter as RoleIcon
} from '@mui/icons-material';

interface ContactRole {
  id: number;
  contact_id: number;
  contact_name: string;
  title: string;
  email: string;
  phone?: string;
  role_type: string;
  influence_level: number;
  decision_authority: number;
  engagement_level: number;
  is_primary: boolean;
  department?: string;
}

interface ContactRolesManagerProps {
  accountId: number;
}

// Mock data - replace with actual API calls
const mockContacts: ContactRole[] = [
  {
    id: 1,
    contact_id: 1,
    contact_name: 'John Smith',
    title: 'CEO',
    email: 'john.smith@company.com',
    phone: '+1 555-0123',
    role_type: 'decision_maker',
    influence_level: 10,
    decision_authority: 10,
    engagement_level: 8,
    is_primary: true,
    department: 'Executive'
  },
  {
    id: 2,
    contact_id: 2,
    contact_name: 'Jane Doe',
    title: 'CTO',
    email: 'jane.doe@company.com',
    role_type: 'technical_buyer',
    influence_level: 8,
    decision_authority: 7,
    engagement_level: 9,
    is_primary: false,
    department: 'Technology'
  },
  {
    id: 3,
    contact_id: 3,
    contact_name: 'Mike Johnson',
    title: 'Procurement Manager',
    email: 'mike.j@company.com',
    role_type: 'economic_buyer',
    influence_level: 7,
    decision_authority: 8,
    engagement_level: 6,
    is_primary: false,
    department: 'Finance'
  }
];

export const ContactRolesManager: React.FC<ContactRolesManagerProps> = ({ accountId }) => {
  const [contacts] = useState<ContactRole[]>(mockContacts);
  const [selectedContact, setSelectedContact] = useState<ContactRole | null>(null);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [committeeDialogOpen, setCommitteeDialogOpen] = useState(false);

  const getRoleColor = (role: string) => {
    const colors: Record<string, any> = {
      decision_maker: 'error',
      technical_buyer: 'primary',
      economic_buyer: 'success',
      influencer: 'warning',
      champion: 'secondary',
      end_user: 'default'
    };
    return colors[role] || 'default';
  };

  const getInfluenceColor = (level: number) => {
    if (level >= 8) return '#22c55e';
    if (level >= 6) return '#eab308';
    if (level >= 4) return '#f97316';
    return '#6b7280';
  };

  const formatRoleType = (type: string) => {
    return type.split('_').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  return (
    <Grid container spacing={3}>
      {/* Summary Cards */}
      <Grid item xs={12}>
        <Grid container spacing={2}>
          <Grid item xs={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <PersonIcon sx={{ color: 'primary.main' }} />
                  <Box>
                    <Typography variant="caption" color="textSecondary">
                      Total Contacts
                    </Typography>
                    <Typography variant="h4" fontWeight="bold">
                      {contacts.length}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <StarIcon sx={{ color: 'warning.main' }} />
                  <Box>
                    <Typography variant="caption" color="textSecondary">
                      Decision Makers
                    </Typography>
                    <Typography variant="h4" fontWeight="bold">
                      {contacts.filter(c => c.role_type === 'decision_maker').length}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <InfluenceIcon sx={{ color: 'success.main' }} />
                  <Box>
                    <Typography variant="caption" color="textSecondary">
                      Avg Influence
                    </Typography>
                    <Typography variant="h4" fontWeight="bold">
                      {(contacts.reduce((sum, c) => sum + c.influence_level, 0) / contacts.length).toFixed(1)}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <GroupIcon sx={{ color: 'info.main' }} />
                  <Box>
                    <Typography variant="caption" color="textSecondary">
                      Committees
                    </Typography>
                    <Typography variant="h4" fontWeight="bold">
                      2
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Grid>

      {/* Contacts Table */}
      <Grid item xs={12}>
        <Paper sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6">
              Contacts & Roles
            </Typography>
            <Stack direction="row" spacing={1}>
              <Button
                variant="outlined"
                startIcon={<GroupIcon />}
                onClick={() => setCommitteeDialogOpen(true)}
              >
                Buying Committee
              </Button>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setRoleDialogOpen(true)}
              >
                Add Contact
              </Button>
            </Stack>
          </Box>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Contact</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Influence</TableCell>
                  <TableCell>Decision Authority</TableCell>
                  <TableCell>Engagement</TableCell>
                  <TableCell>Department</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {contacts.map((contact) => (
                  <TableRow key={contact.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {contact.is_primary && (
                          <Tooltip title="Primary Contact">
                            <StarIcon sx={{ color: 'warning.main', fontSize: 18 }} />
                          </Tooltip>
                        )}
                        <Avatar sx={{ width: 32, height: 32 }}>
                          {contact.contact_name.split(' ').map(n => n[0]).join('')}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight="bold">
                            {contact.contact_name}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {contact.title} • {contact.email}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={formatRoleType(contact.role_type)}
                        size="small"
                        color={getRoleColor(contact.role_type)}
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ width: 60 }}>
                          <Slider
                            value={contact.influence_level}
                            max={10}
                            disabled
                            sx={{
                              '& .MuiSlider-thumb': { display: 'none' },
                              '& .MuiSlider-track': {
                                backgroundColor: getInfluenceColor(contact.influence_level)
                              }
                            }}
                          />
                        </Box>
                        <Typography variant="caption">
                          {contact.influence_level}/10
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ width: 60 }}>
                          <Slider
                            value={contact.decision_authority}
                            max={10}
                            disabled
                            sx={{
                              '& .MuiSlider-thumb': { display: 'none' },
                              '& .MuiSlider-track': {
                                backgroundColor: getInfluenceColor(contact.decision_authority)
                              }
                            }}
                          />
                        </Box>
                        <Typography variant="caption">
                          {contact.decision_authority}/10
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={`${contact.engagement_level}/10`}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      {contact.department || 'N/A'}
                    </TableCell>
                    <TableCell align="center">
                      <IconButton
                        size="small"
                        onClick={() => {
                          setSelectedContact(contact);
                          setRoleDialogOpen(true);
                        }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" color="error">
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}

                {contacts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                      <Typography color="textSecondary">
                        No contacts assigned to this account yet
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </Grid>

      {/* Influence Map */}
      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Influence Map
          </Typography>
          <Alert severity="info" sx={{ mt: 2 }}>
            Interactive influence visualization will be displayed here
          </Alert>
        </Paper>
      </Grid>

      {/* Buying Committee */}
      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Active Buying Committee
          </Typography>
          {contacts.length > 0 ? (
            <Stack spacing={2}>
              {contacts.slice(0, 3).map((contact) => (
                <Box
                  key={contact.id}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    p: 1,
                    borderRadius: 1,
                    bgcolor: 'grey.50'
                  }}
                >
                  <Avatar sx={{ width: 32, height: 32 }}>
                    {contact.contact_name.split(' ').map(n => n[0]).join('')}
                  </Avatar>
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="body2" fontWeight="bold">
                      {contact.contact_name}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      {formatRoleType(contact.role_type)}
                    </Typography>
                  </Box>
                  <Chip
                    label={`Influence: ${contact.influence_level}`}
                    size="small"
                    sx={{
                      backgroundColor: getInfluenceColor(contact.influence_level),
                      color: 'white'
                    }}
                  />
                </Box>
              ))}
            </Stack>
          ) : (
            <Typography variant="body2" color="textSecondary">
              No buying committee formed yet
            </Typography>
          )}
        </Paper>
      </Grid>

      {/* Add/Edit Role Dialog */}
      <Dialog open={roleDialogOpen} onClose={() => setRoleDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {selectedContact ? 'Edit Contact Role' : 'Add Contact Role'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 2 }}>
            <TextField
              label="Contact Name"
              fullWidth
              defaultValue={selectedContact?.contact_name}
            />

            <FormControl fullWidth>
              <InputLabel>Role Type</InputLabel>
              <Select
                defaultValue={selectedContact?.role_type || 'influencer'}
                label="Role Type"
              >
                <MenuItem value="decision_maker">Decision Maker</MenuItem>
                <MenuItem value="technical_buyer">Technical Buyer</MenuItem>
                <MenuItem value="economic_buyer">Economic Buyer</MenuItem>
                <MenuItem value="influencer">Influencer</MenuItem>
                <MenuItem value="champion">Champion</MenuItem>
                <MenuItem value="end_user">End User</MenuItem>
              </Select>
            </FormControl>

            <Box>
              <Typography gutterBottom>Influence Level</Typography>
              <Slider
                defaultValue={selectedContact?.influence_level || 5}
                valueLabelDisplay="auto"
                step={1}
                marks
                min={0}
                max={10}
              />
            </Box>

            <Box>
              <Typography gutterBottom>Decision Authority</Typography>
              <Slider
                defaultValue={selectedContact?.decision_authority || 5}
                valueLabelDisplay="auto"
                step={1}
                marks
                min={0}
                max={10}
              />
            </Box>

            <FormControl fullWidth>
              <InputLabel>Department</InputLabel>
              <Select
                defaultValue={selectedContact?.department || ''}
                label="Department"
              >
                <MenuItem value="Executive">Executive</MenuItem>
                <MenuItem value="Technology">Technology</MenuItem>
                <MenuItem value="Finance">Finance</MenuItem>
                <MenuItem value="Operations">Operations</MenuItem>
                <MenuItem value="Sales">Sales</MenuItem>
                <MenuItem value="Marketing">Marketing</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRoleDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => setRoleDialogOpen(false)}>
            {selectedContact ? 'Update' : 'Add'} Role
          </Button>
        </DialogActions>
      </Dialog>

      {/* Buying Committee Dialog */}
      <Dialog
        open={committeeDialogOpen}
        onClose={() => setCommitteeDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Manage Buying Committee</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mt: 2 }}>
            Select contacts to form a buying committee for opportunities
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCommitteeDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => setCommitteeDialogOpen(false)}>
            Create Committee
          </Button>
        </DialogActions>
      </Dialog>
    </Grid>
  );
};

export default ContactRolesManager;