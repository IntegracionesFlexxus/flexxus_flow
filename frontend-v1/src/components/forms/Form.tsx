import React from 'react';
import { FormProvider, UseFormReturn, FieldValues, SubmitHandler } from 'react-hook-form';
import { Box, BoxProps } from '@mui/material';

// Wrapper de formulario reutilizable - MVP Nivel 1
// TODO: En Nivel 2 agregar auto-save, dirty checking avanzado, wizard forms

interface FormProps<TFieldValues extends FieldValues = FieldValues> extends Omit<BoxProps, 'onSubmit'> {
  methods: UseFormReturn<TFieldValues>;
  onSubmit: SubmitHandler<TFieldValues>;
  children: React.ReactNode;
}

export function Form<TFieldValues extends FieldValues = FieldValues>({
  methods,
  onSubmit,
  children,
  ...boxProps
}: FormProps<TFieldValues>) {
  return (
    <FormProvider {...methods}>
      <Box
        component="form"
        onSubmit={methods.handleSubmit(onSubmit)}
        noValidate
        {...boxProps}
      >
        {children}
      </Box>
    </FormProvider>
  );
}

export default Form;