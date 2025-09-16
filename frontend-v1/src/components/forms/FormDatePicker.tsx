import React from 'react';
import { Controller, useFormContext, FieldPath, FieldValues } from 'react-hook-form';
import { DatePicker, DatePickerProps } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { es } from 'date-fns/locale';

// DatePicker de formulario reutilizable - MVP Nivel 1
// TODO: En Nivel 2 agregar rangos de fecha, tiempo, datetime

interface FormDatePickerProps<TFieldValues extends FieldValues = FieldValues> 
  extends Omit<DatePickerProps<Date>, 'name' | 'value' | 'onChange' | 'renderInput'> {
  name: FieldPath<TFieldValues>;
  label: string;
  rules?: object;
  helperText?: string;
}

export function FormDatePicker<TFieldValues extends FieldValues = FieldValues>({
  name,
  label,
  rules,
  helperText,
  ...datePickerProps
}: FormDatePickerProps<TFieldValues>) {
  const { control } = useFormContext<TFieldValues>();

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
      <Controller
        name={name}
        control={control}
        rules={rules}
        render={({ field, fieldState: { error } }) => (
          <DatePicker
            {...field}
            {...datePickerProps}
            label={label}
            value={field.value || null}
            onChange={(newValue) => field.onChange(newValue)}
            slotProps={{
              textField: {
                fullWidth: true,
                margin: 'normal',
                error: !!error,
                helperText: error?.message || helperText
              }
            }}
          />
        )}
      />
    </LocalizationProvider>
  );
}

export default FormDatePicker;