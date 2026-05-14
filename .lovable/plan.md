## Plano

### 1. Bug crítico: Vendas "sumidas" do mês anterior
**Causa identificada:** O Supabase tem limite padrão de **1000 linhas por consulta**. Como o sistema já tem 1000+ entregas cadastradas, a query `fetchAll()` no Admin (`AdminDashboard.tsx` linha 241) está cortando as mais antigas, fazendo elas sumirem do "Baixa de Notas". Elas continuam no banco — só não aparecem.

**Correção:** Buscar entregas em páginas de 1000 e juntar tudo, OU buscar separadamente as não-pagas (limitando o universo). Vou usar paginação por `range()` para pegar todas.

### 2. Pesquisa de devedores por cliente (Admin)
Adicionar campo de busca no card "Baixa de Notas" para filtrar pendentes pelo nome do cliente.

### 3. Pagamento parcial de notas
- Adicionar coluna `amount_paid` (numeric) na tabela `deliveries`
- No card de "Baixa de Notas", além do botão "Dar baixa total", incluir botão "Pagamento parcial" com input do valor recebido
- Mostrar valor restante (Total − Pago) em vermelho
- Quando reimprimir a nota, incluir linha: `PAGO: R$ X,XX` e `RESTANTE: R$ Y,YY`
- Marcar como totalmente paga apenas quando `amount_paid >= total`

### 4. Relatório de Vendas por dia e forma de pagamento
Novo card no Admin: tabela/agrupamento por dia × método de pagamento (Dinheiro, PIX, Cartão, Prazo, Boleto), com total por linha e coluna. Filtrável por período (hoje, 7d, 30d, mês).

### 5. Data da venda no relatório (Excel)
A exportação Excel já tem `created_at`, mas vou garantir coluna "Data da Venda" formatada `dd/MM/yyyy` no início.

### 6. Edição e exclusão de notas (Admin)
- Botão "Editar" em cada entrega no painel admin → abre modal para editar itens, cliente, observações, método de pagamento
- Botão "Excluir" com confirmação → remove `delivery_items` (cascade via RLS) e a entrega

### Migrações necessárias
- `ALTER TABLE deliveries ADD COLUMN amount_paid numeric NOT NULL DEFAULT 0;`

### Arquivos a alterar
- `supabase/migrations/...` — adicionar `amount_paid`
- `src/components/AdminDashboard.tsx` — paginação, busca em devedores, pagamento parcial, relatório por dia×pagamento, edição/exclusão
- `src/lib/thermalPrinter.ts` e `src/components/EmployeeDashboard.tsx` (recibo) — exibir Pago/Restante
- `src/components/DeliveryReceiptPrint.tsx` — mesmo

Posso começar pela **correção do bug das notas sumidas** + **migração `amount_paid`** primeiro, depois as funcionalidades. Confirma?