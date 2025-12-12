"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type ViewMode = "natural" | "terminal";

interface ViewModeMenuProps {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
}

export function ViewModeMenu({ value, onChange }: ViewModeMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="h-full px-2.5 hover:bg-black/5 transition-colors outline-none">
        View
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuRadioGroup
          value={value}
          onValueChange={(v) => onChange(v as ViewMode)}
        >
          <DropdownMenuRadioItem value="natural">
            Default
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="terminal">
            Terminal
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

