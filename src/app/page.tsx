'use client'
import { useRouter } from 'next/navigation'

export default function Hub() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-screen-xl mx-auto px-6 py-4 flex items-center gap-3">
          <div className="w-7 h-7 bg-gray-900 rounded-md" />
          <span className="font-bold text-gray-900 text-lg">Mainnet Dashboard</span>
        </div>
      </header>

      {/* Center content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-16">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
          Escolha uma área
        </p>
        <h1 className="text-2xl font-bold text-gray-900 mb-10 text-center">
          O que você quer visualizar?
        </h1>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 w-full max-w-2xl">
          {/* Dashboard card */}
          <button
            onClick={() => router.push('/dashboard')}
            className="group relative bg-white rounded-2xl border border-gray-200 p-7 text-left shadow-sm hover:shadow-md hover:border-gray-300 transition-all duration-200"
          >
            {/* Icon */}
            <div className="w-11 h-11 bg-gray-900 rounded-xl flex items-center justify-center mb-5 group-hover:scale-105 transition-transform duration-200">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>

            <h2 className="text-base font-bold text-gray-900 mb-1.5">Dashboard</h2>
            <p className="text-sm text-gray-500 leading-relaxed">
              Receita, custo por projeto e por colaborador, margem e evolução mensal.
            </p>

            {/* Arrow */}
            <div className="mt-5 flex items-center gap-1 text-xs font-semibold text-gray-400 group-hover:text-gray-700 transition-colors">
              Abrir
              <svg className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>

          {/* Auditoria card */}
          <button
            onClick={() => router.push('/auditoria')}
            className="group relative bg-white rounded-2xl border border-gray-200 p-7 text-left shadow-sm hover:shadow-md hover:border-gray-300 transition-all duration-200"
          >
            {/* Icon */}
            <div className="w-11 h-11 bg-amber-500 rounded-xl flex items-center justify-center mb-5 group-hover:scale-105 transition-transform duration-200">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>

            <h2 className="text-base font-bold text-gray-900 mb-1.5">Auditoria de Projetos</h2>
            <p className="text-sm text-gray-500 leading-relaxed">
              Diagnóstico de transações do Notion — vínculos, receita sem horas e inconsistências.
            </p>

            {/* Arrow */}
            <div className="mt-5 flex items-center gap-1 text-xs font-semibold text-gray-400 group-hover:text-gray-700 transition-colors">
              Abrir
              <svg className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}
