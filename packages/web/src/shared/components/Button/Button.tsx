import type { ButtonHTMLAttributes, ReactNode } from "react";
import "./Button.scss";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: "primary" | "quiet";
};

export function Button({ children, className = "", variant = "quiet", ...props }: ButtonProps) {
  return (
    <button className={`dd-button dd-button--${variant} ${className}`.trim()} {...props}>
      {children}
    </button>
  );
}
