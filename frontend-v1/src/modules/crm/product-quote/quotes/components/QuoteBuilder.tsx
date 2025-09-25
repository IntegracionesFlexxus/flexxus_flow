/**
 * QuoteBuilder Component - Sprint 20 Implementation
 * Constructor avanzado de cotizaciones con integración a ProductGrid
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Grid,
  Button,
  TextField,
  Select,
  FormControl,
  InputLabel,
  MenuItem,
  Divider,
  Alert,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tooltip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Fab,
  Badge,
  LinearProgress
} from '@mui/material';
import {
  Add as AddIcon,
  Remove as RemoveIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Send as SendIcon,
  Print as PrintIcon,
  Search as SearchIcon,
  ShoppingCart as CartIcon,
  Calculate as CalculateIcon,
  ExpandMore as ExpandMoreIcon,
  Check as CheckIcon,
  Person as PersonIcon,
  Business as BusinessIcon,
  AttachMoney as MoneyIcon,
  Schedule as ScheduleIcon,
  Assignment as AssignmentIcon
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { useQuoteBuilderEnhanced } from '../hooks/useQuoteBuilderEnhanced';
import { useProductCatalogEnhanced } from '../../catalog/hooks/useProductCatalogEnhanced';
import ProductGrid from '../../catalog/components/ProductGrid';
import {
  Quote,
  QuoteItem,
  CreateQuoteDto,
  UpdateQuoteDto
} from '../../shared/interfaces/quote.interfaces';
import { Product } from '../../shared/interfaces/product.interfaces';
import { useNotification } from '../../../../../shared/hooks/useNotification';
import { formatCurrency } from '../../../../../shared/utils/formatters';

interface QuoteBuilderProps {
  quoteId?: number;
  customerId?: number;
  opportunityId?: number;
  onSave?: (quote: Quote) => void;
  onCancel?: () => void;
  mode?: 'create' | 'edit' | 'view';
  template?: string;
}

interface QuoteBuilderStep {
  label: string;
  component: React.ReactNode;
  validate?: () => boolean;
  optional?: boolean;
}

export const QuoteBuilder: React.FC<QuoteBuilderProps> = ({
  quoteId,
  customerId,
  opportunityId,
  onSave,
  onCancel,
  mode = 'create',
  template = 'standard'
}) => {
  // States
  const [activeStep, setActiveStep] = useState(0);
  const [quoteData, setQuoteData] = useState<Partial<CreateQuoteDto>>({
    customer_id: customerId,
    opportunity_id: opportunityId,
    currency: 'USD',
    language: 'en',
    type: template as any,
    status: 'draft',
    items: []
  });
  const [quoteItems, setQuoteItems] = useState<QuoteItem[]>([]);
  const [calculations, setCalculations] = useState({
    subtotal: 0,
    tax_amount: 0,
    discount_amount: 0,
    total_amount: 0,
    margin_amount: 0,
    margin_percentage: 0
  });
  const [productSelectorOpen, setProductSelectorOpen] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Hooks
  const {
    quote,
    loading,
    error,
    createQuote,
    updateQuote,
    calculateTotals,
    generatePdf,
    sendEmail,
    saveAsDraft,
    duplicate
  } = useQuoteBuilderEnhanced();

  const { showNotification } = useNotification();

  // Effects
  useEffect(() => {
    if (quoteId && mode !== 'create') {
      // Load existing quote
      // This would typically fetch the quote data
    }
  }, [quoteId, mode]);

  // Auto-save effect
  useEffect(() => {
    if (mode === 'create' || mode === 'edit') {
      const timer = setTimeout(() => {
        handleAutoSave();
      }, 5000); // Auto-save every 5 seconds

      return () => clearTimeout(timer);
    }
  }, [quoteData, quoteItems]);

  // Calculate totals when items change
  useEffect(() => {
    if (quoteItems.length > 0) {
      handleCalculateTotals();
    }
  }, [quoteItems]);

  // Handlers
  const handleAutoSave = useCallback(async () => {
    if (mode === 'view' || !quoteData.quote_number) return;

    try {
      setAutoSaving(true);
      await saveAsDraft({
        ...quoteData,
        items: quoteItems
      } as CreateQuoteDto);
    } catch (error) {
      // Silent fail for auto-save
    } finally {
      setAutoSaving(false);
    }
  }, [quoteData, quoteItems, mode, saveAsDraft]);

  const handleQuoteDataChange = useCallback((field: string, value: any) => {
    setQuoteData(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  const handleAddProduct = useCallback((product: Product) => {
    const newItem: QuoteItem = {
      id: Date.now(), // Temporary ID
      product_id: product.id,
      variant_id: undefined,
      description: product.name,
      quantity: 1,
      unit_price: product.base_price,
      discount_percentage: 0,
      discount_amount: 0,
      line_total: product.base_price,
      position: quoteItems.length + 1,
      product_name: product.name,
      product_sku: product.sku
    };

    setQuoteItems(prev => [...prev, newItem]);
    setProductSelectorOpen(false);
  }, [quoteItems.length]);

  const handleUpdateItem = useCallback((index: number, field: string, value: any) => {
    setQuoteItems(prev => {
      const newItems = [...prev];
      const item = { ...newItems[index] };

      item[field] = value;

      // Recalculate line total
      if (field === 'quantity' || field === 'unit_price' || field === 'discount_percentage' || field === 'discount_amount') {
        const subtotal = item.quantity * item.unit_price;
        const discountAmount = item.discount_percentage > 0
          ? subtotal * (item.discount_percentage / 100)
          : item.discount_amount || 0;
        item.line_total = subtotal - discountAmount;

        // Update discount fields consistently
        if (field === 'discount_percentage') {
          item.discount_amount = discountAmount;
        } else if (field === 'discount_amount') {
          item.discount_percentage = subtotal > 0 ? (discountAmount / subtotal) * 100 : 0;
        }
      }

      newItems[index] = item;
      return newItems;
    });
  }, []);

  const handleRemoveItem = useCallback((index: number) => {
    setQuoteItems(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleCalculateTotals = useCallback(async () => {
    try {
      const totals = await calculateTotals(quoteItems, quoteData.customer_id, quoteData.currency);
      setCalculations(totals);

      // Update quote data with calculated totals
      setQuoteData(prev => ({
        ...prev,
        ...totals
      }));
    } catch (error: any) {
      showNotification(error.message || 'Calculation failed', 'error');
    }
  }, [quoteItems, quoteData.customer_id, quoteData.currency, calculateTotals, showNotification]);

  const handleSave = useCallback(async () => {
    try {
      const quoteToSave = {
        ...quoteData,
        items: quoteItems,
        ...calculations
      } as CreateQuoteDto;

      let savedQuote: Quote;
      if (mode === 'create') {
        savedQuote = await createQuote(quoteToSave);
      } else {
        savedQuote = await updateQuote(quoteId!, quoteToSave as UpdateQuoteDto);
      }

      showNotification('Quote saved successfully', 'success');
      onSave?.(savedQuote);
    } catch (error: any) {
      showNotification(error.message || 'Save failed', 'error');
    }
  }, [quoteData, quoteItems, calculations, mode, quoteId, createQuote, updateQuote, onSave, showNotification]);

  const handleStepChange = useCallback((step: number) => {
    // Validate current step before moving
    if (step > activeStep && !validateStep(activeStep)) {
      return;
    }
    setActiveStep(step);
  }, [activeStep]);

  const validateStep = useCallback((step: number): boolean => {
    const errors: string[] = [];

    switch (step) {
      case 0: // Customer & Basic Info
        if (!quoteData.customer_id) errors.push('Customer is required');
        if (!quoteData.quote_number) errors.push('Quote number is required');
        break;
      case 1: // Products & Items
        if (quoteItems.length === 0) errors.push('At least one product is required');
        break;
      case 2: // Terms & Conditions
        // Optional validation
        break;
      case 3: // Review & Send
        // Final validation
        break;
    }

    setValidationErrors(errors);
    return errors.length === 0;
  }, [quoteData, quoteItems]);

  // Render step components
  const renderCustomerStep = () => (
    <Card>
      <CardHeader
        title="Customer & Basic Information"
        avatar={<PersonIcon />}
      />
      <CardContent>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Quote Number"
              value={quoteData.quote_number || ''}
              onChange={(e) => handleQuoteDataChange('quote_number', e.target.value)}
              required
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Customer</InputLabel>
              <Select
                value={quoteData.customer_id || ''}
                onChange={(e) => handleQuoteDataChange('customer_id', e.target.value)}
                required
              >
                <MenuItem value={1}>Sample Customer</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Opportunity</InputLabel>
              <Select
                value={quoteData.opportunity_id || ''}
                onChange={(e) => handleQuoteDataChange('opportunity_id', e.target.value)}
              >
                <MenuItem value="">None</MenuItem>
                <MenuItem value={1}>Sample Opportunity</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              type="date"
              label="Valid Until"
              value={quoteData.valid_until ? quoteData.valid_until.split('T')[0] : ''}
              onChange={(e) => handleQuoteDataChange('valid_until', e.target.value ? new Date(e.target.value).toISOString() : '')}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Currency</InputLabel>
              <Select
                value={quoteData.currency || 'USD'}
                onChange={(e) => handleQuoteDataChange('currency', e.target.value)}
              >
                <MenuItem value="USD">USD</MenuItem>
                <MenuItem value="EUR">EUR</MenuItem>
                <MenuItem value="GBP">GBP</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Type</InputLabel>
              <Select
                value={quoteData.type || 'standard'}
                onChange={(e) => handleQuoteDataChange('type', e.target.value)}
              >
                <MenuItem value="standard">Standard</MenuItem>
                <MenuItem value="custom">Custom</MenuItem>
                <MenuItem value="proposal">Proposal</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );

  const renderProductsStep = () => (
    <Box>
      <Card sx={{ mb: 3 }}>
        <CardHeader
          title="Quote Items"
          avatar={<CartIcon />}
          action={
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setProductSelectorOpen(true)}
            >
              Add Product
            </Button>
          }
        />
        <CardContent>
          {quoteItems.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <CartIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                No items added yet
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Click "Add Product" to start building your quote
              </Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Product</TableCell>
                    <TableCell align="right">Quantity</TableCell>
                    <TableCell align="right">Unit Price</TableCell>
                    <TableCell align="right">Discount</TableCell>
                    <TableCell align="right">Line Total</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {quoteItems.map((item, index) => (
                    <TableRow key={item.id || index}>
                      <TableCell>
                        <Box>
                          <Typography variant="subtitle2">
                            {item.product_name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            SKU: {item.product_sku}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="right">
                        <TextField
                          type="number"
                          size="small"
                          value={item.quantity}
                          onChange={(e) => handleUpdateItem(index, 'quantity', Number(e.target.value))}
                          inputProps={{ min: 0, step: 0.01 }}
                          sx={{ width: 80 }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <TextField
                          type="number"
                          size="small"
                          value={item.unit_price}
                          onChange={(e) => handleUpdateItem(index, 'unit_price', Number(e.target.value))}
                          inputProps={{ min: 0, step: 0.01 }}
                          sx={{ width: 100 }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <TextField
                          type="number"
                          size="small"
                          value={item.discount_percentage}
                          onChange={(e) => handleUpdateItem(index, 'discount_percentage', Number(e.target.value))}
                          inputProps={{ min: 0, max: 100, step: 0.01 }}
                          sx={{ width: 80 }}
                          InputProps={{
                            endAdornment: <Typography variant="caption">%</Typography>
                          }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="subtitle2">
                          {formatCurrency(item.line_total, quoteData.currency)}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <IconButton
                          size="small"
                          onClick={() => handleRemoveItem(index)}
                          color="error"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Totals Card */}
      {quoteItems.length > 0 && (
        <Card>
          <CardHeader
            title="Quote Totals"
            avatar={<CalculateIcon />}
            action={
              <Button
                variant="outlined"
                startIcon={<CalculateIcon />}
                onClick={handleCalculateTotals}
              >
                Recalculate
              </Button>
            }
          />
          <CardContent>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">Subtotal:</Typography>
                  <Typography variant="body2">
                    {formatCurrency(calculations.subtotal, quoteData.currency)}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">Discount:</Typography>
                  <Typography variant="body2">
                    -{formatCurrency(calculations.discount_amount, quoteData.currency)}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">Tax:</Typography>
                  <Typography variant="body2">
                    {formatCurrency(calculations.tax_amount, quoteData.currency)}
                  </Typography>
                </Box>
                <Divider sx={{ my: 1 }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="h6">Total:</Typography>
                  <Typography variant="h6" color="primary">
                    {formatCurrency(calculations.total_amount, quoteData.currency)}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">Margin:</Typography>
                  <Typography variant="body2">
                    {formatCurrency(calculations.margin_amount, quoteData.currency)}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2">Margin %:</Typography>
                  <Typography variant="body2">
                    {calculations.margin_percentage.toFixed(2)}%
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}
    </Box>
  );

  const renderTermsStep = () => (
    <Card>
      <CardHeader
        title="Terms & Conditions"
        avatar={<AssignmentIcon />}
      />
      <CardContent>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              multiline
              rows={4}
              label="Payment Terms"
              value={quoteData.payment_terms || ''}
              onChange={(e) => handleQuoteDataChange('payment_terms', e.target.value)}
              placeholder="e.g., Net 30 days"
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              multiline
              rows={4}
              label="Delivery Terms"
              value={quoteData.delivery_terms || ''}
              onChange={(e) => handleQuoteDataChange('delivery_terms', e.target.value)}
              placeholder="e.g., FOB Origin"
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              rows={6}
              label="Terms & Conditions"
              value={quoteData.terms_conditions || ''}
              onChange={(e) => handleQuoteDataChange('terms_conditions', e.target.value)}
              placeholder="Enter additional terms and conditions..."
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              rows={4}
              label="Notes"
              value={quoteData.notes || ''}
              onChange={(e) => handleQuoteDataChange('notes', e.target.value)}
              placeholder="Customer-visible notes..."
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              rows={4}
              label="Internal Notes"
              value={quoteData.internal_notes || ''}
              onChange={(e) => handleQuoteDataChange('internal_notes', e.target.value)}
              placeholder="Internal notes (not visible to customer)..."
            />
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );

  const renderReviewStep = () => (
    <Box>
      {/* Quote Summary */}
      <Card sx={{ mb: 3 }}>
        <CardHeader title="Quote Summary" />
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" gutterBottom>
                Quote Details
              </Typography>
              <Typography variant="body2">
                Quote #: {quoteData.quote_number}
              </Typography>
              <Typography variant="body2">
                Customer: {/* Customer name would be displayed here */}
              </Typography>
              <Typography variant="body2">
                Currency: {quoteData.currency}
              </Typography>
              <Typography variant="body2">
                Valid Until: {quoteData.valid_until ? new Date(quoteData.valid_until).toLocaleDateString() : 'Not set'}
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" gutterBottom>
                Quote Totals
              </Typography>
              <Typography variant="h4" color="primary">
                {formatCurrency(calculations.total_amount, quoteData.currency)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {quoteItems.length} item{quoteItems.length !== 1 ? 's' : ''}
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <Card>
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <Button
                fullWidth
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={handleSave}
                disabled={loading}
              >
                Save Quote
              </Button>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<PrintIcon />}
                onClick={() => generatePdf(quoteId!)}
                disabled={!quoteId}
              >
                Generate PDF
              </Button>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<SendIcon />}
                disabled={!quoteId}
              >
                Send to Customer
              </Button>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Button
                fullWidth
                variant="outlined"
                onClick={onCancel}
              >
                Cancel
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );

  // Steps configuration
  const steps: QuoteBuilderStep[] = useMemo(() => [
    {
      label: 'Customer & Basic Info',
      component: renderCustomerStep(),
      validate: () => validateStep(0)
    },
    {
      label: 'Products & Items',
      component: renderProductsStep(),
      validate: () => validateStep(1)
    },
    {
      label: 'Terms & Conditions',
      component: renderTermsStep(),
      optional: true
    },
    {
      label: 'Review & Send',
      component: renderReviewStep()
    }
  ], [quoteData, quoteItems, calculations]);

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 3 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4">
          {mode === 'create' ? 'Create Quote' : mode === 'edit' ? 'Edit Quote' : 'View Quote'}
        </Typography>
        {autoSaving && (
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <LinearProgress sx={{ width: 100, mr: 1 }} />
            <Typography variant="caption" color="text.secondary">
              Auto-saving...
            </Typography>
          </Box>
        )}
      </Box>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            Please fix the following errors:
          </Typography>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {validationErrors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </Alert>
      )}

      {/* Stepper */}
      <Stepper activeStep={activeStep} orientation="vertical">
        {steps.map((step, index) => (
          <Step key={step.label}>
            <StepLabel
              optional={step.optional && <Typography variant="caption">Optional</Typography>}
              onClick={() => handleStepChange(index)}
              sx={{ cursor: 'pointer' }}
            >
              {step.label}
            </StepLabel>
            <StepContent>
              {step.component}
              <Box sx={{ mt: 2 }}>
                <Button
                  variant="contained"
                  onClick={() => handleStepChange(index + 1)}
                  disabled={index === steps.length - 1}
                >
                  {index === steps.length - 1 ? 'Finish' : 'Continue'}
                </Button>
                <Button
                  onClick={() => handleStepChange(index - 1)}
                  disabled={index === 0}
                  sx={{ ml: 1 }}
                >
                  Back
                </Button>
              </Box>
            </StepContent>
          </Step>
        ))}
      </Stepper>

      {/* Product Selector Dialog */}
      <Dialog
        open={productSelectorOpen}
        onClose={() => setProductSelectorOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>Select Products</DialogTitle>
        <DialogContent>
          <ProductGrid
            onSelectProduct={handleAddProduct}
            mode="selection"
            hideActions
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setProductSelectorOpen(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default QuoteBuilder;