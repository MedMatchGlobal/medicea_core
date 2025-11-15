'use client';

import {
  Command,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import * as React from 'react';

interface DrugComboBoxProps {
  options: string[];
  value: string;
  onChange: (value: string) => void;
}

export function DrugComboBox({ options, value, onChange }: DrugComboBoxProps) {
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState(value);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const justSelectedRef = React.useRef(false); // ✅ NEW

  const handleSelect = (val: string) => {
    onChange(val);
    setInputValue(val);
    setOpen(false);
    justSelectedRef.current = true; // ✅ NEW
    inputRef.current?.blur(); // ✅ NEW: force blur to prevent dropdown reopening
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          placeholder="Type or select a drug"
          onChange={(e) => {
            setInputValue(e.target.value);
            onChange(e.target.value);
          }}
          onFocus={() => {
            if (justSelectedRef.current) {
              justSelectedRef.current = false; // reset for next time
              return; // ✅ prevent dropdown from reopening
            }
            setOpen(true);
          }}
          style={{
            width: '100%',
            padding: '0.5rem',
            border: '1px solid #ccc',
            borderRadius: '4px',
            backgroundColor: 'white',
            zIndex: 50,
          }}
        />
      </PopoverTrigger>

      <PopoverContent
        align="start"
        className="p-0 z-50 border bg-white shadow-md rounded-md w-full"
        style={{
          backgroundColor: 'white',
          maxHeight: '16rem',
          overflowY: 'auto',
        }}
      >
        <Command shouldFilter>
          <CommandInput placeholder="Search drugs..." />
          <CommandList>
            {options.map((option, index) => (
              <CommandItem
                key={`${option}-${index}`}
                value={option}
                onSelect={() => handleSelect(option)}
              >
                {option}
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
