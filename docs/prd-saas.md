# PRD — Painel SaaS (Loja) do Mainnet Dashboard

> Escopo deste PRD: o lado **Loja / SaaS** do dashboard (ícone 🏪 no rail).
> O lado **Prédio** (🏢 = app financeiro atual da empresa) já existe e não é
> coberto aqui, exceto pelo ponto de integração de P&L descrito em Earnings.

## 1. Contexto e navegação

O rail lateral tem dois contextos:

- **🏢 Prédio** — app atual da empresa (dashboard financeiro já existente).
- **🏪 Loja** — produtos SaaS. Painel **admin/interno** (usuário = você, o dono).
  Monetização por **assinatura recorrente** (via Polar). Templates ficam para depois.

Dentro da Loja, a home é **Serviços**, que lista todos os SaaS. Ao entrar em um
SaaS, o menu da sidebar passa a ser daquele produto:

```
Serviços (home)
 └─ [SaaS selecionado, ex: Insta2Figma]
     ├─ Overview
     ├─ Users
     ├─ Earnings
     └─ Analytics
```

**Fora de escopo (decisão explícita):** páginas *Events* e *Feedbacks* — o
Analytics já cobre a necessidade de comportamento/uso.

O primeiro (e por ora único) SaaS é o **Insta2Figma**: plugin que importa
imagens/posts do Instagram para o **Figma** ou **Framer**. "Jobs" = importações.

## 2. Fonte de dados

Banco Postgres (Prisma). Tabelas relevantes:

| Tabela | Uso no painel |
|---|---|
| `users` | id, email, `plan_tier` (free/pro/max), `email_verified`, `figma_user_id`, `framer_user_id`, `google_id`, `polar_customer_id`, `quota_anchor_at`, `created_at` |
| `jobs` | importações: `type`, `platform` (figma/framer), `status`, `input` (jsonb, contém perfil buscado), `result_summary`, timestamps |
| `assets` | imagens geradas por job (`job_id`, `content_type`, `byte_size`, `shortcode`, `kind`) |
| `subscriptions` | Polar: `status`, `product_id`, `current_period_end` |
| `usage_counters` | `images_used` por `period_start` (quota) |
| `ig_profiles` | perfil IG buscado: `username`, `follower_count`, `is_verified`, etc |
| `product_analytics_events` | eventos de produto (funil): `event_name`, `platform`, `plan_tier`, `session_id`, `properties` (jsonb) |
| `scrape_telemetry` | `latency_ms` do scraper |

> ⚠️ **Não existe** campo de nome/pseudônimo em `users` (só `email`), nem
> qualquer campo de **geolocalização/IP**. Ver pré-requisitos em §7.

Revenue e custos:
- **Revenue** → API do **Polar** (tempo real), reconciliada com `subscriptions`.
- **Custos** → Railway (infra) + Apify + número de telefone do scraper
  (~$10 esporádico), baseline **~$5/mês fixo**. Lançamento manual por ora
  (ver §Earnings — integração de providers é fase 2).

---

## 3. Serviços (home)

Hub que lista todos os SaaS. Baseado no layout "Programs" do Figma.

- **Totais no topo:** MRR consolidado, total de usuários, receita do mês.
- **Grid de cards**, um por SaaS: logo, nome, URL, MRR atual, mini-gráfico de
  earnings, status (ativo/rascunho/pausado), nº de usuários, badge ↑/↓.
- **Botão "+ Novo SaaS".**
- Clicar num card → entra no SaaS (menu passa a ser daquele produto).

---

## 4. Overview (por SaaS)

Foco: saúde do produto num olhar. KPIs usam o **card padrão do Figma**
(node 10:171): ícone no canto, sparkline no topo, label, valor grande e
**pill de variação** (ex: −2%).

- **KPI cards:**
  - **Earnings** — valor do período + variação % vs período anterior.
  - **Usuários** — total de usuários.
  - **Imagens importadas** — contador total (`sum(usage_counters.images_used)`
    ou `count(assets)`).
  - *(opcional 4º: total de jobs no período)*
- **Tabela "Últimos jobs":** Usuário · Horário · Plataforma (Figma/Framer) ·
  Perfil buscado (de `jobs.input`) · Imagens tiradas (`count(assets)`).
- **Globo 3D** (base da página) — ver §7 (fase 2, depende de geo).

Sem payouts, sem gráfico grande de earnings (isso mora em Earnings), sem galeria.

---

## 5. Users (por SaaS)

> Renomeado de "Customers" → **Users**.

- **User** = todo usuário cadastrado (pagante ou não). Hoje: 152 free, 1 pro, 1 max.
- **KPIs no topo** (card padrão): total de users, ativos, novos no período.
  Sugestão: destacar **conversão free→pago** (99% é free hoje) em vez de MRR.
- **Filtros/ações:** busca por email · filtro por plano/status · exportar CSV.
- **Tabela:**

  | Coluna | Campo |
  |---|---|
  | Usuário | `email` (não há pseudônimo/nome) |
  | Plano | `plan_tier` |
  | Verificado | `email_verified` (badge) |
  | Plataforma | Figma/Framer (por `figma_user_id`/`framer_user_id`) |
  | Imagens | `sum(usage_counters.images_used)` |
  | Entrou | `created_at` |
  | Último import | `max(jobs.created_at)` |

- **Clique no user → drawer lateral** com **tabela de imports (jobs)** +
  informações de cada import:
  - Por job: horário, plataforma, perfil buscado, status, nº de imagens,
    duração (`finished_at − started_at`), erro (se houver).
  - Cabeçalho do drawer: dados da conta (email, verificado, plano, ids
    vinculados, `polar_customer_id`), assinatura (`subscriptions`: status,
    `current_period_end`) e uso do período (`usage_counters` vs quota).

---

## 6. Earnings (por SaaS) — P&L

Estrutura visual estilo **Polar/Dub**: header "Total Earnings" + gráfico com
filtro de período/tipo, e tabela de transações abaixo. Mas o objetivo aqui é
**P&L**, não só receita.

- **Revenue** — API do Polar (tempo real).
- **Custos** — categorias: **Infra (Railway)** e **Scraper (Apify + número de
  telefone)**; baseline ~$5/mês fixo.
- **Net = Revenue − Custos**, exibido em destaque.
- **Tabela de transações:** data · tipo · user · valor · earnings · status.
- **Integração com o dashboard da empresa:** o **lucro líquido de cada SaaS
  alimenta o P&L** geral (lado Prédio — reusar `PLTable`/`CashflowSection`).

**Fases:**
- **Fase 1:** revenue via Polar + custos por **lançamento manual** (reusar o
  componente `OperationalCosts` já existente), filtrado por produto.
- **Fase 2:** integração automática com providers (Railway/Apify). Não vale a
  pena agora — custos são ~$5–15/mês. Ligar só se crescerem.

---

## 7. Analytics (por SaaS)

Fonte: `product_analytics_events` (o funil já existe nos dados reais). Layout
inspirado no **Dub**: faixa de funil horizontal no topo + painéis de breakdown
rankeados embaixo.

- **Funil de uso (faixa horizontal com % entre etapas):**
  `session_start → profile_search → preview_loaded → import_started →
  import_completed` (+ taxa de abandono via `import_abandoned`).
- **Funil de conversão (2ª faixa):**
  uso → `preview_limit_reached` → `upgrade_overlay_opened` → assinou.
- **Segmentação/filtros:** plataforma (Figma/Framer) · plano (free/pro/max) ·
  período · evento específico.
- **Insights de uso (cards/painéis):**
  - Sessões + duração (`session_start/end/heartbeat`).
  - Taxa de conclusão de import (`completed/started`) e abandono.
  - Frições/erros (`preview_private_account`, `preview_limit_reached`).
  - Features mais usadas (toggles: `ignore_reels`, `carousel_expand`,
    `selection_mode`, etc).
- **Painéis de breakdown (abas estilo Dub):**
  - Perfis IG mais buscados (`profile_search`/`ig_profiles`) — análogo ao
    "Short Links" do Dub.
  - Plataforma (Figma vs Framer) — análogo ao "Devices".
  - Países — **depende de geo (fase 2)**.

**Fases:**
- **Fase 1:** dashboard fixo — os 2 funis + cards de uso, com filtros de
  plataforma/plano/período.
- **Fase 2:** seletor de evento+segmento (explorável).
- **Fase 3:** explorador completo. **Considerar plugar PostHog** em vez de
  reconstruir — os eventos já são PostHog-style.

---

## 8. Pré-requisitos e fase 2

### Geolocalização (globo 3D + painel de países)
Hoje **nada guarda IP/país**. Antes do globo e do breakdown de países:
1. No login/job, resolver IP → **país (e/ou lat/lon aproximado)** e salvar.
   Guardar **só país/coord aproximada, nunca o IP cru** (privacidade/LGPD).
   Um campo `country` em `users` ou coluna em eventos já basta.
2. Users antigos ficam sem ponto até logarem de novo (globo enche com o tempo).
3. **Globo 3D (Three.js, estilo Framer)** na base da Overview — nice-to-have,
   fase 2, não bloqueia o resto.

### Microsoft Clarity (descartado por ora)
Avaliado e **não incluído**. Se um dia entrar: API tem cota de **10 req/dia** e
só dá agregados de 1–3 dias (sem gravações/heatmaps). Padrão correto seria um
**cron diário** gravando em cache no DB — nunca chamar a API no page load.

---

## 9. Resumo de prioridades

| Página | Fase 1 | Fase 2+ |
|---|---|---|
| Serviços | grid de SaaS + totais | — |
| Overview | KPIs + tabela de jobs | globo 3D (geo) |
| Users | tabela + drawer de imports | — |
| Earnings | Polar + custos manuais + P&L | integração de providers |
| Analytics | 2 funis + cards fixos | explorável / PostHog / países |
