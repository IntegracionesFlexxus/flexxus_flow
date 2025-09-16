import React from 'react';
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  SelectProps
} from '@mui/material';
import { Controller, useFormContext, FieldPath, FieldValues } from 'react-hook-form';

// Select de formulario reutilizable - MVP Nivel 1
// TODO: En Nivel 2 agregar búsqueda, carga asíncrona, multi-select mejorado

interface FormSelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

interface FormSelectProps<TFieldValues extends FieldValues = FieldValues> 
  extends Omit<SelectProps, 'name'> {
  name: FieldPath<TFieldValues>;
  label: string;
  options: FormSelectOption[];
  rules?: object;
  helperText?: string;
}

export function FormSelect<TFieldValues extends FieldValues = FieldValues>({
  name,
  label,
  options,
  rules,
  helperText,
  ...selectProps
}: FormSelectProps<TFieldValues>) {
  const { control } = useFormContext<TFieldValues>();

  return (
    <Controller
      name={name}
      control={control}
      rules={rules}
      render={({ field, fieldState: { error } }) => (
        <FormControl 
          fullWidth={selectProps.fullWidth !== false}
          error={!!error}
          margin="normal"
        >
          <InputLabel>{label}</InputLabel>
          <Select
            {...field}
            {...selectProps}
            label={label}
          >
            {options.map((option) => (
              <MenuItem 
                key={option.value} 
                value={option.value}
                disabled={option.disabled}
              >
                {option.label}
              </MenuItem>
            ))}
          </Select>
          {(error || helperText) && (
            <FormHelperText>
              {error?.message || helperText}
            </FormHelperText>
          )}
        </FormControl>
      )}
    />
  );
}

export default FormSelect;