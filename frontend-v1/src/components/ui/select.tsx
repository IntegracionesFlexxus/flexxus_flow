import React from 'react';
import {
  Select as MuiSelect,
  SelectProps as MuiSelectProps,
  MenuItem,
  FormControl,
  InputLabel,
  FormHelperText
} from '@mui/material';

export interface SelectProps extends Omit<MuiSelectProps, 'variant'> {
  options?: Array<{ value: string | number; label: string }>;
  helperText?: string;
}

export const Select: React.FC<SelectProps> = ({
  options = [],
  label,
  helperText,
  error,
  fullWidth = true,
  ...props
}) => {
  return (
    <FormControl fullWidth={fullWidth} error={error}>
      {label && <InputLabel>{label}</InputLabel>}
      <MuiSelect label={label} {...props}>
        {options.map((option) => (
          <MenuItem key={option.value} value={option.value}>
            {option.label}
          </MenuItem>
        ))}
      </MuiSelect>
      {helperText && <FormHelperText>{helperText}</FormHelperText>}
    </FormControl>
  );
};

export const SelectContent: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <>{children}</>
);

export const SelectItem = MenuItem;
export const SelectTrigger = Select;
export const SelectValue: React.FC<{ placeholder?: string }> = ({ placeholder }) => (
  <span>{placeholder}</span>
);

export default Select;