"use client";

import { useEffect, useState, useCallback } from "react";
import FHIR from "fhirclient";
import type { Client } from "fhirclient/lib/types";
import { getPatient, getVitals, createVitals } from "@/lib/fhir";
import type { Patient, Observation } from "@/lib/types";
import { PatientBanner } from "@/components/PatientBanner";
import { VitalsDisplay } from "@/components/VitalsDisplay";
import { VitalsForm } from "@/components/VitalsForm";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Home() {
  const [client, setClient] = useState<Client | null>(null);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [observations, setObservations] = useState<Observation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const loadData = useCallback(async (fhirClient: Client) => {
    setLoading(true);
    setError(null);
    try {
      const patientData = await getPatient(fhirClient);
      setPatient(patientData);
      if (patientData) {
        const vitalsData = await getVitals(fhirClient);
        setObservations(vitalsData);
      }
    } catch (e: any) {
      setError("Failed to load patient data or vitals.");
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    FHIR.oauth2.ready()
      .then(client => {
        setClient(client);
        loadData(client);
      })
      .catch(err => {
        console.error(err);
        setError("Failed to authorize with FHIR server. Please launch the application from your EHR system.");
        setLoading(false);
      });
  }, [loadData]);

  const handleVitalsSubmit = async (data: { systolic?: number; diastolic?: number; spO2?: number }) => {
    if (!client || !patient?.id) {
      toast({ variant: "destructive", title: "Error", description: "Application is not properly initialized." });
      return;
    }
    setIsSubmitting(true);
    const success = await createVitals(client, patient.id, data);
    if (success) {
      const vitalsData = await getVitals(client);
      setObservations(vitalsData);
    }
    setIsSubmitting(false);
  };
  
  const showPatientBanner = client?.state.context?.hide_patient_banner === false;

  if (loading) {
    return (
      <div className="container mx-auto p-4 md:p-8">
        <header className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-primary font-headline">VitalView</h1>
          <p className="text-muted-foreground">Loading patient data...</p>
        </header>
        <div className="space-y-6">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto flex h-screen items-center justify-center p-4 md:p-8">
        <div className="w-full max-w-lg">
          <header className="mb-8 text-center">
            <h1 className="text-4xl font-bold text-primary font-headline">VitalView</h1>
          </header>
          <Alert variant="destructive">
            <Terminal className="h-4 w-4" />
            <AlertTitle>Application Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-8">
      <header className="mb-8 text-center">
        <h1 className="text-4xl font-bold text-primary font-headline">VitalView</h1>
        <p className="text-muted-foreground">Review and enter vital signs for your patient.</p>
      </header>
      
      <main className="max-w-4xl mx-auto">
        {showPatientBanner && <PatientBanner patient={patient} />}
        <VitalsForm onSubmit={handleVitalsSubmit} isSubmitting={isSubmitting} />
        <VitalsDisplay observations={observations} />
      </main>
    </div>
  );
}
