# DESIGN.md — Mainnet Dashboard Design System

> Design system baseado no **AlignUI**, portado do plugin `insta2figma/packages/plugin-ui`.
> Vibe: tech / blueprint. Documento é a fonte da verdade para consistência visual.

## Metodologia (3 camadas)

1. **Cores cruas** — escalas `0–950` + alpha em `oklch` (`--color-blue-500`, `--color-gray-200`…).
2. **Tokens semânticos** — apontam para as cruas: `--color-bg-white-0`, `--color-text-strong-950`, `--color-stroke-soft-200`, `--color-primary-base`, `--color-faded-*`, estados (`information`, `warning`, `error`, `success`, `away`, `feature`, `verified`…).
3. **Componentes** — `src/components/ui/*` usando `tv()` (tailwind-variants) + `cn()`. Nunca hardcode hex; sempre token.

Tudo vive em Tailwind **v4** via `@theme` (não há `tailwind.config`). Os tokens geram as utilities automaticamente: `--color-primary-base` → `bg-primary-base`/`text-primary-base`/`ring-primary-base`; `--radius-10` → `rounded-10`; `--text-label-sm` → `text-label-sm`.

## Onde está

```
src/app/globals.css      # importa o tailwind + mainnet-ui.css + chrome primitives
src/app/mainnet-ui.css   # @theme (tokens light) + .dark (dark) + keyframes  ← foundation
src/utils/               # cn.ts, tv.ts, polymorphic.ts, recursive-clone-children.tsx
src/hooks/               # use-tab-observer.ts
src/components/ui/       # componentes (import via `import * as Button from '@/components/ui/button'`)
```

Os tokens antigos (`--bg`, `--tx`, `--bd`) do dashboard continuam válidos e **não colidem** com os `--color-*` — a migração dos componentes legados para os tokens novos pode ser gradual.

## Tokens principais

- **Superfícies:** `bg-white-0` (base), `bg-weak-50`, `bg-soft-200`, `bg-sub-300`, `bg-surface-800`, `bg-strong-950`.
- **Texto:** `text-strong-950`, `text-sub-600`, `text-soft-400`, `text-disabled-300`, `text-white-0`.
- **Bordas:** `stroke-soft-200`, `stroke-sub-300`, `stroke-strong-950`, `stroke-white-0`.
- **Primary:** `primary-base` (= blue-500) + `primary-dark/darker/light/lighter` + `primary-alpha-10/16/24`.
- **Tipografia:** `text-title-h1…h6`, `text-label-xl…xs`, `text-paragraph-*`, `text-subheading-*` (line-height, tracking e weight embutidos no token).
- **Raios:** `rounded-10` (.625rem), `rounded-20` (1.25rem) + os default do Tailwind.
- **Dark mode:** classe `.dark` no `<html>` (via `next-themes`). O bloco `.dark` em `mainnet-ui.css` remapeia os tokens.

## Componentes disponíveis

`Button`, `FancyButton`, `Input`, `Textarea`, `Checkbox`, `CheckboxLabel`, `Switch`, `Slider`, `SegmentedControl`, `Tooltip`, `Pagination`, `CounterField`.

Padrão de uso (namespace import + subcomponentes):

```tsx
import * as Button from '@/components/ui/button';

<Button.Root variant='primary' mode='filled' size='medium'>
  <Button.Icon as={RiAddLine} />
  Ação
</Button.Root>
```

Os componentes vêm ~verbatim da fonte; customização é feita nos **parâmetros** (`variant`, `mode`, `size`) e via `className`, não editando o `.tsx`.

## Chrome tech (blueprint)

Primitivos decorativos em `globals.css`:

- `.mn-hatch` — preenchimento de hachura diagonal 1px. Ex.: `<div className="mn-hatch" />`. Sobrescreva a cor com `--mn-hatch-line`.
- `.mn-vertex` + `--tl/--tr/--bl/--br` — marcador 8×8 nos cantos. Coloque dentro de um container `position: relative` (`.relative`).

```tsx
<div className='relative mn-hatch p-6'>
  <span className='mn-vertex mn-vertex--tl' />
  <span className='mn-vertex mn-vertex--br' />
</div>
```

## A adicionar quando precisar

- **Ruler** (régua com marcas medidas) — é runtime-driven no plugin; portar como componente React quando o layout pedir.
- Componentes extras do AlignUI (badge, table, drawer, select, etc.) — copiar de `plugin-ui/src/components/ui` sob demanda, mesmas deps.
