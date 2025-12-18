import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateAndSaveCards } from "@/lib/card-generator";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const employee = await prisma.employee.findUnique({
      where: { id: params.id },
    });

    if (!employee) {
      return NextResponse.json(
        { success: false, error: "Employee not found" },
        { status: 404 }
      );
    }

    // Get active templates
    const [frontTemplate, backTemplate] = await Promise.all([
      prisma.template.findFirst({ where: { type: "front", isActive: true } }),
      prisma.template.findFirst({ where: { type: "back", isActive: true } }),
    ]);

    // Generate cards
    const { frontPath, backPath } = await generateAndSaveCards(
      employee,
      frontTemplate,
      backTemplate
    );

    // Update employee record
    const updatedEmployee = await prisma.employee.update({
      where: { id: params.id },
      data: {
        cardGenerated: true,
        cardFrontPath: frontPath,
        cardBackPath: backPath,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        employee: updatedEmployee,
        frontPath,
        backPath,
      },
    });
  } catch (error) {
    console.error("Error generating card:", error);
    return NextResponse.json(
      { success: false, error: "Failed to generate card" },
      { status: 500 }
    );
  }
}
