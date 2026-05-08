import { useState } from "react";
import { useEmployees } from "@/lib/hooks/useEmployees";
import type { Employee } from "@/lib/api";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/app/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/app/components/ui/command";
import { Button } from "@/app/components/ui/button";
import { Check, ChevronsUpDown, Users, Loader2 } from "lucide-react";
import { cn } from "@/app/components/ui/utils";

interface EmployeeSelectProps {
  value?: string;
  onChange: (employee: Employee | null) => void;
  status?: "active" | "inactive" | "terminated";
  department?: string;
  placeholder?: string;
}

export default function EmployeeSelect({
  value,
  onChange,
  status = "active",
  department,
  placeholder = "Select employee...",
}: EmployeeSelectProps) {
  const [open, setOpen] = useState(false);

  const { data: employees, isLoading } = useEmployees({
    status,
    department,
    limit: 100,
  });

  const selectedEmployee = employees?.find((e) => e._id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between bg-white dark:bg-slate-950",
            !value && "text-slate-400 dark:text-slate-500"
          )}
        >
          {selectedEmployee ? (
            <span className="flex items-center gap-2 truncate">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                {selectedEmployee.firstName?.[0]}
                {selectedEmployee.lastName?.[0]}
              </span>
              <span className="truncate">
                {selectedEmployee.employeeId} — {selectedEmployee.firstName}{" "}
                {selectedEmployee.lastName}
                {selectedEmployee.department && (
                  <span className="text-slate-400 dark:text-slate-500">
                    {" "}
                    ({selectedEmployee.department})
                  </span>
                )}
              </span>
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Users className="h-4 w-4 text-slate-400" />
              {placeholder}
            </span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[360px] p-0">
        <Command>
          <CommandInput placeholder="Search by name, ID, or department..." />
          <CommandList>
            {isLoading ? (
              <div className="flex items-center justify-center gap-2 py-6 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading employees...
              </div>
            ) : (
              <>
                <CommandEmpty>No employee found.</CommandEmpty>
                <CommandGroup>
                  {employees?.map((emp) => (
                    <CommandItem
                      key={emp._id}
                      value={`${emp.employeeId} ${emp.firstName} ${emp.lastName} ${emp.department || ""}`}
                      onSelect={() => {
                        onChange(emp);
                        setOpen(false);
                      }}
                      className="cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          {emp.firstName?.[0]}
                          {emp.lastName?.[0]}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-900 dark:text-white">
                            {emp.firstName} {emp.lastName}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {emp.employeeId}
                            {emp.department && ` · ${emp.department}`}
                            {emp.position && ` · ${emp.position}`}
                          </p>
                        </div>
                      </div>
                      <Check
                        className={cn(
                          "ml-auto h-4 w-4",
                          value === emp._id
                            ? "opacity-100"
                            : "opacity-0"
                        )}
                      />
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
