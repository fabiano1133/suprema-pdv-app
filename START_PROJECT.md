Você é um Frontend Engineer Sênior especializado em aplicações Enterprise, com foco em UX/UI para sistemas operacionais de uso diário (caixa, vendas, controle interno).

Seu objetivo é construir um MVP de um web app para controle de vendas de uma loja física de semijoias, utilizando DADOS MOCKADOS nesta primeira fase, exclusivamente para validação de UX, UI e fluxo de uso.

⚠️ IMPORTANTE:
- NÃO integrar com backend real por enquanto
- Utilizar mocks em memória (arrays, context ou services fake)
- Priorizar clareza, velocidade de uso e simplicidade visual
- O app deve funcionar bem em MOBILE (mobile-first), mas também em desktop

---

## STACK OBRIGATÓRIA
- React (última versão estável)
- TailwindCSS (última versão)
- react-hook-form
- zod (validação)
- TypeScript
- Sem autenticação
- Sem estado global complexo (evitar Redux, Zustand etc. por enquanto)

---

## ESTILO VISUAL
- Estilo: Enterprise / SaaS profissional
- Paleta sóbria:
  - tons de cinza
  - azul escuro ou verde escuro como cor primária
- UI limpa, sem exageros
- Tipografia legível
- Componentes claros, com hierarquia visual forte
- Layout funcional (caixa de supermercado)

---

## DOMÍNIO DO SISTEMA (MODELO MENTAL)

- SKU (Semijoia):
  - representa o produto (modelo)
  - pode ser vendido várias vezes
- Comanda:
  - representa uma venda
  - contém vários SKUs com quantidade
- O sistema apenas REGISTRA a venda no caixa
- Estoque é controlado por SKU (mockado)

---

## DADOS MOCKADOS INICIAIS


```ts
{
  id: number
  sku: string
  nome: string
  preco: number
  estoque: number
}

### Comanda (Venda)
{
  id: number
  codigo: string
  status: 'ABERTA' | 'FECHADA'
  clienteNome?: string
  itens: ComandaItem[]
}
### ComandaItem (Transacional)
{
  skuId: number
  nome: string
  precoUnitario: number
  quantidade: number
  subtotal: number
}
TELAS OBRIGATÓRIAS
Lista de Comandas (HOME)
Listar todas as comandas
Filtros:
status (ABERTA / FECHADA)
Botão fixo:
➕ Criar nova comanda

Criar Comanda
Campo opcional:
nome do cliente
Botão:
Criar comanda
Ao criar, redirecionar para a tela da comanda

Tela da Comanda (CAIXA)
Estilo caixa de supermercado.
Elementos:
Campo grande para buscar SKU (por nome ou código)
Lista de itens adicionados:
nome
quantidade (+ / -)
subtotal
Total da venda fixo no rodapé
Botões:
remover item
fechar comanda
Regras:
Se adicionar o mesmo SKU, incrementar quantidade
Bloquear se quantidade > estoque disponível
Atualizar total automaticamente

Cadastro de Semijoias (SKU)
Formulário usando react-hook-form + zod
Campos:
SKU
Nome
Preço
Quantidade em estoque
Listar SKUs cadastrados abaixo do formulário.

Geração de Etiquetas (Mock)
Selecionar um SKU
Informar quantidade
Gerar visualmente uma lista de etiquetas (mock)
NÃO gerar PDF ainda
Apenas layout visual da etiqueta
Etiqueta deve conter:
Nome da joia
SKU
Código fictício da peça

REGRAS IMPORTANTES
Sem login
Sem permissões
Sem backend
Código organizado por features
Componentes reutilizáveis
UX simples e rápida (uso real em loja)

OBJETIVO FINAL
Entregar um MVP funcional visualmente, com fluxo completo de venda, pronto para:
validação de UX/UI
ajustes de fluxo
futura integração com backend real
Construa o projeto completo seguindo essas diretrizes.


---

## 🧠 Por que esse prompt funciona
- Ele **limita escopo** (Cursor não inventa coisa)
- Ele **força mock** (sem backend agora)
- Ele **prioriza UX real de caixa**
- Ele **usa stack moderna e segura**
- Ele já prepara o terreno pra plugar API depois

---

## Próximo passo recomendado (sem perder tempo)
Depois que o Cursor gerar isso:

1️⃣ Você usa o app **1–2 dias na loja (simulado)**  
2️⃣ Anota:
- onde travou
- o que está lento
- o que é desnecessário  

3️⃣ Aí sim:
- conecta no backend
- ajusta estoque real
- imprime etiquetas de verdade

---

Se quiser, no próximo passo eu:
- reviso o **output do Cursor**
- ajusto o **UX do caixa**
- ou escrevo o **prompt da Fase 2 (integração real)**

Mas por agora:  
👉 **esse prompt já te coloca em produção mentalmente hoje.**
