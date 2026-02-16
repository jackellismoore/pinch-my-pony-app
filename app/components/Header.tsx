"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useRouter } from "next/navigation"

export default function Header() {
  const [user, setUser] = useState<any>(null)
  const router = useRouter()

  useEffect(() => {
    let mounted = true

    const init = async () => {
      const { data } = await supabase.auth.getUser()
      if (!mounted) return
      setUser(data.user ?? null)
    }

    init()

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => {
      mounted = false
      sub.subscription.unsubscribe()
    }
  }, [])

  const logout = async () => {
    await supabase.auth.signOut()
    router.push("/")
    router.refresh()
  }

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "14px 30px",
        borderBottom: "1px solid #eee",
        background: "white",
      }}
    >
      <Link
        href="/"
        style={{
          fontWeight: 700,
          fontSize: 18,
          textDecoration: "none",
          color: "#0f172a",
        }}
      >
        🐴 Pinch My Pony
      </Link>

      <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
        {user ? (
          <>
            <Link href="/browse">Browse</Link>
            <Link href="/messages">Messages</Link>
            <Link href="/dashboard/owner">Dashboard</Link>
            <Link href="/dashboard/owner/horses">My Horses</Link>
            <button
              onClick={logout}
              style={{
                padding: "6px 14px",
                borderRadius: 6,
                border: "1px solid #ddd",
                background: "#f3f3f3",
                cursor: "pointer",
              }}
            >
              Logout
            </button>
          </>
        ) : (
          <>
            <Link href="/login">Login</Link>
            <Link href="/signup">Sign Up</Link>
          </>
        )}
      </div>
    </header>
  )
}
