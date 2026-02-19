# ==============================
# main.py (FastAPI Version)
# SAME LOGIC – Only UI removed
# ==============================


from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import numpy as np
import pickle

# ------------------------------
# Initialize FastAPI
# ------------------------------
app = FastAPI(title="NaariCare PCOS ML API")

# Allow frontend connection
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # change in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ------------------------------
# Load Models (SAME AS BEFORE)
# ------------------------------
rf_model = pickle.load(open("models/rf_model.pkl", "rb"))
xgb_model = pickle.load(open("models/xgb_model.pkl", "rb"))
knn_model = pickle.load(open("models/knn_model.pkl", "rb"))
scaler = pickle.load(open("models/scaler.pkl", "rb"))

# ------------------------------
# Input Schema (Frontend format)
# ------------------------------
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

# ------------------------------
# SAME HELPER FUNCTIONS
# ------------------------------
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
            "doctor": False
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
            "doctor": True
        }

    else:
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
            "doctor": True
        }

# ------------------------------
# Prediction Endpoint
# ------------------------------
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

    input_scaled = scaler.transform(input_data)

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
