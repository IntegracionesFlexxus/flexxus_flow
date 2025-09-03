import React from 'react';
import {
  FormControlLabel,
  Checkbox,
  CheckboxProps,
  FormHelperText,
  Box
} from '@mui/material';
import { Controller, useFormContext, FieldPath, FieldValues } from 'react-hook-form';

// Checkbox de formulario reutilizable - MVP Nivel 1

interface FormCheckboxProps<TFieldValues extends FieldValues = FieldValues> 
  extends Omit<CheckboxProps, 'name'> {
  name: FieldPath<TFieldValues>;
  label: string | React.ReactNode;
  rules?: object;
  helperText?: string;
}

export function FormCheckbox<TFieldValues extends FieldValues = FieldValues>({
  name,
  label,
  rules,
  helperText,
  ...checkboxProps
}: FormCheckboxProps<TFieldValues>) {
  const { control } = useFormContext<TFieldValues>();

  return (
    <Controller
      name={name}
      control={control}
      rules={rules}
      render={({ field: { value, ...field }, fieldState: { error } }) => (
        <Box>
          <FormControlLabel
            control={
              <Checkbox
                {...field}
                {...checkboxProps}
                checked={!!value}
              />
            }
            label={label}
          />
          {(error || helperText) && (
            <FormHelperText error={!!error}>
              {error?.message || helperText}
            </FormHelperText>
          )}
        </Box>
      )}
    />
  );
}

export default FormCheckbox;