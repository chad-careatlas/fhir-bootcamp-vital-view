"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import FHIR from "fhirclient";
import type { Client } from "fhirclient/lib/types";
import { getPatient, getVitals, createVitals } from "@/lib/fhir";
import type { Patient, Observation } from "@/lib/types";
import { PatientBanner } from "@/components/PatientBanner";
import { VitalsDisplay } from "@/components/VitalsDisplay";
import { VitalsForm } from "@/components/VitalsForm";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Terminal, Power } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

function AppContent() {
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
    const initializeClient = async () => {
      try {
        const fhirClient = await FHIR.oauth2.ready();
        setClient(fhirClient);
        await loadData(fhirClient);
      } catch (err) {
        console.error(err);
        setError("Failed to authorize with FHIR server. Please launch the application from your EHR system.");
        setLoading(false);
      }
    };
    initializeClient();
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
           <div className="mt-6 text-center">
              <Link href="/launch">
                <Button>
                  <Power className="mr-2 h-4 w-4" /> Go to Launch Page
                </Button>
              </Link>
            </div>
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

function Welcome() {
  return (
    <div className="container mx-auto flex h-screen items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-lg text-center">
         <header className="mb-8">
          <h1 className="text-4xl font-bold text-primary font-headline">VitalView</h1>
         </header>
         <Alert>
          <Terminal className="h-4 w-4" />
          <AlertTitle>Welcome!</AlertTitle>
          <AlertDescription>
            This is a SMART on FHIR application. Please launch it from your EHR.
          </AlertDescription>
         </Alert>
         <div className="mt-6">
          <Link href="/launch">
            <Button>
              <Power className="mr-2 h-4 w-4" /> Go to Launch Page
            </Button>
          </Link>
         </div>
      </div>
    </div>
  );
}


function LaunchHandler() {
  const searchParams = useSearchParams();
  const iss = searchParams.get('iss');
  const launch = searchParams.get('launch');

  useEffect(() => {
    if (!iss || !launch) {
      console.error('Missing required launch parameters');
      return;
    }

    // Using localhost with trailing slash as registered in Cerner
    const redirectUri = "http://localhost:9002/";
    
    FHIR.oauth2.authorize({
      clientId: "21c14f4e-ec5c-4295-ac1c-50ee0e99eee2",
      scope: "launch patient/Observation.read patient/Observation.write patient/Patient.read openid fhirUser",
      redirectUri: redirectUri,
      iss: iss,
      launch: launch,
    });
  }, [iss, launch]);

  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4 text-center p-4">
        <h1 className="text-2xl font-bold text-primary font-headline">Launching VitalView...</h1>
        <p className="text-muted-foreground">Please wait while we securely connect to your EHR.</p>
        <div className="w-full max-w-md space-y-4 p-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-20 w-full" />
          <p className="text-sm text-muted-foreground">You will be redirected momentarily.</p>
        </div>
      </div>
    </div>
  );
}

function AuthChecker() {
  const searchParams = useSearchParams();
  const hasAuthParams = searchParams.has('code') && searchParams.has('state');
  const hasLaunchParams = searchParams.has('iss') && searchParams.has('launch');
  const hasError = searchParams.has('error');

  // Handle OAuth errors
  if (hasError) {
    const error = searchParams.get('error');
    const errorUri = searchParams.get('error_uri');
    return (
      <div className="container mx-auto flex h-screen items-center justify-center p-4 md:p-8">
        <div className="w-full max-w-lg">
          <header className="mb-8 text-center">
            <h1 className="text-4xl font-bold text-primary font-headline">VitalView</h1>
          </header>
          <Alert variant="destructive">
            <Terminal className="h-4 w-4" />
            <AlertTitle>Authorization Error</AlertTitle>
            <AlertDescription>
              {error === 'invalid_request' ? 'The authorization request was invalid. Please try launching again from your EHR.' : `Error: ${error}`}
              {errorUri && (
                <div className="mt-2">
                  <a href={errorUri} target="_blank" rel="noopener noreferrer" className="text-sm underline">
                    View error details
                  </a>
                </div>
              )}
            </AlertDescription>
          </Alert>
          <div className="mt-6 text-center">
            <Link href="/">
              <Button>
                <Power className="mr-2 h-4 w-4" /> Return to Home
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Handle SMART launch
  if (hasLaunchParams) {
    return <LaunchHandler />;
  }

  // Handle OAuth callback
  if (hasAuthParams) {
    return <AppContent />;
  }

  return <Welcome />;
}

export default function Home() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AuthChecker />
    </Suspense>
  );
}
