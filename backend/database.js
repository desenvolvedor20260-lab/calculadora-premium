/* ===============================================
   CALCULADORA PREMIUM - DATABASE
   =============================================== */

const fs = require('fs');
const path = require('path');

// Caminho do arquivo de banco de dados
const DB_PATH = path.join(__dirname, 'data.json');

// Estrutura inicial do banco de dados
const DEFAULT_DB = {
    payments: [],
    calculations: []
};

// ===============================================
// INICIALIZAR BANCO DE DADOS
// ===============================================

function initializeDatabase() {
    if (!fs.existsSync(DB_PATH)) {
        fs.writeFileSync(DB_PATH, JSON.stringify(DEFAULT_DB, null, 2));
        console.log('✅ Banco de dados inicializado em:', DB_PATH);
    }
}

// ===============================================
// LEITURA DO BANCO DE DADOS
// ===============================================

function readDatabase() {
    try {
        const data = fs.readFileSync(DB_PATH, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('❌ Erro ao ler banco de dados:', error);
        return DEFAULT_DB;
    }
}

// ===============================================
// ESCRITA DO BANCO DE DADOS
// ===============================================

function writeDatabase(data) {
    try {
        fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('❌ Erro ao escrever banco de dados:', error);
    }
}

// ===============================================
// OPERAÇÕES DE PAGAMENTO
// ===============================================

function createPayment(paymentData) {
    const db = readDatabase();
    
    const payment = {
        id: paymentData.id,
        sessionId: paymentData.sessionId,
        paymentId: paymentData.paymentId,
        amount: paymentData.amount,
        status: 'pending', // pending, paid, failed, expired, cancelled
        result: paymentData.result,
        pixKey: paymentData.pixKey,
        pixCopiaECola: paymentData.pixCopiaECola,
        qrCode: paymentData.qrCode,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        paidAt: null
    };

    db.payments.push(payment);
    writeDatabase(db);

    return payment;
}

function getPaymentByPaymentId(paymentId) {
    const db = readDatabase();
    return db.payments.find(p => p.paymentId === paymentId);
}

function getPaymentBySessionId(sessionId) {
    const db = readDatabase();
    return db.payments.find(p => p.sessionId === sessionId);
}

function updatePaymentStatus(paymentId, status, paidAt = null) {
    const db = readDatabase();
    
    const payment = db.payments.find(p => p.paymentId === paymentId);
    if (payment) {
        payment.status = status;
        payment.updatedAt = new Date().toISOString();
        if (paidAt) {
            payment.paidAt = paidAt;
        }
        writeDatabase(db);
        return payment;
    }

    return null;
}

function getAllPayments() {
    const db = readDatabase();
    return db.payments;
}

// ===============================================
// OPERAÇÕES DE CÁLCULO
// ===============================================

function createCalculation(calculationData) {
    const db = readDatabase();
    
    const calculation = {
        id: calculationData.id,
        sessionId: calculationData.sessionId,
        value: calculationData.value,
        percentage: calculationData.percentage,
        result: calculationData.result,
        createdAt: new Date().toISOString()
    };

    db.calculations.push(calculation);
    writeDatabase(db);

    return calculation;
}

function getCalculationBySessionId(sessionId) {
    const db = readDatabase();
    return db.calculations.find(c => c.sessionId === sessionId);
}

// ===============================================
// VERIFICAÇÃO DE PAGAMENTO PENDENTE
// ===============================================

function getPendingPaymentBySessionId(sessionId) {
    const db = readDatabase();
    return db.payments.find(p => p.sessionId === sessionId && p.status === 'pending');
}

function hasActivePendingPayment(sessionId) {
    const payment = getPendingPaymentBySessionId(sessionId);
    if (!payment) return false;

    // Verificar se o pagamento ainda é válido (menos de 10 minutos)
    const createdTime = new Date(payment.createdAt).getTime();
    const currentTime = new Date().getTime();
    const diffMinutes = (currentTime - createdTime) / (1000 * 60);

    return diffMinutes < 10;
}

// ===============================================
// LIMPEZA DE PAGAMENTOS EXPIRADOS
// ===============================================

function cleanExpiredPayments() {
    const db = readDatabase();
    const now = new Date();
    const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60000);

    db.payments = db.payments.map(payment => {
        if (payment.status === 'pending') {
            const createdTime = new Date(payment.createdAt);
            if (createdTime < thirtyMinutesAgo) {
                payment.status = 'expired';
                payment.updatedAt = new Date().toISOString();
            }
        }
        return payment;
    });

    writeDatabase(db);
}

// ===============================================
// EXPORTAR FUNÇÕES
// ===============================================

module.exports = {
    initializeDatabase,
    readDatabase,
    writeDatabase,

    // Pagamentos
    createPayment,
    getPaymentByPaymentId,
    getPaymentBySessionId,
    updatePaymentStatus,
    getAllPayments,
    getPendingPaymentBySessionId,
    hasActivePendingPayment,
    cleanExpiredPayments,

    // Cálculos
    createCalculation,
    getCalculationBySessionId
};
