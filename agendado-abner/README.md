# 📘 Agendado Abner

Agenda inteligente de estudos para o ENEM. Organiza automaticamente os
conteúdos das 4 áreas do ENEM entre a data de início dos estudos e a data
da prova, respeitando os dias e horários que você escolher — com agenda,
calendário, cronômetro de estudo, controle de redações, simulados e
relatórios de progresso.

> Projeto estático (HTML + CSS + JavaScript puro). Não precisa de Node,
> build, npm ou framework para rodar. Os dados ficam salvos no navegador
> (localStorage).

---

## 1. Estrutura do projeto

```
agendado-abner/
├── index.html      → estrutura da aplicação (todas as telas)
├── style.css       → todo o visual (responsivo, com modo escuro)
├── data.js         → base de conteúdos do ENEM (4 áreas, matérias, tópicos)
├── storage.js       → camada de acesso a dados (hoje: localStorage)
├── scheduler.js    → algoritmo que gera a agenda automática
├── charts.js       → gráficos simples em <canvas>, sem dependências externas
├── app.js          → toda a lógica da aplicação e das telas
└── README.md       → este arquivo
```

Não há build nem dependências para instalar. É um site estático puro.

---

## 2. Como testar localmente

**Opção A — abrir direto no navegador**
Basta dar duplo-clique em `index.html`. Funciona porque nenhum arquivo usa
`import`/`fetch` de módulos que exijam servidor.

**Opção B — servidor local (recomendado)**
Alguns navegadores restringem certas APIs quando o site é aberto via
`file://`. Para simular o ambiente real:

```bash
# Se tiver Python instalado:
cd agendado-abner
python3 -m http.server 8080
# depois acesse http://localhost:8080

# Ou, se tiver Node instalado:
npx serve .
```

Na primeira vez que abrir, o app mostrará a tela **"Configurar Plano de
Estudos"**. Preencha nome, datas, horário e dias da semana — a agenda
completa até a data do ENEM será gerada automaticamente.

---

## 3. Como os dados são salvos

Tudo é salvo no `localStorage` do navegador (chaves com o prefixo
`agendadoAbner:`), incluindo:

- Configuração do plano (datas, horários, dias da semana);
- Todas as tarefas da agenda e seus status;
- Progresso de cada conteúdo (status, dificuldade, questões resolvidas);
- Redações, simulados e revisões avulsas;
- Histórico de tempo estudado (usado nos relatórios e no dashboard).

Em **Configurações → Dados** você pode exportar tudo em um arquivo
`.json` (backup), importar um backup existente, ou apagar todos os dados.

### Preparado para crescer (banco de dados no futuro)

Toda leitura/escrita passa por `storage.js`, que expõe apenas
`get / set / remove / exportAll / importAll / clearAll`. Se no futuro você
quiser usar **PostgreSQL, MySQL ou Firebase**, basta:

1. Criar uma API (Node/Express, Firebase Functions etc.) com endpoints
   equivalentes a essas operações;
2. Reescrever o conteúdo de `storage.js` para chamar `fetch()`/SDK do
   Firebase em vez de `localStorage`;
3. Nenhum outro arquivo (`app.js`, `scheduler.js`, telas) precisa mudar,
   pois todos usam apenas o objeto `Storage`.

---

## 4. Publicando o site (passo a passo, sem termos técnicos difíceis)

O domínio **agendadoabner.com.br** ainda **não está registrado nem
publicado** — os passos abaixo mostram como fazer isso quando você
decidir seguir em frente.

### Passo 1 — Escolher uma hospedagem
Qualquer hospedagem de **site estático** funciona bem aqui, por exemplo:
Vercel, Netlify, Cloudflare Pages, GitHub Pages, ou uma hospedagem
tradicional brasileira (Hostinger, KingHost, Locaweb etc.). Crie uma
conta gratuita ou paga em uma delas.

### Passo 2 — Publicar os arquivos
- Em serviços como **Vercel/Netlify**: crie uma conta, escolha "novo
  projeto/site", e arraste a pasta `agendado-abner` (ou conecte um
  repositório do GitHub com esses arquivos). Não é necessário nenhum
  comando de build — configure "Build command" como vazio e "Output
  directory" como a raiz do projeto.
- Em hospedagem tradicional (cPanel, FTP): envie os arquivos
  (`index.html`, `style.css`, `data.js`, `storage.js`, `scheduler.js`,
  `charts.js`, `app.js`) para a pasta pública do site (geralmente
  `public_html`).

### Passo 3 — Registrar o domínio agendadoabner.com.br
1. Acesse o **Registro.br** (registrador oficial de domínios `.br`);
2. Crie uma conta e verifique se `agendadoabner.com.br` está disponível;
3. Registre o domínio (é pago anualmente).

### Passo 4 — Conectar o domínio à hospedagem
1. No painel do Registro.br, acesse as configurações de **DNS** do
   domínio;
2. Sua hospedagem (Vercel, Netlify, cPanel etc.) vai indicar os
   endereços que você precisa cadastrar — normalmente um registro do
   tipo **A** (apontando para um IP) e/ou **CNAME** (apontando para um
   endereço como `cname.vercel-dns.com`);
3. Copie exatamente os valores que a hospedagem indicar para os campos
   de DNS no Registro.br;
4. Aguarde a propagação do DNS (pode levar de alguns minutos a até 48h).

### Passo 5 — Ativar HTTPS/SSL
A maioria das hospedagens modernas (Vercel, Netlify, Cloudflare Pages)
ativa o certificado SSL **automaticamente e de graça** assim que o
domínio é conectado corretamente — não é preciso fazer nada além de
aguardar. Em hospedagens tradicionais, procure a opção **"SSL grátis"**
ou **"Let's Encrypt"** dentro do painel (cPanel costuma ter um botão
"AutoSSL").

### Passo 6 — Atualizar o site depois
- Se estiver usando Vercel/Netlify conectado a um repositório Git: basta
  enviar (`git push`) as alterações e o site é atualizado sozinho.
- Se estiver usando FTP/cPanel: basta enviar os arquivos atualizados por
  cima dos antigos.
- Como os dados dos usuários ficam no navegador de cada pessoa
  (localStorage), atualizar os arquivos do site **não apaga** o
  progresso de estudo já salvo.

---

## 5. Funcionalidades incluídas nesta versão

- Onboarding com validação (mínimo de 1h de estudo por dia);
- Geração automática da agenda entre a data de início e a prova,
  intercalando as 4 áreas do ENEM, com dias de revisão, simulado e
  redação reservados;
- Dashboard com contagem regressiva, progresso geral, horas da semana,
  atrasos e próximo conteúdo;
- Agenda por dia com filtros de status/área e ações (concluir, editar
  observação, reagendar, excluir, iniciar cronômetro);
- Calendário mensal/semanal/diário com cores por tipo/status e detalhe
  ao clicar no dia;
- Página de Conteúdos com busca, filtros, status, dificuldade, questões
  resolvidas e observações por tópico;
- Cronômetro de estudo persistente (sobrevive a atualizações de página);
- Redação: registro de temas, competências 1–5, nota e gráfico de
  evolução;
- Revisões e Simulados: registro de simulados por área com gráficos de
  desempenho e evolução;
- Relatórios: horas por período, progresso por área, taxa de conclusão
  do plano, evolução de simulados e redações;
- Configurações: editar plano, regerar agenda (preservando o histórico
  já estudado), exportar/importar/limpar dados e alternar modo escuro.

## 6. Próximos passos sugeridos (fora do escopo desta versão)
- Autenticação de usuário e sincronização entre dispositivos (exigiria
  um backend/banco de dados, ver seção 3);
- Arrastar-e-soltar tarefas no calendário (hoje o reagendamento é feito
  por um seletor de data, para manter o código simples e robusto em
  qualquer navegador/dispositivo);
- Notificações/lembretes por e-mail ou push.
