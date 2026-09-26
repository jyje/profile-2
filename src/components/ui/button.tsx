// Adapted from shadcn/ui new-york Button (MIT). See THIRD_PARTY_NOTICES.md.
import * as React from 'react';
import {Slot} from '@radix-ui/react-slot';
import {cva, type VariantProps} from 'class-variance-authority';
import {cn} from '@site/src/lib/utils';

const buttonVariants = cva(
  'tw:inline-flex tw:items-center tw:justify-center tw:gap-2 tw:whitespace-nowrap tw:[font-family:inherit] tw:text-sm tw:font-medium tw:leading-5 tw:transition-colors tw:cursor-pointer tw:border tw:border-solid tw:border-transparent tw:no-underline tw:focus-visible:outline-2 tw:focus-visible:outline-offset-2 tw:focus-visible:outline-ring tw:disabled:pointer-events-none tw:disabled:opacity-50 tw:motion-reduce:transition-none tw:[&_svg]:pointer-events-none tw:[&_svg]:size-4 tw:[&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'tw:bg-primary tw:text-primary-foreground tw:hover:bg-primary/90',
        destructive: 'tw:bg-destructive tw:text-destructive-foreground tw:hover:bg-destructive/90',
        outline: 'tw:border-input tw:bg-background tw:text-foreground tw:hover:bg-accent tw:hover:text-accent-foreground',
        secondary: 'tw:bg-secondary tw:text-secondary-foreground tw:hover:bg-secondary/80',
        ghost: 'tw:bg-transparent tw:text-foreground tw:hover:bg-accent tw:hover:text-accent-foreground',
        link: 'tw:bg-transparent tw:text-primary tw:underline-offset-4 tw:hover:underline',
      },
      size: {
        default: 'tw:h-9 tw:px-4 tw:py-2',
        sm: 'tw:h-8 tw:px-3 tw:text-xs',
        lg: 'tw:h-10 tw:px-8',
        icon: 'tw:size-9',
        text: 'tw:h-auto tw:p-0',
      },
      shape: {default: 'tw:rounded-md', pill: 'tw:rounded-full', square: 'tw:rounded-none'},
    },
    defaultVariants: {variant: 'default', size: 'default', shape: 'default'},
  },
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({className, variant, size, shape, asChild = false, ...props}, ref) => {
    const Comp = asChild ? Slot : 'button';
    return <Comp data-slot="button" className={cn(buttonVariants({variant, size, shape}), className)} ref={ref} {...props} />;
  },
);
Button.displayName = 'Button';

export {Button, buttonVariants};
