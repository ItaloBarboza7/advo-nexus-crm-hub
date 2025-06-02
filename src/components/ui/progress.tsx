
import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"

import { cn } from "@/lib/utils"

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>
>(({ className, value, ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    className={cn(
      "relative h-4 w-full overflow-hidden rounded-full bg-gray-200 shadow-inner",
      className
    )}
    {...props}
  >
    <ProgressPrimitive.Indicator
      className="h-full w-full flex-1 transition-all relative overflow-hidden rounded-full"
      style={{ 
        transform: `translateX(-${100 - (value || 0)}%)`,
        background: `linear-gradient(45deg, #10b981, #10b981ff, #10b981cc, #10b981ff, #10b981)`,
        backgroundSize: '400% 400%',
        boxShadow: `
          0 0 20px #10b98160,
          inset 0 1px 0 rgba(255,255,255,0.6),
          inset 0 -1px 0 rgba(0,0,0,0.2),
          0 4px 15px #10b98130
        `
      }}
    >
      <div 
        className="absolute inset-0 rounded-full animate-laser-sweep"
        style={{
          background: `linear-gradient(90deg, 
            transparent 0%, 
            rgba(255,255,255,0.6) 20%, 
            rgba(255,255,255,0.8) 50%, 
            rgba(255,255,255,0.6) 80%, 
            transparent 100%
          )`
        }}
      />
      <div 
        className="absolute inset-0 rounded-full opacity-30"
        style={{
          background: `radial-gradient(ellipse at center, #10b981ff 0%, transparent 70%)`
        }}
      />
    </ProgressPrimitive.Indicator>
  </ProgressPrimitive.Root>
))
Progress.displayName = ProgressPrimitive.Root.displayName

export { Progress }
