// Exportación centralizada de componentes de formulario - MVP Nivel 1

export { Form } from './Form';
export { FormInput } from './FormInput';
export { FormSelect } from './FormSelect';
export { FormCheckbox } from './FormCheckbox';
export { FormRadioGroup } from './FormRadioGroup';
export { FormSwitch } from './FormSwitch';
export { FormDatePicker } from './FormDatePicker';

// Re-exportar tipos útiles de react-hook-form
export type {
  UseFormReturn,
  FieldValues,
  SubmitHandler,
  Control,
  FieldPath,
  RegisterOptions,
  FieldErrors
} from 'react-hook-form';

// Re-exportar hooks útiles
export { 
  useForm,
  useFormContext,
  useFieldArray,
  useWatch,
  useController
} from 'react-hook-form';