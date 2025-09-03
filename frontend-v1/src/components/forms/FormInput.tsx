import React from 'react';
import { TextField, TextFieldProps } from '@mui/material';
import { Controller, useFormContext, FieldPath, FieldValues } from 'react-hook-form';

// Input de formulario reutilizable - MVP Nivel 1
// TODO: En Nivel 2 agregar máscaras, autocompletado, validación en tiempo real

interface FormInputProps<TFieldValues extends FieldValues = FieldValues> 
  extends Omit<TextFieldProps, 'name'> {
  name: FieldPath<TFieldValues>;
  label: string;
  rules?: object;
}

export function FormInput<TFieldValues extends FieldValues = FieldValues>({
  name,
  label,
  rules,
  ...textFieldProps
}: FormInputProps<TFieldValues>) {
  const { control } = useFormContext<TFieldValues>();

  return (
    <Controller
      name={name}
      control={control}
      rules={rules}
      render={({ field, fieldState: { error } }) => (
        <TextField
          {...field}
          {...textFieldProps}
          label={label}
          error={!!error}
          helperText={error?.message || textFieldProps.helperText}
          fullWidth={textFieldProps.fullWidth !== false}
          margin={textFieldProps.margin || 'normal'}
        />
      )}
    />
  );
}

export default FormInput;