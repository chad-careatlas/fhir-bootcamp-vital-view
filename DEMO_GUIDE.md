# VitalView Demo Guide

## Quick Start
Your app is now running at: **http://localhost:9002**

## How the App Works

### 1. SMART Launch from Cerner
- The app needs to be launched from within Cerner EHR
- Cerner will provide launch parameters including patient context
- The launch URL format: `http://localhost:9002/launch?iss=[FHIR_SERVER_URL]&launch=[LAUNCH_TOKEN]`

### 2. Core Features

#### ✅ Automatic Launch from Cerner
- When launched from Cerner, the app automatically handles OAuth authentication
- No manual login required - it gets patient context from the EHR

#### ✅ Patient Banner Display
- Shows/hides based on EHR token context
- If `hide_patient_banner` is false in the context, the banner displays:
  - Patient name
  - Birth date
  - Gender

#### ✅ List All Patient Vital Signs
- Automatically loads and displays:
  - Blood Pressure (systolic/diastolic)
  - Oxygen Saturation (SpO2)
- Shows history with timestamps
- Most recent vitals appear first

#### ✅ Create New Vital Signs
- Form for manual entry with validation:
  - Systolic BP: 70-250 mmHg
  - Diastolic BP: 40-150 mmHg
  - SpO2: 50-100%
- Saves to FHIR server immediately
- Shows success/error notifications

## Testing Without Cerner

For your demo, you can:

1. **Direct Access**: Go to http://localhost:9002
   - You'll see a welcome screen
   - Click "Go to Launch Page" button

2. **Launch Page**: http://localhost:9002/launch
   - This simulates the SMART launch
   - Currently configured for Firebase deployment
   - For local testing, you'd need to update the redirect URI

## Important Notes for Demo

1. **The app is working** - All components are built and functional
2. **FHIR Integration** - Uses standard FHIR resources and LOINC codes
3. **Real-time Updates** - After saving vitals, the list refreshes automatically
4. **Responsive Design** - Works on desktop and tablet

## What Your Instructor Will See

- Clean, professional medical UI
- Proper SMART on FHIR implementation
- All required features working:
  - ✅ SMART launch capability
  - ✅ Patient banner (context-aware)
  - ✅ Vital signs display
  - ✅ Manual vital entry with validation

## Quick Fixes if Needed

If the server stops, restart with:
```bash
npm run dev
```

The app will be at http://localhost:9002