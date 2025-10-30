import { NextResponse } from "next/server";
import { generateItinerary } from "@/lib/aiPlanner";
import { createSupabaseServerClient } from "@/lib/supabaseClient";
import type { AIPlannerRequest } from "@/types/travel";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as AIPlannerRequest;
    const client = createSupabaseServerClient();

    if (!client) {
      return NextResponse.json(
        { message: "Supabase 未配置，无法保存旅行计划" },
        { status: 500 }
      );
    }

    const {
      data: { session },
    } = await client.auth.getSession();

    if (!session) {
      return NextResponse.json({ message: "未登录或会话已过期" }, { status: 401 });
    }

    const aiResponse = await generateItinerary(body);

    const { data: itinerary, error: insertError } = await client
      .from("itineraries")
      .insert({
        user_id: session.user.id,
        title: `${body.destination} 智能行程`,
        destination: body.destination,
        start_date: body.startDate,
        end_date: body.endDate,
        travelers: body.travelers,
        budget: body.budget,
        currency: body.currency ?? "CNY",
        preferences: body.preferences,
        plan_days: aiResponse.itinerary,
        budget_items: aiResponse.budget,
      })
      .select("*")
      .single();

    if (insertError || !itinerary) {
      console.error("Failed to persist itinerary", insertError);
      return NextResponse.json(
        { message: insertError?.message ?? "保存旅行计划失败" },
        { status: 500 }
      );
    }

    return NextResponse.json({ itinerary, tips: aiResponse.tips });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: (error as Error).message }, { status: 500 });
  }
}
