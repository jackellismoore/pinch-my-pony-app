// --- Typing channel: listen + keep a ref so we can send broadcasts ---
useEffect(() => {
  if (!requestId || !myUserId) return

  const typingChannel = supabase
    .channel(`typing:thread:${requestId}`, {
      config: {
        broadcast: { self: false }, // don't echo our own typing back
      },
    })
    .on("broadcast", { event: "typing" }, (event) => {
      // ✅ supabase-js v2: event.payload contains what was sent
      const { user_id, typing } = (event.payload ?? {}) as {
        user_id?: string
        typing?: boolean
      }

      if (!user_id || user_id === myUserId) return
      setOtherTyping(Boolean(typing))
    })
    .subscribe()

  typingChannelRef.current = typingChannel

  return () => {
    typingChannelRef.current = null
    supabase.removeChannel(typingChannel)
  }
}, [requestId, myUserId])
