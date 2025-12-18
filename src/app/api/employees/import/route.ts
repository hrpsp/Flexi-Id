import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import Papa from "papaparse";
import { CSVEmployee } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file provided" },
        { status: 400 }
      );
    }

    const text = await file.text();
    const parsed = Papa.parse<CSVEmployee>(text, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(),
    });

    if (parsed.errors.length > 0) {
      return NextResponse.json(
        { success: false, error: "Invalid CSV format", details: parsed.errors },
        { status: 400 }
      );
    }

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const row of parsed.data) {
      try {
        // Validate required fields
        if (!row.firstName || !row.lastName || !row.designation) {
          results.failed++;
          results.errors.push(`Row missing required fields: ${row.employeeId || "unknown"}`);
          continue;
        }

        // Generate employee ID if not provided
        const employeeId = row.employeeId || String(Date.now()).slice(-7);

        // Check if employee ID already exists
        const existing = await prisma.employee.findUnique({
          where: { employeeId },
        });

        if (existing) {
          results.failed++;
          results.errors.push(`Employee ID ${employeeId} already exists`);
          continue;
        }

        await prisma.employee.create({
          data: {
            employeeId,
            firstName: row.firstName.trim(),
            lastName: row.lastName.trim(),
            designation: row.designation.trim(),
            department: row.department?.trim() || "General",
            city: row.city?.trim() || "",
            contactNumber: row.contactNumber?.trim() || "",
            mobileNumber: row.mobileNumber?.trim() || "",
            cnic: row.cnic?.trim() || "",
            bloodGroup: row.bloodGroup?.trim() || "",
            emergencyContact: row.emergencyContact?.trim() || "",
            dateOfBirth: row.dateOfBirth ? new Date(row.dateOfBirth) : new Date(),
            dateOfJoining: row.dateOfJoining ? new Date(row.dateOfJoining) : new Date(),
          },
        });

        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push(`Failed to import: ${row.employeeId || row.firstName}`);
      }
    }

    return NextResponse.json({ success: true, data: results });
  } catch (error) {
    console.error("Error importing employees:", error);
    return NextResponse.json(
      { success: false, error: "Failed to import employees" },
      { status: 500 }
    );
  }
}
