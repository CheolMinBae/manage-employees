import { NextResponse } from "next/server";
import dbConnect from "@libs/db";
import Category from "@models/Category";

export async function GET() {
  try {
    await dbConnect();
    const categories = await Category.find().lean();
    return NextResponse.json(categories);
  } catch (error) {
    console.error("Failed to fetch categories:", error);
    return NextResponse.json(
      { error: "Failed to fetch categories" },
      { status: 500 }
    );
  }
}
