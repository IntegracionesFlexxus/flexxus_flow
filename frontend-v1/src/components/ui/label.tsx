import React from 'react';
import { FormLabel, FormLabelProps, Typography } from '@mui/material';

export interface LabelProps extends FormLabelProps {
  htmlFor?: string;
  children?: React.ReactNode;
}

export const Label: React.FC<LabelProps> = ({
  children,
  htmlFor,
  ...props
}) => {
  return (
    <FormLabel 
      htmlFor={htmlFor}
      {...props}
      sx={{
        display: 'block',
        marginBottom: 1,
        fontSize: '0.875rem',
        fontWeight: 500,
        ...props.sx
      }}
    >
      {children}
    </FormLabel>
  );
};

export default Label;