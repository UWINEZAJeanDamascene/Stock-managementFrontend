import { useState, useEffect, useRef } from 'react';
import { companyApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useCompanyStore } from '@/store/companyStore';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/app/components/ui/dialog';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { Camera, Loader2, X, Save, Building2 } from 'lucide-react';

interface CompanyFormData {
  name: string;
  legal_name: string;
  email: string;
  phone: string;
  website: string;
  registration_number: string;
  tax_identification_number: string;
  industry: string;
  address_street: string;
  address_city: string;
  address_state: string;
  address_country: string;
  address_postcode: string;
}

interface CompanyProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CompanyProfileDialog({ open, onOpenChange }: CompanyProfileDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const setCompany = useCompanyStore((state) => state.setCompany);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [formData, setFormData] = useState<CompanyFormData>({
    name: '',
    legal_name: '',
    email: '',
    phone: '',
    website: '',
    registration_number: '',
    tax_identification_number: '',
    industry: '',
    address_street: '',
    address_city: '',
    address_state: '',
    address_country: '',
    address_postcode: '',
  });

  // Fetch company profile when dialog opens
  useEffect(() => {
    if (open) {
      companyApi.getMe().then((response) => {
        if (response.success && response.data) {
          const company = response.data as any;
          setFormData({
            name: company.name ?? '',
            legal_name: company.legal_name ?? '',
            email: company.email ?? '',
            phone: company.phone ?? '',
            website: company.website ?? '',
            registration_number: company.registration_number ?? '',
            tax_identification_number: company.tax_identification_number ?? '',
            industry: company.industry ?? '',
            address_street: company.address?.street ?? '',
            address_city: company.address?.city ?? '',
            address_state: company.address?.state ?? '',
            address_country: company.address?.country ?? '',
            address_postcode: company.address?.postcode ?? '',
          });
          setLogoUrl(company.logo_url ?? null);
        }
      }).catch(() => {
        toast({
          title: 'Error',
          description: 'Failed to load company profile',
          variant: 'destructive',
        });
      });
      setPreviewUrl(null);
    }
  }, [open]);

  const handleChange = (field: keyof CompanyFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Error',
        description: 'Please select an image file',
        variant: 'destructive',
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'Error',
        description: 'Image must be less than 5MB',
        variant: 'destructive',
      });
      return;
    }

    // Create preview and upload
    setIsUploading(true);
    try {
      const response = await companyApi.uploadLogo(file);
      if (response.success) {
        setPreviewUrl(response.data.logo_url);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to upload logo',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const updateData = {
        name: formData.name,
        legal_name: formData.legal_name || undefined,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        website: formData.website || undefined,
        registration_number: formData.registration_number || undefined,
        tax_identification_number: formData.tax_identification_number || undefined,
        industry: formData.industry || undefined,
        logo_url: previewUrl ?? logoUrl ?? undefined,
        address: {
          street: formData.address_street || undefined,
          city: formData.address_city || undefined,
          state: formData.address_state || undefined,
          country: formData.address_country || undefined,
          postcode: formData.address_postcode || undefined,
        },
      };

      const response = await companyApi.update(updateData);

      if (response.success) {
        toast({
          title: 'Success',
          description: 'Company profile updated successfully',
        });
        
        // Fetch fresh company data from server to get saved logo_url
        const freshCompanyResponse = await companyApi.getMe();
        if (freshCompanyResponse.success && freshCompanyResponse.data) {
          const company = freshCompanyResponse.data as any;
          setCompany({
            _id: company._id || company.id,
            name: company.name,
            legal_name: company.legal_name,
            email: company.email,
            phone: company.phone,
            website: company.website,
            registration_number: company.registration_number,
            tax_identification_number: company.tax_identification_number,
            industry: company.industry,
            logo_url: company.logo_url,
            address: company.address,
          });
          onOpenChange(false);
        }
      } else {
        onOpenChange(false);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update company profile',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      ?.split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'C';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-2xl md:max-w-3xl dark:bg-slate-900 dark:border-slate-800 p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="dark:text-white flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Company Profile
          </DialogTitle>
          <DialogDescription className="dark:text-slate-400">
            Manage your company information and logo
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6 mt-2 sm:mt-4">
          {/* Logo Upload */}
          <div className="flex flex-col items-center gap-3 sm:gap-4">
            <div className="relative">
              <Avatar className="h-20 w-20 sm:h-24 sm:w-24 border-4 border-slate-100 dark:border-slate-800">
                {previewUrl || logoUrl ? (
                  <AvatarImage src={(previewUrl || logoUrl) ?? undefined} alt={formData.name} />
                ) : null}
                <AvatarFallback className="bg-indigo-600 text-white text-xl sm:text-2xl font-semibold">
                  {getInitials(formData.name)}
                </AvatarFallback>
              </Avatar>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="absolute -bottom-1 -right-1 h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-700 transition-colors shadow-lg disabled:opacity-50"
              >
                {isUploading ? (
                  <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin" />
                ) : (
                  <Camera className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Click the camera icon to upload a company logo
            </p>
          </div>

          {/* Form Fields */}
          <div className="space-y-3 sm:space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-1.5 sm:space-y-2">
                <Label htmlFor="name" className="text-sm dark:text-slate-200">
                  Company Name *
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="Enter company name"
                  required
                  className="h-9 sm:h-10 text-sm sm:text-base dark:bg-slate-800 dark:text-white dark:border-slate-700 dark:placeholder:text-slate-500"
                />
              </div>

              <div className="space-y-1.5 sm:space-y-2">
                <Label htmlFor="legal_name" className="text-sm dark:text-slate-200">
                  Legal Name
                </Label>
                <Input
                  id="legal_name"
                  value={formData.legal_name}
                  onChange={(e) => handleChange('legal_name', e.target.value)}
                  placeholder="Full registered legal name"
                  className="h-9 sm:h-10 text-sm sm:text-base dark:bg-slate-800 dark:text-white dark:border-slate-700 dark:placeholder:text-slate-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-1.5 sm:space-y-2">
                <Label htmlFor="email" className="text-sm dark:text-slate-200">
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="company@example.com"
                  className="h-9 sm:h-10 text-sm sm:text-base dark:bg-slate-800 dark:text-white dark:border-slate-700 dark:placeholder:text-slate-500"
                />
              </div>

              <div className="space-y-1.5 sm:space-y-2">
                <Label htmlFor="phone" className="text-sm dark:text-slate-200">
                  Phone Number
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  placeholder="+250 780 936 645"
                  className="h-9 sm:h-10 text-sm sm:text-base dark:bg-slate-800 dark:text-white dark:border-slate-700 dark:placeholder:text-slate-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-1.5 sm:space-y-2">
                <Label htmlFor="website" className="text-sm dark:text-slate-200">
                  Website
                </Label>
                <Input
                  id="website"
                  value={formData.website}
                  onChange={(e) => handleChange('website', e.target.value)}
                  placeholder="https://example.com"
                  className="h-9 sm:h-10 text-sm sm:text-base dark:bg-slate-800 dark:text-white dark:border-slate-700 dark:placeholder:text-slate-500"
                />
              </div>

              <div className="space-y-1.5 sm:space-y-2">
                <Label htmlFor="industry" className="text-sm dark:text-slate-200">
                  Industry
                </Label>
                <Input
                  id="industry"
                  value={formData.industry}
                  onChange={(e) => handleChange('industry', e.target.value)}
                  placeholder="e.g., Manufacturing, Retail"
                  className="h-9 sm:h-10 text-sm sm:text-base dark:bg-slate-800 dark:text-white dark:border-slate-700 dark:placeholder:text-slate-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-1.5 sm:space-y-2">
                <Label htmlFor="registration_number" className="text-sm dark:text-slate-200">
                  Registration Number
                </Label>
                <Input
                  id="registration_number"
                  value={formData.registration_number}
                  onChange={(e) => handleChange('registration_number', e.target.value)}
                  placeholder="Company registration number"
                  className="h-9 sm:h-10 text-sm sm:text-base dark:bg-slate-800 dark:text-white dark:border-slate-700 dark:placeholder:text-slate-500"
                />
              </div>

              <div className="space-y-1.5 sm:space-y-2">
                <Label htmlFor="tax_identification_number" className="text-sm dark:text-slate-200">
                  Tax ID / TIN
                </Label>
                <Input
                  id="tax_identification_number"
                  value={formData.tax_identification_number}
                  onChange={(e) => handleChange('tax_identification_number', e.target.value)}
                  placeholder="Tax identification number"
                  className="h-9 sm:h-10 text-sm sm:text-base dark:bg-slate-800 dark:text-white dark:border-slate-700 dark:placeholder:text-slate-500"
                />
              </div>
            </div>

            <div className="border-t border-slate-700 pt-4">
              <h4 className="text-sm font-medium text-slate-300 mb-3">Address</h4>
              <div className="space-y-3">
                <div className="space-y-1.5 sm:space-y-2">
                  <Label htmlFor="address_street" className="text-sm dark:text-slate-200">
                    Street Address
                  </Label>
                  <Input
                    id="address_street"
                    value={formData.address_street}
                    onChange={(e) => handleChange('address_street', e.target.value)}
                    placeholder="Street address"
                    className="h-9 sm:h-10 text-sm sm:text-base dark:bg-slate-800 dark:text-white dark:border-slate-700 dark:placeholder:text-slate-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label htmlFor="address_city" className="text-sm dark:text-slate-200">
                      City
                    </Label>
                    <Input
                      id="address_city"
                      value={formData.address_city}
                      onChange={(e) => handleChange('address_city', e.target.value)}
                      placeholder="City"
                      className="h-9 sm:h-10 text-sm sm:text-base dark:bg-slate-800 dark:text-white dark:border-slate-700 dark:placeholder:text-slate-500"
                    />
                  </div>

                  <div className="space-y-1.5 sm:space-y-2">
                    <Label htmlFor="address_state" className="text-sm dark:text-slate-200">
                      State / Province
                    </Label>
                    <Input
                      id="address_state"
                      value={formData.address_state}
                      onChange={(e) => handleChange('address_state', e.target.value)}
                      placeholder="State/Province"
                      className="h-9 sm:h-10 text-sm sm:text-base dark:bg-slate-800 dark:text-white dark:border-slate-700 dark:placeholder:text-slate-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label htmlFor="address_country" className="text-sm dark:text-slate-200">
                      Country
                    </Label>
                    <Input
                      id="address_country"
                      value={formData.address_country}
                      onChange={(e) => handleChange('address_country', e.target.value)}
                      placeholder="Country"
                      className="h-9 sm:h-10 text-sm sm:text-base dark:bg-slate-800 dark:text-white dark:border-slate-700 dark:placeholder:text-slate-500"
                    />
                  </div>

                  <div className="space-y-1.5 sm:space-y-2">
                    <Label htmlFor="address_postcode" className="text-sm dark:text-slate-200">
                      Postcode
                    </Label>
                    <Input
                      id="address_postcode"
                      value={formData.address_postcode}
                      onChange={(e) => handleChange('address_postcode', e.target.value)}
                      placeholder="Postcode"
                      className="h-9 sm:h-10 text-sm sm:text-base dark:bg-slate-800 dark:text-white dark:border-slate-700 dark:placeholder:text-slate-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-end pt-4 border-t border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
              className="w-full sm:w-auto dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
