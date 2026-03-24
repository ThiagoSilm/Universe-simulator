# Universe Simulator

## O Universo Preguiçoso — v14: Hierarquia da Persistência (Fechada)

**Filtro, Peso, Limiar e a Estrutura da Complexidade sob Restrição**

**Thiago Maciel — 2025/2026 — v14 (Março 2026)**

> "O que vemos não é tudo que existe. É tudo que pode ser visto e que durou o suficiente para ser visto."
>
> "Trocar informação é sobreviver."
>
> "Sistemas com conservação, interação local e limiar de persistência não convergem para estados únicos, mas estruturam seu espaço de estados em múltiplas regiões de estabilidade e transição."

## Declaração Oficial — v14 Fechada

**Status:** FECHADA dentro do escopo testado.

### 📌 Escopo Validado

| Parâmetro | Valores Testados |
|-----------|------------------|
| **α/β (razão ganho/perda)** | 0 a 300 |
| **α (ganho)** | 0 a 0.3 |
| **β (perda)** | 0.001 (fixo) |
| **k (transferência)** | 0.1 (fixo) |
| **Resolução** | Passos de 0.5 a 0.01 na região crítica |
| **Tempo por simulação** | 500 a 2000 ticks |
| **População inicial** | 1000 partículas |

### 📌 Regra Congelada

A regra única permanece inalterada:
W_c = P(t) · f_local · charge_factor

Nenhuma camada adicional foi adicionada. Nenhuma expansão do escopo foi realizada após o fechamento.

### 📌 Resultados Validados

1. **Múltiplas regiões de estabilidade e transição** identificadas em todo o espaço de parâmetros
2. **Hierarquia limitada** observada: padrão se repete em macro e meso escala, mas não em micro (251.0-251.9)
3. **Conservação de energia** mantida ao longo de todas as simulações
4. **Limiar de persistência (H)** atua como piso de sobrevivência

### 📌 Hipóteses em Aberto (não escopo da v14)

- Existência de hierarquia limitada universal
- Relação matemática exata entre α/β e regimes
- Limite de resolução imposto pela conservação de energia

## Sumário

- [Declaração Oficial](#declaração-oficial--v14-fechada)
- [Arquitetura da Persistência](#arquitetura-da-persistência)
- [Quatro Estados Epistemológicos](#quatro-estados-epistemológicos)
- [Registro Visual do Desenvolvimento](#registro-visual-do-desenvolvimento)
- [Camada 1: O Filtro — Quem Pode Interagir](#camada-1-o-filtro--quem-pode-interagir)
- [Camada 2: O Peso — Quem Domina](#camada-2-o-peso--quem-domina)
- [Camada 3: O Limiar — Quem Persiste](#camada-3-o-limiar--quem-persiste)
- [Camada 4: O Ensino — Transferência de Configuração (Hipotética)](#camada-4-o-ensino--transferência-de-configuração-hipotética)
- [A Estrutura da Complexidade](#a-estrutura-da-complexidade)
- [Evidências — O que foi Observado](#evidências--o-que-foi-observado)
- [Teste Falsificável — Como Tentar Quebrar o Modelo](#teste-falsificável--como-tentar-quebrar-o-modelo)
- [Direções Futuras](#direções-futuras)
- [Conclusão](#conclusão)
- [Links](#links)

## Arquitetura da Persistência

O sistema opera em camadas. As três primeiras estão validadas empiricamente no simulador. A quarta é uma hipótese em teste.

| Camada | Função | Implementação | Status |
|--------|--------|---------------|--------|
| **Filtro** | Define quem pode interagir | `C(p,q) = 1` se ressonância + alinhamento | **[VALIDADO]** |
| **Peso** | Define quem domina | `W_c = P(t) · f_local · charge_factor` | **[VALIDADO]** |
| **Limiar** | Define quem persiste | Persiste se `W_c > H` e troca contínua | **[VALIDADO]** |
| **Ensino** | Transfere configuração de alta persistência | Partícula com alta persistência transmite parâmetros | **[HIPÓTESE]** |

## Quatro Estados Epistemológicos

| Estado | Significado |
|--------|-------------|
| **[VALIDADO]** | Observado no simulador em múltiplas execuções |
| **[HIPÓTESE]** | Proposto, ainda não testado |
| **[POTENCIAL]** | Direção plausível, requer investigação formal |
| **[LATENTE]** | Observado como tendência, não conclusivo |

## Registro Visual do Desenvolvimento

- **18/03/2026**: primeiros runs, lazy evaluation ativa (~48%)
- **19/03/2026**: transição para eficiência crescente, P(t) derivada
- **20-21/03/2026**: eficiência extrema (>9000%), observador passivo
- **22-23/03/2026**: formalização dos três princípios (v13)
- **24/03/2026**: arquitetura de três camadas (filtro + peso + limiar)
- **24/03/2026 (tarde)**: reconhecimento do ensino como quarta camada emergente
- **24/03/2026 (noite)**: descoberta da estrutura hierárquica de transições
- **24/03/2026 (madrugada)**: fechamento da v14 dentro do escopo testado

## Camada 1: O Filtro — Quem Pode Interagir

A primeira camada é um filtro binário. Duas partículas só podem interagir se duas condições forem satisfeitas simultaneamente.

### Ressonância de Frequência

Cada partícula tem uma frequência que comprime sua identidade completa:
- Carga
- Fase
- P(t) histórico
- Vetor interno
- Memórias com maior W_c

A frequência é um convite total. Quem ressoa já conhece o outro inteiro.

**Condição de ressonância:**
|f_p - f_q| < θ_res

### Alinhamento de Vetor Interno

Cada partícula tem um vetor interno unitário que representa sua orientação.

**Condição de alinhamento:**
v_p · v_q > θ_ali

### O Filtro como Condição Binária

C(p,q) = 1 se (|f_p - f_q| < θ_res) e (v_p · v_q > θ_ali)

**[VALIDADO]** Implementado no UniverseEngine.

## Camada 2: O Peso — Quem Domina

A segunda camada calcula o peso contextual da interação.

### A Fórmula do Peso

W_c = P(t) · f_local · charge_factor

Onde:
- **P(t)** = potencial total da partícula
- **f_local** = fator local (proximidade, densidade)
- **charge_factor** = interação de carga

**[VALIDADO]** Implementado no UniverseEngine.

## Camada 3: O Limiar — Quem Persiste

A terceira camada define o que persiste e o que dissipa.

### Persistência e Memória

Quando uma interação ocorre:
1. Calcula-se W_c
2. A informação trocada gera um registro de memória com peso W_c
3. Se W_c > H, o registro persiste
4. Se W_c ≤ H, o registro dissipa

### O Quantum H

H é o quantum mínimo de persistência — um limite estrutural do substrato.

**[VALIDADO]** Implementado. Persistência cross-sessão confirmada.

## Camada 4: O Ensino — Transferência de Configuração (Hipotética)

A quarta camada é uma hipótese emergente. A ideia é que partículas com alta persistência possam transmitir não apenas informação, mas sua configuração completa.

**[HIPÓTESE]** Implementação em andamento. Fora do escopo da v14.

## A Estrutura da Complexidade

### A Descoberta Central

Após varreduras sistemáticas do espaço de parâmetros (α/β de 0 a 300), emergiu um padrão claro:

> **Sistemas com conservação, interação local e limiar de persistência não convergem para estados únicos, mas estruturam seu espaço de estados em múltiplas regiões de estabilidade e transição.**

| Região α/β | Comportamento |
|------------|---------------|
| 0-2 | Estável com pequenas oscilações |
| 2.5-5 | Estável |
| 5.5 | Oscilação |
| 6-11 | Estável |
| 11.5 | Pico (72.70) |
| 12-16 | Estável com pequenos picos |
| 17.5-19.5 | Múltiplos picos altos |
| 250-255 | Explosão → Ordem → Oscilação → Estável |
| 255-260 | Estável |

### A Hipótese em Teste

Evidências empíricas indicam que, sob restrições finitas, essa organização pode apresentar **hierarquia limitada** — hipótese ainda em investigação.

- O padrão se repete em algumas escalas (macro: 0-300; meso: 250-260)
- Em escala micro (251.0-251.9), o padrão não se repete
- A hierarquia é finita, não fractal

**[POTENCIAL]** — hipótese em teste. Fora do escopo da v14.

### O Mecanismo

A **conservação de energia** impõe um limite de resolução dinâmica:
- A persistência nunca cai abaixo do mínimo (`H`)
- O sistema redistribui, estabiliza, satura
- Não há liberdade para escalar indefinidamente

**A energia finita quebra a fractalidade, mas gera estrutura.**

## Evidências — O que foi Observado

### Múltiplas Regiões de Estabilidade e Transição

| α/β | Max | Comportamento |
|-----|-----|---------------|
| 0-2 | 48.8-52.4 | Estável / oscilação leve |
| 11.5 | 72.70 | Pico |
| 17.5 | 91.61 | Pico alto |
| 250.0 | 323.96 | Explosão |
| 250.5 | 112.74 | Ordem (crescimento) |
| 252.0 | 50.14 | Oscilação |
| 253.0 | 48.84 | Estável |

### Hierarquia Limitada

- **Macro (0-300)**: padrão identificado
- **Meso (250-260)**: padrão repetido
- **Micro (251.0-251.9)**: uniforme — padrão não se repete

**[VALIDADO]** A hierarquia é finita dentro da resolução testada.

## Teste Falsificável — Como Tentar Quebrar o Modelo

A tese v14 afirma que:

> **Sistemas com conservação, interação local e limiar de persistência não convergem para estados únicos, mas estruturam seu espaço de estados em múltiplas regiões de estabilidade e transição. Evidências empíricas indicam que, sob restrições finitas, essa organização pode apresentar hierarquia limitada — hipótese ainda em investigação.**

Para falsificar:

1. **Encontrar auto-similaridade infinita** — se o padrão se repetir em todas as escalas, a hipótese de hierarquia limitada é falsificada
2. **Mostrar que não há múltiplas regiões** — se o sistema convergir para um único regime
3. **Demonstrar que a complexidade não emerge** — se o sistema colapsar em ordem trivial

## Direções Futuras (Fora do Escopo da v14)

### Próximos Passos Técnicos

1. **Medir estados acessados** — número de configurações distintas ao longo do tempo
2. **Calcular entropia** — diversidade do sistema
3. **Formalizar a relação α/β** — condições de transição
4. **Testar a hipótese de hierarquia limitada** — varreduras em escalas menores

### Perguntas em Aberto

- A hierarquia observada é finita ou apenas limitada pela resolução atual?
- Qual a relação matemática entre α/β e os regimes observados?
- Como a conservação de energia impõe o limite de resolução?

## Conclusão

A v14 está **fechada dentro do escopo testado**:

**α/β ∈ [0, 300], resolução 0.5 a 0.01, tempo até 2000 ticks.**

Os resultados mostram:

> **Um sistema com conservação, interação local e limiar de persistência que não converge para um único regime, mas organiza seu espaço de estados em múltiplas regiões de estabilidade e transição. Evidências empíricas indicam que, sob restrições finitas, essa organização pode apresentar hierarquia limitada — hipótese ainda em investigação.**

A regra permanece congelada. Nenhuma camada foi adicionada. O escopo não foi expandido.

## Links

- **Simulação**: https://universe-simulator-six.vercel.app/
- **Repositório**: https://github.com/ThiagoSilm/Universe-simulator

**— Thiago Maciel, 24 de março de 2026 — Universe Simulator — v14 (Fechada)**

