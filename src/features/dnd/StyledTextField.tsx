import { TextField, TextFieldProps } from "@mui/material";

export default function StyledTextField(props: TextFieldProps) {
  const { InputProps, sx, ...rest } = props;
  return (
    <TextField
      variant="outlined"
      InputLabelProps={{ shrink: true }}
      InputProps={{
        ...InputProps,
        sx: {
          "::placeholder": { color: "gray" },
          ...(InputProps && InputProps.sx),
        },
      }}
      sx={{
        backgroundColor: "background.paper",
        color: "text.primary",
        borderRadius: 1,
        boxShadow: 1,
        ...sx,
      }}
      {...rest}
    />
  );
}
