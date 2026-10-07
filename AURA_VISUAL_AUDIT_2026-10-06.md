# AURA SYSTEM STYLE • AUDITORIA VISUAL DE PONTA A PONTA

Data: 2026-10-06
Base funcional auditada: InvistaPro-V10 main @ 3608f0dcf2d18cc4f0ab5ba9984583d83aad31fc
Camada auditada: Invista-PRO-V10-Aura-System-Style
Escopo: coerência visual, identidade Aura, tokens, superfícies, tipografia, cor, estados, navegação, responsividade e componentes compartilhados.

## 1. VEREDITO

STATUS: REPROVADO PARA "100% AURA".

A arquitetura de sincronização está correta, mas a camada visual atual é apenas um skin global parcial. Ela ainda não transforma toda a aplicação em um sistema Aura consistente.

Principais evidências:
- 20 páginas públicas/protegidas auditadas.
- Trading System possui ~1.261 ocorrências de classes cromáticas Tailwind, incluindo azul, índigo, roxo, verde, vermelho, âmbar, laranja, ciano, rosa e violeta.
- MetaTrader possui ~347 ocorrências cromáticas.
- Resultados ~91.
- Transparência ~64.
- MetaTrader 5 ~61.
- Segurança ~49.
- Pending Approval ~36.
- Landing ~30.
- Como Funciona ~27.
- LGPD ~32.
- Tecnologia Financeira ~31.
- Políticas institucionais também mantêm cores semânticas legadas.
- O skin Aura atual cobre bem alguns tokens globais, mas não cria uma linguagem única para todos os componentes.
- O glass real está concentrado principalmente na autenticação. Cards, tabelas, painéis, tabs, dialogs e muitos módulos continuam herdando superfícies e estilos antigos.
- A tipografia base do Aura está em Segoe UI/Inter, enquanto o restante da aplicação continua usando suas próprias hierarquias e estilos locais.
- O campo de ícones Aura é visualmente atmosférico, porém usa aleatoriedade em posição, ícone e duração, produzindo uma composição não determinística entre carregamentos.

## 2. IDENTIDADE AURA QUE DEVE SER O PADRÃO

A aplicação deve ser percebida como um único produto, não como páginas antigas cobertas por um filtro.

Princípios-alvo:
- fundo deep-space quase preto;
- superfícies translúcidas em camadas;
- bordas finas luminosas;
- ciano como acento estrutural;
- violeta/púrpura apenas como acento secundário;
- verde/vermelho/âmbar reservados para estados semânticos;
- glassmorphism verdadeiro em cards e overlays;
- glow controlado;
- tipografia técnica limpa;
- ícones Lucide com stroke e escala consistentes;
- raios de borda coerentes;
- espaçamento em uma escala única;
- estados hover/focus/active/disabled padronizados;
- motion discreto e consistente;
- mobile e desktop com a mesma identidade.

## 3. SHELL GLOBAL

### Fundo
ATUAL: bom ponto de partida com #05070a, grid, circuitos e scanlines.
PROBLEMA: o grid/scanline funciona como efeito global, mas não há um sistema completo de superfícies que faça o conteúdo parecer integrado ao ambiente.

### Camadas
ATUAL: AuraVisualLayer fica atrás do #root.
PROBLEMA: muitos componentes permanecem opacos, neutralizando o efeito de profundidade.

### Cards
ATUAL: o override troca bg-card por rgba(8,12,18,.9).
PROBLEMA: isso é uma superfície escura, não necessariamente glass. Falta backdrop-filter, rim-light, variação de elevação e hierarquia entre superfície base, elevada e modal.

### Bordas
ATUAL: grande parte vira rgba(0,229,255,.14-.24).
PROBLEMA: ciano em excesso transforma toda borda em neon e reduz hierarquia.

### Sombras
ATUAL: shadows globais recebem glow ciano.
PROBLEMA: todos os níveis de sombra ficam muito parecidos. Aura precisa de níveis de profundidade, não apenas "sombra + brilho".

## 4. TIPOGRAFIA

ATUAL:
- Segoe UI/Inter como base.
- Componentes usam pesos e tamanhos locais.
- Há títulos muito grandes e hierarquias diferentes entre páginas.

INCONSISTÊNCIAS:
- falta escala tipográfica Aura centralizada;
- labels, captions e valores financeiros não possuem uma gramática única;
- números de trading precisam de tratamento técnico consistente;
- headings institucionais e dashboard parecem pertencer a produtos diferentes.

CORREÇÃO-ALVO:
Display / H1 / H2 / H3 / body / label / data / micro-label devem usar tokens únicos.

## 5. AUTENTICAÇÃO

STATUS: É a área mais próxima do Aura.

PONTOS BONS:
- glass;
- ciano;
- tabs;
- glow;
- backdrop.

INCONSISTÊNCIAS:
- dependência de seletores estruturais frágeis como .grid>div:first-child;
- ainda há mensagens amber/blue herdadas;
- botão submit tem tratamento específico separado do sistema global;
- login é Aura, mas o restante da plataforma volta a estilos legados.

## 6. LANDING PAGE

Problemas detectados:
- azul, âmbar, índigo, verde e slate usados simultaneamente;
- gradients locais numerosos;
- cards com linguagem promocional antiga;
- footer e badges possuem identidade própria;
- efeitos de glass não são uniformes;
- cores semânticas e cores de marca se misturam.

Alvo:
Landing deve parecer a porta de entrada do mesmo dashboard Aura.

## 7. DASHBOARD / HOME

Arquivos principais:
- home.tsx
- dashboard/header.tsx
- dashboard/action-buttons.tsx
- dashboard/portfolio-overview.tsx
- dashboard/transaction-history.tsx

Problemas:
- action-buttons usa verde/âmbar/azul diretamente;
- portfolio usa emerald/amber;
- transaction-history usa blue/green/red/gray;
- header não possui uma camada Aura explícita;
- tabelas ainda dependem de estados Tailwind legados.

Alvo:
- header glass;
- cards de patrimônio com níveis de profundidade;
- números com glow mínimo;
- lucro = semantic green;
- perda = semantic red;
- ação principal = Aura cyan;
- atenção = amber;
- nenhuma cor arbitrária fora dos tokens.

## 8. TRADING SYSTEM

STATUS: MAIOR FOCO DA REFORMA.

Arquivo: trading-system.tsx, ~379 KB.

Problema crítico:
A página possui aproximadamente 1.261 ocorrências cromáticas Tailwind.

Há uma grande quantidade de:
- blue;
- indigo;
- purple;
- violet;
- emerald;
- green;
- red;
- orange;
- amber;
- yellow;
- pink;
- cyan;
- gray.

Isso cria dezenas de micro-identidades.

Elementos que precisam convergir:
- header;
- saldo;
- conta demo/real;
- tabs;
- cards de modalidades;
- Digits;
- Altas & Baixas;
- Dentro & Fora;
- Accumulators;
- Boom/Crash;
- configuração;
- tokens;
- IA;
- logs;
- histórico;
- status;
- botões start/stop;
- indicadores;
- progress bars;
- alertas;
- dialogs;
- tabelas;
- gráficos;
- filtros;
- badges;
- tooltips;
- estados loading/error/empty.

Regra:
A modalidade não deve escolher sua própria identidade visual. A modalidade escolhe apenas o estado semântico. O sistema visual continua sendo Aura.

## 9. METATRADER

Arquivo: metatrader-page.tsx, ~136 KB.

STATUS: CRÍTICO.

~347 ocorrências cromáticas.

Problemas:
- enorme quantidade de estados green/red/yellow/blue;
- interface extensa com identidade própria;
- painéis e controles não estão unificados com o Aura shell;
- trading terminal precisa parecer um "Aura command center", não uma aplicação separada.

Alvo:
- terminal dark glass;
- painel lateral Aura;
- cards de posição;
- gráficos com fundo transparente;
- estados de P/L sem quebrar o tema;
- controles técnicos em ciano;
- alertas sem backgrounds sólidos.

## 10. METATRADER 5

STATUS: CRÍTICO.

~61 ocorrências cromáticas.

Problemas:
- azul, verde, vermelho e amarelo ainda têm tratamentos próprios;
- vários backgrounds sólidos;
- estados dark/light misturados.

Alvo:
mesma linguagem visual do MetaTrader e Trading System.

## 11. INSTITUCIONAIS

Páginas:
- Como Funciona
- LGPD
- Política de Cookies
- Política de Privacidade
- Quem Somos
- Segurança
- Tecnologia Financeira
- Termos de Uso
- Transparência
- Resultados

Problema estrutural:
Essas páginas foram construídas com componentes promocionais/institucionais claros e cores próprias. O override global escurece parte delas, mas não redesenha sua hierarquia.

Exemplos:
- Como Funciona: blue/green/purple/amber/red.
- LGPD: green/amber/blue/purple/orange.
- Segurança: red/blue/green/purple/orange.
- Resultados: ~91 ocorrências cromáticas.
- Transparência: ~64 ocorrências.

Alvo:
Todas devem compartilhar:
- mesmo header;
- mesmo fundo;
- mesmo container;
- mesma tipografia;
- mesmo card glass;
- mesma iconografia;
- mesmo sistema de callout;
- mesmo footer;
- mesmos estados de link.

## 12. PENDING APPROVAL

Problemas:
- backgrounds gray/green/orange/blue;
- cards claros herdados;
- sem linguagem de "status terminal".

Alvo:
status card Aura com:
- cyan para processo;
- green para aprovado;
- amber para aguardando;
- red para bloqueio;
- glass surface única.

## 13. KEEP ALIVE

Problemas:
- green/red/blue/purple/orange;
- indicadores de sistema visualmente antigos.

Alvo:
monitor técnico Aura:
- online = cyan/green sem fundo sólido;
- offline = red;
- warning = amber;
- logs em mono;
- indicadores com glow discreto.

## 14. RESET PASSWORD / NOT FOUND

Essas páginas são simples e podem ser completamente absorvidas pelo shell Aura.

Devem compartilhar:
- background;
- glass card;
- typography;
- CTA;
- focus states;
- logo;
- ambient effects.

## 15. COMPONENTES UI FUNDAMENTAIS

Card:
ATUAL: rounded-lg border bg-card shadow-sm.
PROBLEMA: não é um card Aura por si só.
ALVO: surface glass tokenizada.

Button:
ATUAL: variantes shadcn tradicionais.
PROBLEMA: default/secondary/outline/ghost não possuem uma assinatura Aura consistente.
ALVO: Primary Cyan, Secondary Glass, Ghost, Danger, Success, Icon.

Input:
ATUAL: bg-background.
PROBLEMA: depende do tema base.
ALVO: inset glass input + rim border + focus glow.

Badge:
ATUAL: background baseado em primary/secondary/destructive.
ALVO: badges translúcidos com borda semântica.

Tabs:
ATUAL: bg-muted e active bg-background.
ALVO: segmented glass control com active cyan/violet glow.

Dialog:
ATUAL: bg-background + shadow.
ALVO: deep glass modal + backdrop + rim-light.

Select:
ATUAL: bg-popover.
ALVO: popover glass idêntico a dialog/menu.

Table:
ATUAL: tabela neutra.
ALVO: terminal data surface, cabeçalho translúcido, linhas com hover Aura.

## 16. ASSISTENTE IA

AiAssistant.tsx possui múltiplas identidades violet/indigo/red.

Alvo:
- Aura AI deve ser uma entidade visual própria, mas pertencente ao mesmo sistema;
- violet pode ser reservado à IA;
- sem caixas violetas pesadas;
- glow suave;
- mensagens em glass;
- streaming com microanimação;
- erro em red sem abandonar o glass.

## 17. GRÁFICOS

Simple chart e demais gráficos precisam de:
- canvas transparente;
- grid quase invisível;
- cyan como série primária;
- green/red apenas para semântica;
- tooltip glass;
- eixos muted;
- pontos/linhas com glow controlado.

Não usar uma paleta multicolorida por padrão.

## 18. ICONOGRAFIA

ATUAL:
Lucide é consistente como biblioteca, mas as cores e tamanhos variam.

ALVO:
- 16px controles;
- 18px navegação;
- 20px ações;
- 24px status;
- 32px hero;
- stroke 1.75 aproximadamente;
- cyan somente para ícone ativo/brand;
- semantic colors somente quando representam estado.

O campo de ícones flutuantes Aura deve deixar de ser aleatório para permitir composição visual estável.

## 19. MOTION

ATUAL:
- auraFloat;
- auraPulse;
- auraScan;
- auraRotate;
- várias animações locais da aplicação.

PROBLEMA:
não há uma escala única de motion.

ALVO:
- micro 120-180ms;
- interface 200-280ms;
- entrada 300-450ms;
- ambient 8-40s;
- respeitar prefers-reduced-motion.

## 20. RESPONSIVIDADE

A auditoria estática encontrou regras mobile apenas pontuais.

Alvo:
auditar pelo menos:
- 390x844;
- 768x1024;
- 1280x800;
- 1440x900.

Em especial:
- Trading System;
- MetaTrader;
- MetaTrader5;
- Dashboard;
- Auth;
- Landing;
- dialogs;
- tables;
- tabs;
- sidebars;
- floating AI.

## 21. PRIORIDADE DE CORREÇÃO

P0:
1. Design tokens Aura globais.
2. Card/surface glass universal.
3. Button/Input/Tabs/Dialog/Select/Table/Badge.
4. Trading System.
5. MetaTrader.
6. Dashboard shell/header/navigation.

P1:
7. Landing.
8. MetaTrader5.
9. AI Assistant.
10. Charts.
11. Pending Approval.
12. Keep Alive.

P2:
13. Todas as páginas institucionais.
14. Not Found.
15. Reset Password.
16. Footer e microcomponentes.

## 22. CRITÉRIO DE ACEITAÇÃO

A plataforma só será considerada "100% Aura" quando:

- nenhuma página apresentar aparência de light/legacy UI;
- nenhuma superfície principal depender de bg-white/bg-gray/bg-blue etc.;
- cores de marca estiverem tokenizadas;
- semântica green/red/amber estiver separada da identidade de marca;
- cards, dialogs, popovers, tabs e inputs usarem a mesma linguagem;
- tipografia seguir a mesma escala;
- radius seguir a mesma escala;
- sombras seguirem a mesma escala;
- focus/hover/active/disabled seguirem o mesmo padrão;
- gráficos seguirem o mesmo tema;
- mobile seguir o mesmo sistema;
- o usuário puder navegar da autenticação ao Trading, MetaTrader e páginas institucionais sem perceber troca de produto;
- o visual for validado em desktop, tablet e mobile;
- o CI impedir regressão visual.

## CONCLUSÃO

A Aura atual é uma boa camada atmosférica, mas ainda não é um Design System completo.

O maior problema não é falta de "efeito neon". É falta de unificação estrutural.

A próxima implementação deve ser feita como uma verdadeira camada de Design System Aura sobre o core canônico, substituindo progressivamente as dezenas de estilos locais por tokens e componentes visuais comuns, sem alterar qualquer lógica funcional.
