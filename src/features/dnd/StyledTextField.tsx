import { TextField, TextFieldProps } from "@mui/material";

export default function StyledTextField(props: TextFieldProps) {
  const { InputProps, InputLabelProps, label, sx, ...rest } = props;
  return (
    <TextField
      variant="outlined"
      label={label}
      InputLabelProps={{
        ...InputLabelProps,
        sx: {
          backgroundColor: "background.paper",
          px: 0.5,
          color: "text.primary",
          ...(InputLabelProps && (InputLabelProps as any).sx),
        },
      }}
      InputProps={{
        ...InputProps,
        sx: {
          "&::placeholder": { color: "secondary.light" },
          fontFamily: "typography.fontFamily",
          ...(InputProps && InputProps.sx),
        },
      }}
      sx={{
        backgroundColor: "background.paper",
        color: "text.primary",
        borderRadius: 1,
        boxShadow: 1,
        "& .MuiOutlinedInput-notchedOutline": {
          borderColor: "primary.main",
        },
        "&:hover .MuiOutlinedInput-notchedOutline": {
          borderColor: "primary.light",
        },
        "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
          borderColor: "secondary.main",
        },
        ...sx,
      }}
      {...rest}
    />
  );
}
