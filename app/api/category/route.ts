// src/app/api/category/route.ts
import { NextResponse } from "next/server";
import { connectDB } from "@libs/mongodb";
// ⬇️ alias 대신 상대 경로 사용 (현재 위치 기준으로 models/Category.ts 로 올라가기)
import Category from "../../../../models/Category";

export async function GET() {
  try {
    await connectDB();
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
