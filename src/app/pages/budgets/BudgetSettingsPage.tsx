import { useState, useEffect } from 'react';
import { Layout } from '../../layout/Layout';
import {
  Settings,
  Plus,
  Loader2,
  Edit2,
  Trash2,
  Save,
  ArrowLeft,
  Search,
  GitBranch,
  CheckCircle,
  Star,
  Play,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Building2,
  DollarSign,
  X,
} from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Textarea } from '@/app/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Label } from '@/app/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Switch } from '@/app/components/ui/switch';
import { toast } from 'sonner';
import { useNavigate } from 'react-router';
import { budgetsApi } from '@/lib/api';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/app/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/app/components/ui/collapsible';

interface WorkflowStep {
  step_number: number;
  step_name: string;
  description?: string;
  approver_type: 'user' | 'role' | 'department_head' | 'any_manager' | 'specific_user';
  approver_id?: string | null;
  approver_role?: string | null;
  required_approvals: number;
  min_amount?: number;
  max_amount?: number | null;
  can_reject: boolean;
  can_request_changes: boolean;
  can_delegate: boolean;
  auto_approve_hours?: number | null;
}

interface WorkflowSettings {
  allow_parallel_approvals: boolean;
  require_all_steps: boolean;
  notify_requester_on_approval: boolean;
  notify_requester_on_rejection: boolean;
  escalation_hours: number;
  escalation_user_id?: string | null;
}

interface WorkflowConfig {
  _id: string;
  name: string;
  description: string;
  workflow_type: 'budget_creation' | 'budget_transfer' | 'budget_adjustment' | 'encumbrance' | 'expense' | 'all';
  min_amount: number;
  max_amount: number | null;
  department_scope: 'all' | 'specific';
  department_ids: string[];
  steps: WorkflowStep[];
  is_active: boolean;
  is_default: boolean;
  priority: number;
  settings: WorkflowSettings;
  usage_count: number;
  createdAt: string;
  updatedAt: string;
}

const WORKFLOW_TYPES = [
  { value: 'budget_creation', label: 'Budget Creation' },
  { value: 'budget_transfer', label: 'Budget Transfer' },
  { value: 'budget_adjustment', label: 'Budget Adjustment' },
  { value: 'encumbrance', label: 'Encumbrance' },
  { value: 'expense', label: 'Expense' },
  { value: 'all', label: 'All Types' },
];

const APPROVER_TYPES = [
  { value: 'user', label: 'Specific User' },
  { value: 'role', label: 'Role-based' },
  { value: 'department_head', label: 'Department Head' },
  { value: 'any_manager', label: 'Any Manager' },
  { value: 'specific_user', label: 'Named User' },
];

const APPROVER_ROLES = [
  'finance_manager',
  'director',
  'executive_committee',
  'department_head',
  'manager',
  'cfo',
  'ceo',
];

const defaultStep = (): WorkflowStep => ({
  step_number: 1,
  step_name: '',
  description: '',
  approver_type: 'role',
  approver_id: null,
  approver_role: 'finance_manager',
  required_approvals: 1,
  min_amount: 0,
  max_amount: null,
  can_reject: true,
  can_request_changes: true,
  can_delegate: false,
  auto_approve_hours: null,
});

const defaultSettings = (): WorkflowSettings => ({
  allow_parallel_approvals: false,
  require_all_steps: true,
  notify_requester_on_approval: true,
  notify_requester_on_rejection: true,
  escalation_hours: 48,
  escalation_user_id: null,
});

export default function BudgetSettingsPage() {
  const navigate = useNavigate();
  const [configs, setConfigs] = useState<WorkflowConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [drawerMode, setDrawerMode] = useState<'create' | 'edit' | 'test' | null>(null);
  const [selectedConfig, setSelectedConfig] = useState<WorkflowConfig | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [expandedSteps, setExpandedSteps] = useState<number[]>([0]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [configToDelete, setConfigToDelete] = useState<WorkflowConfig | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formWorkflowType, setFormWorkflowType] = useState<'budget_creation' | 'budget_transfer' | 'budget_adjustment' | 'encumbrance' | 'expense' | 'all'>('budget_creation');
  const [formMinAmount, setFormMinAmount] = useState('0');
  const [formMaxAmount, setFormMaxAmount] = useState('');
  const [formDepartmentScope, setFormDepartmentScope] = useState<'all' | 'specific'>('all');
  const [formIsDefault, setFormIsDefault] = useState(false);
  const [formPriority, setFormPriority] = useState('0');
  const [formSteps, setFormSteps] = useState<WorkflowStep[]>([defaultStep()]);
  const [formSettings, setFormSettings] = useState<WorkflowSettings>(defaultSettings());

  // Test form state
  const [testWorkflowType, setTestWorkflowType] = useState('budget_creation');
  const [testAmount, setTestAmount] = useState('');
  const [testDepartmentId, setTestDepartmentId] = useState('');
  const [testResult, setTestResult] = useState<WorkflowConfig | null>(null);
  const [testLoading, setTestLoading] = useState(false);

  const fetchConfigs = async () => {
    setLoading(true);
    try {
      const response = await budgetsApi.getWorkflowConfigs() as any;
      setConfigs(response.data || []);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load workflow configurations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchConfigs(); }, []);

  const filteredConfigs = configs.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.workflow_type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const closeDrawer = () => {
    setDrawerMode(null);
    setSelectedConfig(null);
    setFormName('');
    setFormDescription('');
    setFormWorkflowType('budget_creation');
    setFormMinAmount('0');
    setFormMaxAmount('');
    setFormDepartmentScope('all');
    setFormIsDefault(false);
    setFormPriority('0');
    setFormSteps([defaultStep()]);
    setFormSettings(defaultSettings());
    setExpandedSteps([0]);
    setTestResult(null);
    setTestAmount('');
    setTestDepartmentId('');
  };

  const openCreate = () => {
    setFormName('');
    setFormDescription('');
    setFormWorkflowType('budget_creation');
    setFormMinAmount('0');
    setFormMaxAmount('');
    setFormDepartmentScope('all');
    setFormIsDefault(false);
    setFormPriority('0');
    setFormSteps([defaultStep()]);
    setFormSettings(defaultSettings());
    setExpandedSteps([0]);
    setDrawerMode('create');
  };

  const openEdit = (config: WorkflowConfig) => {
    setSelectedConfig(config);
    setFormName(config.name);
    setFormDescription(config.description);
    setFormWorkflowType(config.workflow_type);
    setFormMinAmount(String(config.min_amount || 0));
    setFormMaxAmount(config.max_amount ? String(config.max_amount) : '');
    setFormDepartmentScope(config.department_scope);
    setFormIsDefault(config.is_default);
    setFormPriority(String(config.priority));
    setFormSteps(config.steps.length > 0 ? config.steps : [defaultStep()]);
    setFormSettings({ ...defaultSettings(), ...config.settings });
    setExpandedSteps([0]);
    setDrawerMode('edit');
  };

  const openTest = () => {
    setTestWorkflowType('budget_creation');
    setTestAmount('');
    setTestDepartmentId('');
    setTestResult(null);
    setDrawerMode('test');
  };

  const handleAddStep = () => {
    const newStep = defaultStep();
    newStep.step_number = formSteps.length + 1;
    setFormSteps([...formSteps, newStep]);
    setExpandedSteps([...expandedSteps, formSteps.length]);
  };

  const handleRemoveStep = (index: number) => {
    const newSteps = formSteps.filter((_, i) => i !== index);
    // Re-number steps
    newSteps.forEach((step, i) => { step.step_number = i + 1; });
    setFormSteps(newSteps);
    setExpandedSteps(expandedSteps.filter(i => i !== index).map(i => i > index ? i - 1 : i));
  };

  const handleStepChange = (index: number, field: keyof WorkflowStep, value: any) => {
    const newSteps = [...formSteps];
    newSteps[index] = { ...newSteps[index], [field]: value };
    setFormSteps(newSteps);
  };

  const toggleStepExpanded = (index: number) => {
    if (expandedSteps.includes(index)) {
      setExpandedSteps(expandedSteps.filter(i => i !== index));
    } else {
      setExpandedSteps([...expandedSteps, index]);
    }
  };

  const handleCreate = async () => {
    if (!formName.trim()) { toast.error('Workflow name is required'); return; }
    if (formSteps.length === 0) { toast.error('At least one approval step is required'); return; }
    if (formSteps.some(s => !s.step_name.trim())) { toast.error('All steps must have a name'); return; }

    setActionLoading('create');
    try {
      await budgetsApi.createWorkflowConfig({
        name: formName,
        description: formDescription,
        workflow_type: formWorkflowType,
        min_amount: parseFloat(formMinAmount) || 0,
        max_amount: formMaxAmount ? parseFloat(formMaxAmount) : null,
        department_scope: formDepartmentScope,
        department_ids: [],
        steps: formSteps,
        is_default: formIsDefault,
        priority: parseInt(formPriority) || 0,
        settings: formSettings,
      });
      toast.success('Workflow configuration created');
      closeDrawer();
      fetchConfigs();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create workflow configuration');
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdate = async () => {
    if (!selectedConfig) return;
    if (!formName.trim()) { toast.error('Workflow name is required'); return; }
    if (formSteps.length === 0) { toast.error('At least one approval step is required'); return; }
    if (formSteps.some(s => !s.step_name.trim())) { toast.error('All steps must have a name'); return; }

    setActionLoading('update');
    try {
      await budgetsApi.updateWorkflowConfig(selectedConfig._id, {
        name: formName,
        description: formDescription,
        workflow_type: formWorkflowType,
        min_amount: parseFloat(formMinAmount) || 0,
        max_amount: formMaxAmount ? parseFloat(formMaxAmount) : null,
        department_scope: formDepartmentScope,
        department_ids: [],
        steps: formSteps,
        is_default: formIsDefault,
        priority: parseInt(formPriority) || 0,
        settings: formSettings,
      });
      toast.success('Workflow configuration updated');
      closeDrawer();
      fetchConfigs();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update workflow configuration');
    } finally {
      setActionLoading(null);
    }
  };

  const openDeleteDialog = (config: WorkflowConfig) => {
    setConfigToDelete(config);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!configToDelete) return;
    setActionLoading(configToDelete._id);
    try {
      await budgetsApi.deleteWorkflowConfig(configToDelete._id);
      toast.success('Workflow configuration deleted');
      setDeleteDialogOpen(false);
      setConfigToDelete(null);
      fetchConfigs();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete workflow configuration');
    } finally {
      setActionLoading(null);
    }
  };

  const handleSetDefault = async (config: WorkflowConfig) => {
    setActionLoading(`default-${config._id}`);
    try {
      await budgetsApi.setDefaultWorkflowConfig(config._id);
      toast.success('Workflow set as default');
      fetchConfigs();
    } catch (err: any) {
      toast.error(err.message || 'Failed to set default workflow');
    } finally {
      setActionLoading(null);
    }
  };

  const handleTestWorkflow = async () => {
    setTestLoading(true);
    try {
      const response = await budgetsApi.testWorkflowMatch({
        workflow_type: testWorkflowType,
        amount: testAmount ? parseFloat(testAmount) : 0,
        department_id: testDepartmentId || null,
      }) as any;
      setTestResult(response.data?.workflow || null);
      if (!response.data?.workflow) {
        toast.info('No matching workflow found for the given criteria');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to test workflow match');
    } finally {
      setTestLoading(false);
    }
  };

  const formatCurrency = (amount: number | null) => {
    if (amount === null || amount === undefined) return '∞';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);
  };

  const getWorkflowTypeLabel = (type: string) => {
    return WORKFLOW_TYPES.find(t => t.value === type)?.label || type;
  };

  const getApproverTypeLabel = (type: string) => {
    return APPROVER_TYPES.find(t => t.value === type)?.label || type;
  };

  return (
    <Layout>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={() => navigate('/budgets')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Settings className="h-6 w-6" />
                Budget Workflow Settings
              </h1>
              <p className="text-muted-foreground">Configure multi-level approval workflows for budgets</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={openTest} className="gap-2">
              <Play className="h-4 w-4" />
              Test Match
            </Button>
            <Button onClick={openCreate} className="gap-2">
              <Plus className="h-4 w-4" />
              Create Workflow
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search workflows..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Configs Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredConfigs.length === 0 ? (
          <div className="text-center py-16">
            <GitBranch className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No workflow configurations</h3>
            <p className="text-muted-foreground mb-4">Create your first approval workflow to get started</p>
            <Button onClick={openCreate} className="gap-2">
              <Plus className="h-4 w-4" />
              Create Workflow
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredConfigs.map(config => (
              <Card key={config._id} className={config.is_default ? 'border-primary/50 bg-primary/5' : ''}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base">{config.name}</CardTitle>
                      {config.is_default && (
                        <Badge className="text-xs bg-primary text-primary-foreground">
                          <Star className="h-3 w-3 mr-1" />
                          Default
                        </Badge>
                      )}
                    </div>
                    <div className="flex gap-1">
                      {!config.is_default && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2"
                          onClick={() => handleSetDefault(config)}
                          disabled={actionLoading === `default-${config._id}`}
                        >
                          {actionLoading === `default-${config._id}` ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Star className="h-3 w-3" />
                          )}
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => openEdit(config)}>
                        <Edit2 className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-destructive hover:text-destructive"
                        onClick={() => openDeleteDialog(config)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <CardDescription className="text-xs">{config.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Workflow Info */}
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {getWorkflowTypeLabel(config.workflow_type)}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      <DollarSign className="h-3 w-3 mr-1" />
                      {formatCurrency(config.min_amount)} - {formatCurrency(config.max_amount)}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      <Building2 className="h-3 w-3 mr-1" />
                      {config.department_scope === 'all' ? 'All Departments' : 'Specific Departments'}
                    </Badge>
                  </div>

                  {/* Steps Preview */}
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                      {config.steps.length} approval step{config.steps.length !== 1 ? 's' : ''}
                    </div>
                    <div className="space-y-1">
                      {config.steps.slice(0, 3).map((step, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <div className="h-5 w-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-medium">
                            {step.step_number}
                          </div>
                          <span className="truncate">{step.step_name}</span>
                          <span className="text-xs text-muted-foreground">({getApproverTypeLabel(step.approver_type)})</span>
                        </div>
                      ))}
                      {config.steps.length > 3 && (
                        <div className="text-xs text-muted-foreground pl-7">
                          +{config.steps.length - 3} more steps
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Usage Stats */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                    <span>Used {config.usage_count} times</span>
                    {!config.is_active && (
                      <Badge variant="destructive" className="text-xs">Inactive</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* ── Drawer ──────────────────────────────────────────────── */}
        {drawerMode && (
          <>
            <div className="fixed inset-0 bg-black/50 z-40" onClick={closeDrawer} />
            <div className="fixed right-0 top-0 bottom-0 w-full max-w-3xl bg-background border-l z-50 shadow-xl flex flex-col">

              {/* Create / Edit */}
              {(drawerMode === 'create' || drawerMode === 'edit') && (
                <>
                  <div className="flex items-center justify-between p-6 border-b">
                    <div>
                      <h2 className="text-lg font-semibold flex items-center gap-2">
                        {drawerMode === 'create' ? <Plus className="h-5 w-5" /> : <Edit2 className="h-5 w-5" />}
                        {drawerMode === 'create' ? 'Create Workflow' : 'Edit Workflow'}
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        {drawerMode === 'create'
                          ? 'Define a new multi-level approval workflow'
                          : `Editing: ${selectedConfig?.name}`}
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={closeDrawer}><X className="h-4 w-4" /></Button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Basic Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2 md:col-span-2">
                        <Label>Workflow Name *</Label>
                        <Input
                          value={formName}
                          onChange={e => setFormName(e.target.value)}
                          placeholder="e.g., Standard Budget Approval"
                        />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label>Description</Label>
                        <Textarea
                          value={formDescription}
                          onChange={e => setFormDescription(e.target.value)}
                          placeholder="What this workflow is used for..."
                          rows={2}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Workflow Type</Label>
                        <Select value={formWorkflowType} onValueChange={v => setFormWorkflowType(v as any)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {WORKFLOW_TYPES.map(t => (
                              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Priority</Label>
                        <Input
                          type="number"
                          value={formPriority}
                          onChange={e => setFormPriority(e.target.value)}
                          placeholder="Higher = preferred"
                        />
                      </div>
                    </div>

                    {/* Amount Range */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Minimum Amount</Label>
                        <Input
                          type="number"
                          value={formMinAmount}
                          onChange={e => setFormMinAmount(e.target.value)}
                          placeholder="0"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Maximum Amount (empty = no limit)</Label>
                        <Input
                          type="number"
                          value={formMaxAmount}
                          onChange={e => setFormMaxAmount(e.target.value)}
                          placeholder="No limit"
                        />
                      </div>
                    </div>

                    {/* Department Scope & Default */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Department Scope</Label>
                        <Select value={formDepartmentScope} onValueChange={v => setFormDepartmentScope(v as any)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Departments</SelectItem>
                            <SelectItem value="specific">Specific Departments</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center space-x-2 pt-6">
                        <Switch
                          id="is-default"
                          checked={formIsDefault}
                          onCheckedChange={setFormIsDefault}
                        />
                        <Label htmlFor="is-default" className="cursor-pointer">
                          Set as default workflow for this type
                        </Label>
                      </div>
                    </div>

                    {/* Steps */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label className="text-base">Approval Steps</Label>
                        <Button variant="outline" size="sm" onClick={handleAddStep} className="gap-2">
                          <Plus className="h-4 w-4" />
                          Add Step
                        </Button>
                      </div>

                      <div className="space-y-3">
                        {formSteps.map((step, index) => (
                          <Collapsible
                            key={index}
                            open={expandedSteps.includes(index)}
                            onOpenChange={() => toggleStepExpanded(index)}
                          >
                            <div className="border rounded-lg overflow-hidden">
                              <CollapsibleTrigger asChild>
                                <div className="flex items-center justify-between p-3 bg-muted/50 cursor-pointer">
                                  <div className="flex items-center gap-3">
                                    <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-medium">
                                      {step.step_number}
                                    </div>
                                    <span className="font-medium">
                                      {step.step_name || `Step ${step.step_number}`}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                      ({getApproverTypeLabel(step.approver_type)})
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {formSteps.length > 1 && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 px-2 text-destructive hover:text-destructive"
                                        onClick={(e) => { e.stopPropagation(); handleRemoveStep(index); }}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    )}
                                    {expandedSteps.includes(index) ? (
                                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                                    ) : (
                                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                    )}
                                  </div>
                                </div>
                              </CollapsibleTrigger>
                              <CollapsibleContent>
                                <div className="p-4 space-y-4">
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                      <Label>Step Name *</Label>
                                      <Input
                                        value={step.step_name}
                                        onChange={e => handleStepChange(index, 'step_name', e.target.value)}
                                        placeholder="e.g., Department Manager Approval"
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label>Approver Type</Label>
                                      <Select
                                        value={step.approver_type}
                                        onValueChange={v => handleStepChange(index, 'approver_type', v)}
                                      >
                                        <SelectTrigger>
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {APPROVER_TYPES.map(t => (
                                            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  </div>

                                  {step.approver_type === 'role' && (
                                    <div className="space-y-2">
                                      <Label>Approver Role</Label>
                                      <Select
                                        value={step.approver_role || ''}
                                        onValueChange={v => handleStepChange(index, 'approver_role', v)}
                                      >
                                        <SelectTrigger>
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {APPROVER_ROLES.map(r => (
                                            <SelectItem key={r} value={r}>{r.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  )}

                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                      <Label>Required Approvals</Label>
                                      <Input
                                        type="number"
                                        min={1}
                                        value={step.required_approvals}
                                        onChange={e => handleStepChange(index, 'required_approvals', parseInt(e.target.value) || 1)}
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label>Auto-approve (hours)</Label>
                                      <Input
                                        type="number"
                                        placeholder="No auto-approve"
                                        value={step.auto_approve_hours || ''}
                                        onChange={e => handleStepChange(index, 'auto_approve_hours', e.target.value ? parseInt(e.target.value) : null)}
                                      />
                                    </div>
                                  </div>

                                  <div className="flex flex-wrap gap-4 pt-2">
                                    <div className="flex items-center space-x-2">
                                      <Switch
                                        id={`can-reject-${index}`}
                                        checked={step.can_reject}
                                        onCheckedChange={v => handleStepChange(index, 'can_reject', v)}
                                      />
                                      <Label htmlFor={`can-reject-${index}`} className="cursor-pointer text-sm">Can Reject</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <Switch
                                        id={`can-request-${index}`}
                                        checked={step.can_request_changes}
                                        onCheckedChange={v => handleStepChange(index, 'can_request_changes', v)}
                                      />
                                      <Label htmlFor={`can-request-${index}`} className="cursor-pointer text-sm">Can Request Changes</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <Switch
                                        id={`can-delegate-${index}`}
                                        checked={step.can_delegate}
                                        onCheckedChange={v => handleStepChange(index, 'can_delegate', v)}
                                      />
                                      <Label htmlFor={`can-delegate-${index}`} className="cursor-pointer text-sm">Can Delegate</Label>
                                    </div>
                                  </div>
                                </div>
                              </CollapsibleContent>
                            </div>
                          </Collapsible>
                        ))}
                      </div>
                    </div>

                    {/* Settings */}
                    <div className="space-y-4 border-t pt-4">
                      <Label className="text-base">Workflow Settings</Label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="notify-approval"
                            checked={formSettings.notify_requester_on_approval}
                            onCheckedChange={v => setFormSettings({ ...formSettings, notify_requester_on_approval: v })}
                          />
                          <Label htmlFor="notify-approval" className="cursor-pointer">Notify requester on approval</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="notify-rejection"
                            checked={formSettings.notify_requester_on_rejection}
                            onCheckedChange={v => setFormSettings({ ...formSettings, notify_requester_on_rejection: v })}
                          />
                          <Label htmlFor="notify-rejection" className="cursor-pointer">Notify requester on rejection</Label>
                        </div>
                        <div className="space-y-2">
                          <Label>Escalation Hours</Label>
                          <Input
                            type="number"
                            value={formSettings.escalation_hours}
                            onChange={e => setFormSettings({ ...formSettings, escalation_hours: parseInt(e.target.value) || 48 })}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 border-t">
                    <Button
                      onClick={drawerMode === 'create' ? handleCreate : handleUpdate}
                      className="w-full gap-2"
                      disabled={actionLoading === 'create' || actionLoading === 'update'}
                    >
                      {(actionLoading === 'create' || actionLoading === 'update') ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      {drawerMode === 'create' ? 'Create Workflow' : 'Save Changes'}
                    </Button>
                  </div>
                </>
              )}

              {/* Test Workflow */}
              {drawerMode === 'test' && (
                <>
                  <div className="flex items-center justify-between p-6 border-b">
                    <div>
                      <h2 className="text-lg font-semibold flex items-center gap-2">
                        <Play className="h-5 w-5" />
                        Test Workflow Match
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        Find which workflow would match given criteria
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={closeDrawer}><X className="h-4 w-4" /></Button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    <div className="grid grid-cols-1 gap-4">
                      <div className="space-y-2">
                        <Label>Workflow Type</Label>
                        <Select value={testWorkflowType} onValueChange={setTestWorkflowType}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {WORKFLOW_TYPES.map(t => (
                              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Amount</Label>
                        <Input
                          type="number"
                          value={testAmount}
                          onChange={e => setTestAmount(e.target.value)}
                          placeholder="Enter amount..."
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Department ID (optional)</Label>
                        <Input
                          value={testDepartmentId}
                          onChange={e => setTestDepartmentId(e.target.value)}
                          placeholder="Enter department ID..."
                        />
                      </div>
                    </div>

                    <Button
                      onClick={handleTestWorkflow}
                      className="w-full gap-2"
                      disabled={testLoading}
                    >
                      {testLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                      Test Match
                    </Button>

                    {testResult && (
                      <Card className="border-primary">
                        <CardHeader>
                          <CardTitle className="text-base flex items-center gap-2">
                            <CheckCircle className="h-5 w-5 text-green-500" />
                            Matching Workflow Found
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div>
                            <div className="font-medium">{testResult.name}</div>
                            <div className="text-sm text-muted-foreground">{testResult.description}</div>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Badge variant="secondary">{getWorkflowTypeLabel(testResult.workflow_type)}</Badge>
                            <Badge variant="outline">
                              {formatCurrency(testResult.min_amount)} - {formatCurrency(testResult.max_amount)}
                            </Badge>
                          </div>
                          <div className="text-sm">
                            <span className="font-medium">{testResult.steps.length} steps:</span>
                            <ul className="mt-1 space-y-1">
                              {testResult.steps.map((step, i) => (
                                <li key={i} className="flex items-center gap-2">
                                  <span className="h-4 w-4 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center">
                                    {step.step_number}
                                  </span>
                                  {step.step_name}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {testResult === null && !testLoading && (
                      <div className="text-center py-8">
                        <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
                        <h3 className="text-lg font-medium mb-2">No Matching Workflow</h3>
                        <p className="text-muted-foreground">No workflow configuration matches the given criteria</p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </>
        )}

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Delete Workflow
              </DialogTitle>
              <DialogDescription>
                Are you sure you want to delete "{configToDelete?.name}"? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={!!actionLoading}
              >
                {actionLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-2" />
                )}
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
