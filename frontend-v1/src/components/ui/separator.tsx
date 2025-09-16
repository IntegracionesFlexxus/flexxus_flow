import React from 'react';
import { Divider, DividerProps } from '@mui/material';

export interface SeparatorProps extends DividerProps {
  orientation?: 'horizontal' | 'vertical';
}

export const Separator: React.FC<SeparatorProps> = ({
  orientation = 'horizontal',
  ...props
}) => {
  return (
    <Divider 
      orientation={orientation}
      {...props}
    />
  );
};

export default Separator;