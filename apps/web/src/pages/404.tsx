export default function Custom404Page() {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        fontFamily: 'system-ui, sans-serif',
        padding: '2rem',
        textAlign: 'center',
      }}
    >
      <div>
        <h1 style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>404</h1>
        <p>Trang ban yeu cau khong ton tai.</p>
      </div>
    </main>
  );
}
