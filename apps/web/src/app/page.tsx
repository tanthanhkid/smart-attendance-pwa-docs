import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Smart Attendance</h1>
        <p className="text-muted-foreground mb-8">PWA Chấm công thông minh</p>
        <div className="space-y-4">
          <Link
            href="/auth/login"
            className="block w-full max-w-xs mx-auto bg-primary text-primary-foreground hover:bg-primary/90 py-3 px-4 rounded-lg font-medium text-center"
          >
            Đăng nhập
          </Link>
        </div>
      </div>
    </div>
  );
}
