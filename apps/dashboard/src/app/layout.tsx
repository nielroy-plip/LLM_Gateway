import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'LLM Resilience Gateway - Dashboard',
  description: 'Painel de Observabilidade, Roteamento LLM Local e Mascaramento de PII',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="bg-[#090d16] text-gray-100 antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}