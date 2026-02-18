import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";


import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { 
  Activity, Droplets, ChevronRight, Thermometer, TrendingUp,
  Stethoscope, FileText, BookOpen, Sparkles, Loader2, Calendar,
  Heart, ArrowRight, Sun, Moon
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useCycleTracking } from "@/hooks/useCycleTracking";
import { differenceInDays, parseISO, format } from "date-fns";
import { useMemo } from "react";

const dashboardSections = [
  { icon: Stethoscope, title: "Find Doctors", description: "Connect with specialists", path: "/doctors", color: "text-teal", bgColor: "bg-teal/15" },
  { icon: BookOpen, title: "Health Resources", description: "Educational content", path: "/health-resources", color: "text-primary", bgColor: "bg-primary/15" },
  { icon: FileText, title: "Govt. Schemes", description: "Explore health benefits", path: "/schemes", color: "text-accent", bgColor: "bg-accent/15" },
  { icon: Sparkles, title: "Hygiene Tips", description: "Wellness guidance", path: "/hygiene", color: "text-teal", bgColor: "bg-teal/15" },
];

const Dashboard = () => {
  const { user } = useAuth();

 useEffect(() => {
  const fetchAssessments = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("health_assessments")
      .select("assessment_type, risk_score, risk_category, created_at")
      .eq("user_id", user.id)
      .in("assessment_type", ["pcos", "menopause"])
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      return;
    }

    if (!data) return;

    const latestPCOS = data.find(a => a.assessment_type === "pcos");
    const latestMenopause = data.find(a => a.assessment_type === "menopause");

    if (latestPCOS) setPcosAssessment(latestPCOS);
    if (latestMenopause) setMenopauseAssessment(latestMenopause);
  };

  fetchAssessments();
}, [user]);



  const { cycleLogs, loading, prediction, insights } = useCycleTracking();
  const userName = user?.user_metadata?.full_name?.split(' ')[0] || 'there';
  const [pcosAssessment, setPcosAssessment] = useState<any>(null);
  const [pcosHistory, setPcosHistory] = useState<any[]>([]);
  

  const [menopauseAssessment, setMenopauseAssessment] = useState<any>(null);
  



  // Get time-based greeting
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return { text: "Good morning", icon: Sun };
    if (hour < 18) return { text: "Good afternoon", icon: Sun };
    return { text: "Good evening", icon: Moon };
  }, []);

  // Calculate current cycle day and create cycle visualization
  const cycleData = useMemo(() => {
    if (cycleLogs.length === 0) {
      return {
        currentDay: null,
        cycleLength: 28,
        periodDays: [],
        ovulationDays: [],
        today: new Date(),
        phase: "unknown",
      };
    }

    const latestCycle = cycleLogs[0];
    const cycleStart = parseISO(latestCycle.start_date);
    const today = new Date();
    const dayOfCycle = differenceInDays(today, cycleStart) + 1;
    const cycleLength = insights.averageCycleLength || 28;
    const periodLength = latestCycle.period_length || insights.averagePeriodLength || 5;
    
    // Calculate period days (1 to periodLength)
    const periodDays: number[] = [];
    for (let i = 1; i <= periodLength; i++) {
      periodDays.push(i);
    }

    // Calculate ovulation window (typically around day 14 ± 2 for 28-day cycle)
    const ovulationCenter = Math.round(cycleLength / 2);
    const ovulationDays: number[] = [];
    for (let i = ovulationCenter - 2; i <= ovulationCenter + 2; i++) {
      if (i > 0 && i <= cycleLength) {
        ovulationDays.push(i);
      }
    }

    // Determine current phase
    let phase = "follicular";
    if (dayOfCycle <= periodLength) phase = "menstrual";
    else if (dayOfCycle >= ovulationCenter - 2 && dayOfCycle <= ovulationCenter + 2) phase = "ovulation";
    else if (dayOfCycle > ovulationCenter + 2) phase = "luteal";

    return {
      currentDay: dayOfCycle > 0 && dayOfCycle <= cycleLength ? dayOfCycle : null,
      cycleLength,
      periodDays,
      ovulationDays,
      today,
      phase,
    };
  }, [cycleLogs, insights]);

  // Phase info
  const phaseInfo = useMemo(() => {
    const phases: Record<string, { name: string; color: string; tip: string }> = {
      menstrual: { name: "Menstrual Phase", color: "text-primary", tip: "Rest well and stay hydrated" },
      follicular: { name: "Follicular Phase", color: "text-teal", tip: "Great time for new activities" },
      ovulation: { name: "Ovulation Phase", color: "text-accent", tip: "You're at peak energy" },
      luteal: { name: "Luteal Phase", color: "text-secondary-foreground", tip: "Practice self-care" },
      unknown: { name: "Start Tracking", color: "text-muted-foreground", tip: "Log your cycle to get insights" },
    };
    return phases[cycleData.phase] || phases.unknown;
  }, [cycleData.phase]);

  // Generate health cards with real data
  const healthCards = useMemo(() => [
    {
      title: "Menstrual Health",
      status: cycleData.currentDay ? `Day ${cycleData.currentDay} of Cycle` : "Start tracking",
      statusColor: cycleData.currentDay ? "text-teal" : "text-muted-foreground",
      icon: Droplets,
      iconBg: "bg-teal/15",
      iconColor: "text-teal",
      path: "/modules/menstrual",
      metric: cycleLogs.length > 0 ? `${insights.averageCycleLength} days` : "N/A",
      metricLabel: "Average Cycle",
    },
   {
  title: "PCOS Risk",
  status: pcosAssessment
    ? pcosAssessment.risk_category.toUpperCase()
    : "Not Assessed",

  statusColor: pcosAssessment
    ? pcosAssessment.risk_category === "high"
      ? "text-destructive"
      : pcosAssessment.risk_category === "medium"
      ? "text-accent"
      : "text-success"
    : "text-muted-foreground",

  icon: Activity,
  iconBg: "bg-accent/15",
  iconColor: "text-accent",
  path: "/modules/pcos",

  metric: pcosAssessment
    ? `${pcosAssessment.risk_score}%`
    : "N/A",

  metricLabel: "Health Score",
},

    {
  title: "Menopause Stage",
  status: menopauseAssessment
    ? menopauseAssessment.risk_category.toUpperCase()
    : "Not Assessed",

  statusColor: menopauseAssessment
    ? menopauseAssessment.risk_category === "high"
      ? "text-primary"
      : menopauseAssessment.risk_category === "medium"
      ? "text-accent"
      : "text-teal"
    : "text-muted-foreground",

  icon: Thermometer,
  iconBg: "bg-primary/15",
  iconColor: "text-primary",
  path: "/modules/menopause",

  metric: menopauseAssessment
    ? `${menopauseAssessment.risk_score}%`
    : "N/A",

  metricLabel: "Current Stage",
}

  ], [cycleData, cycleLogs, insights]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading your dashboard...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 md:space-y-8 animate-fade-up">
        {/* Welcome Hero Section */}
        <div className="relative overflow-hidden glass-card rounded-2xl p-6 md:p-8 bg-gradient-to-br from-primary/10 via-secondary/10 to-teal/10">
          <div className="absolute top-0 right-0 w-32 h-32 md:w-48 md:h-48 bg-primary/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-24 h-24 md:w-32 md:h-32 bg-teal/20 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />
          
          <div className="relative z-10">
            {/* NaariCare Logo */}
           {/* NaariCare Logo */}
<div className="flex items-center gap-3 mb-4">
  <img 
    src="/favicon.ico" 
    alt="NaariCare Logo"
    className="w-12 h-12 object-contain rounded-lg shadow-md"
  />
  <span className="font-heading font-bold text-xl text-foreground">
    Naari<span className="text-accent">Care</span>
  </span>
</div>

            
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <greeting.icon className="w-4 h-4" />
              <span className="text-sm">{greeting.text}</span>
            </div>
            <h1 className="font-heading text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-3">
              Welcome back, {userName}! 👋
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base max-w-lg">
              Here's your personalized health summary. Track your cycle, monitor your health, and access resources all in one place.
            </p>
            
            {/* Quick Stats */}
            <div className="flex flex-wrap gap-4 mt-6">
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-background/60 backdrop-blur-sm border border-border/50">
                <Calendar className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">
                  {cycleLogs.length} {cycleLogs.length === 1 ? 'Cycle' : 'Cycles'} Logged
                </span>
              </div>
              {cycleData.currentDay && (
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-background/60 backdrop-blur-sm border border-border/50">
                  <Heart className="w-4 h-4 text-accent" />
                  <span className="text-sm font-medium">Day {cycleData.currentDay}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Health Modules - Quick Access */}
        <div className="animate-fade-up" style={{ animationDelay: '100ms' }}>
          <h2 className="font-heading text-lg sm:text-xl font-semibold text-foreground mb-4">Health Modules</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {healthCards.map((card, index) => (
              <Link 
                key={card.title} 
                to={card.path} 
                className="glass-card card-hover rounded-xl p-5 group animate-fade-up"
                style={{ animationDelay: `${(index + 1) * 75}ms` }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-12 h-12 rounded-xl ${card.iconBg} flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg`}>
                    <card.icon className={`w-6 h-6 ${card.iconColor}`} />
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all duration-300" />
                </div>
                <h3 className="font-heading text-base font-semibold text-foreground mb-1">{card.title}</h3>
                <p className={`text-sm font-medium ${card.statusColor} mb-3`}>{card.status}</p>
                <div className="pt-3 border-t border-border">
                  <div className="text-xl font-bold gradient-text">{card.metric}</div>
                  
                  <div className="text-xs text-muted-foreground mt-0.5">{card.metricLabel}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Quick Resources Grid */}
        <div className="animate-fade-up" style={{ animationDelay: '400ms' }}>
          <h2 className="font-heading text-lg sm:text-xl font-semibold text-foreground mb-4">Quick Access</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            {dashboardSections.map((section, index) => (
              <Link 
                key={section.title} 
                to={section.path} 
                className="glass-card card-hover rounded-xl p-4 sm:p-5 group text-center"
                style={{ animationDelay: `${(index + 5) * 50}ms` }}
              >
                <div className={`w-12 h-12 rounded-xl ${section.bgColor} flex items-center justify-center mx-auto mb-3 transition-all duration-300 group-hover:scale-110 group-hover:shadow-md`}>
                  <section.icon className={`w-6 h-6 ${section.color}`} />
                </div>
                <h3 className="font-medium text-foreground text-sm mb-1">{section.title}</h3>
                <p className="text-xs text-muted-foreground hidden sm:block">{section.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;