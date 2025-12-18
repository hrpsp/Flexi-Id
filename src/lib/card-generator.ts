import { createCanvas, loadImage, registerFont } from "canvas";
import * as QRCode from "qrcode";
import path from "path";
import fs from "fs/promises";
import { Employee, Template } from "@prisma/client";
import { formatDate } from "./utils";

// Default field configurations for card templates
const DEFAULT_FRONT_CONFIG = {
  photo: { x: 50, y: 120, width: 180, height: 220 },
  firstName: { x: 270, y: 180, fontSize: 32, color: "#FFFFFF", fontWeight: "bold" },
  lastName: { x: 270, y: 220, fontSize: 32, color: "#FFFFFF", fontWeight: "bold" },
  designation: { x: 270, y: 270, fontSize: 14, color: "#FFFFFF", letterSpacing: 4 },
  employeeId: { x: 270, y: 320, fontSize: 16, color: "#FFFFFF", label: "EMPLOYEE ID:" },
  department: { x: 270, y: 350, fontSize: 16, color: "#FFFFFF", label: "DEPARTMENT:" },
  contact: { x: 270, y: 380, fontSize: 16, color: "#FFFFFF", label: "CONTACT:" },
};

const DEFAULT_BACK_CONFIG = {
  employeeId: { x: 280, y: 95, fontSize: 14, color: "#333333" },
  department: { x: 280, y: 125, fontSize: 14, color: "#333333" },
  city: { x: 280, y: 155, fontSize: 14, color: "#333333" },
  dateOfJoining: { x: 280, y: 185, fontSize: 14, color: "#333333" },
  dateOfBirth: { x: 280, y: 215, fontSize: 14, color: "#333333" },
  mobile: { x: 280, y: 245, fontSize: 14, color: "#333333" },
  cnic: { x: 280, y: 275, fontSize: 14, color: "#333333" },
  bloodGroup: { x: 280, y: 305, fontSize: 14, color: "#333333" },
  emergency: { x: 280, y: 335, fontSize: 14, color: "#333333" },
  qrCode: { x: 50, y: 100, size: 150 },
};

interface FieldConfig {
  x: number;
  y: number;
  fontSize?: number;
  color?: string;
  fontWeight?: string;
  letterSpacing?: number;
  label?: string;
  width?: number;
  height?: number;
  size?: number;
}

export async function generateFrontCard(
  employee: Employee,
  template: Template | null
): Promise<Buffer> {
  const width = 638;
  const height = 1011;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  // Load and draw template background
  if (template?.imagePath) {
    try {
      const templatePath = path.join(process.cwd(), "public", template.imagePath);
      const templateImage = await loadImage(templatePath);
      ctx.drawImage(templateImage, 0, 0, width, height);
    } catch (error) {
      console.error("Error loading template:", error);
      // Draw fallback background
      ctx.fillStyle = "#1e3a5f";
      ctx.fillRect(0, 0, width, height);
    }
  } else {
    // Draw default background
    ctx.fillStyle = "#1e3a5f";
    ctx.fillRect(0, 0, width, height);
  }

  const config = template?.fieldConfig
    ? { ...DEFAULT_FRONT_CONFIG, ...JSON.parse(template.fieldConfig) }
    : DEFAULT_FRONT_CONFIG;

  // Draw employee photo
  if (employee.photoPath) {
    try {
      const photoPath = path.join(process.cwd(), "public", employee.photoPath);
      const photo = await loadImage(photoPath);
      const photoConfig = config.photo as FieldConfig;

      // Draw photo with rounded corners effect
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(photoConfig.x, photoConfig.y, photoConfig.width!, photoConfig.height!, 10);
      ctx.clip();
      ctx.drawImage(photo, photoConfig.x, photoConfig.y, photoConfig.width!, photoConfig.height!);
      ctx.restore();
    } catch (error) {
      console.error("Error loading photo:", error);
    }
  }

  // Draw text fields
  const firstNameConfig = config.firstName as FieldConfig;
  ctx.fillStyle = firstNameConfig.color || "#FFFFFF";
  ctx.font = `bold ${firstNameConfig.fontSize}px Arial`;
  ctx.fillText(employee.firstName.toUpperCase(), firstNameConfig.x, firstNameConfig.y);

  const lastNameConfig = config.lastName as FieldConfig;
  ctx.fillStyle = lastNameConfig.color || "#FFFFFF";
  ctx.font = `bold ${lastNameConfig.fontSize}px Arial`;
  ctx.fillText(employee.lastName.toUpperCase(), lastNameConfig.x, lastNameConfig.y);

  // Draw designation with letter spacing
  const designationConfig = config.designation as FieldConfig;
  ctx.fillStyle = designationConfig.color || "#FFFFFF";
  ctx.font = `${designationConfig.fontSize}px Arial`;
  const spacedDesignation = employee.designation.toUpperCase().split("").join(" ");
  ctx.fillText(spacedDesignation, designationConfig.x, designationConfig.y);

  // Draw info fields
  const employeeIdConfig = config.employeeId as FieldConfig;
  ctx.fillStyle = employeeIdConfig.color || "#FFFFFF";
  ctx.font = `${employeeIdConfig.fontSize}px Arial`;
  ctx.fillText(`EMPLOYEE ID: ${employee.employeeId}`, employeeIdConfig.x, employeeIdConfig.y);

  const departmentConfig = config.department as FieldConfig;
  ctx.fillStyle = departmentConfig.color || "#FFFFFF";
  ctx.font = `${departmentConfig.fontSize}px Arial`;
  ctx.fillText(`DEPARTMENT: ${employee.department}`, departmentConfig.x, departmentConfig.y);

  const contactConfig = config.contact as FieldConfig;
  ctx.fillStyle = contactConfig.color || "#FFFFFF";
  ctx.font = `${contactConfig.fontSize}px Arial`;
  ctx.fillText(`CONTACT: ${employee.contactNumber}`, contactConfig.x, contactConfig.y);

  return canvas.toBuffer("image/png");
}

export async function generateBackCard(
  employee: Employee,
  template: Template | null,
  qrCodeUrl: string = "https://hrpsp.net"
): Promise<Buffer> {
  const width = 638;
  const height = 1011;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  // Load and draw template background
  if (template?.imagePath) {
    try {
      const templatePath = path.join(process.cwd(), "public", template.imagePath);
      const templateImage = await loadImage(templatePath);
      ctx.drawImage(templateImage, 0, 0, width, height);
    } catch (error) {
      console.error("Error loading template:", error);
      ctx.fillStyle = "#f5f5f5";
      ctx.fillRect(0, 0, width, height);
    }
  } else {
    ctx.fillStyle = "#f5f5f5";
    ctx.fillRect(0, 0, width, height);
  }

  const config = template?.fieldConfig
    ? { ...DEFAULT_BACK_CONFIG, ...JSON.parse(template.fieldConfig) }
    : DEFAULT_BACK_CONFIG;

  // Generate and draw QR code
  try {
    const qrConfig = config.qrCode as FieldConfig;
    const qrDataUrl = await QRCode.toDataURL(qrCodeUrl, {
      width: qrConfig.size || 150,
      margin: 1,
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
    });
    const qrImage = await loadImage(qrDataUrl);
    ctx.drawImage(qrImage, qrConfig.x, qrConfig.y, qrConfig.size || 150, qrConfig.size || 150);
  } catch (error) {
    console.error("Error generating QR code:", error);
  }

  // Draw employee information
  const fields = [
    { key: "employeeId", value: employee.employeeId },
    { key: "department", value: employee.department },
    { key: "city", value: employee.city },
    { key: "dateOfJoining", value: formatDate(employee.dateOfJoining) },
    { key: "dateOfBirth", value: formatDate(employee.dateOfBirth) },
    { key: "mobile", value: employee.mobileNumber },
    { key: "cnic", value: employee.cnic },
    { key: "bloodGroup", value: employee.bloodGroup },
    { key: "emergency", value: employee.emergencyContact },
  ];

  for (const field of fields) {
    const fieldConfig = config[field.key as keyof typeof config] as FieldConfig;
    if (fieldConfig) {
      ctx.fillStyle = fieldConfig.color || "#333333";
      ctx.font = `${fieldConfig.fontSize || 14}px Arial`;
      ctx.fillText(field.value, fieldConfig.x, fieldConfig.y);
    }
  }

  return canvas.toBuffer("image/png");
}

export async function generateAndSaveCards(
  employee: Employee,
  frontTemplate: Template | null,
  backTemplate: Template | null
): Promise<{ frontPath: string; backPath: string }> {
  const generatedDir = path.join(process.cwd(), "public", "generated");
  await fs.mkdir(generatedDir, { recursive: true });

  const frontBuffer = await generateFrontCard(employee, frontTemplate);
  const backBuffer = await generateBackCard(employee, backTemplate);

  const frontFilename = `${employee.employeeId}_front.png`;
  const backFilename = `${employee.employeeId}_back.png`;

  const frontPath = path.join(generatedDir, frontFilename);
  const backPath = path.join(generatedDir, backFilename);

  await fs.writeFile(frontPath, frontBuffer);
  await fs.writeFile(backPath, backBuffer);

  return {
    frontPath: `/generated/${frontFilename}`,
    backPath: `/generated/${backFilename}`,
  };
}
