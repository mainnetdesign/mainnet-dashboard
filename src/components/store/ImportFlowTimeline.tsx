'use client'

import { useState } from 'react'
import {
  RiCheckLine,
  RiCloseLine,
  RiDownload2Line,
  RiGitBranchLine,
  RiLoader4Line,
  RiSearchLine,
  RiArrowDownSLine,
} from '@remixicon/react'
import Badge from '@/components/ds/Badge'
import { WidgetCard } from '@/components/ds'
import type {
  ImportFlowStep,
  ImportFlowStepAttempt,
  ImportFlowStepType,
  ImportFlowSummary,
} from '@/types/insta2figma'
import { fmtDateTime, fmtDuration, fmtUSD } from '@/lib/insta2figma/constants'
import {
  formatJobError,
  importFlowStatusLabel,
  importFlowStepStatusLabel,
  importFlowStepTypeLabel,
} from '@/lib/insta2figma/labels'
import { cn } from '@/utils/cn'

const FLOW_STATUS_VARIANT = {
  started: 'info',
  completed: 'success',
  search_failed: 'error',
  import_failed: 'error',
  abandoned: 'warning',
} as const

const STEP_STATUS_VARIANT = {
  running: 'info',
  succeeded: 'success',
  failed: 'error',
} as const

const STEP_TYPE_ICON: Record<ImportFlowStepType, typeof RiSearchLine> = {
  search: RiSearchLine,
  load_more: RiArrowDownSLine,
  import: RiDownload2Line,
}

/* Animated connector: vertical line with a green energy pulse flowing down. */
function FlowConnector({ active }: { active: boolean }) {
  return (
    <div className="relative flex justify-center py-0.5">
      <span
        className={cn(
          'relative h-6 w-px overflow-visible',
          active ? 'bg-success-base/40' : 'bg-stroke-soft-200',
        )}
      >
        {active && (
          <>
            <span className="i2f-pulse absolute -left-[2.5px] size-[6px] rounded-full bg-success-base shadow-[0_0_6px_2px_rgba(56,199,122,0.55)]" />
            <span className="i2f-pulse absolute -left-[2.5px] size-[6px] rounded-full bg-success-base shadow-[0_0_6px_2px_rgba(56,199,122,0.55)] [animation-delay:0.9s]" />
          </>
        )}
      </span>
    </div>
  )
}

/*
 * Branch fork: when a step tried multiple scrape sources, show the paths that
 * were attempted — the winning path glows green, failed branches show dim red.
 */
function BranchFork({ attempts }: { attempts: ImportFlowStepAttempt[] }) {
  const sources = new Map<string, ImportFlowStepAttempt[]>()
  for (const a of attempts) {
    const list = sources.get(a.source) ?? []
    list.push(a)
    sources.set(a.source, list)
  }
  if (sources.size < 2) return null

  const branches = Array.from(sources.entries()).map(([source, list]) => ({
    source,
    tries: list.length,
    succeeded: list.some((a) => a.status === 'succeeded'),
    running: list.some((a) => a.status === 'running'),
  }))

  return (
    <div className="mt-3">
      <p className="mb-2 flex items-center gap-1 text-label-xs text-text-sub-600">
        <RiGitBranchLine className="size-3.5" aria-hidden />
        Caminhos tentados
      </p>
      <div className="relative flex items-start gap-3 pl-3">
        {/* trunk */}
        <span className="absolute -top-1 left-0 h-[calc(100%+4px)] w-px bg-stroke-soft-200" />
        {branches.map((b) => (
          <div
            key={b.source}
            className={cn(
              'relative flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-paragraph-xs',
              b.succeeded
                ? 'i2f-glow border-success-base/50 bg-success-base/5 text-text-strong-950'
                : b.running
                  ? 'border-information-base/50 bg-information-base/5'
                  : 'border-error-base/30 bg-bg-weak-50 text-text-soft-400 [border-style:dashed]',
            )}
          >
            {/* elbow connecting branch to trunk */}
            <span
              className={cn(
                'absolute -left-3 top-1/2 h-px w-3',
                b.succeeded ? 'bg-success-base/60' : 'bg-stroke-soft-200',
              )}
            />
            {b.succeeded ? (
              <RiCheckLine className="size-3.5 text-success-base" aria-hidden />
            ) : b.running ? (
              <RiLoader4Line className="size-3.5 animate-spin text-information-base" aria-hidden />
            ) : (
              <RiCloseLine className="size-3.5 text-error-base" aria-hidden />
            )}
            <span className="font-mono">{b.source}</span>
            {b.tries > 1 && <span className="text-text-soft-400">×{b.tries}</span>}
          </div>
        ))}
      </div>
    </div>
  )
}

function StatusIcon({ status }: { status: ImportFlowStep['status'] }) {
  if (status === 'succeeded') return <RiCheckLine className="size-4 text-success-base" aria-hidden />
  if (status === 'failed') return <RiCloseLine className="size-4 text-error-base" aria-hidden />
  return <RiLoader4Line className="size-4 animate-spin text-information-base" aria-hidden />
}

function AttemptLine({ attempt }: { attempt: ImportFlowStepAttempt }) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-x-2 gap-y-1 border-l-2 py-1 pl-3 text-paragraph-xs',
        attempt.status === 'succeeded' ? 'border-success-base/50' : 'border-stroke-soft-200',
      )}
    >
      <StatusIcon status={attempt.status} />
      <span className="text-text-strong-950">Tentativa {attempt.attemptOrder}</span>
      <span className="font-mono text-text-soft-400">{attempt.source}</span>
      <span className="text-text-soft-400">{fmtDuration(attempt.durationMs)}</span>
      {attempt.httpStatus != null && (
        <span className="text-text-soft-400">HTTP {attempt.httpStatus}</span>
      )}
      {attempt.postsReturned != null && (
        <span className="text-text-soft-400">
          {attempt.postsRequested != null
            ? `${attempt.postsReturned}/${attempt.postsRequested} posts`
            : `${attempt.postsReturned} posts`}
        </span>
      )}
      {attempt.costUsd > 0 && <span className="text-text-soft-400">{fmtUSD(attempt.costUsd)}</span>}
      {attempt.retryCount > 0 && (
        <span className="text-text-soft-400">{attempt.retryCount} retentativa(s)</span>
      )}
      {(attempt.errorKind || attempt.errorMessage) && (
        <span className="w-full break-all font-mono text-error-base">
          {formatJobError(attempt.errorKind, attempt.errorMessage)}
        </span>
      )}
    </div>
  )
}

function StepBox({
  step,
  isLast,
  defaultOpen,
}: {
  step: ImportFlowStep
  isLast: boolean
  defaultOpen: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  const Icon = STEP_TYPE_ICON[step.stepType] ?? RiSearchLine
  const succeeded = step.status === 'succeeded'

  return (
    <div className="relative">
      <div
        className={cn(
          'rounded-xl border bg-bg-white-0 transition-shadow',
          step.status === 'failed'
            ? 'border-error-base/40'
            : succeeded
              ? 'i2f-glow border-success-base/40'
              : 'border-stroke-soft-200',
        )}
      >
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center justify-between gap-3 px-4 py-3"
        >
          <div className="flex min-w-0 items-center gap-2">
            <span
              className={cn(
                'flex size-7 shrink-0 items-center justify-center rounded-md',
                succeeded ? 'bg-success-base/10' : 'bg-bg-weak-50',
              )}
            >
              <Icon
                className={cn('size-4', succeeded ? 'text-success-base' : 'text-text-sub-600')}
                aria-hidden
              />
            </span>
            <span className="truncate text-label-sm text-text-strong-950">
              {step.stepOrder}. {importFlowStepTypeLabel(step.stepType)}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Badge variant={STEP_STATUS_VARIANT[step.status] ?? 'neutral'}>
              {importFlowStepStatusLabel(step.status)}
            </Badge>
            <RiArrowDownSLine
              className="mn-chevron size-4 text-text-soft-400"
              data-open={open}
              aria-hidden
            />
          </div>
        </button>

        {open && (
          <div className="border-t border-stroke-soft-200 px-4 py-3">
            <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-paragraph-xs sm:grid-cols-4">
              <div>
                <dt className="text-text-soft-400">Início</dt>
                <dd>{fmtDateTime(step.startedAt)}</dd>
              </div>
              <div>
                <dt className="text-text-soft-400">Duração</dt>
                <dd>{fmtDuration(step.durationMs)}</dd>
              </div>
              {step.previewPage != null && (
                <div>
                  <dt className="text-text-soft-400">Página</dt>
                  <dd>{step.previewPage}</dd>
                </div>
              )}
              {step.postsReturned != null && (
                <div>
                  <dt className="text-text-soft-400">Posts retornados</dt>
                  <dd>{step.postsReturned}</dd>
                </div>
              )}
              {step.imagesImported != null && (
                <div>
                  <dt className="text-text-soft-400">Imagens importadas</dt>
                  <dd>{step.imagesImported}</dd>
                </div>
              )}
              <div>
                <dt className="text-text-soft-400">Custo</dt>
                <dd>{step.costUsd > 0 ? fmtUSD(step.costUsd) : '—'}</dd>
              </div>
            </dl>

            {step.errorMessage && (
              <p className="mt-3 break-all font-mono text-paragraph-xs text-error-base">
                {formatJobError(step.errorCode, step.errorMessage)}
              </p>
            )}

            <BranchFork attempts={step.attempts} />

            {step.attempts.length > 0 && (
              <div className="mt-3 space-y-1">
                <p className="mb-1 text-label-xs text-text-sub-600">
                  Log ({step.attempts.length} tentativa{step.attempts.length === 1 ? '' : 's'})
                </p>
                {step.attempts.map((attempt) => (
                  <AttemptLine key={attempt.id} attempt={attempt} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {!isLast && <FlowConnector active={succeeded} />}
    </div>
  )
}

type ImportFlowTimelineProps = {
  flow: ImportFlowSummary
}

export default function ImportFlowTimeline({ flow }: ImportFlowTimelineProps) {
  return (
    <WidgetCard>
      {/* component-scoped keyframes — globals.css is off-limits */}
      <style>{`
        @keyframes i2f-pulse {
          0% { top: -6px; opacity: 0; }
          15% { opacity: 1; }
          85% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
        .i2f-pulse { animation: i2f-pulse 1.8s linear infinite; }
        @keyframes i2f-glow {
          0%, 100% { box-shadow: 0 0 4px 0 rgba(56, 199, 122, 0.18); }
          50% { box-shadow: 0 0 10px 2px rgba(56, 199, 122, 0.35); }
        }
        .i2f-glow { animation: i2f-glow 2.4s ease-in-out infinite; }
      `}</style>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <p className="text-label-sm text-text-strong-950">Fluxo da importação</p>
          {flow.synthesized && <Badge variant="neutral">Reconstruído de eventos</Badge>}
        </div>
        <Badge variant={FLOW_STATUS_VARIANT[flow.status] ?? 'neutral'}>
          {importFlowStatusLabel(flow.status)}
        </Badge>
      </div>

      <dl className="mb-4 grid grid-cols-2 gap-3 text-paragraph-xs">
        <div>
          <dt className="text-text-soft-400">Duração total</dt>
          <dd>{fmtDuration(flow.totalDurationMs)}</dd>
        </div>
        <div>
          <dt className="text-text-soft-400">Custo total</dt>
          <dd>{flow.totalCostUsd > 0 ? fmtUSD(flow.totalCostUsd) : '—'}</dd>
        </div>
        <div>
          <dt className="text-text-soft-400">Etapas</dt>
          <dd>{flow.steps.length}</dd>
        </div>
        <div>
          <dt className="text-text-soft-400">Finalizado</dt>
          <dd>{flow.finishedAt ? fmtDateTime(flow.finishedAt) : '—'}</dd>
        </div>
      </dl>

      <div className="flex flex-col">
        {flow.steps.map((step, index) => (
          <StepBox
            key={step.id}
            step={step}
            isLast={index === flow.steps.length - 1}
            defaultOpen={step.status === 'failed' || step.status === 'running'}
          />
        ))}
      </div>
    </WidgetCard>
  )
}
