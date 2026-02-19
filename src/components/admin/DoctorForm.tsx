import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2, Stethoscope } from "lucide-react";

interface Doctor {
  id: string;
  name: string;
  specialization: string;
  hospital: string | null;
  location: string | null;
  phone: string | null;
  email: string | null;
  description: string | null;
  image_url: string | null;
  is_active: boolean | null;
}

interface DoctorFormProps {
  doctor?: Doctor | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export const DoctorForm = ({ doctor, onSuccess, onCancel }: DoctorFormProps) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: doctor?.name || "",
    specialization: doctor?.specialization || "",
    hospital: doctor?.hospital || "",
    location: doctor?.location || "",
    phone: doctor?.phone || "",
    email: doctor?.email || "",
    description: doctor?.description || "",
    image_url: doctor?.image_url || "",
    is_active: doctor?.is_active ?? true,
  });

  const handleChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.specialization.trim()) {
      toast({ title: "Required fields missing", description: "Name and specialization are required.", variant: "destructive" });
      return;
    }
    setLoading(true);

    const payload = {
      name: formData.name.trim(),
      specialization: formData.specialization.trim(),
      hospital: formData.hospital.trim() || null,
      location: formData.location.trim() || null,
      phone: formData.phone.trim() || null,
      email: formData.email.trim() || null,
      description: formData.description.trim() || null,
      image_url: formData.image_url.trim() || null,
      is_active: formData.is_active,
    };

    const { error } = doctor?.id
      ? await supabase.from("doctors").update(payload).eq("id", doctor.id)
      : await supabase.from("doctors").insert(payload);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success", description: doctor?.id ? "Doctor updated." : "Doctor added successfully." });
      onSuccess();
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onCancel}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h2 className="font-heading text-xl font-semibold text-foreground flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-primary" />
            {doctor?.id ? "Edit Doctor" : "Add New Doctor"}
          </h2>
          <p className="text-sm text-muted-foreground">Only verified and approved doctors should be added.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="glass-card rounded-xl p-6 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Doctor Full Name <span className="text-destructive">*</span></Label>
            <Input
              id="name"
              placeholder="Dr. Priya Mehta"
              value={formData.name}
              onChange={e => handleChange("name", e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">Enter complete name with prefix (Dr.)</p>
          </div>

          {/* Specialization */}
          <div className="space-y-2">
            <Label htmlFor="specialization">Specialization <span className="text-destructive">*</span></Label>
            <Input
              id="specialization"
              placeholder="Gynecologist, PCOS Expert..."
              value={formData.specialization}
              onChange={e => handleChange("specialization", e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">E.g., Gynecologist, Obstetrician, Fertility Specialist</p>
          </div>

          {/* Hospital */}
          <div className="space-y-2">
            <Label htmlFor="hospital">Hospital / Clinic Name</Label>
            <Input
              id="hospital"
              placeholder="Fortis Hospital"
              value={formData.hospital}
              onChange={e => handleChange("hospital", e.target.value)}
            />
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label htmlFor="location">Full Address / Location</Label>
            <Input
              id="location"
              placeholder="Andheri East, Mumbai"
              value={formData.location}
              onChange={e => handleChange("location", e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Enter area and city for map search</p>
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+91 98765 43210"
              value={formData.phone}
              onChange={e => handleChange("phone", e.target.value)}
            />
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="doctor@hospital.com"
              value={formData.email}
              onChange={e => handleChange("email", e.target.value)}
            />
          </div>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="description">Description / Bio</Label>
          <Textarea
            id="description"
            placeholder="Brief description of the doctor's expertise and experience..."
            value={formData.description}
            onChange={e => handleChange("description", e.target.value)}
            rows={3}
          />
        </div>

        {/* Image URL */}
        <div className="space-y-2">
          <Label htmlFor="image_url">Profile Image URL (optional)</Label>
          <Input
            id="image_url"
            type="url"
            placeholder="https://..."
            value={formData.image_url}
            onChange={e => handleChange("image_url", e.target.value)}
          />
        </div>

        {/* Active Toggle */}
        <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
          <Switch
            id="is_active"
            checked={!!formData.is_active}
            onCheckedChange={val => handleChange("is_active", val)}
          />
          <div>
            <Label htmlFor="is_active" className="cursor-pointer font-medium">Active / Visible</Label>
            <p className="text-xs text-muted-foreground">Only active doctors appear in user search</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={loading} className="gap-2">
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {doctor?.id ? "Update Doctor" : "Add Doctor"}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        </div>
      </form>
    </div>
  );
};
