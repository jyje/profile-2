// Adapted from shadcn/ui new-york Input (MIT). See THIRD_PARTY_NOTICES.md.
import * as React from 'react';
import {cn} from '@site/src/lib/utils';

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(
  ({className, type, ...props}, ref) => (
    <input
      ref={ref}
      type={type}
      data-slot="input"
      className={cn(
        'tw:flex tw:h-9 tw:w-full tw:min-w-0 tw:rounded-md tw:border tw:border-solid tw:border-input tw:bg-background tw:px-3 tw:py-1 tw:[font-family:inherit] tw:text-base tw:text-foreground tw:transition-colors tw:placeholder:text-muted-foreground tw:focus-visible:outline-2 tw:focus-visible:outline-offset-2 tw:focus-visible:outline-ring tw:disabled:cursor-not-allowed tw:disabled:opacity-50 tw:motion-reduce:transition-none tw:md:text-sm',
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = 'Input';

export {Input};
