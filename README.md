# 📊 Calculadora Premium

Um sistema web completo de calculadora com pagamento PIX integrado. Interface premium, backend seguro e fluxo de pagamento real.

---

## 🎯 Características

✅ **Calculadora Funcional** - Cálculo de percentuais com validação em backend
✅ **Resultado Bloqueado** - Resultado só aparece após pagamento confirmado
✅ **Pagamento PIX Real** - Integração com API de pagamento
✅ **QR Code Dinâmico** - Gerado automaticamente para cada cobrança
✅ **PIX Copia e Cola** - Código PIX pronto para copiar
✅ **Verificação Automática** - Polling para confirmar pagamento
✅ **Webhook** - Recebe confirmação oficial do provedor
✅ **Design Premium** - Interface moderna, responsiva e animada
✅ **Segurança** - Validação backend, sem confiança no frontend
✅ **Banco de Dados** - Armazenamento persistente de transações

---

## 🏗️ Estrutura do Projeto

```
calculadora-premium/
│
├── frontend/
│   ├── index.html          # Interface HTML
│   ├── style.css           # Estilos premium
│   └── script.js           # Lógica do cliente
│
├── backend/
│   ├── server.js           # Servidor Express
│   ├── database.js         # Gerenciamento de dados
│   ├── package.json        # Dependências
│   └── .env.example        # Variáveis de ambiente
│
├── .gitignore
└── README.md
```

---

## 🚀 Início Rápido

### 1️⃣ Clonar Repositório

```bash
git clone https://github.com/desenvolvedor20260-lab/calculadora-premium.git
cd calculadora-premium
```

### 2️⃣ Instalar Dependências

```bash
cd backend
npm install
```

### 3️⃣ Configurar Variáveis de Ambiente

Copie o arquivo `.env.example` para `.env`:

```bash
cp .env.example .env
```

Abra `.env` e configure:

```env
PORT=3000
PIX_KEY=509.166.058-50
PAYMENT_AMOUNT=2490
NODE_ENV=development
```

### 4️⃣ Executar o Servidor

```bash
npm start
```

Você verá:

```
╔═══════════════════════════════════════════╗
║     CALCULADORA PREMIUM - BACKEND         ║
╚═══════════════════════════════════════════╝

🚀 Servidor rodando em: http://localhost:3000
📱 Frontend: http://localhost:3000
🔑 Chave PIX: ✅ Configurada
💰 Valor do pagamento: R$ 24,90
```

### 5️⃣ Acessar no Navegador

Abra: **http://localhost:3000**

---

## 💻 Como Usar

### Fluxo do Usuário

1. **Preencher Dados**
   - Insira o valor
   - Insira o percentual
   - Clique em "CALCULAR"

2. **Ver Resultado Bloqueado**
   - O resultado aparece desfocado
   - Mensagem pedindo pagamento de R$ 24,90

3. **Realizar Pagamento**
   - Clique em "VER MEU RESULTADO"
   - Escolha entre:
     - Escanear **QR Code** com seu banco
     - Copiar **PIX Copia e Cola**

4. **Confirmação Automática**
   - Sistema verifica o pagamento a cada 3 segundos
   - Quando confirmado, resultado é liberado

5. **Ver Resultado**
   - Resultado completo aparece após pagamento
   - Opção para fazer novo cálculo

---

## 🔐 Segurança

### ⚠️ Frontend
- ❌ Nunca confia em localStorage/sessionStorage
- ❌ Nunca confia em parâmetros de URL
- ❌ Nunca confia em cookies manipuláveis
- ❌ Resultado bloqueado visualmente até backend confirmar

### ✅ Backend
- Validação completa de entrada
- Resultado armazenado somente após pagamento confirmado
- Resposta 403 Forbidden se acessar sem pagamento
- Webhook com validação de assinatura
- Sessão única por usuário
- Proteção contra duplo pagamento

---

## 🔗 API Endpoints

### Calculadora

```http
POST /api/calculate
Content-Type: application/json

{
  "sessionId": "session_xxx",
  "value": 1000,
  "percentage": 10
}
```

**Response:**
```json
{
  "success": true,
  "result": 100,
  "sessionId": "session_xxx"
}
```

---

### Criar Pagamento

```http
POST /api/payment/create
Content-Type: application/json

{
  "sessionId": "session_xxx",
  "amount": 2490,
  "result": 100
}
```

**Response:**
```json
{
  "success": true,
  "paymentId": "pay_1234567890",
  "qrCode": "data:image/png;base64,...",
  "pixCopiaECola": "00020126580014br.gov.bcb.pix..."
}
```

---

### Consultar Status de Pagamento

```http
GET /api/payment/status/pay_1234567890
```

**Response:**
```json
{
  "paymentId": "pay_1234567890",
  "status": "pending|paid|failed|expired|cancelled",
  "amount": 2490,
  "createdAt": "2026-08-25T02:30:00Z"
}
```

---

### Webhook (Receber Confirmação)

```http
POST /api/payment/webhook
Content-Type: application/json
X-Webhook-Signature: [assinatura do provedor]

{
  "paymentId": "pay_1234567890",
  "status": "paid",
  "paidAt": "2026-08-25T02:35:00Z"
}
```

---

### Buscar Resultado

```http
GET /api/result/session_xxx
```

**Response (Pagamento Confirmado):**
```json
{
  "success": true,
  "result": 100,
  "status": "paid",
  "paidAt": "2026-08-25T02:35:00Z"
}
```

**Response (Sem Pagamento):**
```json
{
  "error": "Pagamento necessário para acessar este resultado.",
  "code": "PAYMENT_REQUIRED"
}
```

---

## 💳 Configurar Pagamento PIX Real

### Provedores Disponíveis

| Provedor | Site |
|----------|------|
| **Mercado Pago** | mercadopago.com.br |
| **Asaas** | asaas.com |
| **Gerencianet** | gerencianet.com.br |
| **Stone** | stone.com.br |
| **Stripe** | stripe.com |

### Passos

1. Faça login na plataforma
2. Gere chaves de API
3. Configure no `.env`
4. Integre a API no `server.js`
5. Configure webhook

---

## 🧪 Testando Localmente

### Modo Desenvolvimento

**Listar todos os pagamentos:**
```bash
curl http://localhost:3000/api/admin/payments
```

**Confirmar pagamento (teste):**
```bash
curl -X POST http://localhost:3000/api/admin/payment/pay_xxx/confirm
```

⚠️ Estas rotas só funcionam com `NODE_ENV=development`

---

## 📱 Responsividade

Funciona perfeitamente em:

- 📱 Celular (320px - 480px)
- 📱 Celular grande (480px - 768px)
- 📱 Tablet (768px - 1024px)
- 💻 Desktop (1024px+)

---

## 🎨 Design Premium

### Cores
- **Primária**: #6366f1 (Indigo)
- **Secundária**: #8b5cf6 (Roxo)
- **Sucesso**: #10b981 (Verde)
- **Fundo**: #0f172a (Azul escuro)

### Animações
- Float (logo)
- Slide In (seções)
- Spin (loading)
- Pulse (ícones)

---

## 📚 Variáveis de Ambiente

```env
# Servidor
PORT=3000
NODE_ENV=development

# PIX
PIX_KEY=509.166.058-50
PAYMENT_AMOUNT=2490

# API de Pagamento
PAYMENT_API_KEY=
PAYMENT_CLIENT_ID=
PAYMENT_CLIENT_SECRET=
PAYMENT_WEBHOOK_SECRET=
```

---

## 🚀 Deploy em Produção

### Heroku

```bash
heroku login
heroku create calculadora-premium
heroku config:set PIX_KEY=509.166.058-50
git push heroku main
```

### Vercel/Netlify

- Frontend no Vercel/Netlify
- Backend em servidor Node.js separado

---

## 📝 Tecnologias

- **Frontend**: HTML5, CSS3, JavaScript Vanilla
- **Backend**: Node.js, Express.js
- **Banco de Dados**: JSON (pronto para integrar MySQL/MongoDB)
- **Pagamento**: PIX (QR Code + Copia e Cola)

---

## 👨‍💻 Desenvolvedor

**Desenvolvedor20260-lab** - 2026

---

## ⭐ Se gostou, deixe uma estrela!

```
Calculadora Premium 📊
│
├── Premium Design ✨
├── Pagamento PIX Real 💳
├── Backend Seguro 🔐
├── Responsivo 📱
└── Pronto para Produção 🚀
```

**Desenvolvido com ❤️**
