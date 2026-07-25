<div align="center">

# Vanilson Workout

### App de treino de hipertrofia · 6 dias · metas, treinadores, registo e sincronização na nuvem

![Frontend](https://img.shields.io/badge/Frontend-HTML%20%2B%20CSS%20%2B%20JS-d9ff47?style=for-the-badge&labelColor=08090b)
![Build](https://img.shields.io/badge/Build_step-none-d9ff47?style=for-the-badge&labelColor=08090b)
![Hosting](https://img.shields.io/badge/Hosting-GitHub%20Pages-blue?style=for-the-badge&labelColor=08090b)
![Offline](https://img.shields.io/badge/Offline-IndexedDB-6c5ce7?style=for-the-badge&labelColor=08090b)
![Cloud](https://img.shields.io/badge/Cloud-Supabase-2ee6a8?style=for-the-badge&labelColor=08090b)

</div>

---

## Sobre

App de treino para usar no telemóvel durante o treino no ginásio. Mostra o plano de 6 dias,
a técnica de cada exercício com **vídeo a tocar dentro da própria app**, e deixa-te
registar **pesos, séries, reps e notas** — com histórico, **metas**, **treinadores** e
sincronização entre dispositivos.

Sem build, sem gestor de pacotes, sem framework. Ficheiros estáticos servidos pelo GitHub Pages.

Split semanal:

| Dia | Treino |
|:---:|:---|
| Segunda | Perna — Quadríceps + Panturrilha |
| Terça | Tríceps |
| Quarta | Ombro + Bíceps |
| Quinta | Costas + Peito |
| Sexta | Perna — Posterior + Panturrilha |
| Sábado | Cardio + Core |
| Domingo | Descanso |

---

## Funcionalidades

- **Início** — treino de hoje, sequência de dias, resumo da semana, progresso real das metas
- **Treino** — dia e semana no mesmo ecrã, 4 blocos de periodização (Volume · Intensidade · Pesado · Deload)
- **Por exercício** — nome PT/EN, equipamento, séries · reps · carga · RPE · descanso
- **Técnica** — execução passo a passo, músculos, respiração, e **erro / correção**
- **Vídeo inline** — a demonstração toca **dentro do cartão**; a app nunca abre outro separador
- **Registo** — carga, reps feitas, séries marcadas e notas; grava sozinho
- **Metas** — cria, edita e elimina metas com valor inicial, alvo, atual, prazo e capa; 🔥 ao atingir
- **Treinadores** — ficha completa (especialidade, bio, contactos, disponibilidade, dias, planos, notas, sessões, ativo/inativo)
- **Integração inicial** — configuração em 5 passos, ignorável a qualquer momento
- **Histórico** editável + **Exportar / Importar** (backup JSON)
- **Sincronização na nuvem** (Supabase) entre telemóvel e PC
- **Bilingue** EN / PT em toda a app
- **Tema escuro e claro**, ambos desenhados a sério
- Mobile-first; funciona **offline** (IndexedDB)

---

## Tecnologia

| Camada | O quê |
|:---|:---|
| **Frontend** | HTML + CSS + JavaScript puro, sem build |
| **Tipografia** | Anton + Archivo, alojadas localmente (SIL OFL) — sem CDN de fontes |
| **Fotografia** | Ficheiros locais em `img/`, do Pexels (ver `img/attribution.md`) |
| **Alojamento** | GitHub Pages (estático) |
| **Local / offline** | IndexedDB (com fallback para localStorage) |
| **Nuvem** | Supabase (Auth + Postgres com Row Level Security) |
| **Gráficos** | Chart.js (CDN, opcional em runtime) |

> O GitHub Pages só serve ficheiros estáticos — não corre servidor. Por isso a base de
> dados vive no **Supabase**, e o site fala com ele a partir do browser.

---

## Estrutura

```
index.html        casca estática: gate, #view, barra de navegação, #sheet, #onboard
css/tokens.css    tokens dos dois temas, escala tipográfica, espaçamento, movimento
css/app.css       componentes
css/gate.css      ecrã de entrada (isolado sob #gate)
js/data.js        EX, YT, CARDIO, DAYS, BLOCKS, prog(), I()   ← só dados
js/i18n.js        dicionário EN/PT + t(), L(), dtxt()
js/photos.js      o único ficheiro que nomeia imagens
js/store.js       STATE, IndexedDB, saveState(), Supabase, auth, CRUD
js/ui.js          todos os ecrãs, eventos, integração inicial, gráfico
img/              fotografias + attribution.md
fonts/            Anton + Archivo (woff2, subconjunto latino)
```

Os `<script>` são **clássicos, não módulos** — módulos ES são bloqueados em `file://`, o
que impediria abrir o `index.html` diretamente.

---

## Correr localmente

```bash
python -m http.server 8000
```

Depois abre `http://localhost:8000/`.

Também podes abrir o `index.html` diretamente (`file://`): CSS, JS, fontes e imagens
carregam todos. Só os 2 scripts de CDN falham, e sem eles o ecrã de entrada não consegue
autenticar — a app fica atrás do login. É o comportamento esperado.

**Deploy:** commit para `main`. O GitHub Pages serve a raiz do repositório.

---

## Configurar a sincronização na nuvem (Supabase)

### 1) Criar a tabela

No Supabase → **SQL Editor** → corre:

```sql
create table if not exists public.user_state (
  user_id uuid primary key references auth.users on delete cascade,
  data jsonb,
  updated_at timestamptz default now()
);
alter table public.user_state enable row level security;
create policy "own_select" on public.user_state for select using (auth.uid() = user_id);
create policy "own_insert" on public.user_state for insert with check (auth.uid() = user_id);
create policy "own_update" on public.user_state for update using (auth.uid() = user_id);
```

| Coluna | Tipo | Descrição |
|:---|:---|:---|
| `user_id` | `uuid` | Utilizador dono dos dados (ligado ao Auth) |
| `data` | `jsonb` | Todo o estado da app (registos, histórico, metas, treinadores, perfil) |
| `updated_at` | `timestamptz` | Última atualização |

As metas e os treinadores vivem dentro deste mesmo `jsonb`. É por isso que **cada conta só
vê os seus próprios dados**: as políticas RLS acima limitam tudo a `auth.uid()`.

### 2) Login imediato (recomendado)

**Authentication → Providers → Email** → desligar **"Confirm email"**.

### 3) Ligar a app ao projeto

Em **Settings → API**, copia o **Project URL** e a chave **publishable**, e coloca-as no
topo da secção Supabase em `js/store.js`:

```js
const SUPA_URL  = 'https://<o-teu-projeto>.supabase.co';
const SUPA_ANON = 'sb_publishable_...';   // chave publishable (pública por design)
```

> **Segurança:** a chave *publishable* é feita para ir no frontend — não é segredo. A
> proteção real vem das **políticas RLS**. Nunca ponhas aqui a chave *service_role*.

---

## Como usar

1. Abre a app e **cria conta** (email + palavra-passe).
2. Na primeira entrada, a **configuração inicial** pergunta o teu nome, peso atual e alvo,
   dias de treino, a primeira meta e, se quiseres, um treinador. Podes ignorar qualquer passo.
3. Em **Treino**, escolhe o dia → abre um exercício → mete a **carga**, marca as **séries**
   e escreve **notas**. Grava sozinho. Toca no vídeo para ver a execução ali mesmo.
4. No fim, **Guardar sessão de hoje** arquiva no histórico.
5. Em **Metas**, atualiza o valor atual e vê o progresso real.
6. Em **Perfil**, geres os teus **treinadores**, vês o gráfico e o histórico, e mudas tema
   ou idioma.
7. Entra com a **mesma conta** noutro dispositivo → os dados aparecem lá.

---

## Como os dados são guardados

- **Local (sempre):** IndexedDB no browser — rápido e funciona offline.
- **Nuvem (com sessão iniciada):** o estado sobe a cada alteração (com 200 ms de debounce).
- **Estratégia:** última alteração prevalece (*last-write-wins*).

Se vinhas de uma versão anterior da app, os teus **registos, pesos, séries e histórico são
mantidos** — o formato de armazenamento não mudou. Ainda assim, faz **Exportar** antes de
atualizar, por segurança.

---

## Resolução de problemas

| Sintoma | Causa provável | Solução |
|:---|:---|:---|
| Fica no ecrã de entrada | `SUPA_URL`/`SUPA_ANON` errados ou CDN bloqueado | Confirma as 2 chaves e o acesso à internet |
| "Erro" ao criar conta | "Confirm email" ligado | Desliga em Authentication → Email, ou confirma pelo email |
| Entra mas não sincroniza | SQL não corrido / RLS | Corre o SQL da secção acima |
| Vídeo não toca | Sem internet, ou embed bloqueado | O vídeo vem do YouTube; a foto local continua a aparecer |
| Vê a configuração inicial outra vez | Conta sem `profile.onboardedAt` | Normal na primeira entrada após a atualização; podes ignorar |

---

## Aviso

Ferramenta educativa. As cargas marcadas **`cal`** são estimativas de calibração — confirma
na Semana 1. Em caso de dor lombar aguda, dor articular ou tontura, pára e procura apoio
profissional.

---

<div align="center">

**Técnica > Ego**

</div>
