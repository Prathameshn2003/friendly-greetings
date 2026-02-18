from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import numpy as np
import pickle

# ===============================
# Initialize FastAPI
# ===============================
app = FastAPI(title="NaariCare Unified ML API")

# Allow frontend connection
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # change in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ===============================
# LOAD PCOS MODELS
# ===============================
rf_model = pickle.load(open("pcos_backend/models/rf_model.pkl", "rb"))
xgb_model = pickle.load(open("pcos_backend/models/xgb_model.pkl", "rb"))
knn_model = pickle.load(open("pcos_backend/models/knn_model.pkl", "rb"))
pcos_scaler = pickle.load(open("pcos_backend/models/scaler.pkl", "rb"))

# ===============================
# LOAD MENOPAUSE MODELS
# ===============================
menopause_rf = pickle.load(open("menopause_backend/models/rf_model.pkl", "rb"))
menopause_scaler = pickle.load(open("menopause_backend/models/scaler.pkl", "rb"))
menopause_le = pickle.load(open("menopause_backend/models/label_encoder.pkl", "rb"))

# =====================================================
# PCOS SECTION (LOGIC UNCHANGED)
# =====================================================

class PCOSInput(BaseModel):
    age: float
    weight: float
    bmi: float
    cycleRegular: bool
    cycleLength: float
    weightGain: bool
    hairGrowth: bool
    skinDarkening: bool
    hairLoss: bool
    pimples: bool
    fastFood: bool
    regularExercise: bool
    follicleLeft: float
    follicleRight: float
    endometrium: float


@app.post("/predict/pcos")
def predict_pcos(data: PCOSInput):

    cycle = 1 if data.cycleRegular else 0
    wg = 1 if data.weightGain else 0
    hg = 1 if data.hairGrowth else 0
    sd = 1 if data.skinDarkening else 0
    hl = 1 if data.hairLoss else 0
    pimples = 1 if data.pimples else 0
    fastfood = 1 if data.fastFood else 0
    exercise = 1 if data.regularExercise else 0

    input_data = np.array([
        data.age, data.weight, data.bmi, cycle,
        data.cycleLength, wg, hg, sd, hl,
        pimples, fastfood, exercise,
        data.follicleLeft, data.follicleRight,
        data.endometrium
    ]).reshape(1, -1)

    input_scaled = pcos_scaler.transform(input_data)

    rf_pred = rf_model.predict(input_scaled)[0]
    xgb_pred = xgb_model.predict(input_scaled)[0]
    knn_pred = knn_model.predict(input_scaled)[0]

    final_pred = 1 if (rf_pred + xgb_pred + knn_pred) >= 2 else 0

    cycle_score = 1 if cycle == 0 else 0
    hormonal_score = hg + sd + hl + pimples
    ultrasound_score = 1 if (data.follicleLeft + data.follicleRight) >= 10 else 0
    metabolic_score = 1 if data.bmi >= 25 else 0

    total_score = (
        2 * cycle_score +
        2 * ultrasound_score +
        hormonal_score +
        metabolic_score
    )

    if total_score >= 4:
        final_pred = 1

    if final_pred == 1:
        risk_percentage = int((total_score / 9) * 100)
        risk_percentage = max(30, risk_percentage)
        severity = classify_severity_from_risk(risk_percentage)
    else:
        risk_percentage = 0
        severity = "None"

    return {
        "hasPCOS": final_pred == 1,
        "riskPercentage": risk_percentage,
        "severity": severity,
        "breakdown": {
            "cycleScore": cycle_score * 2,
            "hormonalScore": hormonal_score,
            "ultrasoundScore": ultrasound_score * 2,
            "metabolicScore": metabolic_score
        },
        "recommendations": recommendation(severity)
    }


# =====================================================
# MENOPAUSE SECTION (LOGIC UNCHANGED)
# =====================================================

class MenopauseInput(BaseModel):
    age: int
    estrogen_level: float
    fsh_level: float
    years_since_last_period: float
    irregular_periods: int
    missed_periods: int
    hot_flashes: int
    night_sweats: int
    sleep_problems: int
    vaginal_dryness: int
    joint_pain: int


@app.post("/predict/menopause")
def predict_menopause(data: MenopauseInput):

    inputs = [
        data.age,
        data.estrogen_level,
        data.fsh_level,
        data.years_since_last_period,
        data.irregular_periods,
        data.missed_periods,
        data.hot_flashes,
        data.night_sweats,
        data.sleep_problems,
        data.vaginal_dryness,
        data.joint_pain
    ]

    X = menopause_scaler.transform([inputs])
    probs = menopause_rf.predict_proba(X)[0]
    stage_index = probs.argmax()
    stage = menopause_le.inverse_transform([stage_index])[0]
    risk_percentage = int(probs[stage_index] * 100)

    # -------------------------------
    # BREAKDOWN CALCULATION
    # -------------------------------
    age_score = 0
    if data.age >= 55:
        age_score = 4
    elif data.age >= 50:
        age_score = 3
    elif data.age >= 45:
        age_score = 2
    elif data.age >= 40:
        age_score = 1

    hormone_score = 0
    if data.fsh_level >= 40:
        hormone_score += 2
    elif data.fsh_level >= 25:
        hormone_score += 1

    if data.estrogen_level <= 30:
        hormone_score += 2
    elif data.estrogen_level <= 50:
        hormone_score += 1

    symptom_score = (
        data.irregular_periods +
        data.missed_periods +
        data.hot_flashes +
        data.night_sweats +
        data.sleep_problems +
        data.vaginal_dryness +
        data.joint_pain
    )

    period_score = 0
    if data.years_since_last_period >= 2:
        period_score = 4
    elif data.years_since_last_period >= 1:
        period_score = 3
    elif data.years_since_last_period >= 0.5:
        period_score = 2
    elif data.years_since_last_period > 0:
        period_score = 1

    has_symptoms = stage != "Pre-Menopause"

    # =====================================================
    # STAGE-BASED RECOMMENDATIONS (UPDATED SECTION)
    # =====================================================

    if stage == "Pre-Menopause":

        diet = [
            "Balanced diet rich in fruits and vegetables",
            "Calcium-rich foods (milk, curd, ragi)",
            "Adequate protein intake (dal, eggs, nuts)",
            "Limit processed and sugary foods"
        ]

        exercise = [
            "Brisk walking – 30 minutes daily",
            "Yoga and stretching exercises",
            "Light strength training 2–3 times per week",
            "Stress management techniques"
        ]

        lifestyle = [
            "Maintain regular sleep cycle",
            "Manage stress effectively",
            "Annual health checkups",
            "Track menstrual cycle regularly"
        ]

    elif stage == "Peri-Menopause":

        diet = [
            "High-fiber foods (oats, whole grains)",
            "Phytoestrogen sources (soy, flax seeds)",
            "Iron and calcium-rich foods",
            "Reduce caffeine and spicy foods",
            "Stay hydrated"
        ]

        exercise = [
            "Walking or cycling – 40 minutes",
            "Yoga (Anulom Vilom, Bhramari)",
            "Moderate strength training",
            "Breathing and relaxation exercises"
        ]

        lifestyle = [
            "Monitor hormonal symptoms regularly",
            "Practice mindfulness or meditation",
            "Maintain healthy body weight",
            "Consult doctor if symptoms worsen"
        ]

    else:  # Post-Menopause

        diet = [
            "High-calcium foods (milk, sesame, cheese)",
            "Vitamin D through sunlight or supplements",
            "Protein-rich diet (lentils, fish, tofu)",
            "Anti-inflammatory foods (turmeric, green vegetables)",
            "Avoid fried and processed foods"
        ]

        exercise = [
            "Weight-bearing exercises (walking, stairs)",
            "Light resistance training",
            "Balance exercises to prevent falls",
            "Stretching and flexibility exercises"
        ]

        lifestyle = [
            "Bone density checkups",
            "Heart health monitoring",
            "Maintain active lifestyle",
            "Consult gynecologist regularly"
        ]

    recommendations = {
        "diet": diet,
        "exercise": exercise,
        "lifestyle": lifestyle,
        "needsDoctor": stage != "Pre-Menopause"
    }

    return {
        "stage": stage,
        "riskPercentage": risk_percentage,
        "hasMenopauseSymptoms": has_symptoms,
        "breakdown": {
            "ageScore": age_score,
            "hormoneScore": hormone_score,
            "symptomScore": symptom_score,
            "periodScore": period_score
        },
        "recommendations": recommendations
    }




# ===============================
# SAME HELPER FUNCTIONS (PCOS)
# ===============================

def classify_severity_from_risk(risk):
    if 30 <= risk < 50:
        return "Low"
    elif 50 <= risk < 70:
        return "Medium"
    else:
        return "High"


def recommendation(severity):

    if severity == "Low":
        return {
            "diet": [
                "Low glycemic index foods (millets, oats, brown rice)",
                "Fresh vegetables (spinach, broccoli, carrot, cucumber)",
                "Fruits in moderation (apple, berries, guava)",
                "Lean protein sources (dal, paneer, eggs, fish)",
                "Healthy fats (nuts, seeds, olive oil)",
                "Drink 2–3 liters of water daily",
                "Limit caffeine and packaged food"
            ],
            "exercise": [
                "Brisk walking – 30 minutes daily",
                "Yoga (Surya Namaskar, Anulom Vilom)",
                "Light stretching exercises",
                "Basic home workouts",
                "Minimum 5 days per week"
            ],
            "lifestyle": [
                "Sleep 7–8 hours daily",
                "Maintain regular sleep and wake time",
                "Reduce stress through meditation",
                "Avoid late-night meals",
                "Maintain a regular daily routine"
            ],
            "needsDoctor": False
        }

    elif severity == "Medium":
        return {
            "diet": [
                "Strict low-glycemic-index diet",
                "High-fiber foods (vegetables, salads, sprouts)",
                "Protein in every meal (eggs, pulses, fish)",
                "Small and frequent meals",
                "Anti-inflammatory foods (turmeric, berries, nuts)",
                "Completely avoid sugar, fast food, bakery items",
                "Reduce salt and oily food intake"
            ],
            "exercise": [
                "Cardio workouts (walking/jogging) – 30–40 minutes",
                "Strength training – 3 to 4 days per week",
                "Yoga for hormone balance",
                "Beginner-level HIIT exercises",
                "Pelvic floor strengthening exercises"
            ],
            "lifestyle": [
                "Fixed sleep and wake-up time",
                "Weight monitoring every week",
                "Reduce screen time",
                "Stress management is mandatory",
                "Track menstrual cycle regularly"
            ],
            "needsDoctor": True
        }

    else:  # High Risk PCOS
        return {
            "diet": [
                "Very strict low-glycemic-index diet",
                "High-fiber vegetables in every meal",
                "Lean protein with each meal",
                "Anti-inflammatory foods only",
                "Complete elimination of sugar, maida, fried food",
                "Avoid alcohol, soft drinks, and packaged foods",
                "Calorie-controlled meals under medical guidance"
            ],
            "exercise": [
                "HIIT workouts (doctor-approved)",
                "Resistance training for insulin sensitivity",
                "Cardio exercises – 45 to 60 minutes daily",
                "Daily yoga for hormonal balance",
                "Consistency is critical"
            ],
            "lifestyle": [
                "Strict daily routine",
                "Mental health care and counseling if needed",
                "Avoid crash dieting",
                "Track menstrual cycle and symptoms monthly",
                "Long-term lifestyle discipline required"
            ],
            "needsDoctor": True
        }
