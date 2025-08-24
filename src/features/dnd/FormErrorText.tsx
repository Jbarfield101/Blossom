import { Typography } from "@mui/material";
import type { ReactNode } from "react";

interface FormErrorTextProps {
  id: string;
  children?: ReactNode;
}

export default function FormErrorText({ id, children }: FormErrorTextProps) {
  if (!children) return null;
  return (
    <Typography id={id} component="span" sx={{ color: "error.main" }}>
      {children}
    </Typography>
  );
}
