import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { Layout } from "../../layout/Layout";
import { useEmployee, useCreateEmployee, useUpdateEmployee } from "@/lib/hooks/useEmployees";
import { payrollApi } from "@/lib/api";
import {
  ArrowLeft,
  Save,
  Loader2,
  User,
  Building2,
  CreditCard,
  DollarSign,
  Briefcase,
  Calculator,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { toast } from "sonner";

const GENDER_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
];

const EMPLOYMENT_TYPES = [
  { value: "full-time", label: "Full-time" },
  { value: "part-time", label: "Part-time" },
  { value: "contract", label: "Contract" },
  { value: "intern", label: "Intern" },
];

const TAX_STATUS_OPTIONS = [
  { value: "resident", label: "Resident" },
  { value: "non-resident", label: "Non-resident" },
];

interface FormData {
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: "male" | "female" | "other" | "";
  nationalId: string;
  hireDate: string;
  employmentType: "full-time" | "part-time" | "contract" | "intern" | "";
  department: string;
  position: string;
  location: string;
  bankName: string;
  bankAccount: string;
  bankBranch: string;
  mobileMoneyNumber: string;
  taxStatus: string;
  rssbRegistrationNumber: string;
  tinNumber: string;
  // Salary (only on create)
  basicSalary: string;
  transportAllowance: string;
  housingAllowance: string;
  otherAllowances: string;
  salaryEffectiveDate: string;
}

function emptyForm(): FormData {
  return {
    employeeId: "",
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    dateOfBirth: "",
    gender: "",
    nationalId: "",
    hireDate: new Date().toISOString().split("T")[0],
    employmentType: "full-time",
    department: "",
    position: "",
    location: "",
    bankName: "",
    bankAccount: "",
    bankBranch: "",
    mobileMoneyNumber: "",
    taxStatus: "resident",
    rssbRegistrationNumber: "",
    tinNumber: "",
    basicSalary: "",
    transportAllowance: "0",
    housingAllowance: "0",
    otherAllowances: "0",
    salaryEffectiveDate: new Date().toISOString().split("T")[0],
  };
}

function populateFromEmployee(emp: any): FormData {
  return {
    employeeId: emp.employeeId || "",
    firstName: emp.firstName || "",
    lastName: emp.lastName || "",
    email: emp.email || "",
    phone: emp.phone || "",
    dateOfBirth: emp.dateOfBirth ? emp.dateOfBirth.split("T")[0] : "",
    gender: emp.gender || "",
    nationalId: emp.nationalId || "",
    hireDate: emp.hireDate ? emp.hireDate.split("T")[0] : "",
    employmentType: emp.employmentType || "full-time",
    department: emp.department || "",
    position: emp.position || "",
    location: emp.location || "",
    bankName: emp.bankName || "",
    bankAccount: emp.bankAccount || "",
    bankBranch: emp.bankBranch || "",
    mobileMoneyNumber: emp.mobileMoneyNumber || "",
    taxStatus: emp.taxStatus || "resident",
    rssbRegistrationNumber: emp.rssbRegistrationNumber || "",
    tinNumber: emp.tinNumber || "",
    basicSalary: emp.currentSalary?.basicSalary?.toString() || "",
    transportAllowance: emp.currentSalary?.transportAllowance?.toString() || "0",
    housingAllowance: emp.currentSalary?.housingAllowance?.toString() || "0",
    otherAllowances: emp.currentSalary?.otherAllowances?.toString() || "0",
    salaryEffectiveDate: emp.currentSalary?.effectiveDate
      ? emp.currentSalary.effectiveDate.split("T")[0]
      : new Date().toISOString().split("T")[0],
  };
}

function parseNumber(v: string): number {
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
}

interface FieldProps {
  label: string;
  children: React.ReactNode;
  required?: boolean;
}

function Field({ label, children, required }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </Label>
      {children}
    </div>
  );
}

export default function EmployeeFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const isEdit = Boolean(id);

  const { data: existingEmployee } = useEmployee(isEdit ? id : undefined);
  const createMutation = useCreateEmployee();
  const updateMutation = useUpdateEmployee();

  const [form, setForm] = useState<FormData>(emptyForm());
  const [calcPreview, setCalcPreview] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("personal");

  useEffect(() => {
    if (existingEmployee) {
      setForm(populateFromEmployee(existingEmployee));
    }
  }, [existingEmployee]);

  // Live calculation preview
  useEffect(() => {
    const basic = parseNumber(form.basicSalary);
    if (basic <= 0) {
      setCalcPreview(null);
      return;
    }
    const transport = parseNumber(form.transportAllowance);
    const housing = parseNumber(form.housingAllowance);
    const other = parseNumber(form.otherAllowances);

    const salaryData = {
      basicSalary: basic,
      transportAllowance: transport,
      housingAllowance: housing,
      otherAllowances: other,
    };

    // Call calculate API
    payrollApi
      .calculate({ salary: salaryData })
      .then((res) => {
        if (res.success) setCalcPreview(res.data);
      })
      .catch(() => setCalcPreview(null));
  }, [form.basicSalary, form.transportAllowance, form.housingAllowance, form.otherAllowances]);

  const updateField = (field: keyof FormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    if (!form.employeeId.trim() || !form.firstName.trim() || !form.lastName.trim()) {
      toast.error("Employee ID, First Name, and Last Name are required");
      setActiveTab("personal");
      return;
    }

    const payload = {
      employeeId: form.employeeId.trim().toUpperCase(),
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim() || undefined,
      phone: form.phone.trim() || undefined,
      dateOfBirth: form.dateOfBirth || undefined,
      gender: (form.gender || undefined) as "male" | "female" | "other" | undefined,
      nationalId: form.nationalId.trim() || undefined,
      hireDate: form.hireDate || undefined,
      employmentType: (form.employmentType || undefined) as "full-time" | "part-time" | "contract" | "intern" | undefined,
      department: form.department.trim() || undefined,
      position: form.position.trim() || undefined,
      location: form.location.trim() || undefined,
      bankName: form.bankName.trim() || undefined,
      bankAccount: form.bankAccount.trim() || undefined,
      bankBranch: form.bankBranch.trim() || undefined,
      mobileMoneyNumber: form.mobileMoneyNumber.trim() || undefined,
      taxStatus: form.taxStatus as "resident" | "non-resident",
      rssbRegistrationNumber: form.rssbRegistrationNumber.trim() || undefined,
      tinNumber: form.tinNumber.trim() || undefined,
    };

    if (isEdit) {
      updateMutation.mutate(
        { id: id!, payload },
        {
          onSuccess: () => {
            toast.success("Employee updated successfully");
            navigate(`/employees/${id}`);
          },
          onError: (err: any) => toast.error(err.message || "Update failed"),
        }
      );
    } else {
      const createPayload: any = { ...payload };
      // Include initial salary if provided
      const basic = parseNumber(form.basicSalary);
      if (basic > 0) {
        createPayload.salary = {
          basicSalary: basic,
          transportAllowance: parseNumber(form.transportAllowance),
          housingAllowance: parseNumber(form.housingAllowance),
          otherAllowances: parseNumber(form.otherAllowances),
          effectiveDate: form.salaryEffectiveDate,
          reason: "Initial salary",
        };
      }
      createMutation.mutate(createPayload, {
        onSuccess: (data) => {
          toast.success("Employee created successfully");
          navigate(`/employees/${data._id}`);
        },
        onError: (err: any) => toast.error(err.message || "Creation failed"),
      });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Layout>
      <div className="mx-auto max-w-5xl space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(isEdit ? `/employees/${id}` : "/employees")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
              {isEdit ? "Edit Employee" : "Add New Employee"}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {isEdit
                ? "Update employee details"
                : "Create a new employee master record"}
            </p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="bg-slate-100 dark:bg-slate-900">
            <TabsTrigger value="personal">
              <User className="mr-2 h-4 w-4" />
              Personal
            </TabsTrigger>
            <TabsTrigger value="organization">
              <Building2 className="mr-2 h-4 w-4" />
              Organization
            </TabsTrigger>
            <TabsTrigger value="bank">
              <CreditCard className="mr-2 h-4 w-4" />
              Bank & Tax
            </TabsTrigger>
            {!isEdit && (
              <TabsTrigger value="salary">
                <DollarSign className="mr-2 h-4 w-4" />
                Salary
              </TabsTrigger>
            )}
          </TabsList>

          {/* Personal Tab */}
          <TabsContent value="personal" className="mt-4">
            <Card className="border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-950">
              <CardHeader>
                <CardTitle className="text-base font-semibold text-slate-950 dark:text-white">
                  Personal Details
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Field label="Employee ID" required>
                  <Input
                    value={form.employeeId}
                    onChange={(e) => updateField("employeeId", e.target.value)}
                    placeholder="e.g. EMP001"
                    disabled={isEdit}
                  />
                </Field>
                <Field label="First Name" required>
                  <Input
                    value={form.firstName}
                    onChange={(e) => updateField("firstName", e.target.value)}
                    placeholder="First name"
                  />
                </Field>
                <Field label="Last Name" required>
                  <Input
                    value={form.lastName}
                    onChange={(e) => updateField("lastName", e.target.value)}
                    placeholder="Last name"
                  />
                </Field>
                <Field label="Email">
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => updateField("email", e.target.value)}
                    placeholder="email@company.com"
                  />
                </Field>
                <Field label="Phone">
                  <Input
                    value={form.phone}
                    onChange={(e) => updateField("phone", e.target.value)}
                    placeholder="+250..."
                  />
                </Field>
                <Field label="Date of Birth">
                  <Input
                    type="date"
                    value={form.dateOfBirth}
                    onChange={(e) => updateField("dateOfBirth", e.target.value)}
                  />
                </Field>
                <Field label="Gender">
                  <Select
                    value={form.gender}
                    onValueChange={(v) => updateField("gender", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      {GENDER_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="National ID">
                  <Input
                    value={form.nationalId}
                    onChange={(e) => updateField("nationalId", e.target.value)}
                    placeholder="National ID number"
                  />
                </Field>
                <Field label="Hire Date">
                  <Input
                    type="date"
                    value={form.hireDate}
                    onChange={(e) => updateField("hireDate", e.target.value)}
                  />
                </Field>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Organization Tab */}
          <TabsContent value="organization" className="mt-4">
            <Card className="border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-950">
              <CardHeader>
                <CardTitle className="text-base font-semibold text-slate-950 dark:text-white">
                  Organization
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Field label="Employment Type">
                  <Select
                    value={form.employmentType}
                    onValueChange={(v) => updateField("employmentType", v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EMPLOYMENT_TYPES.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Department">
                  <Input
                    value={form.department}
                    onChange={(e) => updateField("department", e.target.value)}
                    placeholder="e.g. Engineering"
                  />
                </Field>
                <Field label="Position">
                  <Input
                    value={form.position}
                    onChange={(e) => updateField("position", e.target.value)}
                    placeholder="e.g. Senior Developer"
                  />
                </Field>
                <Field label="Location">
                  <Input
                    value={form.location}
                    onChange={(e) => updateField("location", e.target.value)}
                    placeholder="e.g. Kigali"
                  />
                </Field>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Bank & Tax Tab */}
          <TabsContent value="bank" className="mt-4">
            <Card className="border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-950">
              <CardHeader>
                <CardTitle className="text-base font-semibold text-slate-950 dark:text-white">
                  Bank & Tax Information
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Field label="Bank Name">
                  <Input
                    value={form.bankName}
                    onChange={(e) => updateField("bankName", e.target.value)}
                    placeholder="e.g. Bank of Kigali"
                  />
                </Field>
                <Field label="Bank Account">
                  <Input
                    value={form.bankAccount}
                    onChange={(e) => updateField("bankAccount", e.target.value)}
                    placeholder="Account number"
                  />
                </Field>
                <Field label="Branch">
                  <Input
                    value={form.bankBranch}
                    onChange={(e) => updateField("bankBranch", e.target.value)}
                    placeholder="Branch name"
                  />
                </Field>
                <Field label="Mobile Money">
                  <Input
                    value={form.mobileMoneyNumber}
                    onChange={(e) =>
                      updateField("mobileMoneyNumber", e.target.value)
                    }
                    placeholder="e.g. +2507..."
                  />
                </Field>
                <Field label="Tax Status">
                  <Select
                    value={form.taxStatus}
                    onValueChange={(v) => updateField("taxStatus", v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TAX_STATUS_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="RSSB Registration Number">
                  <Input
                    value={form.rssbRegistrationNumber}
                    onChange={(e) =>
                      updateField("rssbRegistrationNumber", e.target.value)
                    }
                    placeholder="RSSB number"
                  />
                </Field>
                <Field label="TIN Number">
                  <Input
                    value={form.tinNumber}
                    onChange={(e) => updateField("tinNumber", e.target.value)}
                    placeholder="TIN number"
                  />
                </Field>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Salary Tab (Create only) */}
          <TabsContent value="salary" className="mt-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <Card className="border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-950">
                <CardHeader>
                  <CardTitle className="text-base font-semibold text-slate-950 dark:text-white">
                    Initial Salary
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4">
                  <Field label="Basic Salary" required>
                    <Input
                      type="number"
                      min={0}
                      value={form.basicSalary}
                      onChange={(e) => updateField("basicSalary", e.target.value)}
                      placeholder="e.g. 500000"
                    />
                  </Field>
                  <Field label="Transport Allowance">
                    <Input
                      type="number"
                      min={0}
                      value={form.transportAllowance}
                      onChange={(e) =>
                        updateField("transportAllowance", e.target.value)
                      }
                      placeholder="0"
                    />
                  </Field>
                  <Field label="Housing Allowance">
                    <Input
                      type="number"
                      min={0}
                      value={form.housingAllowance}
                      onChange={(e) =>
                        updateField("housingAllowance", e.target.value)
                      }
                      placeholder="0"
                    />
                  </Field>
                  <Field label="Other Allowances">
                    <Input
                      type="number"
                      min={0}
                      value={form.otherAllowances}
                      onChange={(e) =>
                        updateField("otherAllowances", e.target.value)
                      }
                      placeholder="0"
                    />
                  </Field>
                  <Field label="Effective Date">
                    <Input
                      type="date"
                      value={form.salaryEffectiveDate}
                      onChange={(e) =>
                        updateField("salaryEffectiveDate", e.target.value)
                      }
                    />
                  </Field>
                </CardContent>
              </Card>

              {/* Live Preview */}
              <Card className="border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-950">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-950 dark:text-white">
                    <Calculator className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    Payroll Preview
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {calcPreview ? (
                    <>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-slate-950 dark:text-white">
                          RWF{" "}
                          {new Intl.NumberFormat("en-US").format(
                            calcPreview.grossSalary
                          )}
                        </span>
                        <span className="text-sm text-slate-500 dark:text-slate-400">
                          gross
                        </span>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-500 dark:text-slate-400">
                            PAYE Tax
                          </span>
                          <span className="font-medium text-red-600 dark:text-red-400">
                            -RWF{" "}
                            {new Intl.NumberFormat("en-US").format(
                              calcPreview.deductions.paye
                            )}
                          </span>
                        </div>
                        {/* RSSB Employee Deductions */}
                        <div className="mt-1 space-y-1 rounded bg-slate-50/50 p-1.5 dark:bg-slate-900/50">
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-500 dark:text-slate-400">
                              RSSB Pension (6%)
                            </span>
                            <span className="text-red-500 dark:text-red-400">
                              -RWF{" "}
                              {new Intl.NumberFormat("en-US").format(
                                calcPreview.deductions.rssbEmployeePension || 0
                              )}
                            </span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-500 dark:text-slate-400">
                              RSSB Maternity (0.3%)
                            </span>
                            <span className="text-red-500 dark:text-red-400">
                              -RWF{" "}
                              {new Intl.NumberFormat("en-US").format(
                                calcPreview.deductions.rssbEmployeeMaternity || 0
                              )}
                            </span>
                          </div>
                        </div>
                        {/* RSSB Employer Contributions */}
                        <div className="mt-1 space-y-1 rounded bg-slate-50/50 p-1.5 dark:bg-slate-900/50">
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-500 dark:text-slate-400">
                              Emp. Pension (6%)
                            </span>
                            <span className="text-slate-600 dark:text-slate-400">
                              RWF{" "}
                              {new Intl.NumberFormat("en-US").format(
                                calcPreview.contributions.rssbEmployerPension || 0
                              )}
                            </span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-500 dark:text-slate-400">
                              Emp. Maternity (0.3%)
                            </span>
                            <span className="text-slate-600 dark:text-slate-400">
                              RWF{" "}
                              {new Intl.NumberFormat("en-US").format(
                                calcPreview.contributions.rssbEmployerMaternity || 0
                              )}
                            </span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-500 dark:text-slate-400">
                              Occ. Hazard ({calcPreview.contributions.occupationalHazardRate || 2}%)
                            </span>
                            <span className="text-slate-600 dark:text-slate-400">
                              RWF{" "}
                              {new Intl.NumberFormat("en-US").format(
                                calcPreview.contributions.occupationalHazard || 0
                              )}
                            </span>
                          </div>
                        </div>
                        {calcPreview.deductions.healthInsurance > 0 && (
                          <div className="flex justify-between">
                            <span className="text-slate-500 dark:text-slate-400">
                              Health Insurance
                            </span>
                            <span className="font-medium text-red-600 dark:text-red-400">
                              -RWF{" "}
                              {new Intl.NumberFormat("en-US").format(
                                calcPreview.deductions.healthInsurance
                              )}
                            </span>
                          </div>
                        )}
                        {calcPreview.deductions.loanDeductions > 0 && (
                          <div className="flex justify-between">
                            <span className="text-slate-500 dark:text-slate-400">
                              Loan Repayments
                            </span>
                            <span className="font-medium text-red-600 dark:text-red-400">
                              -RWF{" "}
                              {new Intl.NumberFormat("en-US").format(
                                calcPreview.deductions.loanDeductions
                              )}
                            </span>
                          </div>
                        )}
                        {calcPreview.deductions.otherDeductions > 0 && (
                          <div className="flex justify-between">
                            <span className="text-slate-500 dark:text-slate-400">
                              Other Deductions
                            </span>
                            <span className="font-medium text-red-600 dark:text-red-400">
                              -RWF{" "}
                              {new Intl.NumberFormat("en-US").format(
                                calcPreview.deductions.otherDeductions
                              )}
                            </span>
                          </div>
                        )}
                        <div className="border-t border-slate-100 pt-2 dark:border-slate-800">
                          <div className="flex justify-between">
                            <span className="font-semibold text-slate-900 dark:text-white">
                              Net Pay
                            </span>
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">
                              RWF{" "}
                              {new Intl.NumberFormat("en-US").format(
                                calcPreview.netPay
                              )}
                            </span>
                          </div>
                        </div>
                        <div className="flex justify-between text-xs text-slate-400 dark:text-slate-500">
                          <span>Total Employer Cost</span>
                          <span>
                            RWF{" "}
                            {new Intl.NumberFormat("en-US").format(
                              calcPreview.contributions.totalEmployerCost || 0
                            )}
                          </span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-2 py-8 text-slate-500 dark:text-slate-400">
                      <Briefcase className="h-8 w-8" />
                      <p className="text-sm">
                        Enter a basic salary to see payroll preview
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3">
          <Button
            variant="outline"
            onClick={() =>
              navigate(isEdit ? `/employees/${id}` : "/employees")
            }
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isPending}
            className="bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Save className="mr-2 h-4 w-4" />
            {isEdit ? "Save Changes" : "Create Employee"}
          </Button>
        </div>
      </div>
    </Layout>
  );
}
