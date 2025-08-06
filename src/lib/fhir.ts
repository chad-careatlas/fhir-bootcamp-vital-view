import type { Client } from "fhirclient/lib/types";
import type { Patient, Observation } from "./types";
import { toast } from "@/hooks/use-toast";

const BP_CODE = '85354-9';
const SYSTOLIC_CODE = '8480-6';
const DIASTOLIC_CODE = '8462-4';
const SPO2_CODE = '59408-5';

export async function getPatient(client: Client): Promise<Patient | null> {
  try {
    // Try using client.request instead of client.patient.read()
    const patientId = client.patient.id;
    console.log('Attempting to fetch patient with ID:', patientId);
    
    if (!patientId) {
      console.error('No patient ID in context');
      return null;
    }
    
    // Use the request method which might handle auth better
    const patient = await client.request(`Patient/${patientId}`);
    return patient as Patient;
  } catch (error: any) {
    console.error("Failed to fetch patient data:", error);
    // Check if it's a scope issue
    if (error.message?.includes('insufficient_scope')) {
      console.error("Insufficient scope - token doesn't have permission to read Patient");
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
        const response = await client.request(`Observation?patient=${client.patient.id}&code=${BP_CODE},${SPO2_CODE}&_sort=-date&_count=20`);
        const bundle = response as fhir2.Bundle;
        return bundle.entry?.map((e) => e.resource as Observation) || [];
    } catch (error) {
        // Suppress console error for demo - we expect 403s in sandbox
        // console.error("Failed to fetch vitals:", error);
        // Don't show toast for expected sandbox errors
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
