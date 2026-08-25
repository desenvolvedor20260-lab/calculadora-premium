/* ===============================================
   CALCULADORA PREMIUM - SERVIDOR BACKEND
   =============================================== */

const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');
require('dotenv').config();

const db = require('./database');

// ===============================================
// CONFIGURAÇÕES
// ===============================================

const app = express();
const PORT = process.env.PORT || 3000;
const PIX_KEY = process.env.PIX_KEY;
const PAYMENT_AMOUNT = parseInt(process.env.PAYMENT_AMOUNT) || 2490;

// ===============================================
// MIDDLEWARE
// ===============================================

app.use(cors());
app.use(express.json());
app.use(express.static('../frontend'));

// Log de requisições
app.use((req, res, next) => {
    console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.path}`);
    next();
});

// ===============================================
// INICIALIZAR
// ===============================================

db.initializeDatabase();

// Limpar pagamentos expirados a cada 5 minutos
setInterval(() => {
    db.cleanExpiredPayments();
    console.log('🧹 Limpeza de pagamentos expirados executada');
}, 5 * 60 * 1000);

// ===============================================
// ROTAS
// ===============================================

// HEALTH CHECK
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Servidor funcionando normalmente' });
});

// ===============================================
// ROTA: CALCULAR
// ===============================================

app.post('/api/calculate', (req, res) => {
    try {
        const { sessionId, value, percentage } = req.body;

        // Validações
        if (!sessionId || value === undefined || percentage === undefined) {
            return res.status(400).json({
                error: 'Parâmetros obrigatórios faltando'
            });
        }

        // Validar tipos
        const numValue = parseFloat(value);
        const numPercentage = parseFloat(percentage);

        if (isNaN(numValue) || isNaN(numPercentage)) {
            return res.status(400).json({
                error: 'Valor e percentual devem ser números'
            });
        }

        // Validar ranges
        if (numValue < 0 || numPercentage < 0 || numPercentage > 100) {
            return res.status(400).json({
                error: 'Valores inválidos. Valor >= 0 e Percentual entre 0 e 100'
            });
        }

        // CÁLCULO (Backend valida também)
        const result = (numValue * numPercentage) / 100;

        // Armazenar cálculo
        const calculation = db.createCalculation({
            id: uuidv4(),
            sessionId,
            value: numValue,
            percentage: numPercentage,
            result
        });

        console.log(`✅ Cálculo realizado: ${numValue} × ${numPercentage}% = ${result}`);

        res.json({
            success: true,
            sessionId,
            result,
            message: 'Cálculo realizado com sucesso'
        });

    } catch (error) {
        console.error('❌ Erro ao calcular:', error);
        res.status(500).json({
            error: 'Erro ao processar o cálculo'
        });
    }
});

// ===============================================
// ROTA: CRIAR PAGAMENTO
// ===============================================

app.post('/api/payment/create', async (req, res) => {
    try {
        const { sessionId, amount, result } = req.body;

        // Validações
        if (!sessionId || !amount) {
            return res.status(400).json({
                error: 'sessionId e amount são obrigatórios'
            });
        }

        if (amount !== PAYMENT_AMOUNT) {
            return res.status(400).json({
                error: `Valor do pagamento deve ser exatamente R$ ${(PAYMENT_AMOUNT / 100).toFixed(2)}`
            });
        }

        // Verificar se já existe pagamento pendente válido
        if (db.hasActivePendingPayment(sessionId)) {
            const existingPayment = db.getPendingPaymentBySessionId(sessionId);
            console.log('♻️ Reutilizando pagamento pendente:', existingPayment.paymentId);
            
            return res.json({
                success: true,
                paymentId: existingPayment.paymentId,
                qrCode: existingPayment.qrCode,
                pixCopiaECola: existingPayment.pixCopiaECola,
                amount: PAYMENT_AMOUNT,
                message: 'Pagamento recuperado'
            });
        }

        // Gerar ID único do pagamento
        const paymentId = 'pay_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

        // INTEGRAÇÃO COM API PIX (Estrutura pronta)
        // Aqui você integrará com Mercado Pago, Asaas, Gerencianet, Stone, etc.
        
        // Por enquanto, geramos QR Code local para demonstração
        const qrCodeData = await generateQRCode(paymentId, PIX_KEY, PAYMENT_AMOUNT);
        const pixCopiaECola = generatePixCopiaECola(PIX_KEY, PAYMENT_AMOUNT, paymentId);

        // Criar pagamento no banco de dados
        const payment = db.createPayment({
            id: uuidv4(),
            sessionId,
            paymentId,
            amount: PAYMENT_AMOUNT,
            result,
            pixKey: PIX_KEY,
            pixCopiaECola,
            qrCode: qrCodeData
        });

        console.log(`🔐 Pagamento criado: ${paymentId}`);

        res.json({
            success: true,
            paymentId,
            qrCode: qrCodeData,
            pixCopiaECola,
            amount: PAYMENT_AMOUNT,
            status: 'pending',
            message: 'Pagamento criado. Aguardando confirmação.'
        });

    } catch (error) {
        console.error('❌ Erro ao criar pagamento:', error);
        res.status(500).json({
            error: 'Erro ao criar pagamento'
        });
    }
});

// ===============================================
// ROTA: CONSULTAR STATUS DO PAGAMENTO
// ===============================================

app.get('/api/payment/status/:paymentId', (req, res) => {
    try {
        const { paymentId } = req.params;

        if (!paymentId) {
            return res.status(400).json({
                error: 'paymentId é obrigatório'
            });
        }

        const payment = db.getPaymentByPaymentId(paymentId);

        if (!payment) {
            return res.status(404).json({
                error: 'Pagamento não encontrado'
            });
        }

        // INTEGRAÇÃO COM API PIX
        // Aqui você consultaria o status real no provedor
        // Por enquanto, retornamos o status armazenado localmente

        res.json({
            paymentId,
            status: payment.status,
            amount: payment.amount,
            createdAt: payment.createdAt,
            updatedAt: payment.updatedAt,
            paidAt: payment.paidAt
        });

    } catch (error) {
        console.error('❌ Erro ao consultar pagamento:', error);
        res.status(500).json({
            error: 'Erro ao consultar pagamento'
        });
    }
});

// ===============================================
// ROTA: WEBHOOK (Receber confirmação de pagamento)
// ===============================================

app.post('/api/payment/webhook', (req, res) => {
    try {
        const { paymentId, status, paidAt } = req.body;

        // ⚠️ IMPORTANTE: Validar autenticidade da requisição
        // Verificar assinatura/token do provedor
        const webhookSecret = process.env.PAYMENT_WEBHOOK_SECRET;

        if (!webhookSecret) {
            console.warn('⚠️ PAYMENT_WEBHOOK_SECRET não configurada. Webhook pode ser inseguro.');
        }

        // Aqui você validaria a assinatura do webhook
        // Exemplo:
        // const signature = req.headers['x-webhook-signature'];
        // if (!verifyWebhookSignature(req.body, signature, webhookSecret)) {
        //     return res.status(401).json({ error: 'Assinatura inválida' });
        // }

        if (!paymentId) {
            return res.status(400).json({
                error: 'paymentId é obrigatório'
            });
        }

        const payment = db.getPaymentByPaymentId(paymentId);

        if (!payment) {
            return res.status(404).json({
                error: 'Pagamento não encontrado'
            });
        }

        // Atualizar status
        const newStatus = status || 'paid';
        const updatedPayment = db.updatePaymentStatus(
            paymentId,
            newStatus,
            paidAt || new Date().toISOString()
        );

        console.log(`✅ Webhook recebido: ${paymentId} → ${newStatus}`);

        res.json({
            success: true,
            paymentId,
            status: updatedPayment.status,
            message: 'Pagamento atualizado com sucesso'
        });

    } catch (error) {
        console.error('❌ Erro no webhook:', error);
        res.status(500).json({
            error: 'Erro ao processar webhook'
        });
    }
});

// ===============================================
// ROTA: BUSCAR RESULTADO
// ===============================================

app.get('/api/result/:sessionId', (req, res) => {
    try {
        const { sessionId } = req.params;

        if (!sessionId) {
            return res.status(400).json({
                error: 'sessionId é obrigatório'
            });
        }

        // Buscar pagamento da sessão
        const payment = db.getPaymentBySessionId(sessionId);

        if (!payment) {
            return res.status(403).json({
                error: 'Pagamento necessário para acessar este resultado.',
                code: 'PAYMENT_REQUIRED'
            });
        }

        // CRÍTICO: Verificar se o pagamento foi CONFIRMADO
        if (payment.status !== 'paid') {
            return res.status(403).json({
                error: 'Pagamento necessário para acessar este resultado.',
                code: 'PAYMENT_PENDING',
                paymentStatus: payment.status
            });
        }

        // Retornar resultado
        res.json({
            success: true,
            sessionId,
            result: payment.result,
            status: payment.status,
            paidAt: payment.paidAt
        });

    } catch (error) {
        console.error('❌ Erro ao buscar resultado:', error);
        res.status(500).json({
            error: 'Erro ao buscar resultado'
        });
    }
});

// ===============================================
// ROTAS DE TESTE E ADMIN
// ===============================================

// Listar todos os pagamentos (somente desenvolvimento)
app.get('/api/admin/payments', (req, res) => {
    if (process.env.NODE_ENV !== 'development') {
        return res.status(403).json({ error: 'Acesso negado' });
    }

    const payments = db.getAllPayments();
    res.json({
        total: payments.length,
        payments
    });
});

// Marcar pagamento como pago (somente teste/desenvolvimento)
app.post('/api/admin/payment/:paymentId/confirm', (req, res) => {
    if (process.env.NODE_ENV !== 'development') {
        return res.status(403).json({ error: 'Acesso negado' });
    }

    const { paymentId } = req.params;
    const payment = db.updatePaymentStatus(paymentId, 'paid', new Date().toISOString());

    if (!payment) {
        return res.status(404).json({ error: 'Pagamento não encontrado' });
    }

    res.json({
        success: true,
        message: 'Pagamento marcado como pago',
        payment
    });
});

// ===============================================
// TRATAMENTO DE ERROS
// ===============================================

app.use((req, res) => {
    res.status(404).json({
        error: 'Rota não encontrada',
        path: req.path
    });
});

app.use((err, req, res, next) => {
    console.error('❌ Erro não tratado:', err);
    res.status(500).json({
        error: 'Erro interno do servidor',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// ===============================================
// UTILITÁRIOS
// ===============================================

/**
 * Gerar QR Code com dados PIX
 */
async function generateQRCode(paymentId, pixKey, amount) {
    try {
        // Estrutura EMV (padrão PIX - simplificado para demonstração)
        // Em produção, use a biblioteca qrcode para gerar QR Code correto
        const pixData = `${pixKey}|${(amount / 100).toFixed(2)}|${paymentId}`;
        
        const qrCode = await QRCode.toDataURL(pixData);
        return qrCode;
    } catch (error) {
        console.error('❌ Erro ao gerar QR Code:', error);
        return null;
    }
}

/**
 * Gerar Pix Copia e Cola
 * Formato: 00020126580014br.gov.bcb.pix...
 */
function generatePixCopiaECola(pixKey, amount, paymentId) {
    // Formato simplificado para demonstração
    // Em produção, gerar EMV completo conforme padrão BC
    return `00020126580014br.gov.bcb.pix0136${pixKey}52040000530398654061${(amount / 100).toFixed(2)}5802BR5913CALCULADORA6009SAO PAULO62410503${paymentId}63041D3D`;
}

/**
 * Verificar assinatura do webhook (exemplo)
 */
function verifyWebhookSignature(data, signature, secret) {
    // Implementar verificação conforme o provedor
    // Exemplo com HMAC-SHA256:
    // const crypto = require('crypto');
    // const hash = crypto.createHmac('sha256', secret).update(JSON.stringify(data)).digest('hex');
    // return hash === signature;
    
    return true; // Placeholder
}

// ===============================================
// INICIAR SERVIDOR
// ===============================================

app.listen(PORT, () => {
    console.log('');
    console.log('╔═══════════════════════════════════════════╗');
    console.log('║     CALCULADORA PREMIUM - BACKEND         ║');
    console.log('╚═══════════════════════════════════════════╝');
    console.log('');
    console.log(`🚀 Servidor rodando em: http://localhost:${PORT}`);
    console.log(`📱 Frontend: http://localhost:${PORT}`);
    console.log(`🔑 Chave PIX: ${PIX_KEY ? '✅ Configurada' : '❌ Não configurada'}`);
    console.log(`💰 Valor do pagamento: R$ ${(PAYMENT_AMOUNT / 100).toFixed(2)}`);
    console.log('');
});

module.exports = app;
