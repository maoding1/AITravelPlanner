import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabaseClient";

const formatDisplayName = (email?: string, fullName?: string) => {
  if (fullName && fullName.trim().length > 0) {
    return fullName.trim();
  }
  if (!email) {
    return "旅行者";
  }
  const [name] = email.split("@");
  return name || email;
};

const initials = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) {
    return "旅";
  }
  const firstChar = trimmed[0];
  return firstChar.toUpperCase();
};

export async function UserBadge() {
  const client = createSupabaseServerClient();

  if (!client) {
    return (
      <Link
        href="/auth"
        className="flex items-center gap-3 rounded-full border border-dashed border-cyan-500 px-3 py-2 text-sm text-cyan-600 hover:bg-cyan-50"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-full border border-cyan-500 text-xs">配置</span>
        <span>配置 Supabase</span>
      </Link>
    );
  }

  const {
    data: { session },
  } = await client.auth.getSession();

  if (!session) {
    return (
      <Link
        href="/auth"
        className="flex items-center gap-3 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 shadow-sm hover:border-cyan-400 hover:text-cyan-600"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-full border border-dashed border-slate-300 text-xs text-slate-500">
          未
        </span>
        <div className="leading-tight">
          <p className="text-xs">未登录</p>
          <p className="text-sm font-semibold">前往登录</p>
        </div>
      </Link>
    );
  }

  const user = session.user;
  const displayName = formatDisplayName(user.email ?? undefined, user.user_metadata?.full_name);
  const avatarUrl = user.user_metadata?.avatar_url as string | undefined;
  const avatarInitial = initials(displayName);

  return (
    <Link
      href="/dashboard"
      className="flex items-center gap-3 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm hover:border-cyan-400 hover:text-cyan-700"
    >
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarUrl}
          alt={displayName}
          className="h-9 w-9 rounded-full border border-slate-200 object-cover"
        />
      ) : (
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-cyan-600 text-sm font-semibold text-white">
          {avatarInitial}
        </span>
      )}
      <div className="leading-tight">
        <p className="text-xs text-slate-500">已登录</p>
        <p className="text-sm font-semibold">{displayName}</p>
      </div>
    </Link>
  );
}
