/**
 * SearchInput Component - Sprint 3
 * Campo de búsqueda reutilizable con debounce y sugerencias
 * Implementación con principios SOLID y Clean Code
 */

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  TextField,
  InputAdornment,
  IconButton,
  Box,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  CircularProgress,
  Typography,
  Divider,
  Popper,
  Fade,
  ClickAwayListener,
  Badge,
  Tooltip,
  Stack
} from '@mui/material';
import {
  Search,
  X,
  Clock,
  TrendingUp,
  Filter,
  ChevronRight,
  Star,
  History,
  Hash,
  FileText,
  User,
  Folder
} from 'lucide-react';
import { useDebounce } from '@/shared/hooks/useDebounce';

export interface SearchSuggestion {
  id: string;
  text: string;
  type?: 'recent' | 'popular' | 'result';
  category?: string;
  icon?: React.ReactNode;
  meta?: string;
  count?: number;
}

export interface SearchFilter {
  id: string;
  label: string;
  value: any;
  active?: boolean;
}

export interface SearchInputProps {
  // Basic props
  value?: string;
  onChange: (value: string) => void;
  onSearch?: (value: string, filters?: SearchFilter[]) => void;
  placeholder?: string;
  label?: string;
  // Features
  debounceMs?: number;
  showSuggestions?: boolean;
  suggestions?: SearchSuggestion[];
  onSuggestionSelect?: (suggestion: SearchSuggestion) => void;
  loadingSuggestions?: boolean;
  // History
  showHistory?: boolean;
  recentSearches?: string[];
  onClearHistory?: () => void;
  maxHistoryItems?: number;
  // Filters
  filters?: SearchFilter[];
  onFilterChange?: (filters: SearchFilter[]) => void;
  showFilterCount?: boolean;
  // Styling
  fullWidth?: boolean;
  size?: 'small' | 'medium';
  variant?: 'outlined' | 'filled' | 'standard';
  autoFocus?: boolean;
  disabled?: boolean;
  error?: boolean;
  helperText?: string;
  // Advanced
  minSearchLength?: number;
  maxSearchLength?: number;
  allowClear?: boolean;
  showSearchButton?: boolean;
  enterKeyHint?: 'search' | 'enter' | 'done' | 'go' | 'next' | 'previous' | 'send';
  inputProps?: any;
}

/**
 * SearchInput Component
 * Principios aplicados:
 * - S: Responsabilidad única de búsqueda
 * - O: Extensible mediante props y sugerencias
 * - L: Sustituible por cualquier input de búsqueda
 * - I: Interface segregada con features opcionales
 * - D: Depende de abstracciones (props)
 */
export const SearchInput: React.FC<SearchInputProps> = ({
  value: externalValue = '',
  onChange,
  onSearch,
  placeholder = 'Buscar...',
  label,
  // Features
  debounceMs = 300,
  showSuggestions = true,
  suggestions = [],
  onSuggestionSelect,
  loadingSuggestions = false,
  // History
  showHistory = false,
  recentSearches = [],
  onClearHistory,
  maxHistoryItems = 5,
  // Filters
  filters = [],
  onFilterChange,
  showFilterCount = true,
  // Styling
  fullWidth = true,
  size = 'medium',
  variant = 'outlined',
  autoFocus = false,
  disabled = false,
  error = false,
  helperText,
  // Advanced
  minSearchLength = 1,
  maxSearchLength = 100,
  allowClear = true,
  showSearchButton = false,
  enterKeyHint = 'search',
  inputProps = {}
}) => {
  // State
  const [internalValue, setInternalValue] = useState(externalValue);
  const [isFocused, setIsFocused] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const anchorRef = useRef<HTMLDivElement>(null);

  // Debounced value
  const debouncedValue = useDebounce(internalValue, debounceMs);

  // Update internal value when external changes
  useEffect(() => {
    setInternalValue(externalValue);
  }, [externalValue]);

  // Trigger onChange when debounced value changes
  useEffect(() => {
    if (debouncedValue !== externalValue) {
      onChange(debouncedValue);
    }
  }, [debouncedValue, externalValue, onChange]);

  /**
   * Active filters count
   */
  const activeFiltersCount = useMemo(() => {
    return filters.filter(f => f.active).length;
  }, [filters]);

  /**
   * Combined suggestions with history
   */
  const combinedSuggestions = useMemo(() => {
    const items: SearchSuggestion[] = [];

    // Add recent searches
    if (showHistory && recentSearches.length > 0 && !internalValue) {
      const historyItems = recentSearches.slice(0, maxHistoryItems).map(text => ({
        id: `history-${text}`,
        text,
        type: 'recent' as const,
        icon: <Clock size={16} />
      }));
      items.push(...historyItems);
    }

    // Add suggestions
    if (internalValue.length >= minSearchLength) {
      items.push(...suggestions);
    }

    return items;
  }, [showHistory, recentSearches, internalValue, minSearchLength, suggestions, maxHistoryItems]);

  /**
   * Handle input change
   */
  const handleInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value;
    
    if (newValue.length <= maxSearchLength) {
      setInternalValue(newValue);
      setShowDropdown(true);
      setSelectedIndex(-1);
    }
  }, [maxSearchLength]);

  /**
   * Handle clear
   */
  const handleClear = useCallback(() => {
    setInternalValue('');
    onChange('');
    setShowDropdown(false);
    inputRef.current?.focus();
  }, [onChange]);

  /**
   * Handle search
   */
  const handleSearch = useCallback(() => {
    if (internalValue.trim().length >= minSearchLength) {
      onSearch?.(internalValue.trim(), filters);
      setShowDropdown(false);
    }
  }, [internalValue, minSearchLength, onSearch, filters]);

  /**
   * Handle suggestion select
   */
  const handleSuggestionClick = useCallback((suggestion: SearchSuggestion) => {
    setInternalValue(suggestion.text);
    onChange(suggestion.text);
    onSuggestionSelect?.(suggestion);
    onSearch?.(suggestion.text, filters);
    setShowDropdown(false);
    inputRef.current?.blur();
  }, [onChange, onSuggestionSelect, onSearch, filters]);

  /**
   * Handle keyboard navigation
   */
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (!showDropdown || combinedSuggestions.length === 0) {
      if (event.key === 'Enter') {
        handleSearch();
      }
      return;
    }

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setSelectedIndex(prev => 
          prev < combinedSuggestions.length - 1 ? prev + 1 : 0
        );
        break;
      
      case 'ArrowUp':
        event.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : combinedSuggestions.length - 1
        );
        break;
      
      case 'Enter':
        event.preventDefault();
        if (selectedIndex >= 0) {
          handleSuggestionClick(combinedSuggestions[selectedIndex]);
        } else {
          handleSearch();
        }
        break;
      
      case 'Escape':
        setShowDropdown(false);
        setSelectedIndex(-1);
        break;
    }
  }, [showDropdown, combinedSuggestions, selectedIndex, handleSuggestionClick, handleSearch]);

  /**
   * Handle filter toggle
   */
  const handleFilterToggle = useCallback((filterId: string) => {
    if (!onFilterChange) return;

    const updatedFilters = filters.map(filter =>
      filter.id === filterId
        ? { ...filter, active: !filter.active }
        : filter
    );
    onFilterChange(updatedFilters);
  }, [filters, onFilterChange]);

  /**
   * Get suggestion icon
   */
  const getSuggestionIcon = useCallback((suggestion: SearchSuggestion) => {
    if (suggestion.icon) return suggestion.icon;

    switch (suggestion.type) {
      case 'recent':
        return <Clock size={16} />;
      case 'popular':
        return <TrendingUp size={16} />;
      default:
        return <Search size={16} />;
    }
  }, []);

  /**
   * Render suggestion item
   */
  const renderSuggestion = useCallback((suggestion: SearchSuggestion, index: number) => {
    const isSelected = index === selectedIndex;

    return (
      <ListItem
        key={suggestion.id}
        button
        selected={isSelected}
        onClick={() => handleSuggestionClick(suggestion)}
        sx={{
          '&:hover': {
            backgroundColor: 'action.hover'
          }
        }}
      >
        <ListItemIcon sx={{ minWidth: 36 }}>
          {getSuggestionIcon(suggestion)}
        </ListItemIcon>
        
        <ListItemText
          primary={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2">
                {suggestion.text}
              </Typography>
              {suggestion.category && (
                <Chip
                  label={suggestion.category}
                  size="small"
                  sx={{ height: 18, fontSize: '0.7rem' }}
                />
              )}
            </Box>
          }
          secondary={suggestion.meta}
        />
        
        {suggestion.count !== undefined && (
          <Typography variant="caption" color="text.secondary">
            {suggestion.count}
          </Typography>
        )}
      </ListItem>
    );
  }, [selectedIndex, handleSuggestionClick, getSuggestionIcon]);

  return (
    <Box sx={{ position: 'relative', width: fullWidth ? '100%' : 'auto' }} ref={anchorRef}>
      {/* Filters */}
      {filters.length > 0 && (
        <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
          {filters.map(filter => (
            <Chip
              key={filter.id}
              label={filter.label}
              size="small"
              variant={filter.active ? 'filled' : 'outlined'}
              onClick={() => handleFilterToggle(filter.id)}
              onDelete={filter.active ? () => handleFilterToggle(filter.id) : undefined}
              color={filter.active ? 'primary' : 'default'}
            />
          ))}
        </Stack>
      )}

      {/* Search Input */}
      <TextField
        ref={inputRef}
        label={label}
        placeholder={placeholder}
        value={internalValue}
        onChange={handleInputChange}
        onFocus={() => {
          setIsFocused(true);
          setShowDropdown(true);
        }}
        onBlur={() => {
          setIsFocused(false);
          // Delay to allow click on suggestion
          setTimeout(() => setShowDropdown(false), 200);
        }}
        onKeyDown={handleKeyDown}
        fullWidth={fullWidth}
        size={size}
        variant={variant}
        autoFocus={autoFocus}
        disabled={disabled}
        error={error}
        helperText={helperText}
        InputProps={{
          ...inputProps,
          startAdornment: (
            <InputAdornment position="start">
              {loadingSuggestions ? (
                <CircularProgress size={20} />
              ) : (
                <Badge
                  badgeContent={showFilterCount && activeFiltersCount > 0 ? activeFiltersCount : 0}
                  color="primary"
                >
                  <Search size={20} />
                </Badge>
              )}
            </InputAdornment>
          ),
          endAdornment: (
            <InputAdornment position="end">
              <Stack direction="row" spacing={0.5}>
                {allowClear && internalValue && (
                  <IconButton
                    size="small"
                    onClick={handleClear}
                    edge="end"
                  >
                    <X size={18} />
                  </IconButton>
                )}
                {showSearchButton && (
                  <IconButton
                    size="small"
                    onClick={handleSearch}
                    edge="end"
                    disabled={internalValue.length < minSearchLength}
                  >
                    <ChevronRight size={18} />
                  </IconButton>
                )}
              </Stack>
            </InputAdornment>
          )
        }}
        inputProps={{
          enterKeyHint,
          maxLength: maxSearchLength
        }}
      />

      {/* Suggestions Dropdown */}
      <Popper
        open={showSuggestions && showDropdown && combinedSuggestions.length > 0}
        anchorEl={anchorRef.current}
        placement="bottom-start"
        style={{ zIndex: 1300, width: anchorRef.current?.offsetWidth }}
        transition
      >
        {({ TransitionProps }) => (
          <Fade {...TransitionProps} timeout={350}>
            <Paper elevation={8} sx={{ mt: 1, maxHeight: 400, overflow: 'auto' }}>
              {/* History section */}
              {showHistory && recentSearches.length > 0 && !internalValue && (
                <>
                  <Box sx={{ 
                    px: 2, 
                    py: 1, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    backgroundColor: 'background.default'
                  }}>
                    <Typography variant="caption" color="text.secondary">
                      Búsquedas recientes
                    </Typography>
                    {onClearHistory && (
                      <IconButton size="small" onClick={onClearHistory}>
                        <X size={14} />
                      </IconButton>
                    )}
                  </Box>
                  <Divider />
                </>
              )}

              {/* Suggestions list */}
              <List dense disablePadding>
                {combinedSuggestions.map((suggestion, index) => 
                  renderSuggestion(suggestion, index)
                )}
              </List>

              {/* Loading state */}
              {loadingSuggestions && (
                <>
                  <Divider />
                  <Box sx={{ p: 2, textAlign: 'center' }}>
                    <CircularProgress size={24} />
                  </Box>
                </>
              )}
            </Paper>
          </Fade>
        )}
      </Popper>
    </Box>
  );
};

/**
 * Hook para gestionar búsquedas con historial
 * Clean Code: Abstracción de lógica de búsqueda
 */
export const useSearchWithHistory = (storageKey = 'search-history', maxItems = 10) => {
  const [searchHistory, setSearchHistory] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const addToHistory = useCallback((searchTerm: string) => {
    if (!searchTerm.trim()) return;

    setSearchHistory(prev => {
      const filtered = prev.filter(item => item !== searchTerm);
      const updated = [searchTerm, ...filtered].slice(0, maxItems);
      
      try {
        localStorage.setItem(storageKey, JSON.stringify(updated));
      } catch {}
      
      return updated;
    });
  }, [storageKey, maxItems]);

  const clearHistory = useCallback(() => {
    setSearchHistory([]);
    try {
      localStorage.removeItem(storageKey);
    } catch {}
  }, [storageKey]);

  return {
    searchHistory,
    addToHistory,
    clearHistory
  };
};

export default SearchInput;