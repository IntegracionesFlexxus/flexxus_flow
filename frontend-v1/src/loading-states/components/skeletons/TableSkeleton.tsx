/**
 * TableSkeleton Component
 * Loading States - Skeleton para tablas de datos
 */

import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Skeleton,
  Paper,
  Box
} from '@mui/material';

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  showHeader?: boolean;
  showActions?: boolean;
  compact?: boolean;
  className?: string;
}

export const TableSkeleton: React.FC<TableSkeletonProps> = ({
  rows = 5,
  columns = 4,
  showHeader = true,
  showActions = false,
  compact = false,
  className
}) => {
  const cellHeight = compact ? 32 : 52;
  const actualColumns = showActions ? columns + 1 : columns;

  return (
    <TableContainer component={Paper} className={className}>
      <Table size={compact ? 'small' : 'medium'}>
        {showHeader && (
          <TableHead>
            <TableRow>
              {Array.from({ length: actualColumns }).map((_, index) => (
                <TableCell key={`header-${index}`}>
                  <Skeleton 
                    variant="text" 
                    width={index === 0 ? 120 : index === actualColumns - 1 && showActions ? 80 : '80%'} 
                    height={24}
                  />
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
        )}
        <TableBody>
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <TableRow key={`row-${rowIndex}`}>
              {Array.from({ length: actualColumns }).map((_, colIndex) => (
                <TableCell key={`cell-${rowIndex}-${colIndex}`}>
                  {colIndex === actualColumns - 1 && showActions ? (
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Skeleton variant="circular" width={32} height={32} />
                      <Skeleton variant="circular" width={32} height={32} />
                    </Box>
                  ) : (
                    <Skeleton 
                      variant="text" 
                      width={colIndex === 0 ? 150 : `${60 + Math.random() * 40}%`}
                      height={cellHeight}
                    />
                  )}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default TableSkeleton;