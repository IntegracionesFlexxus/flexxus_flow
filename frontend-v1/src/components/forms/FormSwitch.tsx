import React from 'react';
import {
  FormControlLabel,
  Switch,
  SwitchProps,
  FormHelperText,
  Box
} from '@mui/material';
import { Controller, useFormContext, FieldPath, FieldValues } from 'react-hook-form';

// Switch de formulario reutilizable - MVP Nivel 1

interface FormSwitchProps<TFieldValues extends FieldValues = FieldValues> 
  extends Omit<SwitchProps, 'name'> {
  name: FieldPath<TFieldValues>;
  label: string;
  rules?: object;
  helperText?: string;
}

export function FormSwitch<TFieldValues extends FieldValues = FieldValues>({
  name,
  label,
  rules,
  helperText,
  ...switchProps
}: FormSwitchProps<TFieldValues>) {
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
              <Switch
                {...field}
                {...switchProps}
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

export default FormSwitch;