import type { Observation } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { HeartPulse, Gauge, List } from "lucide-react";
import { format } from 'date-fns';

interface VitalsDisplayProps {
  observations: Observation[];
}

interface VitalSign {
  type: string;
  value: string;
  unit: string;
  date: string;
  icon: React.ReactNode;
}

export function VitalsDisplay({ observations }: VitalsDisplayProps) {
  const parsedVitals = observations.flatMap((obs): VitalSign[] => {
    if (!obs.effectiveDateTime) return [];
    const date = format(new Date(obs.effectiveDateTime), "MM/dd/yyyy, h:mm a");
    
    if (obs.code.coding?.some(c => c.code === '85354-9')) {
      const systolic = obs.component?.find(c => c.code.coding?.some(co => co.code === '8480-6'))?.valueQuantity;
      const diastolic = obs.component?.find(c => c.code.coding?.some(co => co.code === '8462-4'))?.valueQuantity;
      if (systolic && diastolic) {
        return [{
          type: "Blood Pressure",
          value: `${systolic.value}/${diastolic.value}`,
          unit: systolic.unit,
          date,
          icon: <HeartPulse className="h-5 w-5 text-destructive" />
        }];
      }
    }

    if (obs.code.coding?.some(c => c.code === '59408-5')) {
      if (obs.valueQuantity) {
        return [{
          type: 'Oxygen Saturation',
          value: String(obs.valueQuantity.value),
          unit: obs.valueQuantity.unit,
          date,
          icon: <Gauge className="h-5 w-5 text-primary" />
        }];
      }
    }
    
    return [];
  });

  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <List className="h-6 w-6 text-primary" />
          <span>Recent Vital Signs</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="w-full overflow-x-auto">
          {parsedVitals.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Vital Sign</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead className="text-right">Date / Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parsedVitals.map((vital, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium flex items-center gap-2">{vital.icon} {vital.type}</TableCell>
                    <TableCell>{vital.value} {vital.unit}</TableCell>
                    <TableCell className="text-right">{vital.date}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground text-center py-8">No recent vital signs found for this patient.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
