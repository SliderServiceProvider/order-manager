"use client";

import React, { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

type Item = {
  id: string;
  name: string;
};

type ComboboxProps = {
  items?: Item[];
  onInputChange: (value: string) => void;
  onItemSelect: (item: Item) => void;
  placeholder?: string;
};

export function LocationSearch({
  items = [],
  onInputChange,
  onItemSelect,
  placeholder = "Search location...",
}: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");

  // Log `items` for debugging
  const displayItems = Array.isArray(items) ? items : []; // Fallback to empty array
  console.log("LocationSearch displayItems:", displayItems);

  const handleInputChange = (newValue: string) => {
    console.log("Input change:", newValue); // Debug log
    onInputChange(newValue);
  };

  const handleSelect = (currentValue: string) => {
    console.log("Selected value:", currentValue); // Debug log
    const selectedItem = displayItems.find(
      (item) => item.name === currentValue
    );
    if (selectedItem) {
      setValue(currentValue); // Update selected value
      setOpen(false); // Close dropdown
      onItemSelect(selectedItem); // Trigger parent handler
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {value || placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[515px] p-0">
        <Command>
          <CommandInput
            placeholder={placeholder}
            onValueChange={(newValue) => {
              console.log("CommandInput value changed:", newValue); // Debug log
              handleInputChange(newValue);
            }}
          />
          <CommandEmpty>No locations found</CommandEmpty>
          <CommandGroup>
            {displayItems.map((item) => (
              <CommandItem
                key={item.id}
                value={item.name}
                onSelect={(currentValue) => {
                  console.log("CommandItem selected:", currentValue); // Debug log
                  handleSelect(currentValue);
                }}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    value === item.name ? "opacity-100" : "opacity-0"
                  )}
                />
                {item.name}
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
