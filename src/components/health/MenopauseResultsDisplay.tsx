import { Button } from "@/components/ui/button";
import { MenopauseResult } from "@/lib/ml-predictions";
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
  Thermometer,
  TrendingUp
} from "lucide-react";
import { motion } from "framer-motion";

interface MenopauseResultsDisplayProps {
  result: MenopauseResult;
  onFindDoctors: () => void;
  onRestart: () => void;
}

export const MenopauseResultsDisplay = ({ result, onFindDoctors, onRestart }: MenopauseResultsDisplayProps) => {
  const {
  stage,
  riskPercentage,
  hasMenopauseSymptoms,
  breakdown,
  recommendations = {
    diet: [],
    exercise: [],
    lifestyle: [],
    needsDoctor: false
  }
} = result;


  const stageConfig = {
    'Pre-Menopause': { 
      label: 'Pre-Menopause', 
      sublabel: 'No significant menopause symptoms detected',
      description: 'Your symptoms suggest you are in the pre-menopausal phase. Continue maintaining a healthy lifestyle.',
      color: 'text-teal', 
      bgColor: 'bg-teal/20',
      status: 'positive' as const,
      emoji: '💚'
    },
    'Peri-Menopause': { 
      label: 'Peri-Menopause', 
      sublabel: 'Transition phase detected',
      description: 'You may be experiencing the transition to menopause. Some symptoms are present.',
      color: 'text-accent', 
      bgColor: 'bg-accent/20',
      status: 'neutral' as const,
      emoji: '🧡'
    },
    'Post-Menopause': { 
      label: 'Post-Menopause', 
      sublabel: 'Menopause indicators present',
      description: 'Your symptoms suggest you are in or past menopause. Focus on wellness management.',
      color: 'text-primary', 
      bgColor: 'bg-primary/20',
      status: 'neutral' as const,
      emoji: '💜'
    },
  };

  const config = stageConfig[stage];

  // Score breakdown data
  const scoreBreakdownItems = [
    { name: 'Age Factor', score: breakdown.ageScore, maxScore: 30, description: 'Age-related risk assessment' },
    { name: 'Hormone Changes', score: breakdown.hormoneScore, maxScore: 25, description: 'Hormonal symptom indicators' },
    { name: 'Physical Symptoms', score: breakdown.symptomScore, maxScore: 25, description: 'Hot flashes, night sweats, etc.' },
    { name: 'Period Status', score: breakdown.periodScore, maxScore: 20, description: 'Menstrual cycle changes' },
  ];

  return (
    <div className="animate-fade-up space-y-6 sm:space-y-8">
      {/* Header Result */}
      <div className="text-center px-2">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", duration: 0.5 }}
          className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-teal/30 to-primary/30 flex items-center justify-center mx-auto mb-4"
        >
          <Thermometer className="w-8 h-8 sm:w-10 sm:h-10 text-teal" />
        </motion.div>
        <h1 className="font-heading text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-2">
          Your Menopause Assessment
        </h1>
        <p className="text-muted-foreground text-sm sm:text-base">
          AI-powered analysis based on your health data
        </p>
      </div>

      {/* Main Result Card */}
      <ResultSummaryCard
        title={`${config.emoji} ${config.label}`}
        status={config.status}
        icon={stage === 'Pre-Menopause' ? <CheckCircle2 className="w-8 h-8" /> : <AlertCircle className="w-8 h-8" />}
        description={config.description}
        details={[
          config.sublabel,
          'This is a screening tool, not a medical diagnosis',
          stage !== 'Pre-Menopause' ? 'Consider consulting a healthcare provider' : 'Continue regular health check-ups'
        ]}
      />

      {/* Risk Score & Breakdown */}
      {hasMenopauseSymptoms && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Risk Gauge */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass-card rounded-2xl p-4 sm:p-6 flex flex-col items-center justify-center"
          >
            <h3 className="font-heading text-base sm:text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-teal" />
              Menopause Indicator Score
            </h3>
            <RiskGauge 
              score={riskPercentage} 
              label="Stage Indicator" 
              color={config.color} 
            />
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full mt-4 ${config.bgColor} ${config.color}`}>
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
          <Lightbulb className="w-5 h-5 text-teal" />
          Recommendations for {stage}
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
            className="p-4 sm:p-5 rounded-xl bg-primary/10 border-2 border-primary/30"
          >
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                <Stethoscope className="w-5 h-5 text-primary" />
              </div>
              <div>
                <span className="font-semibold text-primary text-base sm:text-lg">Medical Consultation Recommended</span>
                <p className="text-sm text-muted-foreground mt-1">
                  {stage === 'Peri-Menopause' 
                    ? 'Consider consulting a gynecologist to discuss symptom management options.'
                    : 'Regular check-ups are important for bone and heart health.'}
                </p>
              </div>
            </div>
            <Button onClick={onFindDoctors} className="gap-2 w-full sm:w-auto bg-primary hover:bg-primary/90">
              Find Specialists Near You
              <ArrowRight className="w-4 h-4" />
            </Button>
          </motion.div>
        )}
      </div>

      <HealthDisclaimer />

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        {!recommendations.needsDoctor && (
          <Button onClick={onFindDoctors} size="lg" className="gap-2 bg-teal hover:bg-teal/90">
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
