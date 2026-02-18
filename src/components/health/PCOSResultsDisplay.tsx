import { Button } from "@/components/ui/button";
import { PCOSResult } from "@/lib/ml-predictions";
import { RiskGauge } from "./RiskGauge";
import { HealthDisclaimer } from "./HealthDisclaimer";
import { ScoreBreakdown } from "./ScoreBreakdown";
import { ResultSummaryCard } from "./ResultSummaryCard";
import { 
  AlertCircle, 
  CheckCircle2, 
  ArrowRight, 
  Lightbulb,
  Utensils,
  Dumbbell,
  Heart,
  Stethoscope,
  RotateCcw,
  Activity,
  TrendingUp
} from "lucide-react";
import { motion } from "framer-motion";

interface PCOSResultsDisplayProps {
  result: PCOSResult;
  onFindDoctors: () => void;
  onRestart: () => void;
}

export const PCOSResultsDisplay = ({ result, onFindDoctors, onRestart }: PCOSResultsDisplayProps) => {
const {
  hasPCOS,
  riskPercentage,
  severity,
  breakdown = {
    cycleScore: 0,
    hormonalScore: 0,
    ultrasoundScore: 0,
    metabolicScore: 0
  },
  recommendations = {
    diet: [],
    exercise: [],
    lifestyle: [],
    needsDoctor: false
  }
} = result;



  const severityConfig = {
    none: { label: 'No PCOS Detected', color: 'text-teal', bgColor: 'bg-teal/20', description: 'Your symptoms do not indicate PCOS risk. Maintain a healthy lifestyle!' },
    low: { label: 'Low Risk', color: 'text-teal', bgColor: 'bg-teal/20', description: 'Minor indicators present. Continue monitoring your health.' },
    medium: { label: 'Medium Risk', color: 'text-accent', bgColor: 'bg-accent/20', description: 'Some PCOS indicators detected. Consider consulting a doctor.' },
    high: { label: 'High Risk', color: 'text-destructive', bgColor: 'bg-destructive/20', description: 'Significant PCOS indicators. Medical consultation recommended.' },
  };

  const config = severityConfig[severity];

  // Score breakdown data for the new component
  const scoreBreakdownItems = [
    { name: 'Cycle Irregularity', score: breakdown.cycleScore, maxScore: 35, description: 'Irregular periods, missed cycles, or unusual timing' },
    { name: 'Hormonal Signs', score: breakdown.hormonalScore, maxScore: 25, description: 'Acne, excess hair growth, hair thinning' },
    { name: 'Ovarian Status', score: breakdown.ultrasoundScore, maxScore: 25, description: 'Follicle count from ultrasound' },
    { name: 'Metabolic Factor', score: breakdown.metabolicScore, maxScore: 15, description: 'BMI and weight distribution' },
  ];

  return (
    <div className="animate-fade-up space-y-6 sm:space-y-8">
      {/* Header Result */}
      <div className="text-center px-2">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", duration: 0.5 }}
          className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-accent/30 to-primary/30 flex items-center justify-center mx-auto mb-4"
        >
          <Activity className="w-8 h-8 sm:w-10 sm:h-10 text-accent" />
        </motion.div>
        <h1 className="font-heading text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-2">
          Your PCOS Assessment
        </h1>
        <p className="text-muted-foreground text-sm sm:text-base">
          AI-powered analysis based on your health data
        </p>
      </div>

      {/* Main Result Card */}
      <ResultSummaryCard
        title={hasPCOS ? "⚠️ PCOS Indicators Detected" : "✅ No PCOS Detected"}
        status={hasPCOS ? (severity === 'high' ? 'negative' : 'neutral') : 'positive'}
        icon={hasPCOS ? <AlertCircle className="w-8 h-8" /> : <CheckCircle2 className="w-8 h-8" />}
        description={config.description}
        details={hasPCOS ? [
          `Risk Level: ${config.label}`,
          'This is a screening tool, not a diagnosis',
          'Professional medical evaluation is recommended'
        ] : [
          'Continue maintaining a healthy lifestyle',
          'Regular check-ups are still important'
        ]}
      />

      {/* Risk Score & Breakdown */}
      {hasPCOS && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Risk Gauge */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass-card rounded-2xl p-4 sm:p-6 flex flex-col items-center justify-center"
          >
            <h3 className="font-heading text-base sm:text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-accent" />
              Overall Risk Score
            </h3>
            <RiskGauge 
              score={riskPercentage} 
              label="Risk Level" 
              color={config.color} 
            />
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full mt-4 ${config.bgColor} ${config.color}`}>
              <AlertCircle className="w-4 h-4" />
              <span className="font-semibold text-sm sm:text-base">{config.label}</span>
            </div>
          </motion.div>

          {/* Score Breakdown */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <ScoreBreakdown 
              title="What's Contributing to Your Score" 
              items={scoreBreakdownItems}
              showTrend={true}
            />
          </motion.div>
        </div>
      )}

      {/* Recommendations */}
      <div className="space-y-4 sm:space-y-6">
        <h3 className="font-heading text-lg sm:text-xl font-semibold text-foreground flex items-center gap-2 px-1">
          <Lightbulb className="w-5 h-5 text-accent" />
          Personalized Recommendations
        </h3>

        {/* Recommendations Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Diet */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-card rounded-2xl p-4 sm:p-5"
          >
            <div className="flex items-center gap-2 mb-3 sm:mb-4">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-teal/20 flex items-center justify-center">
                <Utensils className="w-4 h-4 sm:w-5 sm:h-5 text-teal" />
              </div>
              <h4 className="font-heading text-base sm:text-lg font-semibold text-foreground">Diet</h4>
            </div>
            <ul className="space-y-2">
              {recommendations.diet.map((item, i) => (
                <motion.li 
                  key={i} 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + i * 0.05 }}
                  className="flex items-start gap-2 text-foreground text-sm"
                >
                  <CheckCircle2 className="w-4 h-4 text-teal flex-shrink-0 mt-0.5" />
                  <span>{item}</span>
                </motion.li>
              ))}
            </ul>
          </motion.div>

          {/* Exercise */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-card rounded-2xl p-4 sm:p-5"
          >
            <div className="flex items-center gap-2 mb-3 sm:mb-4">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-accent/20 flex items-center justify-center">
                <Dumbbell className="w-4 h-4 sm:w-5 sm:h-5 text-accent" />
              </div>
              <h4 className="font-heading text-base sm:text-lg font-semibold text-foreground">Exercise</h4>
            </div>
            <ul className="space-y-2">
              {recommendations.exercise.map((item, i) => (
                <motion.li 
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + i * 0.05 }}
                  className="flex items-start gap-2 text-foreground text-sm"
                >
                  <CheckCircle2 className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
                  <span>{item}</span>
                </motion.li>
              ))}
            </ul>
          </motion.div>

          {/* Lifestyle */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="glass-card rounded-2xl p-4 sm:p-5"
          >
            <div className="flex items-center gap-2 mb-3 sm:mb-4">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                <Heart className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              </div>
              <h4 className="font-heading text-base sm:text-lg font-semibold text-foreground">Lifestyle</h4>
            </div>
            <ul className="space-y-2">
              {recommendations.lifestyle.map((item, i) => (
                <motion.li 
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.05 }}
                  className="flex items-start gap-2 text-foreground text-sm"
                >
                  <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                  <span>{item}</span>
                </motion.li>
              ))}
            </ul>
          </motion.div>
        </div>

        {/* Doctor Recommendation */}
        {recommendations.needsDoctor && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-4 sm:p-5 rounded-xl bg-destructive/10 border-2 border-destructive/30"
          >
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-destructive/20 flex items-center justify-center flex-shrink-0">
                <Stethoscope className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <span className="font-semibold text-destructive text-base sm:text-lg">Medical Consultation Recommended</span>
                <p className="text-sm text-muted-foreground mt-1">
                  Based on your assessment, consulting a gynecologist or endocrinologist is advised.
                </p>
              </div>
            </div>
            <Button onClick={onFindDoctors} className="gap-2 w-full sm:w-auto">
              Find Nearby Specialists
              <ArrowRight className="w-4 h-4" />
            </Button>
          </motion.div>
        )}
      </div>

      <HealthDisclaimer />

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        {!recommendations.needsDoctor && (
          <Button onClick={onFindDoctors} size="lg" className="gap-2">
            Find Specialists
            <ArrowRight className="w-5 h-5" />
          </Button>
        )}
        <Button variant="outline" onClick={onRestart} size="lg" className="gap-2">
          <RotateCcw className="w-4 h-4" />
          Take Assessment Again
        </Button>
      </div>
    </div>
  );
};
