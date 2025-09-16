import React from 'react';
import { Switch as MuiSwitch, SwitchProps as MuiSwitchProps, FormControlLabel } from '@mui/material';

export interface SwitchProps extends MuiSwitchProps {
  label?: string;
}

export const Switch: React.FC<SwitchProps> = ({
  label,
  ...props
}) => {
  if (label) {
    return (
      <FormControlLabel
        control={<MuiSwitch {...props} />}
        label={label}
      />
    );
  }
  
  return <MuiSwitch {...props} />;
};

export default Switch;