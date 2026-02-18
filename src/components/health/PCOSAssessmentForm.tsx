import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { 
  ArrowRight, 
  ArrowLeft, 
  User, 
  Activity, 
  Heart, 
  Microscope,
  Sparkles
} from "lucide-react";
import { PCOSInputData } from "@/lib/ml-predictions";


interface PCOSAssessmentFormProps {
  onSubmit: (data: PCOSInputData) => void;
}


type FormStep = 'personal' | 'symptoms' | 'lifestyle' | 'clinical';

export const PCOSAssessmentForm = ({ onSubmit }: PCOSAssessmentFormProps) => {
  const [step, setStep] = useState<FormStep>('personal');
  const [formData, setFormData] = useState<PCOSInputData>({
    age: 25,
    weight: 55,
    bmi: 22,
    cycleRegular: true,
    cycleLength: 28,
    weightGain: false,
    hairGrowth: false,
    skinDarkening: false,
    hairLoss: false,
    pimples: false,
    fastFood: false,
    regularExercise: true,
    follicleLeft: 5,
    follicleRight: 5,
    endometrium: 8,
  });

  const steps: FormStep[] = ['personal', 'symptoms', 'lifestyle', 'clinical'];
  const currentStepIndex = steps.indexOf(step);

  const updateField = <K extends keyof PCOSInputData>(field: K, value: PCOSInputData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const nextStep = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < steps.length) {
      setStep(steps[nextIndex]);
    }
  };

  const prevStep = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setStep(steps[prevIndex]);
    }
  };

 const handleSubmit = () => {
  const bmi = formData.bmi || (formData.weight / 2.5);

  onSubmit({
    ...formData,
    bmi,
  });
};



  const stepIcons = {
    personal: User,
    symptoms: Activity,
    lifestyle: Heart,
    clinical: Microscope,
  };

  const stepLabels = {
    personal: 'Personal Info',
    symptoms: 'Symptoms',
    lifestyle: 'Lifestyle',
    clinical: 'Clinical Data',
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Progress Steps */}
      <div className="flex items-center justify-center gap-2 mb-8">
        {steps.map((s, i) => {
          const Icon = stepIcons[s];
          return (
            <div key={s} className="flex items-center">
              <button
                onClick={() => i <= currentStepIndex && setStep(s)}
                className={`w-12 h-12 rounded-full flex flex-col items-center justify-center text-xs font-medium transition-all duration-300 ${
                  step === s
                    ? "bg-accent text-accent-foreground scale-110 shadow-lg"
                    : i < currentStepIndex
                    ? "bg-teal text-teal-foreground cursor-pointer hover:scale-105"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                <Icon className="w-5 h-5" />
              </button>
              {i < steps.length - 1 && (
                <div className={`w-8 md:w-16 h-0.5 transition-colors duration-300 ${
                  i < currentStepIndex ? "bg-teal" : "bg-border"
                }`} />
              )}
            </div>
          );
        })}
      </div>

      <div className="text-center mb-6">
        <h2 className="font-heading text-xl font-semibold text-foreground">
          {stepLabels[step]}
        </h2>
      </div>

      <div className="glass-card rounded-2xl p-6 md:p-8 animate-fade-up">
        {/* Personal Info Step */}
        {step === 'personal' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="age">Age (years)</Label>
                <Input
                  id="age"
                  type="number"
                  min={15}
                  max={55}
                  value={formData.age}
                  onChange={(e) => updateField('age', Number(e.target.value))}
                  className="text-lg"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="weight">Weight (kg)</Label>
                <Input
                  id="weight"
                  type="number"
                  min={30}
                  max={120}
                  step={0.5}
                  value={formData.weight}
                  onChange={(e) => updateField('weight', Number(e.target.value))}
                  className="text-lg"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bmi">BMI</Label>
              <Slider
                value={[formData.bmi]}
                onValueChange={([v]) => updateField('bmi', v)}
                min={15}
                max={45}
                step={0.5}
                className="mt-3"
              />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>15 (Underweight)</span>
                <span className="font-semibold text-accent">{formData.bmi}</span>
                <span>45 (Obese)</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-accent/10 border border-accent/20">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">Menstrual Cycle</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Is your cycle regular?
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={!formData.cycleRegular ? "font-semibold text-destructive" : "text-muted-foreground"}>
                    Irregular
                  </span>
                  <Switch
                    checked={formData.cycleRegular}
                    onCheckedChange={(v) => updateField('cycleRegular', v)}
                  />
                  <span className={formData.cycleRegular ? "font-semibold text-teal" : "text-muted-foreground"}>
                    Regular
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cycleLength">Cycle Length (days)</Label>
              <Slider
                value={[formData.cycleLength]}
                onValueChange={([v]) => updateField('cycleLength', v)}
                min={15}
                max={90}
                step={1}
                className="mt-3"
              />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>15 days</span>
                <span className="font-semibold text-accent">{formData.cycleLength} days</span>
                <span>90 days</span>
              </div>
            </div>
          </div>
        )}

        {/* Symptoms Step */}
        {step === 'symptoms' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground mb-4">
              Select all symptoms you're experiencing:
            </p>
            
            {[
              { key: 'weightGain', label: 'Weight Gain', desc: 'Unexplained weight gain or difficulty losing weight' },
              { key: 'hairGrowth', label: 'Excess Hair Growth', desc: 'Hair growth on face, chest, or back' },
              { key: 'skinDarkening', label: 'Skin Darkening', desc: 'Dark patches on neck, underarms, or groin' },
              { key: 'hairLoss', label: 'Hair Loss', desc: 'Thinning hair on scalp' },
              { key: 'pimples', label: 'Acne/Pimples', desc: 'Persistent or severe acne' },
            ].map(({ key, label, desc }) => (
              <div
                key={key}
                className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
                  formData[key as keyof PCOSInputData]
                    ? "border-accent bg-accent/10"
                    : "border-border hover:border-accent/50"
                }`}
                onClick={() => updateField(key as keyof PCOSInputData, !formData[key as keyof PCOSInputData] as any)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-foreground">{label}</div>
                    <div className="text-sm text-muted-foreground">{desc}</div>
                  </div>
                  <Switch
                    checked={formData[key as keyof PCOSInputData] as boolean}
                    onCheckedChange={(v) => updateField(key as keyof PCOSInputData, v as any)}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Lifestyle Step */}
        {step === 'lifestyle' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground mb-4">
              Tell us about your lifestyle habits:
            </p>
            
            <div
              className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
                formData.fastFood
                  ? "border-destructive bg-destructive/10"
                  : "border-border hover:border-accent/50"
              }`}
              onClick={() => updateField('fastFood', !formData.fastFood)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-foreground">Fast Food Consumption</div>
                  <div className="text-sm text-muted-foreground">
                    Do you frequently consume fast food/junk food?
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={!formData.fastFood ? "text-teal font-medium" : "text-muted-foreground"}>No</span>
                  <Switch
                    checked={formData.fastFood}
                    onCheckedChange={(v) => updateField('fastFood', v)}
                  />
                  <span className={formData.fastFood ? "text-destructive font-medium" : "text-muted-foreground"}>Yes</span>
                </div>
              </div>
            </div>

            <div
              className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
                formData.regularExercise
                  ? "border-teal bg-teal/10"
                  : "border-border hover:border-accent/50"
              }`}
              onClick={() => updateField('regularExercise', !formData.regularExercise)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-foreground">Regular Exercise</div>
                  <div className="text-sm text-muted-foreground">
                    Do you exercise regularly (at least 3x/week)?
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={!formData.regularExercise ? "text-destructive font-medium" : "text-muted-foreground"}>No</span>
                  <Switch
                    checked={formData.regularExercise}
                    onCheckedChange={(v) => updateField('regularExercise', v)}
                  />
                  <span className={formData.regularExercise ? "text-teal font-medium" : "text-muted-foreground"}>Yes</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Clinical Data Step */}
        {step === 'clinical' && (
          <div className="space-y-6">
            <div className="p-4 rounded-xl bg-muted/50 mb-4">
              <p className="text-sm text-muted-foreground">
                <strong>Note:</strong> If you have ultrasound results, enter them below. 
                Otherwise, use the default values for a general assessment.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Follicle Count - Left Ovary</Label>
              <Slider
                value={[formData.follicleLeft]}
                onValueChange={([v]) => updateField('follicleLeft', v)}
                min={0}
                max={30}
                step={1}
                className="mt-3"
              />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>0</span>
                <span className={`font-semibold ${formData.follicleLeft >= 12 ? 'text-destructive' : 'text-accent'}`}>
                  {formData.follicleLeft} follicles
                </span>
                <span>30</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Follicle Count - Right Ovary</Label>
              <Slider
                value={[formData.follicleRight]}
                onValueChange={([v]) => updateField('follicleRight', v)}
                min={0}
                max={30}
                step={1}
                className="mt-3"
              />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>0</span>
                <span className={`font-semibold ${formData.follicleRight >= 12 ? 'text-destructive' : 'text-accent'}`}>
                  {formData.follicleRight} follicles
                </span>
                <span>30</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Endometrium Thickness (mm)</Label>
              <Slider
                value={[formData.endometrium]}
                onValueChange={([v]) => updateField('endometrium', v)}
                min={1}
                max={20}
                step={0.5}
                className="mt-3"
              />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>1 mm</span>
                <span className="font-semibold text-accent">{formData.endometrium} mm</span>
                <span>20 mm</span>
              </div>
            </div>

            {(formData.follicleLeft + formData.follicleRight >= 20) && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
                ⚠️ High follicle count detected. This may indicate polycystic ovaries.
              </div>
            )}
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-8 pt-6 border-t border-border">
          <Button
            variant="ghost"
            onClick={prevStep}
            disabled={currentStepIndex === 0}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Previous
          </Button>

          {currentStepIndex < steps.length - 1 ? (
            <Button onClick={nextStep} className="gap-2">
              Next
              <ArrowRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} className="gap-2 bg-accent hover:bg-accent/90">
              <Sparkles className="w-4 h-4" />
              Get Assessment
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
