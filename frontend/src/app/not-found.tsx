// 404 — App Router not-found page
// Substitui o /_error do Pages Router

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">404</h1>
        <p className="text-gray-500">Página não encontrada</p>
      </div>
    </div>
  );
}
