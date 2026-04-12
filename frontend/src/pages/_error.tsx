// Página de erro do Pages Router (fallback Next.js para /404 e /500)
// Necessário para evitar que o default use <Html> fora de _document

import type { NextPageContext } from 'next';

interface ErrorProps {
  statusCode?: number;
}

function ErrorPage({ statusCode }: ErrorProps) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '1rem' }}>
          {statusCode ?? 'Erro'}
        </h1>
        <p style={{ color: '#6b7280' }}>
          {statusCode === 404 ? 'Página não encontrada' : 'Ocorreu um erro no servidor'}
        </p>
      </div>
    </div>
  );
}

ErrorPage.getInitialProps = ({ res, err }: NextPageContext) => {
  const statusCode = res ? res.statusCode : err ? (err as any).statusCode : 404;
  return { statusCode };
};

export default ErrorPage;
