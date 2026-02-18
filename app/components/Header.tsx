"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useRouter } from "next/navigation"
import { registerPushForCurrentUser } from "@/lib/push/registerPush"

type Role = "owner" | "borrower" | null

export default function Header() {
  const [user, setUser] = useState<any>(null)
  const [role, setRole] = useState<Role>(null)
  const router = useRouter()

  useEffect(() => {
    let mounted = true

    const loadRole = async (userId: string) => {
      const { data, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .single()

      if (!mounted) return
      if (error) {
        setRole(null)
        return
      }
      setRole((data?.role as Role) ?? null)
    }

    const init = async () => {
      const { data } = await supabase.auth.getUser()
      if (!mounted) return

      const u = data.user ?? null
      setUser(u)

      if (u) {
        registerPushForCurrentUser()
        loadRole(u.id)
      } else {
        setRole(null)
      }
    }

    init()

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const u = session?.user ?? null
      setUser(u)

      if (u) {
        registerPushForCurrentUser()
        await loadRole(u.id)
      } else {
        setRole(null)
      }
    })

    return () => {
      mounted = false
      sub.subscription.unsubscribe()
    }
  }, [])

  const dashboardHref = useMemo(() => {
    if (!user) return "/dashboard"
    if (role === "borrower") return "/dashboard/borrower"
    return "/dashboard/owner"
  }, [user, role])

  const logout = async () => {
    await supabase.auth.signOut()
    router.push("/")
    router.refresh()
  }

  return (
    <header
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "14px 30px",
        borderBottom: "1px solid #eee",
        background: "white",
      }}
    >
      <Link href="/" style={{ fontWeight: 700, fontSize: 18, textDecoration: "none", color: "black" }}>
        🐴 Pinch My Pony
      </Link>

      <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
        {user ? (
          <>
            <Link href="/browse" style={{ textDecoration: "none", color: "black" }}>Browse</Link>
            <Link href="/messages" style={{ textDecoration: "none", color: "black" }}>Messages</Link>

            <Link href={dashboardHref} style={{ textDecoration: "none", color: "black" }}>
              Dashboard
            </Link>

            {role === "owner" ? (
              <Link href="/dashboard/owner/horses" style={{ textDecoration: "none", color: "black" }}>
                My Horses
              </Link>
            ) : null}

            <Link href="/profile" style={{ textDecoration: "none", color: "black", fontWeight: 700 }}>
              My Profile
            </Link>

            <button
              onClick={logout}
              style={{
                padding: "6px 14px",
                borderRadius: 10,
                border: "1px solid #ddd",
                background: "#f3f3f3",
                cursor: "pointer",
                fontWeight: 650,
              }}
            >
              Logout
            </button>
          </>
        ) : (
          <>
            <Link href="/login" style={{ textDecoration: "none", color: "black" }}>Login</Link>
            <Link href="/signup" style={{ textDecoration: "none", color: "black" }}>Sign Up</Link>
          </>
        )}
      </div>
    </header>
  )
}
