"use client";

import * as React from "react";
import { Drawer as DrawerPrimitive } from "vaul";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import { cn } from "@/lib/utils";

// #region agent log
function logBodyStyles(event: string, hypothesisId: string) {
  const body = document.body;
  const html = document.documentElement;
  const overlayCount = document.querySelectorAll('[data-vaul-overlay]').length;
  const drawerCount = document.querySelectorAll('[data-vaul-drawer]').length;
  const vaulNoPointerEvents = document.querySelectorAll('[data-vaul-no-pointer-events]').length;
  const anyVaulAttr = document.querySelectorAll('[data-vaul-drawer-visible]').length;
  const fixedElements = document.querySelectorAll('.fixed.inset-0').length;
  const computedBody = getComputedStyle(body);
  const computedHtml = getComputedStyle(html);
  const data = {bodyOverflow:body.style.overflow,bodyTouchAction:body.style.touchAction,bodyPointerEvents:body.style.pointerEvents,htmlOverflow:html.style.overflow,bodyPosition:body.style.position,bodyDataVaul:body.getAttribute('data-vaul-drawer-visible'),overlayCount,drawerCount,vaulNoPointerEvents,anyVaulAttr,fixedElements,computedBodyOverflow:computedBody.overflow,computedBodyPosition:computedBody.position,computedHtmlOverflow:computedHtml.overflow,webkitOverflowScrolling:(body.style as unknown as Record<string,string>).webkitOverflowScrolling,isIOS:/iPad|iPhone|iPod/.test(navigator.userAgent)};
  console.log(`[DEBUG ${hypothesisId}] ${event}:`, JSON.stringify(data));
  fetch('http://127.0.0.1:7242/ingest/7b82bf8a-7c03-4697-b719-1e325f7e9340',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'drawer.tsx:log',message:event,data,timestamp:Date.now(),sessionId:'debug-session',hypothesisId})}).catch(()=>{});
}
// #endregion

const Drawer = ({
  shouldScaleBackground = false,
  noBodyStyles = true,
  onOpenChange,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Root>) => {
  // #region agent log
  const handleOpenChange = React.useCallback((open: boolean) => {
    logBodyStyles(open ? 'drawer_opening' : 'drawer_closing', 'A,B,C');
    onOpenChange?.(open);
    setTimeout(() => logBodyStyles(open ? 'drawer_opened_50ms' : 'drawer_closed_50ms', 'A,B,C'), 50);
    setTimeout(() => logBodyStyles(open ? 'drawer_opened_200ms' : 'drawer_closed_200ms', 'A,B,C'), 200);
  }, [onOpenChange]);
  // #endregion
  return (
    <DrawerPrimitive.Root shouldScaleBackground={shouldScaleBackground} noBodyStyles={noBodyStyles} onOpenChange={handleOpenChange} {...props} />
  );
};
Drawer.displayName = "Drawer";

const DrawerTrigger = DrawerPrimitive.Trigger;

const DrawerPortal = DrawerPrimitive.Portal;

const DrawerClose = DrawerPrimitive.Close;

const DrawerOverlay = React.forwardRef<
  React.ComponentRef<typeof DrawerPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Overlay
    ref={ref}
    className={cn("fixed inset-0 z-50 bg-black/40", className)}
    {...props}
  />
));
DrawerOverlay.displayName = DrawerPrimitive.Overlay.displayName;

const DrawerContent = React.forwardRef<
  React.ComponentRef<typeof DrawerPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Content> & {
    /** Accessible title for screen readers (visually hidden if no DrawerTitle is used) */
    "aria-label"?: string;
  }
>(({ className, children, "aria-label": ariaLabel, ...props }, ref) => (
  <DrawerPortal>
    <DrawerOverlay />
    <DrawerPrimitive.Content
      ref={ref}
      aria-describedby={undefined}
      className={cn(
        "fixed inset-x-0 bottom-0 z-50 mt-24 flex h-auto flex-col rounded-t-[20px] bg-page/95 backdrop-blur-xl text-primary",
        className
      )}
      {...props}
    >
      {/* Drag handle */}
      <div className="mx-auto mt-3 mb-2 h-1 w-10 rounded-full bg-underline" />
      {/* Visually hidden title for accessibility when no visible title is provided */}
      <VisuallyHidden.Root asChild>
        <DrawerPrimitive.Title>{ariaLabel || "Menu"}</DrawerPrimitive.Title>
      </VisuallyHidden.Root>
      {children}
    </DrawerPrimitive.Content>
  </DrawerPortal>
));
DrawerContent.displayName = "DrawerContent";

const DrawerHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("grid gap-1.5 px-5 pt-2 pb-4 text-center", className)}
    {...props}
  />
);
DrawerHeader.displayName = "DrawerHeader";

const DrawerFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("mt-auto flex flex-col gap-2 p-4", className)}
    {...props}
  />
);
DrawerFooter.displayName = "DrawerFooter";

const DrawerTitle = React.forwardRef<
  React.ComponentRef<typeof DrawerPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Title
    ref={ref}
    className={cn("text-lg font-semibold leading-none tracking-tight", className)}
    {...props}
  />
));
DrawerTitle.displayName = DrawerPrimitive.Title.displayName;

const DrawerDescription = React.forwardRef<
  React.ComponentRef<typeof DrawerPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Description
    ref={ref}
    className={cn("text-sm text-secondary", className)}
    {...props}
  />
));
DrawerDescription.displayName = DrawerPrimitive.Description.displayName;

export {
  Drawer,
  DrawerPortal,
  DrawerOverlay,
  DrawerTrigger,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
};
