<div align="center">

# 🏋️ Treino Vanilson — App

### Aplicação de treino de hipertrofia · 6 dias · com registo e sincronização na nuvem

![Frontend](https://img.shields.io/badge/Frontend-HTML%20%2B%20CSS%20%2B%20JS-orange?style=for-the-badge)
![Hosting](https://img.shields.io/badge/Hosting-GitHub%20Pages-blue?style=for-the-badge)
![Offline](https://img.shields.io/badge/Offline-IndexedDB-6c5ce7?style=for-the-badge)
![Cloud](https://img.shields.io/badge/Cloud-Supabase-2ee6a8?style=for-the-badge)

</div>

---

## 📖 Sobre

App de treino num **único ficheiro HTML**, pensada para usar no telemóvel durante o treino no ginásio. Mostra o plano de 6 dias, a técnica de cada exercício, e deixa-te **registar os teus pesos, séries e notas**, com **histórico** e **sincronização entre dispositivos**.

Split semanal:

| Dia | Treino |
|:---:|:---|
| 🦵 Segunda | Perna — Quadríceps + Panturrilha |
| 💪 Terça | Peito + Tríceps |
| 🎯 Quarta | Ombro + Bíceps |
| 🔙 Quinta | Costas + Peito mínimo |
| 🍑 Sexta | Perna — Posterior + Panturrilha |
| 🔥 Sábado | Cardio + Core |
| 😴 Domingo | Descanso |

---

## ✨ Funcionalidades

- 📅 **Dashboard** com objetivo, calendário semanal e próximo treino
- 🧭 **Navegação por dia** (Seg–Dom) e por **bloco** de periodização (Volume · Intensidade · Pesado · Deload)
- 📋 Por exercício: nome PT/EN, equipamento, séries · reps · carga · RPE · descanso
- ▶️ **Execução** passo a passo, mapa muscular, respiração e botão de **vídeo no YouTube**
- ❌ **Erro** / ✅ **Correção** para cada exercício
- ✍️ **Registo editável**: carga (kg), reps feitas, **marcar séries** e **notas** — grava sozinho
- 💾 **Guardar sessão** → vai para o **histórico** com data
- 📊 **Histórico** e **Exportar / Importar** (backup em JSON)
- ☁️ **Sincronização na nuvem** (Supabase) entre telemóvel e PC — opcional
- 📱 Mobile-first, funciona **offline** (IndexedDB)

---

## 🛠️ Tecnologia

| Camada | O quê |
|:---|:---|
| **Frontend** | HTML + CSS + JavaScript puro, 1 ficheiro, sem build |
| **Alojamento** | GitHub Pages (estático) |
| **Guardar local / offline** | IndexedDB (com fallback para localStorage) |
| **Nuvem (opcional)** | Supabase (Auth + Postgres com Row Level Security) |

> ℹ️ O GitHub Pages só serve ficheiros estáticos — não corre servidor. Por isso a base de dados vive no **Supabase**, e o site (no GitHub) fala com ele a partir do browser.

---

## 🚀 Instalação e deploy (GitHub Pages)

1. Cria um repositório no GitHub (ex.: `treino-vanilson`).
2. Coloca o ficheiro **`Treino_Vanilson_App.html`** na raiz. *(Opcional: renomeia para `index.html` para abrir direto no endereço do site.)*
3. No repositório: **Settings → Pages → Source: `main` / root → Save**.
4. Passado 1–2 min, a app fica em `https://<o-teu-utilizador>.github.io/treino-vanilson/`.

Para usar sem internet/local, basta abrir o ficheiro `.html` no browser.

---

## ☁️ Configurar a sincronização na nuvem (Supabase)

> A app funciona **sem** isto (guarda no dispositivo). A nuvem serve para **sincronizar entre telemóvel e PC** e ter backup online.

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

Estrutura da tabela:

| Coluna | Tipo | Descrição |
|:---|:---|:---|
| `user_id` | `uuid` | Utilizador dono dos dados (ligado ao Auth) |
| `data` | `jsonb` | Todo o estado da app (pesos, notas, séries, histórico) |
| `updated_at` | `timestamptz` | Última atualização |

### 2) Login imediato (recomendado)

**Authentication → Providers → Email** → desligar **"Confirm email"**.
Assim a conta entra logo, sem confirmação por email.

### 3) Ligar a app ao projeto

Em **Settings → API**, copia o **Project URL** e a chave **publishable**, e coloca-as no topo do `<script>` do ficheiro HTML:

```js
const SUPA_URL  = 'https://<o-teu-projeto>.supabase.co';
const SUPA_ANON = 'sb_publishable_...';   // chave publishable (pública por design)
```

> 🔒 **Segurança:** a chave *publishable* é feita para ir no frontend — não é segredo. A proteção real vem das **políticas RLS** acima, que garantem que **cada conta só acede aos seus próprios dados**. Nunca ponhas aqui a chave *secret* / *service_role*.

---

## 📲 Como usar

1. Abre a app.
2. No painel inicial, no cartão **☁️ Sincronizar**, faz **Criar conta** (email + palavra-passe).
3. Escolhe o dia → abre um exercício → mete a **carga**, marca as **séries** feitas e escreve **notas**. Grava sozinho.
4. No fim, toca em **💾 Guardar sessão de hoje** para arquivar no histórico.
5. Entra com a **mesma conta** noutro dispositivo → os dados aparecem lá.

Sem conta? Funciona na mesma no dispositivo, e podes usar **Exportar / Importar** para passar os dados entre telemóvel e PC.

---

## 🗂️ Como os dados são guardados

- **Local (sempre):** IndexedDB no browser — rápido e funciona offline.
- **Nuvem (se com sessão iniciada):** o estado sobe para o Supabase a cada alteração; ao entrares noutro dispositivo, é puxado de volta.
- **Estratégia:** última alteração prevalece (*last-write-wins*) — pensado para uso pessoal.

---

## 🧯 Resolução de problemas

| Sintoma | Causa provável | Solução |
|:---|:---|:---|
| Não aparece o cartão de login | `SUPA_URL`/`SUPA_ANON` vazios ou CDN bloqueado | Confirma as 2 chaves e o acesso à internet |
| "Erro" ao criar conta | "Confirm email" ligado | Desliga em Authentication → Email, ou confirma pelo email |
| Entra mas não sincroniza | SQL não corrido / RLS | Corre o SQL da secção acima |
| Vídeo não abre | — | O botão faz pesquisa no YouTube; precisa de internet |

---

## ⚠️ Aviso

Ferramenta educativa. As cargas marcadas **`cal`** são estimativas de calibração — confirma na Semana 1. Em caso de dor lombar aguda, dor articular ou tontura, pára e procura apoio profissional.

---

<div align="center">

**Feito para o Vanilson 💪 · Técnica > Ego**

</div>
