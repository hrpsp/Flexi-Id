"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, Download, RefreshCw, Printer } from "lucide-react";
import { Employee } from "@/types";

export default function GenerateCardPage() {
  const params = useParams();
  const router = useRouter();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetchEmployee();
  }, [params.id]);

  const fetchEmployee = async () => {
    try {
      const response = await fetch(`/api/employees/${params.id}`);
      const data = await response.json();
      if (data.success) {
        setEmployee(data.data);
      }
    } catch (error) {
      console.error("Error fetching employee:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const response = await fetch(`/api/cards/generate/${params.id}`, {
        method: "POST",
      });
      const data = await response.json();
      if (data.success) {
        setEmployee(data.data.employee);
      } else {
        alert(data.error || "Failed to generate card");
      }
    } catch (error) {
      console.error("Error generating card:", error);
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = async (type: "front" | "back") => {
    const path = type === "front" ? employee?.cardFrontPath : employee?.cardBackPath;
    if (!path) return;

    const link = document.createElement("a");
    link.href = path;
    link.download = `${employee?.employeeId}_${employee?.firstName}_${employee?.lastName}_${type}.png`;
    link.click();
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent"></div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-gray-500">Employee not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/dashboard/cards">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {employee.firstName} {employee.lastName}
            </h1>
            <p className="text-gray-500">Employee ID: {employee.employeeId}</p>
          </div>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
          <Button onClick={handleGenerate} disabled={generating}>
            <RefreshCw className={`mr-2 h-4 w-4 ${generating ? "animate-spin" : ""}`} />
            {generating ? "Generating..." : employee.cardGenerated ? "Regenerate" : "Generate Card"}
          </Button>
        </div>
      </div>

      {employee.cardGenerated && employee.cardFrontPath ? (
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Front Side</CardTitle>
                  <CardDescription>Employee ID card front</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => handleDownload("front")}>
                  <Download className="mr-2 h-4 w-4" />
                  Download PNG
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex justify-center rounded-lg bg-gray-100 p-4">
                <img
                  src={employee.cardFrontPath}
                  alt="Front of card"
                  className="max-h-[500px] rounded-lg shadow-lg"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Back Side</CardTitle>
                  <CardDescription>Employee ID card back</CardDescription>
                </div>
                {employee.cardBackPath && (
                  <Button variant="outline" size="sm" onClick={() => handleDownload("back")}>
                    <Download className="mr-2 h-4 w-4" />
                    Download PNG
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {employee.cardBackPath ? (
                <div className="flex justify-center rounded-lg bg-gray-100 p-4">
                  <img
                    src={employee.cardBackPath}
                    alt="Back of card"
                    className="max-h-[500px] rounded-lg shadow-lg"
                  />
                </div>
              ) : (
                <div className="flex h-64 items-center justify-center text-gray-500">
                  Back side not generated
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="text-center">
              <h3 className="text-lg font-semibold">No Card Generated</h3>
              <p className="mt-1 text-gray-500">
                Click the Generate Card button to create the ID card for this employee
              </p>
              <Button onClick={handleGenerate} disabled={generating} className="mt-4">
                <RefreshCw className={`mr-2 h-4 w-4 ${generating ? "animate-spin" : ""}`} />
                {generating ? "Generating..." : "Generate Card"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Employee Details */}
      <Card>
        <CardHeader>
          <CardTitle>Employee Details</CardTitle>
          <CardDescription>Information displayed on the card</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <p className="text-sm text-gray-500">Name</p>
              <p className="font-medium">{employee.firstName} {employee.lastName}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Designation</p>
              <p className="font-medium">{employee.designation}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Department</p>
              <p className="font-medium">{employee.department}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Employee ID</p>
              <p className="font-medium">{employee.employeeId}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Contact</p>
              <p className="font-medium">{employee.contactNumber}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">City</p>
              <p className="font-medium">{employee.city}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Blood Group</p>
              <p className="font-medium">{employee.bloodGroup}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">CNIC</p>
              <p className="font-medium">{employee.cnic}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Emergency Contact</p>
              <p className="font-medium">{employee.emergencyContact}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
