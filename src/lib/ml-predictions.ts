// ML-based prediction utilities for PCOS, Menopause, and Cycle
// Supports real ML API via Supabase Edge Functions with local TypeScript fallback
import { supabase } from "@/integrations/supabase/client";


const API_BASE_URL = import.meta.env.VITE_API_URL;



// ==========================================
// PCOS PREDICTION ENGINE
// Based on RF + XGBoost ensemble logic
// ==========================================

export interface PCOSInputData {
  age: number;
  weight: number;
  bmi: number;
  cycleRegular: boolean; // true = regular, false = irregular
  cycleLength: number;
  weightGain: boolean;
  hairGrowth: boolean;
  skinDarkening: boolean;
  hairLoss: boolean;
  pimples: boolean;
  fastFood: boolean;
  regularExercise: boolean;
  follicleLeft: number;
  follicleRight: number;
  endometrium: number;
}

export interface PCOSResult {
  hasPCOS: boolean;
  riskPercentage: number;
  severity: 'none' | 'low' | 'medium' | 'high';
  breakdown: {
    cycleScore: number;
    hormonalScore: number;
    ultrasoundScore: number;
    metabolicScore: number;
  };
  recommendations: PCOSRecommendations;
}

export interface PCOSRecommendations {
  diet: string[];
  exercise: string[];
  lifestyle: string[];
  needsDoctor: boolean;
}

export function predictPCOS(data: PCOSInputData): PCOSResult {
  // Score calculation based on ML model logic
  const cycleScore = data.cycleRegular ? 0 : 1;
  
  // Hormonal symptoms score (0-4)
  const hormonalScore = 
    (data.hairGrowth ? 1 : 0) + 
    (data.skinDarkening ? 1 : 0) + 
    (data.hairLoss ? 1 : 0) + 
    (data.pimples ? 1 : 0);
  
  // Ultrasound indicator
  const totalFollicles = data.follicleLeft + data.follicleRight;
  const ultrasoundScore = totalFollicles >= 10 ? 1 : 0;
  
  // Metabolic score
  const metabolicScore = data.bmi >= 25 ? 1 : 0;
  
  // Lifestyle factors
  const lifestyleScore = 
    (data.weightGain ? 0.5 : 0) + 
    (data.fastFood ? 0.5 : 0) + 
    (!data.regularExercise ? 0.5 : 0);
  
  // Weighted total score (max = 9)
  const totalScore = 
    2 * cycleScore + 
    2 * ultrasoundScore + 
    hormonalScore + 
    metabolicScore + 
    lifestyleScore;
  
  // PCOS detection threshold
  const hasPCOS = totalScore >= 4;
  
  // Risk percentage calculation
  let riskPercentage = Math.round((totalScore / 9) * 100);
  riskPercentage = Math.max(hasPCOS ? 30 : 0, riskPercentage);
  riskPercentage = Math.min(100, riskPercentage);
  
  // Severity classification
  let severity: 'none' | 'low' | 'medium' | 'high';
  if (!hasPCOS) {
    severity = 'none';
  } else if (riskPercentage < 50) {
    severity = 'low';
  } else if (riskPercentage < 70) {
    severity = 'medium';
  } else {
    severity = 'high';
  }
  
  // Get recommendations based on severity
  const recommendations = getPCOSRecommendations(severity);
  
  return {
    hasPCOS,
    riskPercentage,
    severity,
    breakdown: {
      cycleScore: cycleScore * 2,
      hormonalScore,
      ultrasoundScore: ultrasoundScore * 2,
      metabolicScore,
    },
    recommendations,
  };
}

function getPCOSRecommendations(severity: 'none' | 'low' | 'medium' | 'high'): PCOSRecommendations {
  if (severity === 'none') {
    return {
      diet: [
        'Maintain balanced diet with whole grains',
        'Include fresh fruits and vegetables',
        'Stay hydrated with 2-3 liters water daily',
        'Include lean protein sources'
      ],
      exercise: [
        'Continue regular physical activity',
        '30 minutes of moderate exercise daily',
        'Mix of cardio and strength training'
      ],
      lifestyle: [
        'Maintain healthy sleep schedule',
        'Regular health check-ups annually',
        'Stress management practices'
      ],
      needsDoctor: false
    };
  }
  
  if (severity === 'low') {
    return {
      diet: [
        'Low glycemic index foods (millets, oats, brown rice)',
        'Fresh vegetables (spinach, broccoli, carrot, cucumber)',
        'Fruits in moderation (apple, berries, guava)',
        'Lean protein sources (dal, paneer, eggs, fish)',
        'Healthy fats (nuts, seeds, olive oil)',
        'Drink 2–3 liters of water daily'
      ],
      exercise: [
        'Brisk walking – 30 minutes daily',
        'Yoga (Surya Namaskar, Anulom Vilom)',
        'Light stretching exercises',
        'Minimum 5 days per week'
      ],
      lifestyle: [
        'Sleep 7–8 hours daily',
        'Reduce stress through meditation',
        'Avoid late-night meals',
        'Maintain a regular daily routine'
      ],
      needsDoctor: false
    };
  }
  
  if (severity === 'medium') {
    return {
      diet: [
        'Strict low-GI diet to reduce insulin resistance',
        'High-fiber foods (vegetables, salads, sprouts)',
        'Protein in every meal (eggs, pulses, fish)',
        'Small and frequent meals',
        'Anti-inflammatory foods (turmeric, berries, nuts)',
        'Completely avoid sugar, fast food, bakery items'
      ],
      exercise: [
        'Cardio workouts (walking/jogging) – 30–40 minutes',
        'Strength training – 3 to 4 days per week',
        'Yoga for hormone balance',
        'Beginner-level HIIT exercises'
      ],
      lifestyle: [
        'Fixed sleep and wake-up time',
        'Weight monitoring every week',
        'Reduce screen time',
        'Stress management is mandatory'
      ],
      needsDoctor: true
    };
  }
  
  // High severity
  return {
    diet: [
      'Very strict low-glycemic-index diet',
      'High-fiber vegetables in every meal',
      'Lean protein with each meal',
      'Anti-inflammatory foods only',
      'Complete elimination of sugar, maida, fried food',
      'Avoid alcohol, soft drinks, and packaged foods',
      'Calorie-controlled meals under medical guidance'
    ],
    exercise: [
      'HIIT workouts (doctor-approved)',
      'Resistance training for insulin sensitivity',
      'Cardio exercises – 45 to 60 minutes daily',
      'Daily yoga for hormonal balance',
      'Consistency is critical'
    ],
    lifestyle: [
      'Strict daily routine',
      'Mental health care and counseling if needed',
      'Avoid crash dieting',
      'Track menstrual cycle and symptoms monthly',
      'Long-term lifestyle discipline required'
    ],
    needsDoctor: true
  };
}

// ==========================================
// MENOPAUSE PREDICTION ENGINE
// Based on RF classifier logic
// ==========================================

export interface MenopauseInputData {
  age: number;
  estrogenLevel: number; // 10-100
  fshLevel: number; // 5-80
  yearsSinceLastPeriod: number; // 0-10
  irregularPeriods: boolean;
  missedPeriods: boolean;
  hotFlashes: boolean;
  nightSweats: boolean;
  sleepProblems: boolean;
  vaginalDryness: boolean;
  jointPain: boolean;
}

export interface MenopauseResult {
  stage: 'Pre-Menopause' | 'Peri-Menopause' | 'Post-Menopause';
  riskPercentage: number;
  hasMenopauseSymptoms: boolean;
  breakdown: {
    ageScore: number;
    hormoneScore: number;
    symptomScore: number;
    periodScore: number;
  };
  recommendations: MenopauseRecommendations;
}

export interface MenopauseRecommendations {
  diet: string[];
  exercise: string[];
  lifestyle: string[];
  needsDoctor: boolean;
}

export function predictMenopause(data: MenopauseInputData): MenopauseResult {
  // Medical rule-based labeling (same as Python logic)
  let stage: 'Pre-Menopause' | 'Peri-Menopause' | 'Post-Menopause';
  
  // Primary rule: 12+ months since last period = Post-Menopause
  if (data.yearsSinceLastPeriod >= 1) {
    stage = 'Post-Menopause';
  } else if (
    data.age >= 40 && 
    (data.irregularPeriods || data.missedPeriods || data.hotFlashes)
  ) {
    stage = 'Peri-Menopause';
  } else {
    stage = 'Pre-Menopause';
  }
  
  // Calculate component scores
  // Age score (0-4)
  let ageScore = 0;
  if (data.age >= 55) ageScore = 4;
  else if (data.age >= 50) ageScore = 3;
  else if (data.age >= 45) ageScore = 2;
  else if (data.age >= 40) ageScore = 1;
  
  // Hormone score based on FSH and Estrogen
  // High FSH (>25) and Low Estrogen (<30) = higher score
  let hormoneScore = 0;
  if (data.fshLevel >= 40) hormoneScore += 2;
  else if (data.fshLevel >= 25) hormoneScore += 1;
  
  if (data.estrogenLevel <= 30) hormoneScore += 2;
  else if (data.estrogenLevel <= 50) hormoneScore += 1;
  
  // Symptom score (0-7)
  const symptomScore = 
    (data.irregularPeriods ? 1 : 0) +
    (data.missedPeriods ? 1 : 0) +
    (data.hotFlashes ? 1 : 0) +
    (data.nightSweats ? 1 : 0) +
    (data.sleepProblems ? 1 : 0) +
    (data.vaginalDryness ? 1 : 0) +
    (data.jointPain ? 1 : 0);
  
  // Period score
  let periodScore = 0;
  if (data.yearsSinceLastPeriod >= 2) periodScore = 4;
  else if (data.yearsSinceLastPeriod >= 1) periodScore = 3;
  else if (data.yearsSinceLastPeriod >= 0.5) periodScore = 2;
  else if (data.yearsSinceLastPeriod > 0) periodScore = 1;
  
  // Total weighted score (max ~19)
  const maxScore = 19;
  const totalScore = ageScore + hormoneScore + symptomScore + periodScore;
  
  let riskPercentage = Math.round((totalScore / maxScore) * 100);
  riskPercentage = Math.min(100, Math.max(0, riskPercentage));
  
  const hasMenopauseSymptoms = stage !== 'Pre-Menopause';
  
  const recommendations = getMenopauseRecommendations(stage);
  
  return {
    stage,
    riskPercentage,
    hasMenopauseSymptoms,
    breakdown: {
      ageScore,
      hormoneScore,
      symptomScore,
      periodScore,
    },
    recommendations,
  };
}

function getMenopauseRecommendations(stage: 'Pre-Menopause' | 'Peri-Menopause' | 'Post-Menopause'): MenopauseRecommendations {
  if (stage === 'Pre-Menopause') {
    return {
      diet: [
        'Maintain balanced nutrition',
        'Include calcium-rich foods',
        'Stay hydrated',
        'Moderate caffeine intake'
      ],
      exercise: [
        'Regular cardio and strength training',
        'Maintain bone health with weight-bearing exercises',
        'Stay active 30 minutes daily'
      ],
      lifestyle: [
        'Regular health check-ups',
        'Stress management',
        'Quality sleep habits'
      ],
      needsDoctor: false
    };
  }
  
  if (stage === 'Peri-Menopause') {
    return {
      diet: [
        'Low-GI foods: oats, brown rice, whole wheat roti',
        'High-fiber foods: salads, sprouts, flax seeds',
        'Protein sources: eggs, pulses, soy, paneer',
        'Healthy fats: nuts, seeds, olive oil',
        'Calcium-rich foods: milk, curd, ragi',
        'Vitamin-D foods or supplements (doctor advice)',
        'Avoid: Sugar, bakery items, excess caffeine'
      ],
      exercise: [
        'Brisk walking – 30 to 40 minutes daily',
        'Yoga: Anulom-Vilom, Bhramari, Surya Namaskar',
        'Strength training – 2 to 3 days per week',
        'Light cardio (cycling, skipping)'
      ],
      lifestyle: [
        'Fixed sleep and wake-up time',
        'Daily meditation or breathing exercises',
        'Stress management is very important',
        'Maintain healthy body weight'
      ],
      needsDoctor: true
    };
  }
  
  // Post-Menopause
  return {
    diet: [
      'High-calcium foods: milk, cheese, curd, sesame seeds',
      'Vitamin-D rich foods or supplements',
      'High-protein diet: lentils, eggs, fish, tofu',
      'Anti-inflammatory foods: turmeric, berries, green tea',
      'Plenty of fruits and vegetables',
      'Avoid: Fried food, excess salt, sugary foods'
    ],
    exercise: [
      'Weight-bearing exercises: walking, stair climbing',
      'Light strength training (resistance bands, dumbbells)',
      'Balance exercises to prevent falls',
      'Stretching and flexibility exercises'
    ],
    lifestyle: [
      'Regular medical check-ups',
      'Bone density test (doctor advice)',
      'Avoid smoking and alcohol',
      'Maintain a stress-free routine'
    ],
    needsDoctor: true
  };
}

// ==========================================
// MENSTRUAL CYCLE PREDICTION
// ==========================================

export interface CycleData {
  cycleHistory: number[]; // Array of cycle lengths
  lastPeriodStart: Date;
  symptoms?: {
    cramps?: 'none' | 'mild' | 'severe';
    mood?: 'stable' | 'irritable' | 'depressed';
    acne?: boolean;
    bloating?: boolean;
    fatigue?: boolean;
  };
  stressLevel?: number; // 1-5
  sleepHours?: number;
}

export interface CyclePrediction {
  predictedStartDate: Date;
  confidenceLevel: 'high' | 'medium' | 'low';
  averageCycleLength: number;
  cycleVariability: number;
  isIrregular: boolean;
  pcosRiskFlag: boolean;
  delayAdjustment: number; // Days to adjust based on stress/sleep
}

export function predictNextCycle(data: CycleData): CyclePrediction {
  const { cycleHistory, lastPeriodStart, symptoms, stressLevel, sleepHours } = data;
  
  if (cycleHistory.length === 0) {
    // Default prediction with no history
    const predictedDate = new Date(lastPeriodStart);
    predictedDate.setDate(predictedDate.getDate() + 28);
    
    return {
      predictedStartDate: predictedDate,
      confidenceLevel: 'low',
      averageCycleLength: 28,
      cycleVariability: 0,
      isIrregular: false,
      pcosRiskFlag: false,
      delayAdjustment: 0,
    };
  }
  
  // Use last 6 cycles for weighted average (more recent cycles have higher weight)
  const recentCycles = cycleHistory.slice(-6);
  const weights = recentCycles.map((_, i) => i + 1);
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  
  const weightedAverage = recentCycles.reduce((sum, cycle, i) => {
    return sum + cycle * weights[i];
  }, 0) / totalWeight;
  
  // Calculate variability (standard deviation)
  const mean = recentCycles.reduce((a, b) => a + b, 0) / recentCycles.length;
  const variance = recentCycles.reduce((sum, cycle) => {
    return sum + Math.pow(cycle - mean, 2);
  }, 0) / recentCycles.length;
  const variability = Math.sqrt(variance);
  
  // Determine confidence level
  let confidenceLevel: 'high' | 'medium' | 'low';
  if (variability <= 2 && cycleHistory.length >= 3) {
    confidenceLevel = 'high';
  } else if (variability <= 5 || cycleHistory.length >= 6) {
    confidenceLevel = 'medium';
  } else {
    confidenceLevel = 'low';
  }
  
  // Check for irregular cycles
  const isIrregular = variability > 7 || recentCycles.some(c => c < 21 || c > 35);
  
  // PCOS risk flag
  const longCycles = recentCycles.filter(c => c > 35).length;
  const pcosRiskFlag = longCycles >= 3 || (isIrregular && symptoms?.acne && 
    (symptoms?.cramps === 'severe' || symptoms?.mood === 'irritable'));
  
  // Stress/sleep delay adjustment
  let delayAdjustment = 0;
  if (stressLevel && stressLevel >= 4) {
    delayAdjustment += 2;
  }
  if (sleepHours && sleepHours < 6) {
    delayAdjustment += 1;
  }
  
  // Calculate predicted date
  const predictedDate = new Date(lastPeriodStart);
  predictedDate.setDate(predictedDate.getDate() + Math.round(weightedAverage) + delayAdjustment);
  
  return {
    predictedStartDate: predictedDate,
    confidenceLevel,
    averageCycleLength: Math.round(weightedAverage),
    cycleVariability: Math.round(variability * 10) / 10,
    isIrregular,
    pcosRiskFlag,
    delayAdjustment,
  };
}

// Generate notification schedule
export function getNotificationSchedule(
  predictedDate: Date,
  isIrregular: boolean
): { date: Date; message: string; daysBefore: number }[] {
  const notifications: { date: Date; message: string; daysBefore: number }[] = [];
  
  if (isIrregular) {
    [5, 3, 1].forEach(daysBefore => {
      const notifDate = new Date(predictedDate);
      notifDate.setDate(notifDate.getDate() - daysBefore);
      notifications.push({
        date: notifDate,
        message: daysBefore === 5 
          ? "Your period may start in about 5 days (estimate) 🌸"
          : daysBefore === 3
          ? "Your period may start soon. This is an estimate 🌸"
          : "Your period may start tomorrow. Take care 💗",
        daysBefore,
      });
    });
  } else {
    [3, 2, 1].forEach(daysBefore => {
      const notifDate = new Date(predictedDate);
      notifDate.setDate(notifDate.getDate() - daysBefore);
      notifications.push({
        date: notifDate,
        message: daysBefore === 3
          ? "Your period is expected in 3 days 🌸"
          : daysBefore === 2
          ? "Your period may start in 2 days. Stay prepared 💕"
          : "Your period may start tomorrow. Take care 💗",
        daysBefore,
      });
    });
  }
  
  return notifications;
}

// ==========================================
// API-BASED PREDICTION FUNCTIONS
// Call real ML models via Supabase Edge Function
// Falls back to local TypeScript logic if API is unavailable
// ==========================================

export interface MLPredictionMeta {
  usedAPI: boolean;
  error?: string;
}

/**
 * PCOS prediction via real ML API with local fallback
 */
export async function predictPCOSFromAPI(
  data: PCOSInputData,
  userId?: string
): Promise<PCOSResult & { _meta: MLPredictionMeta }> {

  try {
    const response = await fetch(`${API_BASE_URL}/predict/pcos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },

      // ✅ FIX: convert boolean → number for FastAPI
      body: JSON.stringify({
        age: data.age,
        weight: data.weight,
        bmi: data.bmi,
        cycleRegular: data.cycleRegular ? 1 : 0,
        cycleLength: data.cycleLength,
        weightGain: data.weightGain ? 1 : 0,
        hairGrowth: data.hairGrowth ? 1 : 0,
        skinDarkening: data.skinDarkening ? 1 : 0,
        hairLoss: data.hairLoss ? 1 : 0,
        pimples: data.pimples ? 1 : 0,
        fastFood: data.fastFood ? 1 : 0,
        regularExercise: data.regularExercise ? 1 : 0,
        follicleLeft: data.follicleLeft,
        follicleRight: data.follicleRight,
        endometrium: data.endometrium,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Backend error:", errorText);
      throw new Error("Backend validation failed");
    }

    const result = await response.json();

    const severityMap: any = {
      Low: "low",
      Medium: "medium",
      High: "high",
      None: "none",
    };

    const formattedResult: PCOSResult = {
      hasPCOS: result.hasPCOS,
      riskPercentage: result.riskPercentage,
      severity: severityMap[result.severity] ?? "none",
      breakdown: result.breakdown,
      recommendations: {
        diet: result.recommendations.diet,
        exercise: result.recommendations.exercise,
        lifestyle: result.recommendations.lifestyle,
        needsDoctor: result.recommendations.doctor,
      },
    };

    if (userId) {
      await supabase.from("health_assessments").insert({
        user_id: userId,
        assessment_type: "pcos",
        risk_score: formattedResult.riskPercentage,
        risk_category:
          formattedResult.severity === "none"
            ? "low"
            : formattedResult.severity,
        responses: data as any,
        recommendations: formattedResult.recommendations as any,
        created_at: new Date().toISOString(),
      });
    }

    return { ...formattedResult, _meta: { usedAPI: true } };

  } catch (error: any) {

    console.log("Using local fallback:", error?.message);

    const localResult = predictPCOS(data);

    return {
      ...localResult,
      _meta: { usedAPI: false, error: error.message },
    };
  }
}




/**
 * Menopause prediction via real ML API with local fallback
 */
export async function predictMenopauseFromAPI(
  data: MenopauseInputData,
  userId?: string
): Promise<MenopauseResult & { _meta: MLPredictionMeta }> {

  try {
    const response = await fetch(`${API_BASE_URL}/predict/menopause`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },

      // ✅ Convert boolean → number (for FastAPI)
      body: JSON.stringify({
        age: data.age,
        estrogen_level: data.estrogenLevel,
        fsh_level: data.fshLevel,
        years_since_last_period: data.yearsSinceLastPeriod,
        irregular_periods: data.irregularPeriods ? 1 : 0,
        missed_periods: data.missedPeriods ? 1 : 0,
        hot_flashes: data.hotFlashes ? 1 : 0,
        night_sweats: data.nightSweats ? 1 : 0,
        sleep_problems: data.sleepProblems ? 1 : 0,
        vaginal_dryness: data.vaginalDryness ? 1 : 0,
        joint_pain: data.jointPain ? 1 : 0,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Backend error:", errorText);
      throw new Error("Backend validation failed");
    }

    const result = await response.json();

    if (userId) {
      await supabase.from("health_assessments").insert({
        user_id: userId,
        assessment_type: "menopause",
        risk_score: result.riskPercentage,
        risk_category:
          result.riskPercentage < 40
            ? "low"
            : result.riskPercentage < 70
            ? "medium"
            : "high",
        responses: data as any,
        recommendations: result.recommendations as any,
        created_at: new Date().toISOString(),
      });
    }

    return { ...result, _meta: { usedAPI: true } };

  } catch (error: any) {

    const localResult = predictMenopause(data);

    return {
      ...localResult,
      _meta: { usedAPI: false, error: error.message },
    };
  }
}


/**
 * Cycle prediction via real ML API with local fallback
 */
export async function predictCycleFromAPI(
  data: CycleData,
  userId?: string
): Promise<CyclePrediction & { _meta: MLPredictionMeta }> {

  try {
    const response = await fetch(`${API_BASE_URL}/predict/cycle`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...data,
        lastPeriodStart: data.lastPeriodStart.toISOString(),
      }),
    });

    if (!response.ok) throw new Error("Backend error");

    const result = await response.json();

    const formatted: CyclePrediction = {
      predictedStartDate: new Date(result.predictedStartDate),
      confidenceLevel: result.confidenceLevel,
      averageCycleLength: result.averageCycleLength,
      cycleVariability: result.cycleVariability,
      isIrregular: result.isIrregular,
      pcosRiskFlag: result.pcosRiskFlag,
      delayAdjustment: result.delayAdjustment,
    };

    if (userId) {
      await supabase.from("cycle_predictions").insert([
        {
          user_id: userId,
          predicted_start_date:
            formatted.predictedStartDate.toISOString().split("T")[0],
          confidence_level: formatted.confidenceLevel,
          created_at: new Date().toISOString(),
        },
      ]);
    }

    return { ...formatted, _meta: { usedAPI: true } };

  } catch (error: any) {

    const localResult = predictNextCycle(data);

    return {
      ...localResult,
      _meta: { usedAPI: false, error: error.message },
    };
  }
}



// Public wrappers for recommendation functions (used by API result mapping)
function getPCOSRecommendationsPublic(severity: 'none' | 'low' | 'medium' | 'high'): PCOSRecommendations {
  return getPCOSRecommendations(severity);
}

function getMenopauseRecommendationsPublic(stage: MenopauseResult['stage']): MenopauseRecommendations {
  return getMenopauseRecommendations(stage);
}
