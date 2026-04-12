'use client';

// 500 / Error boundary — App Router global error handler
// Substitui o /_error do Pages Router

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">500</h1>
        <p className="text-gray-500 mb-4">Algo deu errado</p>
        <button
          onClick={() => reset()}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Tentar novamente
        </button>
      </div>
    </div>
  );
}
