import { useState, useRef, useEffect } from 'react';
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
import { Textarea } from '@/app/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar';
import { Camera, Save, X, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { usersApi } from '@/lib/api';
import { useTranslation } from 'react-i18next';
interface UserProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ProfileFormData {
  name: string;
  email: string;
  phone: string;
  jobTitle: string;
  bio: string;
}

export function UserProfileDialog({ open, onOpenChange }: UserProfileDialogProps) {
  const { user, updateUser } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [formData, setFormData] = useState<ProfileFormData>({
    name: user?.name ?? '',
    email: user?.email ?? '',
    phone: (user?.phone as string) ?? '',
    jobTitle: (user?.jobTitle as string) ?? '',
    bio: (user?.bio as string) ?? '',
  });
  const [avatar, setAvatar] = useState<string | null>((user?.avatar as string | null) ?? null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Fetch profile and reset form when dialog opens
  useEffect(() => {
    if (open) {
      // Fetch latest profile data including avatar
      usersApi.getProfile().then((response) => {
        if (response.success && response.data) {
          const profile = response.data as any;
          setFormData({
            name: profile.name ?? '',
            email: profile.email ?? '',
            phone: (profile.phone as string) ?? '',
            jobTitle: (profile.jobTitle as string) ?? '',
            bio: (profile.bio as string) ?? '',
          });
          setAvatar((profile.avatar as string | null) ?? null);
        }
      }).catch(() => {
        // Fallback to user from auth context
        if (user) {
          setFormData({
            name: user.name ?? '',
            email: user.email ?? '',
            phone: (user.phone as string) ?? '',
            jobTitle: (user.jobTitle as string) ?? '',
            bio: (user.bio as string) ?? '',
          });
          setAvatar((user.avatar as string | null) ?? null);
        }
      });
      setPreviewUrl(null);
    }
  }, [open, user]);

  const handleChange = (field: keyof ProfileFormData, value: string) => {
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

    // Create preview only for immediate display
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      setPreviewUrl(base64);
      setAvatar(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Include avatar in the profile update (convert null to undefined)
      const response = await usersApi.updateProfile({
        ...formData,
        avatar: avatar ?? undefined,
      });

      if (response.success) {
        // Fetch fresh profile data from server to confirm avatar was saved
        const profileResponse = await usersApi.getProfile();
        if (profileResponse.success && profileResponse.data) {
          const freshProfile = profileResponse.data as any;
          updateUser?.(freshProfile);
        } else {
          // Fallback: use local avatar if fetch fails
          updateUser?.({ ...(response.data as any), avatar });
        }
        toast({
          title: 'Success',
          description: 'Profile updated successfully',
        });
        onOpenChange(false);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update profile',
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
      .slice(0, 2) || 'U';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-lg md:max-w-xl dark:bg-[#06080d] dark:border-white/10 p-0 sm:p-0 max-h-[90vh] overflow-y-auto">
        <style>{`
          @keyframes user-scan { 0% { transform: translateX(-115%); } 100% { transform: translateX(115%); } }
          .user-scan { animation: user-scan 5.5s linear infinite; }
          @media (prefers-reduced-motion: reduce) { .user-scan { animation: none; } }
        `}</style>
        {/* Gradient Header */}
        <div className="relative overflow-hidden rounded-t-lg border-b border-slate-200 bg-white dark:border-white/10 dark:bg-white/[0.04]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(14,165,233,0.12),transparent_30%),radial-gradient(circle_at_82%_12%,rgba(16,185,129,0.08),transparent_24%),linear-gradient(135deg,#f8fbff_0%,#edf7f4_50%,#f8fafc_100%)] dark:bg-[radial-gradient(circle_at_18%_18%,rgba(34,211,238,0.10),transparent_30%),radial-gradient(circle_at_82%_12%,rgba(74,222,128,0.06),transparent_24%),linear-gradient(135deg,#05070c_0%,#08111a_50%,#07100d_100%)]" />
          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-cyan-300/40 to-transparent user-scan" />
          <div className="relative flex items-center gap-3 px-5 py-5 sm:px-6">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-slate-950 text-white shadow-lg shadow-cyan-500/10 dark:bg-white dark:text-slate-950">
              <Camera className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold tracking-tight text-slate-950 dark:text-white">
                My Profile
              </DialogTitle>
              <DialogDescription className="text-sm text-slate-500 dark:text-slate-400">
                Manage your personal information and profile picture
              </DialogDescription>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 px-5 py-5 sm:px-6 sm:py-6">
          {/* Avatar Upload */}
          <div className="flex flex-col items-center gap-3 sm:gap-4">
            <div className="relative">
              <Avatar className="h-20 w-20 sm:h-24 sm:w-24 border-4 border-slate-100 dark:border-white/10 shadow-xl">
                {previewUrl || avatar ? (
                  <AvatarImage src={(previewUrl || avatar) ?? undefined} alt={formData.name} />
                ) : null}
                <AvatarFallback className="bg-gradient-to-br from-cyan-400 to-emerald-400 text-white text-xl sm:text-2xl font-semibold">
                  {getInitials(formData.name)}
                </AvatarFallback>
              </Avatar>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="absolute -bottom-1 -right-1 h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-slate-950 text-white flex items-center justify-center hover:bg-slate-800 transition-colors shadow-lg disabled:opacity-50 dark:bg-white dark:text-slate-950 dark:hover:bg-cyan-100"
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
              Click the camera icon to upload a new photo
            </p>
          </div>

          {/* Form Fields */}
          <div className="space-y-4 sm:space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-4">
              <div className="space-y-1.5 sm:space-y-2">
                <Label htmlFor="name" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Full Name *
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="Enter your full name"
                  required
                  className="h-9 sm:h-10 text-sm sm:text-base border-slate-200 bg-white dark:bg-white/[0.06] dark:text-white dark:border-white/10 dark:placeholder:text-slate-500"
                />
              </div>

              <div className="space-y-1.5 sm:space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Email Address *
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="your.email@example.com"
                  required
                  className="h-9 sm:h-10 text-sm sm:text-base border-slate-200 bg-white dark:bg-white/[0.06] dark:text-white dark:border-white/10 dark:placeholder:text-slate-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-4">
              <div className="space-y-1.5 sm:space-y-2">
                <Label htmlFor="phone" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Phone Number
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  placeholder="+250 780 936 645"
                  className="h-9 sm:h-10 text-sm sm:text-base border-slate-200 bg-white dark:bg-white/[0.06] dark:text-white dark:border-white/10 dark:placeholder:text-slate-500"
                />
              </div>

              <div className="space-y-1.5 sm:space-y-2">
                <Label htmlFor="jobTitle" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Job Title
                </Label>
                <Input
                  id="jobTitle"
                  value={formData.jobTitle}
                  onChange={(e) => handleChange('jobTitle', e.target.value)}
                  placeholder="e.g., Accountant, Manager"
                  className="h-9 sm:h-10 text-sm sm:text-base border-slate-200 bg-white dark:bg-white/[0.06] dark:text-white dark:border-white/10 dark:placeholder:text-slate-500"
                />
              </div>
            </div>

            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="bio" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Bio
              </Label>
              <Textarea
                id="bio"
                value={formData.bio}
                onChange={(e) => handleChange('bio', e.target.value)}
                placeholder="Tell us a bit about yourself..."
                rows={2}
                maxLength={500}
                className="text-sm sm:text-base border-slate-200 bg-white dark:bg-white/[0.06] dark:text-white dark:border-white/10 dark:placeholder:text-slate-500 resize-none focus:ring-2 focus:ring-cyan-500"
              />
              <p className="text-xs text-slate-500 dark:text-slate-400 text-right">
                {formData.bio?.length || 0}/500
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-end pt-4 border-t border-slate-200 dark:border-white/10">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
              className="w-full sm:w-auto border-slate-300 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/10"
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full sm:w-auto bg-slate-950 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-cyan-100"
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
