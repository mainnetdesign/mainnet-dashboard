// AlignUI Tooltip v0.0.0 (simplified — single dark/small variant)

import * as React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';

import { cn } from '@/utils/cn';

const TooltipProvider = TooltipPrimitive.Provider;
const TooltipRoot = TooltipPrimitive.Root;
const TooltipTrigger = TooltipPrimitive.Trigger;

const TooltipContent = React.forwardRef<
  React.ComponentRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, children, sideOffset = 6, ...rest }, forwardedRef) => (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content
      ref={forwardedRef}
      sideOffset={sideOffset}
      className={cn(
        'mn-tooltip z-50 rounded-md bg-bg-strong-950 px-2.5 py-1 text-paragraph-sm text-text-white-0 shadow-tooltip',
        className,
      )}
      {...rest}
    >
      {children}
      <TooltipPrimitive.Arrow
        width={10}
        height={5}
        className="fill-bg-strong-950"
      />
    </TooltipPrimitive.Content>
  </TooltipPrimitive.Portal>
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

export {
  TooltipProvider as Provider,
  TooltipRoot as Root,
  TooltipTrigger as Trigger,
  TooltipContent as Content,
};
