"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { HeartPulse, PlusCircle, Gauge } from "lucide-react";
import { Separator } from "./ui/separator";

const vitalsSchema = z.object({
  systolic: z.string().optional(),
  diastolic: z.string().optional(),
  spO2: z.string().optional(),
})
.transform(data => ({
  systolic: data.systolic && data.systolic !== '' ? Number(data.systolic) : undefined,
  diastolic: data.diastolic && data.diastolic !== '' ? Number(data.diastolic) : undefined,
  spO2: data.spO2 && data.spO2 !== '' ? Number(data.spO2) : undefined,
}))
.refine(data => (data.systolic && data.diastolic) || data.spO2, {
  message: "Enter at least blood pressure or SpO2.",
  path: ["systolic"], 
})
.refine(data => !((data.systolic && !data.diastolic) || (!data.systolic && data.diastolic)), {
  message: "Both systolic and diastolic are required for blood pressure.",
  path: ["diastolic"],
})
.refine(data => !data.systolic || (data.systolic >= 50 && data.systolic <= 300), { message: "Must be 50-300.", path: ["systolic"] })
.refine(data => !data.diastolic || (data.diastolic >= 30 && data.diastolic <= 200), { message: "Must be 30-200.", path: ["diastolic"] })
.refine(data => !data.spO2 || (data.spO2 >= 70 && data.spO2 <= 100), { message: "Must be 70-100.", path: ["spO2"] });


type VitalsFormValues = z.infer<typeof vitalsSchema>;

interface VitalsFormProps {
  onSubmit: (data: VitalsFormValues) => Promise<void>;
  isSubmitting: boolean;
}

export function VitalsForm({ onSubmit, isSubmitting }: VitalsFormProps) {
  const form = useForm<z.infer<typeof vitalsSchema>>({
    resolver: zodResolver(vitalsSchema),
    defaultValues: {
      systolic: '',
      diastolic: '',
      spO2: '',
    },
  });

  const handleSubmit = async (values: VitalsFormValues) => {
    await onSubmit(values);
    form.reset();
  };

  return (
    <Card className="mb-6 shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <PlusCircle className="h-6 w-6 text-primary" />
          <span>Enter New Vital Signs</span>
        </CardTitle>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)}>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <h3 className="flex items-center gap-2 font-semibold text-lg"><HeartPulse className="text-destructive h-5 w-5"/>Blood Pressure</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="systolic"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Systolic (mmHg)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="120" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="diastolic"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Diastolic (mmHg)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="80" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
            <Separator />
            <div className="space-y-4">
              <h3 className="flex items-center gap-2 font-semibold text-lg"><Gauge className="text-primary h-5 w-5"/>Oxygen Saturation</h3>
              <FormField
                control={form.control}
                name="spO2"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>SpO2 (%)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="98" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            {form.formState.errors.root && (
              <p className="text-sm font-medium text-destructive">{form.formState.errors.root.message}</p>
            )}
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isSubmitting} size="lg">
              {isSubmitting ? "Saving..." : "Save Vitals"}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
