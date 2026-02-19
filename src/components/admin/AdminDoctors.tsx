import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Search, Plus, Edit, Trash2, Stethoscope, CheckCircle, XCircle } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DoctorForm } from "./DoctorForm";
import { Badge } from "@/components/ui/badge";

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
  created_at: string;
  updated_at: string;
}

export const AdminDoctors = () => {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [filteredDoctors, setFilteredDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchDoctors = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("doctors")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Error", description: "Failed to fetch doctors", variant: "destructive" });
    } else {
      setDoctors(data || []);
      setFilteredDoctors(data || []);
    }
    setLoading(false);
  };

  useEffect(() => { fetchDoctors(); }, []);

  useEffect(() => {
    if (searchQuery) {
      setFilteredDoctors(
        doctors.filter(d =>
          d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          d.specialization.toLowerCase().includes(searchQuery.toLowerCase()) ||
          d.location?.toLowerCase().includes(searchQuery.toLowerCase())
        )
      );
    } else {
      setFilteredDoctors(doctors);
    }
  }, [searchQuery, doctors]);

  const handleDelete = async () => {
    if (!deletingId) return;
    const { error } = await supabase.from("doctors").delete().eq("id", deletingId);
    if (error) {
      toast({ title: "Error", description: "Failed to delete doctor", variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Doctor deleted successfully" });
      fetchDoctors();
    }
    setDeletingId(null);
  };

  const handleToggleActive = async (doctor: Doctor) => {
    const { error } = await supabase
      .from("doctors")
      .update({ is_active: !doctor.is_active })
      .eq("id", doctor.id);
    if (error) {
      toast({ title: "Error", description: "Failed to update status", variant: "destructive" });
    } else {
      toast({ title: "Success", description: `Doctor ${doctor.is_active ? "deactivated" : "activated"}` });
      fetchDoctors();
    }
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingDoctor(null);
    fetchDoctors();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  if (showForm || editingDoctor) {
    return (
      <DoctorForm
        doctor={editingDoctor}
        onSuccess={handleFormSuccess}
        onCancel={() => { setShowForm(false); setEditingDoctor(null); }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="font-heading text-xl font-semibold text-foreground">Doctor Management</h2>
          <p className="text-sm text-muted-foreground mt-1">{doctors.length} doctors in database</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Add Doctor
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="glass-card rounded-xl p-4">
          <p className="text-sm text-muted-foreground flex items-center gap-2"><Stethoscope className="w-4 h-4" /> Total</p>
          <p className="text-2xl font-bold text-foreground mt-1">{doctors.length}</p>
        </div>
        <div className="glass-card rounded-xl p-4">
          <p className="text-sm text-muted-foreground flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> Active</p>
          <p className="text-2xl font-bold text-foreground mt-1">{doctors.filter(d => d.is_active).length}</p>
        </div>
        <div className="glass-card rounded-xl p-4">
          <p className="text-sm text-muted-foreground flex items-center gap-2"><XCircle className="w-4 h-4 text-destructive" /> Inactive</p>
          <p className="text-2xl font-bold text-foreground mt-1">{doctors.filter(d => !d.is_active).length}</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, specialization, or location..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Table */}
      {filteredDoctors.length === 0 ? (
        <div className="glass-card rounded-xl p-8 text-center">
          <Stethoscope className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">
            {doctors.length === 0 ? "No doctors added yet. Click 'Add Doctor' to get started." : "No doctors match your search."}
          </p>
        </div>
      ) : (
        <div className="glass-card rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Doctor</TableHead>
                  <TableHead>Specialization</TableHead>
                  <TableHead>Hospital</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDoctors.map((doctor) => (
                  <TableRow key={doctor.id}>
                    <TableCell className="font-medium">{doctor.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{doctor.specialization}</TableCell>
                    <TableCell className="text-sm">{doctor.hospital || "-"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{doctor.location || "-"}</TableCell>
                    <TableCell>
                      <Badge
                        variant={doctor.is_active ? "default" : "secondary"}
                        className="cursor-pointer select-none"
                        onClick={() => handleToggleActive(doctor)}
                      >
                        {doctor.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditingDoctor(doctor)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeletingId(doctor.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Doctor</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the doctor record. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
