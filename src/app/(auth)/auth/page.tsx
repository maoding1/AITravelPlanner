import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabaseClient";

export const dynamic = "force-dynamic";

type AuthPageProps = {
  searchParams?: {
    error?: string;
    message?: string;
  };
};

const renderBanner = (error?: string, message?: string) => {
  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
        {decodeURIComponent(error)}
      </div>
    );
  }

  if (message === "check_email") {
    return (
      <div className="rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-2 text-sm text-cyan-700">
        注册成功，请到邮箱完成验证后再试一次。
      </div>
    );
  }

  if (message) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
        {decodeURIComponent(message)}
      </div>
    );
  }

  return null;
};

export default async function AuthPage({ searchParams }: AuthPageProps) {
  const client = createSupabaseServerClient();

  if (!client) {
    return (
      <div className="mx-auto max-w-md space-y-6 px-4 py-12 text-center">
        <h1 className="text-2xl font-semibold text-slate-900">Supabase 未配置</h1>
        <p className="text-sm text-slate-600">
          请在环境变量中设置 <code className="rounded bg-slate-100 px-1">NEXT_PUBLIC_SUPABASE_URL</code> 与
          <code className="rounded bg-slate-100 px-1">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>，以启用认证功能。
        </p>
      </div>
    );
  }

  const banner = renderBanner(searchParams?.error, searchParams?.message);

  const {
    data: { session },
  } = await client.auth.getSession();

  if (session) {
    return (
      <div className="mx-auto max-w-md space-y-6 px-4 py-12 text-center">
        <h1 className="text-2xl font-semibold text-slate-900">您已登录</h1>
        <p className="text-sm text-slate-600">可以前往仪表盘查看或继续生成新的旅行计划。</p>
        <div className="flex justify-center gap-3">
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              退出登录
            </button>
          </form>
          <Link
            href="/dashboard"
            className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-cyan-700"
          >
            查看行程
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-6 px-4 py-12">
      <h1 className="text-2xl font-semibold text-slate-900">登录 / 注册</h1>
      <p className="text-sm text-slate-600">通过 Supabase Authentication 管理行程与偏好。</p>
      {banner}
      <form action="/auth/signin" method="post" className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700" htmlFor="email">
            邮箱
          </label>
          <input
            className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-cyan-500 focus:outline-none"
            id="email"
            name="email"
            type="email"
            required
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700" htmlFor="password">
            密码
          </label>
          <input
            className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-cyan-500 focus:outline-none"
            id="password"
            name="password"
            type="password"
            required
          />
        </div>
        <button
          type="submit"
          className="w-full rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-cyan-700"
        >
          登录 / 注册
        </button>
      </form>
      <p className="text-xs text-slate-500">
        登录即表示您同意我们的隐私政策。首次登录将自动创建账户。
      </p>
    </div>
  );
}
