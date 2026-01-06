import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { getMainPageContent, updateMainPageContent, type MainPageContent } from "@/lib/main-page";

export async function GET() {
  const content = getMainPageContent();
  return NextResponse.json(content);
}

export async function PUT(req: NextRequest) {
  // Check authentication
  if (!(await isAuthenticated())) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    
    // Validate the content structure
    const content: MainPageContent = {
      greeting: body.greeting || "",
      bio: body.bio || "",
      links: {
        x: {
          text: body.links?.x?.text || "",
          url: body.links?.x?.url || "",
        },
        github: {
          text: body.links?.github?.text || "",
          url: body.links?.github?.url || "",
        },
        email: {
          text: body.links?.email?.text || "",
          url: body.links?.email?.url || "",
        },
      },
      bioAfterLinks: body.bioAfterLinks || "",
    };

    // Basic validation
    if (!content.greeting.trim()) {
      return NextResponse.json(
        { error: "Greeting is required" },
        { status: 400 }
      );
    }

    updateMainPageContent(content);

    return NextResponse.json({ success: true, content });
  } catch (error) {
    console.error("Error updating main page content:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
