/**
 * DataTable Component - Sprint 3
 * Tabla de datos reutilizable con sorting, filtering y selección
 * Implementación siguiendo principios SOLID y Clean Code
 */

import React, { useMemo, useState, useCallback } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TableSortLabel,
  Checkbox,
  Paper,
  Box,
  Typography,
  IconButton,
  Skeleton,
  Alert,
  Stack,
  Tooltip,
  Chip
} from '@mui/material';
import { ChevronUp, ChevronDown, MoreVertical } from 'lucide-react';

// Tipos genéricos para máxima reutilización
export interface DataTableColumn<T> {
  key: string;
  header: string | React.ReactNode;
  sortable?: boolean;
  width?: string | number;
  align?: 'left' | 'center' | 'right';
  render?: (item: T, index: number) => React.ReactNode;
  headerRender?: () => React.ReactNode;
}

export interface DataTableProps<T> {
  data: T[];
  columns: DataTableColumn<T>[];
  // Paginación
  page?: number;
  rowsPerPage?: number;
  totalCount?: number;
  onPageChange?: (page: number) => void;
  onRowsPerPageChange?: (rowsPerPage: number) => void;
  rowsPerPageOptions?: number[];
  // Selección
  selectable?: boolean;
  selectedRows?: Set<string>;
  onSelectRow?: (id: string) => void;
  onSelectAll?: (items: T[]) => void;
  getRowId?: (item: T) => string;
  // Sorting
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onSort?: (column: string, order: 'asc' | 'desc') => void;
  // Interacción
  onRowClick?: (item: T, index: number) => void;
  onRowDoubleClick?: (item: T, index: number) => void;
  rowActions?: (item: T) => React.ReactNode;
  // Estado
  loading?: boolean;
  error?: string;
  emptyMessage?: string;
  // Estilos
  striped?: boolean;
  hoverable?: boolean;
  dense?: boolean;
  stickyHeader?: boolean;
  maxHeight?: string | number;
  // Otras opciones
  showIndex?: boolean;
  customRowClass?: (item: T, index: number) => string;
}

/**
 * DataTable Component
 * Principios aplicados:
 * - S: Responsabilidad única de renderizar tablas
 * - O: Abierto para extensión mediante props y render functions
 * - L: Puede ser sustituido por cualquier tabla que respete la interfaz
 * - I: Interface segregada con props opcionales
 * - D: Depende de abstracciones (tipos genéricos)
 */
export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  // Paginación
  page = 0,
  rowsPerPage = 10,
  totalCount,
  onPageChange,
  onRowsPerPageChange,
  rowsPerPageOptions = [5, 10, 25, 50],
  // Selección
  selectable = false,
  selectedRows = new Set(),
  onSelectRow,
  onSelectAll,
  getRowId = (item) => item.id,
  // Sorting
  sortBy,
  sortOrder = 'asc',
  onSort,
  // Interacción
  onRowClick,
  onRowDoubleClick,
  rowActions,
  // Estado
  loading = false,
  error,
  emptyMessage = 'No hay datos disponibles',
  // Estilos
  striped = false,
  hoverable = true,
  dense = false,
  stickyHeader = false,
  maxHeight,
  // Otras opciones
  showIndex = false,
  customRowClass
}: DataTableProps<T>) {
  const [localSortBy, setLocalSortBy] = useState(sortBy || '');
  const [localSortOrder, setLocalSortOrder] = useState<'asc' | 'desc'>(sortOrder);

  // Sorting local si no se proporciona handler externo
  const handleSort = useCallback((column: string) => {
    const isAsc = localSortBy === column && localSortOrder === 'asc';
    const newOrder = isAsc ? 'desc' : 'asc';
    
    setLocalSortBy(column);
    setLocalSortOrder(newOrder);
    
    if (onSort) {
      onSort(column, newOrder);
    }
  }, [localSortBy, localSortOrder, onSort]);

  // Datos ordenados localmente
  const sortedData = useMemo(() => {
    if (!localSortBy || onSort) return data; // Si hay handler externo, no ordenar localmente
    
    const sorted = [...data].sort((a, b) => {
      const aValue = a[localSortBy];
      const bValue = b[localSortBy];
      
      if (aValue === bValue) return 0;
      
      const comparison = aValue < bValue ? -1 : 1;
      return localSortOrder === 'asc' ? comparison : -comparison;
    });
    
    return sorted;
  }, [data, localSortBy, localSortOrder, onSort]);

  // Datos paginados
  const paginatedData = useMemo(() => {
    if (totalCount !== undefined) {
      // Paginación del servidor
      return sortedData;
    }
    // Paginación local
    const start = page * rowsPerPage;
    const end = start + rowsPerPage;
    return sortedData.slice(start, end);
  }, [sortedData, page, rowsPerPage, totalCount]);

  // Handlers de selección
  const handleSelectAll = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked && onSelectAll) {
      onSelectAll(paginatedData);
    } else if (onSelectAll) {
      onSelectAll([]);
    }
  }, [paginatedData, onSelectAll]);

  const handleSelectRow = useCallback((item: T) => {
    if (onSelectRow) {
      onSelectRow(getRowId(item));
    }
  }, [onSelectRow, getRowId]);

  // Verificar si todos están seleccionados
  const isAllSelected = useMemo(() => {
    if (paginatedData.length === 0) return false;
    return paginatedData.every(item => selectedRows.has(getRowId(item)));
  }, [paginatedData, selectedRows, getRowId]);

  const isIndeterminate = useMemo(() => {
    if (paginatedData.length === 0) return false;
    const selected = paginatedData.filter(item => selectedRows.has(getRowId(item)));
    return selected.length > 0 && selected.length < paginatedData.length;
  }, [paginatedData, selectedRows, getRowId]);

  // Render de celda
  const renderCell = useCallback((item: T, column: DataTableColumn<T>, index: number) => {
    if (column.render) {
      return column.render(item, index);
    }
    return item[column.key]?.toString() || '-';
  }, []);

  // Loading state
  if (loading) {
    return (
      <Paper sx={{ p: 2 }}>
        <Stack spacing={2}>
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} variant="rectangular" height={40} />
          ))}
        </Stack>
      </Paper>
    );
  }

  // Error state
  if (error) {
    return (
      <Paper sx={{ p: 2 }}>
        <Alert severity="error">{error}</Alert>
      </Paper>
    );
  }

  // Empty state
  if (data.length === 0) {
    return (
      <Paper sx={{ p: 4 }}>
        <Typography variant="body1" color="text.secondary" align="center">
          {emptyMessage}
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper sx={{ width: '100%', overflow: 'hidden' }}>
      <TableContainer sx={{ maxHeight }}>
        <Table 
          stickyHeader={stickyHeader}
          size={dense ? 'small' : 'medium'}
        >
          <TableHead>
            <TableRow>
              {selectable && (
                <TableCell padding="checkbox">
                  <Checkbox
                    indeterminate={isIndeterminate}
                    checked={isAllSelected}
                    onChange={handleSelectAll}
                  />
                </TableCell>
              )}
              
              {showIndex && (
                <TableCell align="center" sx={{ width: 60 }}>
                  #
                </TableCell>
              )}
              
              {columns.map((column) => (
                <TableCell
                  key={column.key}
                  align={column.align || 'left'}
                  sx={{ width: column.width }}
                >
                  {column.headerRender ? (
                    column.headerRender()
                  ) : column.sortable ? (
                    <TableSortLabel
                      active={localSortBy === column.key}
                      direction={localSortBy === column.key ? localSortOrder : 'asc'}
                      onClick={() => handleSort(column.key)}
                    >
                      {column.header}
                    </TableSortLabel>
                  ) : (
                    column.header
                  )}
                </TableCell>
              ))}
              
              {rowActions && (
                <TableCell align="center" sx={{ width: 60 }}>
                  Acciones
                </TableCell>
              )}
            </TableRow>
          </TableHead>
          
          <TableBody>
            {paginatedData.map((item, index) => {
              const rowId = getRowId(item);
              const isSelected = selectedRows.has(rowId);
              const actualIndex = page * rowsPerPage + index;
              
              return (
                <TableRow
                  key={rowId}
                  hover={hoverable}
                  selected={isSelected}
                  onClick={() => onRowClick?.(item, actualIndex)}
                  onDoubleClick={() => onRowDoubleClick?.(item, actualIndex)}
                  className={customRowClass?.(item, actualIndex)}
                  sx={{
                    cursor: onRowClick ? 'pointer' : 'default',
                    backgroundColor: striped && index % 2 === 1 
                      ? 'action.hover' 
                      : undefined
                  }}
                >
                  {selectable && (
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={isSelected}
                        onChange={() => handleSelectRow(item)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </TableCell>
                  )}
                  
                  {showIndex && (
                    <TableCell align="center">
                      {actualIndex + 1}
                    </TableCell>
                  )}
                  
                  {columns.map((column) => (
                    <TableCell
                      key={column.key}
                      align={column.align || 'left'}
                    >
                      {renderCell(item, column, actualIndex)}
                    </TableCell>
                  ))}
                  
                  {rowActions && (
                    <TableCell align="center">
                      {rowActions(item)}
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
      
      {(onPageChange || onRowsPerPageChange) && (
        <TablePagination
          component="div"
          count={totalCount ?? data.length}
          page={page}
          onPageChange={(_, newPage) => onPageChange?.(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(event) => {
            onRowsPerPageChange?.(parseInt(event.target.value, 10));
            onPageChange?.(0);
          }}
          rowsPerPageOptions={rowsPerPageOptions}
          labelRowsPerPage="Filas por página:"
          labelDisplayedRows={({ from, to, count }) => 
            `${from}-${to} de ${count !== -1 ? count : `más de ${to}`}`
          }
        />
      )}
    </Paper>
  );
}