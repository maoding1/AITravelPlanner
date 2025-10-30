import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseClient";
import type { BudgetLineItem } from "@/types/travel";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      itineraryId: string;
      items: BudgetLineItem[];
    };

    const client = createSupabaseServerClient();

    if (!client) {
      return NextResponse.json(
        { message: "Supabase 未配置，无法更新预算" },
        { status: 500 }
      );
    }
    const {
      data: { session },
    } = await client.auth.getSession();

    if (!session) {
      return NextResponse.json({ message: "未登录或会话已过期" }, { status: 401 });
    }

    const { data, error } = await client
      .from("itineraries")
      .update({ budget_items: body.items })
      .eq("id", body.itineraryId)
      .eq("user_id", session.user.id)
      .select("id")
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ itineraryId: data.id });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: (error as Error).message }, { status: 500 });
  }
}
