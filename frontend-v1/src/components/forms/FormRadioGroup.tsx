import React from 'react';
import {
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  FormHelperText,
  RadioGroupProps
} from '@mui/material';
import { Controller, useFormContext, FieldPath, FieldValues } from 'react-hook-form';

// Radio Group de formulario reutilizable - MVP Nivel 1

interface FormRadioOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

interface FormRadioGroupProps<TFieldValues extends FieldValues = FieldValues> 
  extends Omit<RadioGroupProps, 'name'> {
  name: FieldPath<TFieldValues>;
  label: string;
  options: FormRadioOption[];
  rules?: object;
  helperText?: string;
}

export function FormRadioGroup<TFieldValues extends FieldValues = FieldValues>({
  name,
  label,
  options,
  rules,
  helperText,
  row = false,
  ...radioGroupProps
}: FormRadioGroupProps<TFieldValues>) {
  const { control } = useFormContext<TFieldValues>();

  return (
    <Controller
      name={name}
      control={control}
      rules={rules}
      render={({ field, fieldState: { error } }) => (
        <FormControl 
          component="fieldset" 
          error={!!error}
          margin="normal"
        >
          <FormLabel component="legend">{label}</FormLabel>
          <RadioGroup
            {...field}
            {...radioGroupProps}
            row={row}
          >
            {options.map((option) => (
              <FormControlLabel
                key={option.value}
                value={option.value}
                control={<Radio />}
                label={option.label}
                disabled={option.disabled}
              />
            ))}
          </RadioGroup>
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

export default FormRadioGroup;