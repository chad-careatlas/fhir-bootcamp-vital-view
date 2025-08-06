import type { Patient } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User } from "lucide-react";
import { format } from "date-fns";

interface PatientBannerProps {
  patient: Patient | null;
}

export function PatientBanner({ patient }: PatientBannerProps) {
  if (!patient) {
    return null;
  }

  // Handle FHIR Patient resource structure
  const name = patient.name?.[0];
  const patientName = name ? `${name.given?.join(" ")} ${name.family}` : "Unknown Patient";
  const birthDate = patient.birthDate ? format(new Date(patient.birthDate), "MM/dd/yyyy") : "N/A";

  return (
    <Card className="mb-6 shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <User className="h-6 w-6 text-primary" />
          <span>Patient Information</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <p className="text-sm font-semibold text-muted-foreground">Name</p>
            <p className="text-lg">{patientName}</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-muted-foreground">Date of Birth</p>
            <p className="text-lg">{birthDate}</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-muted-foreground">Gender</p>
            <p className="text-lg capitalize">{patient.gender || "N/A"}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
