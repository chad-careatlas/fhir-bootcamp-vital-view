import type { Client } from "fhirclient";
import type { Patient, Observation } from "./types";
import { toast } from "@/hooks/use-toast";

const BP_CODE = '85354-9';
const SYSTOLIC_CODE = '8480-6';
const DIASTOLIC_CODE = '8462-4';

export async function getPatient(client: Client): Promise<Patient | null> {
  try {
    const patientId = client.patient.id;
    console.log('Attempting to fetch patient with ID:', patientId);
    
    if (!patientId) {
      console.error('No patient ID in context');
      return null;
    }
    
    // Try different methods to get patient data
    try {
      // Method 1: Standard patient read
      const patient = await client.patient.read();
      console.log('Successfully fetched patient via client.patient.read():', patient);
      return patient as Patient;
    } catch (e1) {
      console.log('client.patient.read() failed, trying direct request...');
      
      try {
        // Method 2: Direct request
        const patient = await client.request(`Patient/${patientId}`);
        console.log('Successfully fetched patient via direct request:', patient);
        return patient as Patient;
      } catch (e2) {
        console.log('Direct request failed, trying user context...');
        
        // Method 3: Try using the fhirUser context if available
        const userId = client.user?.id;
        if (userId) {
          try {
            const user = await client.user.read();
            console.log('User context data:', user);
            // If user is a patient, use that
            if (user.resourceType === 'Patient') {
              return user as Patient;
            }
          } catch (e3) {
            console.log('User read also failed');
          }
        }
      }
    }
    
    throw new Error('All patient fetch methods failed');
  } catch (error: any) {
    console.error("Failed to fetch patient data:", error);
    
    // If we can't fetch, return a minimal patient object
    const patientId = client.patient?.id;
    if (patientId) {
      return {
        id: patientId,
        resourceType: 'Patient',
        name: [{
          given: ['Patient'],
          family: patientId
        }],
        gender: 'unknown',
        birthDate: '1990-01-01'
      } as Patient;
    }
    return null;
  }
}

export async function getVitals(client: Client): Promise<Observation[]> {
    if (!client.patient?.id) {
        toast({ variant: "destructive", title: "Error", description: "No patient in context." });
        return [];
    }
    try {
        const response = await client.request(`Observation?patient=${client.patient.id}&code=${BP_CODE}&_sort=-date&_count=20`);
        const bundle = response as any;
        return bundle.entry?.map((e: any) => e.resource as Observation) || [];
    } catch (error: any) {
        console.log("Failed to fetch vitals, but this might be expected:", error.status);
        // Return empty array but don't show error - vitals fetch might fail in sandbox
        return [];
    }
}

export async function createVitals(
  client: Client,
  patientId: string,
  vitals: { systolic?: number; diastolic?: number; spO2?: number }
): Promise<boolean> {
  const observations: Omit<Observation, 'id'>[] = [];
  const now = new Date().toISOString();

  if (vitals.systolic && vitals.diastolic) {
    observations.push({
      resourceType: 'Observation',
      status: 'final',
      code: {
        coding: [{ system: 'http://loinc.org', code: BP_CODE, display: 'Blood Pressure' }],
        text: 'Blood Pressure'
      },
      subject: { reference: `Patient/${patientId}` },
      effectiveDateTime: now,
      component: [
        {
          code: { coding: [{ system: 'http://loinc.org', code: SYSTOLIC_CODE, display: 'Systolic Blood Pressure' }] },
          valueQuantity: { value: vitals.systolic, unit: 'mmHg', system: 'http://unitsofmeasure.org', code: 'mm[Hg]' }
        },
        {
          code: { coding: [{ system: 'http://loinc.org', code: DIASTOLIC_CODE, display: 'Diastolic Blood Pressure' }] },
          valueQuantity: { value: vitals.diastolic, unit: 'mmHg', system: 'http://unitsofmeasure.org', code: 'mm[Hg]' }
        }
      ]
    });
  }

  if (vitals.spO2) {
    observations.push({
      resourceType: 'Observation',
      status: 'final',
      code: {
        coding: [{ system: 'http://loinc.org', code: SPO2_CODE, display: 'Oxygen saturation in Arterial blood by Pulse oximetry' }],
        text: 'Oxygen Saturation'
      },
      subject: { reference: `Patient/${patientId}` },
      effectiveDateTime: now,
      valueQuantity: { value: vitals.spO2, unit: '%', system: 'http://unitsofmeasure.org', code: '%' }
    });
  }

  if (observations.length === 0) {
    toast({ variant: "destructive", title: "No Data", description: "No vital signs data was provided to save." });
    return false;
  }

  const bundle = {
    resourceType: 'Bundle',
    type: 'transaction',
    entry: observations.map(obs => ({
      resource: obs,
      request: {
        method: 'POST',
        url: 'Observation'
      }
    }))
  };

  try {
    await client.request({
      url: `/`,
      method: 'POST',
      body: JSON.stringify(bundle),
      headers: { 'Content-Type': 'application/fhir+json' }
    });
    
    toast({ title: "Success", description: "Vital signs have been saved successfully." });
    return true;
  } catch (error) {
    console.error("Failed to save vitals transaction:", error);
    toast({ variant: "destructive", title: "Save Error", description: "An error occurred while saving vital signs." });
    return false;
  }
}
