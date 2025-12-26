import { NextResponse } from "next/server";
import { getAllPosts } from "@/lib/posts";

export async function GET() {
  const posts = getAllPosts();
  return NextResponse.json({ posts });
}
