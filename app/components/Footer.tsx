export default function Footer() {
  return (
    <footer
      style={{
        marginTop: 40,
        padding: 20,
        textAlign: "center",
        borderTop: "1px solid #eee",
        fontSize: 14,
        color: "#666",
      }}
    >
      🐴 Pinch My Pony © {new Date().getFullYear()}
    </footer>
  );
}
