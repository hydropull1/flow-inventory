import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex select-none items-center justify-center gap-2 rounded-lg font-medium transition-all duration-150 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/20 focus-visible:ring-offset-2 active:scale-[0.98] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-60";

const variants: Record<Variant, string> = {
  primary:
    "bg-slate-900 text-white shadow-sm hover:bg-slate-800 hover:shadow active:bg-slate-950",
  secondary:
    "bg-white text-slate-700 border border-slate-300 shadow-sm hover:bg-slate-50 hover:border-slate-400",
  ghost: "bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900",
  danger:
    "bg-white text-red-600 border border-red-200 shadow-sm hover:bg-red-50 hover:border-red-300",
};

const sizes: Record<Size, string> = {
  sm: "px-3.5 py-2 text-sm",
  md: "px-4 py-2.5 text-sm",
  lg: "px-5 py-3 text-[15px] font-semibold",
};

interface BaseProps {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
}

function classes({ variant = "primary", size = "md", className = "" }: BaseProps) {
  return `${base} ${variants[variant]} ${sizes[size]} ${className}`;
}

type ButtonAsButton = BaseProps &
  Omit<ComponentProps<"button">, "className" | "children"> & {
    href?: undefined;
  };

type ButtonAsLink = BaseProps & {
  href: string;
} & Omit<ComponentProps<typeof Link>, "href" | "className" | "children">;

export default function Button(props: ButtonAsButton | ButtonAsLink) {
  if ("href" in props && props.href) {
    const { href, variant, size, className, children, ...rest } = props;
    return (
      <Link href={href} className={classes({ variant, size, className, children })} {...rest}>
        {children}
      </Link>
    );
  }

  const { variant, size, className, children, ...rest } = props as ButtonAsButton;
  return (
    <button className={classes({ variant, size, className, children })} {...rest}>
      {children}
    </button>
  );
}
