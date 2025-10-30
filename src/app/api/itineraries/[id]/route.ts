import { NextResponse } from "next/server";
import { createSupabaseRouteHandlerClient } from "@/lib/supabaseClient";
import { createSupabaseServiceRoleClient } from "@/lib/supabaseServiceRoleClient";

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const client = createSupabaseRouteHandlerClient();
  if (!client) {
    return NextResponse.json({ message: "Supabase 未配置" }, { status: 500 });
  }

  const {
    data: { user },
  } = await client.auth.getUser();

  if (!user) {
    return NextResponse.json({ message: "未登录或会话已过期" }, { status: 401 });
  }

  const { data: deletedRows, error } = await client
    .from("itineraries")
    .delete()
    .eq("id", params.id)
    .eq("user_id", user.id)
    .select("id");

  if (error) {
    console.error("Failed to delete itinerary", error);
    return NextResponse.json({ message: "删除失败" }, { status: 500 });
  }

  if (deletedRows && deletedRows.length > 0) {
    console.info("Deleted itineraries with user session", deletedRows);
    return NextResponse.json({ success: true, deleted: deletedRows });
  }

  const serviceRoleClient = createSupabaseServiceRoleClient();

  if (!serviceRoleClient) {
    console.warn("User-level delete returned no rows and service role key is not configured.");
    return NextResponse.json({ success: false, message: "行程不存在或无删除权限" }, { status: 403 });
  }

  const { data: adminDeletedRows, error: adminError } = await serviceRoleClient
    .from("itineraries")
    .delete()
    .eq("id", params.id)
    .select("id, user_id");

  if (adminError) {
    console.error("Service role delete failed", adminError);
    return NextResponse.json({ success: false, message: "删除失败" }, { status: 500 });
  }

  if (!adminDeletedRows || adminDeletedRows.length === 0) {
    console.warn("Service role delete did not find matching itinerary", params.id);
    return NextResponse.json({ success: false, message: "行程不存在或已经删除" }, { status: 404 });
  }

  console.info("Deleted itineraries with service role", adminDeletedRows);

  return NextResponse.json({ success: true, deleted: adminDeletedRows, fallback: "service-role" });
}
