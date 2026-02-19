import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { AdminDoctors } from "@/components/admin/AdminDoctors";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

const AdminDoctorsPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex pt-20">
        <AdminSidebar />
        <main className="flex-1 p-6 lg:p-8">
          <AdminDoctors />
        </main>
      </div>
      <Footer />
    </div>
  );
};

export default AdminDoctorsPage;
