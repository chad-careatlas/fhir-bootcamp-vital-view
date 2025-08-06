# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

VitalView is a SMART on FHIR application built with Next.js 15 that integrates with Cerner EHR systems. It allows healthcare providers to view and record patient vital signs (blood pressure and oxygen saturation) via FHIR API integration.

## Key Technologies

- **Framework**: Next.js 15.3.3 with React 18
- **Language**: TypeScript
- **Styling**: Tailwind CSS with shadcn/ui components
- **FHIR Integration**: fhirclient library for SMART launch and FHIR API access
- **Forms**: React Hook Form with Zod validation
- **AI Integration**: Google Genkit for AI features
- **Deployment**: Firebase App Hosting

## Development Commands

```bash
# Start development server on port 9002
npm run dev

# Run linting
npm run lint

# Type checking
npm run typecheck

# Build for production
npm run build

# Start production server
npm start

# AI Development (Genkit)
npm run genkit:dev   # Start Genkit server
npm run genkit:watch # Start with file watching
```

## Project Structure

- `/src/app/` - Next.js app router pages
  - `page.tsx` - Main page with SMART launch handling
  - `launch/page.tsx` - SMART launch endpoint
  - `redirect/page.tsx` - OAuth redirect handler
- `/src/components/` - React components
  - `PatientBanner.tsx` - Displays patient demographics
  - `VitalsDisplay.tsx` - Shows vital signs history
  - `VitalsForm.tsx` - Form for entering new vitals
  - `ui/` - shadcn/ui components library
- `/src/lib/` - Core utilities
  - `fhir.ts` - FHIR API client functions
  - `types.ts` - TypeScript type definitions
  - `firebase.ts` - Firebase configuration
- `/src/ai/` - AI/Genkit integration

## Key Features

1. **SMART Launch**: Integrates with Cerner EHR for automatic patient context
2. **Vital Signs Display**: Shows blood pressure (systolic/diastolic) and SpO2 values
3. **Data Entry**: Forms with validation for entering new vital signs
4. **FHIR Integration**: Creates and fetches Observation resources

## FHIR Integration Details

- Uses LOINC codes for observations:
  - Blood Pressure: `85354-9`
  - Systolic BP: `8480-6`
  - Diastolic BP: `8462-4`
  - SpO2: `59408-5`
- Implements SMART on FHIR launch flow
- Creates FHIR Bundle transactions for saving multiple observations

## Important Patterns

- All FHIR operations are centralized in `src/lib/fhir.ts`
- Toast notifications for user feedback on API operations
- Component-based architecture with shadcn/ui for consistent UI
- Form validation using React Hook Form + Zod schemas
- TypeScript strict mode enabled for type safety